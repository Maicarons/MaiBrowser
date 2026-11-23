# 油猴脚本

MaiBrowser 原生解析 Tampermonkey 风格的脚本，不依赖扩展运行时。

## 支持范围

- 元数据：`@name`、`@name:zh-CN`、`@namespace`、`@version`、`@description`、`@match`、`@include`、`@exclude`、`@grant`、`@connect`、`@run-at`、`@noframes`、`@require`、`@resource`
- 匹配：Chrome match pattern + glob `@include` + 正则 `/.../`
- GM API：
  - `GM_getValue` / `GM_setValue` / `GM_deleteValue` / `GM_listValues`
  - `GM_addStyle` / `GM_addElement`
  - `GM_log`
  - `GM_registerMenuCommand` / `GM_unregisterMenuCommand`
  - `GM_openInTab` / `GM_notification` / `GM_setClipboard` / `GM_download`
  - `GM_xmlhttpRequest`（主进程代理，绕过页面 CORS）
  - `GM` 命名空间的 Promise 版本
  - `GM_info`、`unsafeWindow`
  - `GM_getResourceText` / `GM_getResourceURL`（安装时缓存文本资源，URL 为 data URI）

## 注入流程

1. 页面 `bindload` 后，UI 查找启用且匹配当前 URL 的脚本。
2. 从 `userscript_values` 载入每个脚本的值，从 `userscript_resources` 载入 `@require` / `@resource` 缓存。
3. `buildInjection` 生成一个 IIFE：按声明顺序执行 `@require`，注入 GM shim（含资源）和脚本源码。
4. `<webview>.invoke({ method: 'eval', params: { func } })` 执行。
5. 脚本调用 `GM_setValue` 等时，通过 `window.postMessage('__MB__' + JSON)` 通知 UI，UI 再走宿主 RPC。

## 已知限制

- `@run-at document-start` 实际在页面加载后注入，属于兼容性差距。
- `@require` / `@resource` 当前只支持 HTTP(S) 文本资源，单文件上限 2 MB；二进制资源尚未支持。
- `GM_download` 仍等待下载管理器接通。
- 脚本没有独立沙箱；安装页面会明确提示。

## 测试

```bash
bun test packages/userscript
```
