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
  // 访问 "your-project.pages.dev/google/" 将代理到 "https://www.google.com/"
  'google': 'https://www.google.com',

  // 访问 "your-project.pages.dev/another-site/" 将代理到 "https://httpbin.org/"
  // httpbin.org 是一个很好的测试工具，可以用来检查请求头、Cookie 等信息
  'another-site': 'https://httpbin.org',
  'epgdiyp': 'https://tv.mxdyeah.top/epgphp/index.php',
   'epgxml': 'https://tv.mxdyeah.top/epgphp/t.xml',
  // 你可以添加更多规则...
  // 'siteC': 'https://some-other-website.com',
};

// 默认路由
// 当访问根路径 ("/") 或没有匹配到任何路由规则时，将代理到这个地址。
// 设置为 null 则会显示一个简单的提示页面。
const defaultTargetUrl = null; // 或者 'https://example.com';

/**
 * --------------------------------------------------------------------------------
 * 代理逻辑 - 通常无需修改以下代码
 * --------------------------------------------------------------------------------
 */

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean); // e.g., ['google', 'search']
  const routePrefix = pathSegments[0]; // e.g., 'google'

  let targetUrl = null;

  // 1. 寻找匹配的路由
  if (routePrefix && routingRules[routePrefix]) {
    targetUrl = new URL(routingRules[routePrefix]);
    // 从路径中移除路由前缀， e.g., /google/search -> /search
    url.pathname = '/' + pathSegments.slice(1).join('/');
  } else if (defaultTargetUrl) {
    targetUrl = new URL(defaultTargetUrl);
  } else {
    // 如果没有匹配到任何规则，也没有设置默认地址，则返回一个导航页面
    return new Response(generateHomepage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 2. 构建发往目标服务器的请求
  const targetRequestUrl = new URL(targetUrl);
  targetRequestUrl.pathname = url.pathname;
  targetRequestUrl.search = url.search;

  // 复制原始请求，但使用目标 URL
  const newRequest = new Request(targetRequestUrl, context.request);
  newRequest.headers.set('Host', targetUrl.hostname);
  newRequest.headers.set('Referer', targetUrl.origin); // 有些网站会检查 Referer

  // 3. 发送请求并获取响应
  let response = await fetch(newRequest);

  // 创建一个可变的响应副本以修改 Headers
  response = new Response(response.body, response);

  const proxyHost = new URL(context.request.url).host;
  const targetHost = targetUrl.host;

  // 4. 重写响应头 (Cookie 和 Location)
  // 这是支持登录和跳转的关键
  const cookieHeader = response.headers.get('Set-Cookie');
  if (cookieHeader) {
    // 将 Set-Cookie 中的 domain=target.com 替换为 domain=proxy.com
    const newCookieHeader = cookieHeader.replace(new RegExp(`domain=${targetHost}`, 'gi'), `domain=${proxyHost}`);
    response.headers.set('Set-Cookie', newCookieHeader);
  }

  const locationHeader = response.headers.get('Location');
  if (locationHeader && locationHeader.includes(targetHost)) {
    // 将重定向地址中的目标域名替换为代理域名
    const newLocationHeader = locationHeader.replace(new RegExp(`https://${targetHost}`, 'gi'), `https://${proxyHost}/${routePrefix || ''}`);
    response.headers.set('Location', newLocationHeader);
  }

  // 5. 使用 HTMLRewriter 重写响应体中的链接
  // 这是确保页面内链接、资源文件（JS/CSS）加载正确的关键
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('text/html')) {
    const rewriter = new HTMLRewriter()
      .on('a[href]', new AttributeRewriter('href', targetHost, proxyHost, routePrefix))
      .on('img[src]', new AttributeRewriter('src', targetHost, proxyHost, routePrefix))
      .on('link[href]', new AttributeRewriter('href', targetHost, proxyHost, routePrefix))
      .on('script[src]', new AttributeRewriter('src', targetHost, proxyHost, routePrefix))
      .on('form[action]', new AttributeRewriter('action', targetHost, proxyHost, routePrefix));

    return rewriter.transform(response);
  }

  return response;
}

/**
 * HTMLRewriter 的处理器类，用于重写元素属性中的 URL
 */
class AttributeRewriter {
  constructor(attributeName, targetHost, proxyHost, routePrefix) {
    this。attributeName = attributeName;
    this。targetHost = targetHost;
    this.proxyHost = proxyHost;
    this.routePrefix = routePrefix || '';
  }

  element(element) {
    const attribute = element.getAttribute(this.attributeName);
    if (attribute) {
      // 将绝对路径 "https://target.com/path" 替换为 "https://proxy.com/prefix/path"
      // 将相对路径 "/path" 替换为 "/prefix/path"
      let newAttribute = attribute.replace(new RegExp(`https://${this.targetHost}`, 'gi'), `https://${this.proxyHost}/${this.routePrefix}`);
      
      // 处理根相对路径 (e.g., /some/path)
      if (newAttribute.startsWith('/') && !newAttribute.startsWith('//')) {
         newAttribute = `/${this.routePrefix}${newAttribute}`;
      }
      
      element.setAttribute(this.attributeName, newAttribute);
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
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cloudflare Pages Proxy</title>
      <style>
        body { font-family: sans-serif; padding: 2em; line-height: 1.6; }
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 0.5em; }
        code { background-color: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>Cloudflare Pages 反向代理</h1>
      <p>这是一个通过 Cloudflare Pages Functions 实现的反向代理服务。以下是当前配置的路由规则：</p>
      <ul>${listItems}</ul>
      <p>请点击上面的链接进行访问。</p>
    </body>
    </html>
  `;
}
