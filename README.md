

---

# ✨ Starlight Proxy (星光代理)

**— 于云端之巅，以 Cloudflare Pages 编织万维之网 —**

<p align="center">
  <img src="https://img.shields.io/badge/Powered%20by-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white" alt="Powered by Cloudflare Pages"/>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"/>
</p>

这不是一段寻常的代码，而是一座架设在 Cloudflare 全球网络之上的数字桥梁。它将您朴素的 Cloudflare Pages 站点，幻化为一个强大、优雅且功能完备的反向代理网关。

您的域名，自此成为一把万能钥匙，能开启散落在互联网各处的宝藏，将它们无缝地汇聚于一处，并以您独有的方式呈现给世界。无论是为了整合服务、隐藏源站，还是为了突破限制，`Starlight Proxy` 都将以极致的性能与简约的艺术，为您铺平道路。

---

## 核心特性 · The Art of Proxy

*   🎨 **多站点路由 (Multi-Site Routing)**
    *   您的域名如同一座星际之门，通过简单的路径前缀，即可传送至任何目标网站。无论是目录还是具体文件，皆可精准映射，万千世界，尽在掌握。

*   🍪 **无缝会话保持 (Seamless Session Handling)**
    *   跨越域名的鸿沟，让 Cookie 如同归巢的信鸽，自由往返。用户的每一次登录、每一次会话，都被温柔地保持，体验如丝般顺滑，毫无割裂之感。

*   🔗 **动态内容重写 (Dynamic Content Rewriting)**
    *   代码化身一位技艺精湛的画师，在响应内容送达浏览器前，悄然重绘页面中的每一处链接。绝对路径、相对路径，皆被巧妙地转换为代理后的地址，确保每一次点击都停留在您的星光之下。

*   🚀 **WebSocket 透明直通 (Transparent WebSocket Passthrough)**
    *   为实时数据流开辟一条不受干扰的“量子通道”。无论是即时通讯、在线游戏还是实时行情，WebSocket 连接都将畅行无阻，仿佛代理从未存在。

*   ⚙️ **配置即艺术 (Configuration as Art)**
    *   我们坚信，至繁归于至简。您只需在 `routingRules` 中描绘您的代理蓝图，剩下的所有复杂工作，都由 `Starlight Proxy` 在背后优雅完成。

## 架构掠影 · How It Shines

```

## 启程指南 · Quick Start

只需四步，即可点亮您的星光代理：

1.  **获取代码**: 将本项目中的 `functions` 目录完整地放入您的项目仓库中。

2.  **创建站点**: 登录 Cloudflare 控制台，使用您的代码仓库创建一个新的 Cloudflare Pages 项目。构建设置可留空，因为我们只依赖于 Functions。

3.  **描绘蓝图**: 打开 `functions/_middleware.js` 文件，在顶部的 `routingRules` 对象中，添加您的代理规则。
    ```javascript
    // functions/_middleware.js

    const routingRules = {
      // 访问 your.pages.dev/blog/ 将代理到 https://ghost-blog.com/
      'blog': 'https://ghost-blog.com/',

      // 访问 your.pages.dev/stream/ 将代理到 https://live.example.com/player.html
      'stream': 'https://live.example.com/player.html',
      
      // ... 在此添加更多属于您的星辰
    };
    ```

4.  **部署启航**: 提交并推送您的代码。Cloudflare Pages 将自动完成部署。片刻之后，访问您的 `*.pages.dev` 域名，即可见证奇迹。

## 许可证 · License

采用 [MIT](LICENSE) 许可证。

---

<p align="center">
  <i>愿星光，照亮您的网络之旅。</i>
</p>
