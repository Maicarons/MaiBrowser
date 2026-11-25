# Changelog

## 0.2.0 (2026-11-25)

下载管理更新。

### Added

- 桌面端多连接下载：使用 `ipull` 并行分段请求，支持进度、暂停、继续、取消和失败重试。
- 下载页显示实时进度条、已传输/总大小和状态；活动下载在页面打开时自动刷新。
- 页面内 `<a download>`、带 `download` 语义的链接和油猴 `GM_download` 已接入统一下载管理器。
- Android 使用系统 `DownloadManager` 下载到 `Downloads/MaiBrowser/`，支持状态同步、取消和完成通知。
- 下载记录在重启后保留；中断的桌面下载会标记为失败并可重试。

### Changed

- Windows、Android 和根 `package.json` 统一为 `0.2.0`；Android `versionCode=4`。

### Known limitations

- CEF 绑定仍不提供原生下载事件，因此桌面拦截只覆盖显式下载链接和 `GM_download`；表单 POST、`blob:`、PDF 查看器触发的下载仍无法拦截。
- 桌面下载不带 CEF 的 Cookie 或 HttpOnly 会话；需要登录的直链可能失败。
- Android 下载由系统服务管理，不提供暂停/继续按钮；完成通知由系统 DownloadManager 展示。

## 0.1.2 (2026-11-23)

脚本资源与 Android 存储可靠性更新。

### Added

- 油猴脚本 `@require`：安装或更新时抓取并按声明顺序注入，内容缓存到 `userscript_resources`。
- 油猴脚本 `@resource`：缓存文本资源，补齐 `GM_getResourceText` / `GM_getResourceURL`（data URI）。
- 安装/更新时自动补齐缓存；已安装但缺少资源的脚本会在启动刷新时尝试补齐。
- 单文件资源上限 2 MB，超限或下载失败会中止本次安装/更新并提示。

### Fixed

- Android 状态快照改为临时文件 + `fsync` + 原子 rename 写入；保留 `.bak`，主文件损坏时自动回退。
- Android 快照加入 `schemaVersion` 字段，为后续迁移留出显式版本位。

### Changed

- Windows、Android 和根 `package.json` 统一为 `0.1.2`；Android `versionCode=3`。

## 0.1.1 (2026-11-22)

补丁版本：修正英文文案并重建安装包，不包含功能性 API 变更。

### Fixed

- 英文外观设置中的动效说明不再显示内部库名 `@lynx-js/motion`，与其他界面文案保持一致。
- Windows 安装包与 Android APK 使用统一的 `0.1.1` 版本号重新构建；Android `versionCode` 提升到 2。

### Changed

- README 改为英文主文档，新增 `README_zh.md`、Hero 图、徽章与桌面/Android 截图。
- 文档站启用 GitHub Pages（`/MaiBrowser/`），补充 v0.2 升级研究、路线图和仓库主页链接。

## 0.1.0 (2026-11-22)

首个版本，Windows + Android 优先。

### Added

- Lynxtron 桌面壳与 CEF `<webview>` 集成。
- ReactLynx + `@lynx-js/lynx-ui` 浏览器外壳：标签页、地址栏、前进/后退/刷新、菜单。
- 内部页面：新标签页、历史、书签、下载、设置、油猴脚本、关于。
- 设置拆分为外观、搜索引擎、启动时、语言、隐私与安全、下载、数据存储、关于等页面。
- 主题设置页：浅色/深色/跟随系统、7 种强调色、书签栏和界面动效开关，设置即时生效并持久化。
- 全量替换为 Remix Icon 图标集，按主题动态着色；页面进入、菜单、提示条和主题预览接入 `@lynx-js/motion`。
- 修复 Windows 无参数启动时落入 Lynxtron 模板页的问题：打包后把应用载荷放到 `resources/app`，安装包快捷方式直接启动 MaiBrowser。
- DuckDB 存储与迁移：设置、标签页会话、历史、书签、下载、脚本、脚本值。
- 原生 Tampermonkey 兼容层：元数据解析、URL 匹配、`GM_*` / `GM.*`、`GM_xmlhttpRequest` 桥接、脚本更新检查。
- 标签页固定、恢复关闭的标签、隐私标签（不写历史/会话）、地址栏历史/书签补全。
- 页内查找、页面缩放、打印、书签栏。
- 书签 HTML 导入/导出（Windows 原生文件对话框）。
- Android 应用：Lynx 4.2 + ReactLynx 共享 UI、`xelement-webview` 系统 WebView、原生 `MaiBrowserNative` 模块（状态快照 / 网络 / 剪贴板）。
- 中英文界面。
- VitePress 文档。
- AGPL-3.0 许可证。

### Known limitations

- Android 0.1.0 使用 JSON 状态快照；DuckDB Android NDK/JNI 构建在后续版本评估，详见 `docs/guide/v0.2-plan.md`。
- 隐私标签不隔离 Cookie；多窗口、下载事件、站点权限、证书错误和自动更新 UI 尚未接入。
- CEF 下载事件尚未接入下载管理器；下载页面当前管理本地记录。
- Android 文件下载写入、多窗口和站点权限 UI 尚未接入。
- 多窗口、密码管理、云同步、广告拦截不在 0.1.0 范围内。
- 油猴脚本的 `document-start` 实际注入时机为页面加载后，属于已知兼容性差距。
- Android 自动补全选中后，原生地址输入框在部分设备上不会立即回填最终 URL（页面导航正常）。
