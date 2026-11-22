# Contributing to MaiBrowser

感谢你愿意参与 MaiBrowser。这个项目优先保证本地可复现、可测试，不依赖 CI。

## 开发流程

1. 安装 Bun 1.3+、Node.js 22.18+、Visual Studio 2022 C++ 工具链。
2. `bun install`
3. 修改代码后至少运行：
   - `bun run typecheck`
   - `bun test packages`
   - 涉及桌面壳时运行 `bun run --cwd apps/desktop build`
4. 提交前不要引入 CI 工作流；本项目使用本地测试。
5. 不要提交 `node_modules`、构建产物、DuckDB 数据库或任何密钥。

## 代码约定

- 包管理器只用 Bun，不使用 pnpm/yarn/npm 安装依赖。
- TypeScript 严格模式；尽量保持纯函数在 `packages/core`，存储 SQL 在 `packages/storage`。
- UI 组件放在 `packages/ui`，桌面和 Android 共享；平台差异通过 bridge 抽象。
- 产品标识统一使用 `MaiBrowser` / `maibrowser` / `com.maibrowser`，不要使用单独的 `mai`。
- 用户可见文案同时补齐 `zh-Hans` 和 `en`。
- 油猴脚本兼容性改动需要增加 `packages/userscript/src/index.test.ts` 用例。

## 提交信息

使用简短的英文祈使句，例如：

```
add tab session restore
fix userscript @noframes parsing
```

## 许可证

提交代码即表示你同意以 AGPL-3.0 授权你的贡献。
