// functions/_middleware.js

/**
 * --------------------------------------------------------------------------------
 * 配置区域 - 请根据你的需求修改
 * --------------------------------------------------------------------------------
 */

// 路由规则配置
// 键是你在代理 URL 中使用的路径前缀，值是你要代理的目标网站 URL。
const routingRules = {
  // 示例:
  // 访问 "your-project.pages.dev/google/" 将代理 "https://www.google.com" 的 HTTP 和 WebSocket
  'google': 'https://www.google.com',
  'epgdiyp': 'https://tv.mxdyeah.top/epgphp/index.php',
  'epgxml': 'https://tv.mxdyeah.top/epgphp/t.xml',
  
  // 访问 "your-project.pages.dev/ws-test/" 将代理到一个公开的 WebSocket 测试服务
  // 你可以用这个来验证 WebSocket 代理是否成功
  'ws-test': 'https://socketsbay.com', // 目标网站 socketsbay.com/test/
};

// 默认路由
// 当访问根路径 ("/") 或没有匹配到任何路由规则时，将代理到这个地址。
// 设置为 null 则会显示一个简单的导航页面。
const defaultTargetUrl = null;

/**
 * --------------------------------------------------------------------------------
 * 代理逻辑 - 通常无需修改以下代码
 * --------------------------------------------------------------------------------
 */

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const routePrefix = pathSegments[0];

  let targetUrlStr = null;
  let newPathname = url.pathname;

  // 1. 寻找匹配的路由，确定目标地址
  if (routePrefix && routingRules[routePrefix]) {
    targetUrlStr = routingRules[routePrefix];
    newPathname = '/' + pathSegments.slice(1).join('/'); // 从路径中移除路由前缀
  } else if (defaultTargetUrl) {
    targetUrlStr = defaultTargetUrl;
  } else {
    return new Response(generateHomepage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const targetUrl = new URL(targetUrlStr);

  // --- 新增：WebSocket 代理支持 ---
  // 检查请求头，判断是否是 WebSocket 升级请求
  const upgradeHeader = context.request.headers.get('Upgrade');
  if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
    // 如果是 WebSocket 请求，则直接进行 TCP 级别的转发
    return forwardWebSocket(context.request, targetUrl, newPathname);
  }
  // --- WebSocket 逻辑结束 ---


  // 2. 如果是常规 HTTP 请求，执行以下逻辑
  const targetRequestUrl = new URL(targetUrl);
  targetRequestUrl.pathname = newPathname;
  targetRequestUrl.search = url.search;

  const newRequest = new Request(targetRequestUrl, context.request);
  newRequest.headers.set('Host', targetUrl.hostname);
  newRequest.headers.set('Referer', targetUrl.origin);

  let response = await fetch(newRequest);
  response = new Response(response.body, response);

  const proxyHost = url.host;
  const targetHost = targetUrl.host;

  // 3. 重写响应头 (Cookie 和 Location)
  const cookieHeader = response.headers.get('Set-Cookie');
  if (cookieHeader) {
    const newCookieHeader = cookieHeader.replace(new RegExp(`domain=${targetHost}`, 'gi'), `domain=${proxyHost}`);
    response.headers.set('Set-Cookie', newCookieHeader);
  }

  const locationHeader = response.headers.get('Location');
  if (locationHeader) {
      const newLocation = locationHeader.replace(targetUrl.origin, `${url.origin}/${routePrefix || ''}`);
      response.headers.set('Location', newLocation);
  }

  // 4. 使用 HTMLRewriter 重写响应体中的链接
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('text/html')) {
    const rewriter = new HTMLRewriter()
      .on('a[href], link[href], form[action]', new AttributeRewriter('href', 'action', targetUrl, url, routePrefix))
      .on('img[src], script[src]', new AttributeRewriter('src', 'src', targetUrl, url, routePrefix));
    return rewriter.transform(response);
  }

  return response;
}


/**
 * WebSocket 代理函数
 * @param {Request} request 原始请求
 * @param {URL} targetUrl 目标服务器的 URL 对象
 * @param {string} newPathname 处理后的请求路径
 */
async function forwardWebSocket(request, targetUrl, newPathname) {
  // Cloudflare Workers/Pages 提供了一个非常方便的 WebSocket 代理方式。
  // 当 fetch 的请求包含 Upgrade: websocket 头时，它会自动处理 WebSocket 的握手过程。
  // 我们不需要手动创建 WebSocketPair。

  const wsTargetUrl = new URL(targetUrl);
  // 将协议从 http/https 切换到 ws/wss
  wsTargetUrl.protocol = targetUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  wsTargetUrl.pathname = newPathname;
  wsTargetUrl.search = new URL(request.url).search;

  const wsRequest = new Request(wsTargetUrl, request);

  try {
    // 发起 fetch 请求，Cloudflare 会在后台处理 Upgrade 握手
    const response = await fetch(wsRequest);

    // 如果目标服务器返回的不是 101 Switching Protocols，说明握手失败
    if (response.status !== 101) {
      console.error(`WebSocket handshake failed with status: ${response.status}`);
      return new Response('WebSocket handshake with origin server failed', { status: 502 });
    }
    
    // 如果握手成功，`fetch` 返回的响应对象会包含一个 `webSocket` 属性。
    // 这个属性是一个已经连接好的 WebSocket 对象对 (client/server pair)。
    // 我们只需要将它直接返回，Cloudflare 就会自动将客户端和目标服务器的 WebSocket 连接起来。
    // 这就是所谓的“WebSocket 直通”。
    return response;

  } catch (error) {
    console.error('WebSocket forwarding error:', error);
    return new Response('Failed to connect to WebSocket backend', { status: 500 });
  }
}


/**
 * HTMLRewriter 的处理器类，用于重写元素属性中的 URL
 */
class AttributeRewriter {
    constructor(attr1, attr2, targetUrl, proxyUrl, routePrefix) {
      this.attr1 = attr1; // href or src
      this.attr2 = attr2; // action or src
      this.targetOrigin = targetUrl.origin;
      this.proxyOrigin = proxyUrl.origin;
      this.routePrefix = routePrefix || '';
    }
  
    element(element) {
      const processAttribute = (attributeName) => {
        const attribute = element.getAttribute(attributeName);
        if (attribute) {
          // 替换绝对路径
          let newAttribute = attribute.replace(this.targetOrigin, `${this.proxyOrigin}/${this.routePrefix}`);
          
          // 为根相对路径添加前缀 (e.g., /path -> /prefix/path)
          if (newAttribute.startsWith('/') && !newAttribute.startsWith('//')) {
            newAttribute = `/${this.routePrefix}${newAttribute}`;
          }
          element.setAttribute(attributeName， newAttribute);
        }
      };
      processAttribute(this.attr1);
      if (this.attr1 !== this.attr2) {
        processAttribute(this.attr2);
      }
    }
  }


/**
 * 生成一个简单的导航首页
 */
function generateHomepage() {
  let listItems = '';
  for (const prefix in routingRules) {
    listItems += `<li><a href="/${prefix}/">/${prefix}/</a> &rarr; 代理到 ${routingRules[prefix]}</li>`;
  }

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cloudflare Pages 高级反向代理</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 2em; line-height: 1.6; background-color: #f4f4f9; color: #333;}
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #0056b3; }
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 0.8em; font-size: 1.1em; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        code { background-color: #e9ecef; padding: 0.2em 0.4em; border-radius: 3px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Cloudflare Pages 高级反向代理</h1>
        <p>这是一个通过 Cloudflare Pages Functions 实现的全功能反向代理服务，支持多站点路由、Cookie 登录、HTML 内容重写以及 WebSocket 代理。</p>
        <p>以下是当前配置的路由规则：</p>
        <ul>${listItems}</ul>
        <p>请点击上面的链接进行访问。要修改规则，请编辑项目中的 <code>functions/_middleware.js</code> 文件。</p>
      </div>
    </body>
    </html>
  `;
}
