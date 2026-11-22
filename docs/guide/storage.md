# DuckDB 存储

数据库文件：`maibrowser.duckdb`，位于应用 `userData` 目录。

## 表

| 表                     | 内容                                                |
| ---------------------- | --------------------------------------------------- |
| `schema_migrations`    | 迁移版本                                            |
| `settings`             | 键值设置，浏览器设置以 `browser.settings` JSON 保存 |
| `windows` / `tabs`     | 窗口与标签页会话                                    |
| `history`              | 访问历史，30 分钟内同 URL 合并 visit_count          |
| `bookmarks`            | 书签与文件夹（parent_id）                           |
| `downloads`            | 下载记录                                            |
| `permissions`          | 站点权限决策                                        |
| `userscripts`          | 脚本源码与元数据                                    |
| `userscript_values`    | 每个脚本的 GM 值                                    |
| `userscript_resources` | 预留的 @resource 内容                               |
| `userscript_runs`      | 预留的运行记录                                      |

## 迁移

`packages/storage/src/index.ts` 的 `MIGRATIONS` 数组按版本执行。新增迁移时：

1. 追加一个新版本；
2. 只写幂等或按版本顺序安全的 SQL；
3. 在 `Store` 中加查询方法；
4. 在主进程 `STORE_METHODS` 白名单中加方法名；
5. 增加测试。

## 主进程桥

UI 使用：

```ts
bridge.call('store:call', { method: 'listHistory', args: [100] })
```

主进程只允许白名单方法。`store:getSettings` / `store:saveSettings` 是便捷方法，分别读写 `browser.settings`。

## Android（0.1.x）

Android 0.1.x 不链接 DuckDB，而是把同一组状态保存在 `filesDir/maibrowser-state.json`：设置、窗口/标签页会话、历史、书签、下载记录、脚本与脚本值。共享 UI 通过 `packages/ui/src/localBridge.ts` 读写快照，原生模块 `MaiBrowserNative` 负责落盘。这样首个版本在没有 NDK 构建链的设备上也能完整离线运行。

DuckDB 的 Android NDK/JNI 构建推迟到 0.3 评估。在它稳定前不引入 SQLite，避免同一产品出现第二套 SQL 方言；迁移到 DuckDB 时需要一次性导入这份 JSON 快照。
