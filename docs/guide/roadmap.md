# 路线图

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

## 0.2.0 — 浏览器基础能力

目标是把“能浏览”补成“日常可用”。完整分析、工作量和风险见 **[v0.2 升级研究](/guide/v0.2-plan)**。

- [ ] 下载管理器：桌面 CEF 下载事件、Android DownloadManager、暂停/继续/取消、进度与重启恢复
- [ ] 站点权限：摄像头、麦克风、定位、通知、文件选择；允许一次/始终允许/阻止；按站点撤销
- [ ] 证书错误页：默认拒绝，显示域名与错误码
- [ ] Android 对齐：文件选择、书签导入/导出、下载写入
- [ ] 油猴 `@require` / `@resource` 缓存与注入，`GM_download` 接通
- [ ] Android JSON 快照原子写入、版本迁移与损坏回退
- [ ] 版本号统一、CI、校验和、发布文档
- [ ] 隐私标签：若 CEF 请求上下文就绪则实现 Cookie 隔离；否则保持“不记录历史”的诚实文案

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
