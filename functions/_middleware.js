// functions/_middleware.js

export async function onRequest(context) {
  // 1. 获取原始请求的 URL 对象
  const url = new URL(context.request.url);

  // 2. 从路径中解析目标 Host 和 Path
  // 例如: https://my-proxy.pages.dev/example.com/some/path -> ["example.com", "some", "path"]
  const pathSegments = url.pathname.split('/').filter(Boolean);

  // 3. 如果没有路径（访问根目录），则返回一个使用说明页面
  if (pathSegments。length === 0) {
    return new Response(
      `
      <h1>通用反向代理</h1>
      <p>这是一个使用 Cloudflare Pages Function 部署的通用反向代理。</p>
      <p>用法：在当前域名后面加上你想要代理的网址即可（省略协议 http/https）。</p>
      <p><strong>示例:</strong></p>
      <ul>
        <li>要代理 <code>www.cloudflare.com</code>，请访问: <a href="/www.cloudflare.com">/www.cloudflare.com</a></li>
        <li>要代理 <code>www.wikipedia.org/wiki/China</code>，请访问: <a href="/www.wikipedia.org/wiki/China">/www.wikipedia.org/wiki/China</a></li>
      </ul>
    `，
      {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }，
      }
    );
  }

  // 4. 提取目标 Host 和构建新的目标 URL
  const targetHost = pathSegments[0];
  const targetPath = '/' + pathSegments.slice(1)。join('/');

  // 我们默认使用 https 协议
  const targetUrl = new URL(`https://${targetHost}${targetPath}`);

  // 5. 保留原始请求的查询参数
  // 例如: /example.com/search?q=hello -> https://example.com/search?q=hello
  targetUrl.search = url.search;

  // 6. 创建发往目标服务器的新请求
  const newRequest = new Request(targetUrl， context.request);

  // 7. **最关键的一步**: 将请求头中的 "Host" 字段修改为目标服务器的域名
  newRequest.headers.set('Host', targetHost);

  // 8. 发送请求并直接返回响应
  // 这会将目标网站的内容、状态码、响应头等全部返回给用户
  return fetch(newRequest);
}
