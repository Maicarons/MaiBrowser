# 快速开始

## 环境要求

- Windows 10/11 x64（当前桌面端）
- Bun 1.3+
- Node.js 22.18+
- Visual Studio 2022 C++ 工具链
- Android 构建额外需要 JDK 17、Android SDK/NDK

## 安装

```bash
git clone <private-repository-url> MaiBrowser
cd MaiBrowser
bun install
```

Lynxtron 和 CEF 的原生包首次安装会下载运行时。如果脚本被跳过，可手动执行：

```bash
cd node_modules/.bun/@lynx-js+lynxtron@*/node_modules/@lynx-js/lynxtron
node install.js
cd ../../../../@lynx-js+cef-webview@*/node_modules/@lynx-js/cef-webview
node scripts/install.js
```

网络受限时，可设置：

```bash
npm_config_custom_cef_webview_binary_url="<mirror>/cef_webview-v0.0.31-win32-x64.zip" node scripts/install.js
```

## 开发

```bash
bun run dev
```

该命令同时启动 Lynx bundle 开发服务器和 Lynxtron 桌面宿主。

## 构建

```bash
bun run typecheck
bun run test
bun run build
bun run --cwd apps/desktop start
bun run --cwd apps/desktop pack
```

`pack` 使用 `lynxtron-builder` 生成 NSIS 安装包。Android 构建见 [Android](./android.md)。

## 测试清单

```bash
bun run typecheck     # 共享 UI、主进程、DuckDB 适配层
bun run test          # core / i18n / userscript / localBridge / DuckDB
bun run lint          # Biome
bun run docs:build    # VitePress
```

## 数据目录

- Windows 数据库：`%APPDATA%/@maibrowser/desktop/maibrowser.duckdb`
- Windows 下载：系统下载目录下的 `MaiBrowser/`
- Android 状态：应用私有目录 `files/maibrowser-state.json`
- Android 下载：系统下载目录（0.1.x 仅记录元数据）

Windows 数据库使用 DuckDB，不使用 SQLite。删除数据库会同时删除历史、书签、脚本和会话。Android 0.1.x 使用 JSON 快照；DuckDB 迁移推迟到 0.3 评估，见 [v0.2 升级研究](/guide/v0.2-plan)。
