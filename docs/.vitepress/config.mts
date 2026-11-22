import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'MaiBrowser',
  description: '一个本地优先、跨平台的现代浏览器',
  cleanUrls: true,
  ignoreDeadLinks: ['/LICENSE'],
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '架构', link: '/guide/architecture' },
      { text: '油猴脚本', link: '/guide/userscripts' },
      { text: '路线图', link: '/guide/roadmap' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '架构', link: '/guide/architecture' },
          ],
        },
        {
          text: '深入',
          items: [
            { text: 'DuckDB 存储', link: '/guide/storage' },
            { text: '油猴脚本', link: '/guide/userscripts' },
            { text: 'Android', link: '/guide/android' },
          ],
        },
        {
          text: '项目',
          items: [
            { text: '路线图', link: '/guide/roadmap' },
            { text: '许可证', link: '/guide/license' },
          ],
        },
      ],
    },
    outline: { level: [2, 3] },
    footer: {
      message: '以 AGPL-3.0 发布',
      copyright: 'Copyright © 2026 MaiBrowser contributors',
    },
    docFooter: { prev: '上一页', next: '下一页' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
  },
})
