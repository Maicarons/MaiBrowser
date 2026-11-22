# 架构

## 分层

| 层           | 包 / 应用               | 职责                                                      |
| ------------ | ----------------------- | --------------------------------------------------------- |
| UI           | `packages/ui`           | 浏览器外壳、标签页、内部页面，ReactLynx + lynx-ui         |
| 桌面宿主     | `apps/desktop/src/main` | Lynxtron 窗口、CEF 初始化、RPC、DuckDB 适配、网络与文件桥 |
| 桌面 UI 入口 | `apps/desktop/src/app`  | 加载 Lynx bundle，渲染共享 UI                             |
| Android      | `apps/android`          | LynxView + 系统 WebView，复用共享 UI                      |
| 领域模型     | `packages/core`         | 标签页、URL、搜索、显示格式化                             |
| 存储         | `packages/storage`      | DuckDB 适配、迁移、查询封装                               |
| 油猴脚本     | `packages/userscript`   | 元数据解析、URL 匹配、GM 注入                             |
| 国际化       | `packages/i18n`         | zh-Hans / en 文案                                         |

## 数据流

1. Lynx UI 通过 `NativeModules.bridge.call('rpc', { method, params })` 调用宿主。
2. `apps/desktop` 主进程解析 RPC，分发到 `Store`、网络、剪贴板、文件或窗口控制。
3. 返回值以 `{ ok, data }` JSON 信封回传，UI 在 `bridge.ts` 中解包。
4. 网页由 `<webview>`（CEF）承载；页面加载后 UI 通过 `eval` 注入 `PAGE_BOOTSTRAP` 和匹配的油猴脚本。
5. 页面通过 `window.postMessage('__MB__' + JSON)` 回传 `GM_*` 请求，UI 调用宿主完成并 eval 回调。

## 关键设计

### 标签页与会话

标签页状态保存在 `UiTab`，包含 `navId`。`navId` 只在用户主动导航时递增，避免 SPA 的 `bindlocationchange` 改 URL 时把 `<webview>` 的 `src` 重新设置而导致刷新。

会话通过 `saveTabs` 写入 DuckDB，启动时根据 `restoreTabs` 设置恢复。

### 网页引擎抽象

`packages/engine-contract` 定义 `BrowserEngine` 接口，用于未来替换 CEF、Android WebView 或原生引擎。当前桌面端直接使用 Lynxtron `<webview>`，Android 端将实现同一接口。

### 存储

所有 SQL 在 `packages/storage`，主进程只提供 DuckDB 连接。迁移版本记录在 `schema_migrations`，当前为 v1。

### 安全边界

- 主进程网络桥只允许 `http` / `https`，外部打开允许 `mailto`。
- 油猴脚本运行在页面世界，拥有页面权限；安装界面提示风险。
- Android 端采用页面世界 + 窄桥接的 beta 方案，不宣称完整沙箱。
