# MaiBrowser

MaiBrowser 是一个本地优先、跨平台的现代浏览器。界面使用 Lynx 4.x + ReactLynx + `@lynx-js/lynx-ui` 构建，Windows 端由 CEF 渲染网页，Android 端使用系统 WebView，Windows 端的历史、书签、下载记录和油猴脚本存储在 DuckDB 中；Android 0.1.0 使用应用私有的 JSON 状态快照。

> 当前状态：0.1.0 首个公开版本已发布到 [GitHub Releases](https://github.com/Maicarons/MaiBrowser/releases/tag/v0.1.0)，包含 Windows x64（NSIS）与 Android（调试 APK）。共享 UI、CEF / 系统 WebView、油猴脚本和本地存储均已跑通。
>
> 仓库：<https://github.com/Maicarons/MaiBrowser>

## 特性

- **一套 UI，两端复用**：标签页、地址栏、历史、书签、下载、设置和脚本管理都位于 `packages/ui`，桌面与 Android 共享。
- **可定制外观**：设置拆分为外观、搜索引擎、启动时、语言、隐私、下载、存储等独立页面；支持浅色/深色/跟随系统、7 种强调色和界面动效开关。
- **统一的图标与动效**：使用 Remix Icon 图标集，通过运行时着色适配主题；页面进入、菜单弹出、提示条和主题预览使用 `@lynx-js/motion`。
- **日常浏览**：标签固定、恢复关闭的标签、隐私标签、地址栏历史/书签补全、页内查找、缩放、打印和书签栏。
- **原生油猴脚本**：Tampermonkey 兼容的元数据解析、`@match` / `@include` / `@exclude` 匹配，以及 `GM_*` / `GM.*` 桥接 API。
- **书签与脚本管理**：书签 HTML 导入/导出（桌面）、脚本安装/启停/删除/更新检查。
- **DuckDB 存储（Windows）**：历史、书签、下载、脚本、脚本值和标签页会话统一落在 `maibrowser.duckdb`；Android 端当前使用等价的状态快照。
- **本地优先**：没有账号、没有云同步、没有遥测；数据默认只在本机。
- **Lynx 原生 UI**：不使用 Web 前端渲染浏览器外壳，桌面端通过 Lynxtron 承载 Lynx 视图。
- **AGPL-3.0**：代码和文档使用同一许可证。

## 技术栈

| 层       | Windows                                   | Android                             |
| -------- | ----------------------------------------- | ----------------------------------- |
| UI       | Lynx 4.x · ReactLynx · `@lynx-js/lynx-ui` | 同一套 UI                           |
| 外壳     | Lynxtron（Lynx + Node.js）                | Sparkling / LynxView                |
| 网页引擎 | CEF（`@lynx-js/cef-webview`）             | 系统 WebView                        |
| 存储     | DuckDB（`@duckdb/node-api`）              | JSON 快照（DuckDB NDK 为 0.2 工作） |
| 包管理   | Bun 1.3+                                  | Bun + Gradle                        |

## 目录

```
apps/desktop        Lynxtron 桌面应用、主进程 RPC、CEF 初始化
apps/android        Android 应用（Sparkling + Lynx 4.2 + 系统 WebView）
packages/core       标签页、URL、搜索等纯函数模型
packages/ui         浏览器外壳与内部页面（ReactLynx）
packages/storage    DuckDB 适配层与 SQL 迁移
packages/userscript Tampermonkey 元数据、匹配与 GM 注入
packages/i18n       中英文文案
packages/engine-contract 浏览器引擎接口
docs                VitePress 文档
test-pages          本地测试页面
```

## 开发

要求：Windows 10/11、Bun 1.3+、Node.js 22.18+、Visual Studio 2022 C++ 工具链（CEF/Lynxtron 原生依赖）。

```bash
bun install
bun run dev              # 启动 Lynx + Lynxtron 开发模式
bun run typecheck        # TypeScript 检查
bun run test             # core / i18n / userscript / DuckDB 存储测试
bun run build            # 构建 Lynx bundle 与桌面主进程
bun run --cwd apps/desktop start   # 构建后启动桌面应用
bun run --cwd apps/desktop pack    # 生成 Windows NSIS 安装包
bun run docs:build       # 构建 VitePress 文档
```

首次安装 Lynxtron/CEF 原生包后，如果 `@lynx-js/lynxtron` 或 `@lynx-js/cef-webview` 的 postinstall 没有执行，可在对应包目录运行：

```bash
node install.js
node scripts/install.js
```

CEF 二进制较大；网络受限时可设置 `npm_config_custom_cef_webview_binary_url` 指向可访问的镜像。

## 数据位置

- Windows 数据库：`%APPDATA%/@maibrowser/desktop/maibrowser.duckdb`（由 `app.getPath('userData')` 决定）
- Windows 下载目录：系统下载目录下的 `MaiBrowser/`
- Android 状态快照：应用私有目录 `files/maibrowser-state.json`
- Android 下载目录：系统下载目录（0.1.0 仅记录元数据，下载写入待接入）

## 已知限制

- 隐私标签不隔离 Cookie，只保证不写入历史与会话；多窗口尚未接入。
- 下载事件尚未接入 CEF 下载管理器，下载页目前管理本地记录。
- Android 端文件导入/导出和下载写入暂不可用；DuckDB 的 NDK 构建在 0.2。
- 油猴脚本在页面加载后注入，不是严格的文档起点；Android 端为页面世界 + 窄桥接 beta 方案。
- Android 上通过自动补全选中地址后，页面会正确导航，但原生输入框的显示值在部分设备上不会立即回填为最终 URL。
- 站点权限、证书错误和自动更新 UI 尚未接入。

## 安全与隐私

- 不内置广告拦截、密码管理或云同步（P1 规划）。
- 油猴脚本会读取和修改匹配页面；安装界面会明确提示风险。
- Android 端 0.1.0 的状态快照未加密，和其他应用私有文件一样受 Android 沙箱保护。
- Android 端油猴脚本采用页面世界注入 + 窄桥接的 beta 方案，不提供完整沙箱隔离。

## 许可证

Copyright (C) 2026 MaiBrowser contributors.

本项目以 GNU Affero General Public License v3.0 发布，详见 [LICENSE](LICENSE)。文档使用同一许可证。
