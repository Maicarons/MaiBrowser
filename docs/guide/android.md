# Android

Android 端与桌面端共享 `packages/ui`、`packages/core`、`packages/i18n` 和 `packages/userscript`。外壳运行在 Lynx 4.2 / ReactLynx 上，网页由系统 WebView 承载。

## 架构

```
SparklingActivity
  └─ LynxView（共享 UI bundle）
       ├─ 标签页 / 地址栏 / 内部页面
       └─ <webview>（xelement-webview → android.webkit.WebView）
            ├─ PAGE_BOOTSTRAP：标题、URL、pushState 回传
            ├─ 油猴脚本：onLoad 后 eval
            └─ GM_* 消息 → bindmessage → 共享 UI → 原生模块
```

关键点：

- `<webview>` 不在 Lynx 核心 AAR 中，必须依赖 `org.lynxsdk.lynx:xelement-webview`，并把 `BehaviorGenerator.getBehaviors()` 注册到 `SparklingLynxConfig`。
- 页面加载事件通过 `bindload` 进入共享 UI；共享 UI 用 `lynx.createSelectorQuery().invoke({ method: 'eval' })` 注入 `PAGE_BOOTSTRAP` 和匹配的脚本。不要依赖 React ref 的 `invoke`，Android 上该路径不可靠。
- 页面 `window.postMessage('__MB__' + ...)` 通过 `bindmessage` 回到 UI；`GM_setValue`、`GM_xmlhttpRequest` 等桥接沿用桌面端协议。
- 原生模块 `MaiBrowserNative` 提供状态快照、HTTP 文本请求、打开外部链接和剪贴板。共享 UI 的 `localBridge` 在 Android 上调用它。

## 构建

要求：JDK 17、Android SDK、Gradle 8.2。Sparkling 2.0.1 的 `sparkling-navigation` 库仍按 Java 11 编译，Gradle 需要同时找到 JDK 11。

```bash
cd apps/android
bunx rspeedy build
cd android
JAVA_HOME="D:/Program Files/Eclipse Adoptium/jdk-17.0.7.7-hotspot" \
GRADLE_USER_HOME=G:/gradle-home \
./gradlew :app:assembleDebug \
  -Porg.gradle.java.installations.paths=G:/jdk-11.0.22+7
```

APK：`apps/android/android/app/build/outputs/apk/debug/app-debug.apk`

如果 Gradle 与模拟器同时运行导致 JVM 内存不足，把 `apps/android/android/gradle.properties` 的 `org.gradle.jvmargs` 降到 `-Xmx2048m`，或先关闭模拟器再构建。

## 测试

```bash
adb install -r apps/android/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.maibrowser/com.maibrowser.SplashActivity
```

调试页面：打开 `<webview enable-debug>` 后，执行

```bash
adb forward tcp:9222 localabstract:webview_devtools_remote_$(adb shell pidof com.maibrowser)
curl http://127.0.0.1:9222/json
```

即可用 Chrome DevTools Protocol 检查页面标题、DOM 和 `GM_*` 是否注入。

## 存储

Android 使用 `filesDir/maibrowser-state.json` 保存设置、标签页、历史、书签、下载记录、脚本、脚本值和脚本资源。它是共享 UI 本地状态的一份 JSON 快照，保证首个版本可以完整离线使用。0.1.2 起使用临时文件 + `fsync` + 原子 rename，并保留 `.bak` 作为损坏回退。

桌面端使用 DuckDB。Android 的 DuckDB NDK/JNI 构建推迟到 0.3 评估，见 [v0.2 升级研究](/guide/v0.2-plan)；在它稳定前不引入 SQLite，避免同一产品出现第二套 SQL 方言。

## 已知限制

- 油猴脚本在页面 `onLoad` 后注入，`@run-at document-start` 尚未实现真正的文档起点执行。
- 下载通过系统 `DownloadManager` 写入 `Downloads/MaiBrowser/`，支持状态同步与取消；多窗口和站点权限 UI 尚未接入。
- 系统 WebView 的版本由设备决定，最低 Android 7.0（API 24）。
