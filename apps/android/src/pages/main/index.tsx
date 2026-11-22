import { root } from '@lynx-js/react'

;(
  globalThis as unknown as { __MAIBROWSER_PLATFORM__?: string }
).__MAIBROWSER_PLATFORM__ = 'android'

import { App } from './App.js'

root.render(<App />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
