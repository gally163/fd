代码解释
获取 URL: new URL(context.request.url) 获取当前请求的完整 URL 信息。

解析路径: url.pathname.split('/').filter(Boolean) 将路径（如 /example.com/path）分割成数组 ['example.com', 'path']。filter(Boolean) 是一个小技巧，用于移除因开头和结尾的 / 而产生的空字符串。

根目录处理: 判断 pathSegments 数组是否为空。如果为空，说明用户访问的是根目录，此时返回一个 HTML 页面作为使用说明。

构建目标 URL: 将数组的第一个元素 pathSegments[0] 作为目标域名 (targetHost)，剩下的部分重新组合成路径 (targetPath)。然后默认使用 https:// 协议拼接成完整的 URL。

保留查询参数: targetUrl.search = url.search 确保原始请求中的查询参数（如 ?key=value）被传递到目标服务器。

创建新请求: new Request(targetUrl, context.request) 创建一个指向目标服务器的新请求，并复制原始请求的方法（GET/POST）、Body 等。

修改 Host 头: newRequest.headers.set('Host', targetHost) 是反向代理的核心。它告诉目标服务器，我们想要访问的是 targetHost 这个网站。没有这一步，很多网站会返回错误。

返回响应: return fetch(newRequest) 将请求发送出去，并把从目标服务器收到的响应原封不动地返回给最初的用户。

重要注意事项
开放代理风险 (Open Proxy): 这个实现是一个完全开放的代理。任何人只要知道了你的域名，就可以用它来代理任何网站。这可能会被滥用，例如用于隐藏恶意行为的来源。请确保你了解这个风险，不要在生产环境中随意暴露此类代理。

功能限制:

Cookie: 目标网站设置的 Cookie 域名归属目标网站，你的代理域名无法直接使用，可能导致需要登录的网站无法正常工作。

绝对链接: 如果目标网站页面中的链接是写死的绝对路径（例如 href="https://example.com/about"），点击后会离开你的代理。

客户端脚本 (JavaScript): 页面中的 JavaScript 如果发起网络请求（AJAX/Fetch），可能会因为跨域（CORS）策略而被浏览器阻止。

协议: 此代码默认所有目标网站都使用 https。如果需要代理 http 网站，需要更复杂的逻辑来判断或指定协议。
