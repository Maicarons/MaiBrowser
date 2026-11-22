# 路线图

## 0.1.0 — Windows + Android 首个版本

- [x] Lynxtron + CEF 桌面壳
- [x] 共享浏览器 UI
- [x] DuckDB 存储
- [x] 油猴脚本 v1
- [x] Android Sparkling 工程
- [x] Android WebView 引擎适配
- [ ] Android DuckDB NDK 验证（0.2）
- [x] Windows NSIS 安装包验证
- [x] Android APK 验证
- [x] 标签固定、恢复关闭的标签、隐私标签
- [x] 地址栏历史/书签补全
- [x] 页内查找、缩放、打印
- [x] 书签栏、书签 HTML 导入导出（桌面）
- [x] 脚本更新检查

## 0.1.0 已知限制

- 隐私标签不隔离 Cookie，只保证不写历史与会话。
- 多窗口、下载事件、站点权限与证书错误 UI 未接入。
- Android 端文件导入导出和下载写入暂不可用。
- 脚本在页面加载后注入，不是严格的文档起点。

## P1

- 密码管理器
- 标签页 / 书签同步
- 广告拦截
- 多窗口
- 下载事件接入 CEF
- 脚本 `@require` / `@resource`
- 脚本 `document-start` 真正提前注入

## 不做

- 云账号体系（首版）
- 遥测
- 内置 AI 浏览功能
