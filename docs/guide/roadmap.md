# 路线图

## 0.2.0 — 下载管理

- [x] 桌面端多连接下载（`ipull`）：进度、暂停、继续、取消、失败重试
- [x] 下载页进度条与状态刷新，重启后保留记录
- [x] 页面 `<a download>` / `rel=download` 与油猴 `GM_download` 接入下载管理器
- [x] Android 系统 `DownloadManager` 下载、状态同步、取消与完成通知
- [ ] CEF 原生下载事件、站点权限与证书错误页（仍受上游绑定限制）

## 0.1.2 — 脚本资源与存储可靠性

- [x] 油猴 `@require` 抓取、缓存与按序注入
- [x] 油猴 `@resource` 文本资源缓存与 `GM_getResourceText` / `GM_getResourceURL`
- [x] 资源单文件上限与安装/更新失败提示
- [x] Android JSON 快照原子写入、`.bak` 回退与 `schemaVersion`

## 0.1.1 — 补丁版本

- [x] README 改为英文主文档并新增 `README_zh.md`
- [x] 文档站部署到 GitHub Pages
- [x] 修正英文外观设置中的内部库名文案
- [x] Windows 安装包与 Android APK 以 `0.1.1` 重新构建

## 0.1.0 — Windows + Android 首个版本

- [x] Lynxtron + CEF 桌面壳
- [x] 共享浏览器 UI
- [x] DuckDB 存储
- [x] 油猴脚本 v1
- [x] Android Sparkling 工程
- [x] Android WebView 引擎适配
- [x] Windows NSIS 安装包验证
- [x] Android APK 验证
- [x] 标签固定、恢复关闭的标签、隐私标签（仅不入历史）
- [x] 地址栏历史/书签补全
- [x] 页内查找、缩放、打印
- [x] 书签栏、书签 HTML 导入导出（桌面）
- [x] 脚本更新检查

## 0.3.0 — 深入与扩展（方向）

- [ ] Android DuckDB NDK/JNI，或明确的长期存储替代方案
- [ ] 完整隐私窗口隔离（独立 CEF request context）
- [ ] 多窗口、标签页溢出管理与标签搜索
- [ ] Windows 代码签名与自动更新
- [ ] 密码管理器、书签/标签同步、广告拦截（按优先级评估）

## 不做

- 云账号体系（首版）
- 遥测
- 内置 AI 浏览功能
