---
layout: home

hero:
  name: MaiBrowser
  text: 本地优先的现代浏览器
  tagline: Lynx + ReactLynx 界面，Windows 使用 CEF，Android 使用系统 WebView，DuckDB 存储。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 架构
      link: /guide/architecture

features:
  - title: 一套 UI，两端复用
    details: 标签页、地址栏、历史、书签、下载、设置与脚本管理位于 packages/ui，桌面与 Android 共享。
  - title: 原生油猴脚本
    details: 解析 Tampermonkey 元数据，支持 @match/@include/@exclude 与常用 GM_* / GM.* API。
  - title: DuckDB 存储
    details: Windows 端历史、书签、下载、脚本、脚本值和标签页会话统一存储，默认只在本机。
  - title: Lynx 原生界面
    details: 浏览器外壳使用 Lynx 4.x + ReactLynx + @lynx-js/lynx-ui，而不是 Web 前端。
  - title: Lynx 原生界面
    details: 浏览器外壳使用 Lynx 4.x + ReactLynx + @lynx-js/lynx-ui，而不是 Web 前端。
---
