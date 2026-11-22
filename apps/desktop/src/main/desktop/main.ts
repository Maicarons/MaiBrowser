import fs from 'node:fs'
import path from 'node:path'
import cefWebview from '@lynx-js/cef-webview/lynxtron'
import { app, clipboard, dialog, LynxWindow, shell } from '@lynx-js/lynxtron'
import { openStore } from './duckdb'
import { LYNX_BUNDLE_PATH } from './vendorPaths'

const isDev = process.env.NODE_ENV === 'development'
const APP_NAME = 'MaiBrowser'
const USER_AGENT = 'MaiBrowser/0.1.1 (+https://github.com/Maicarons/MaiBrowser)'
const MAX_TEXT_BYTES = 2 * 1024 * 1024

interface AppPaths {
  data: string
  database: string
  downloads: string
}

interface RpcRequest {
  method?: string
  params?: Record<string, unknown>
  args?: unknown[]
}

interface RpcEnvelope {
  ok: boolean
  data?: unknown
  error?: string
}

const STORE_METHODS = new Set([
  'getSetting',
  'setSetting',
  'listSettings',
  'addVisit',
  'listHistory',
  'searchHistory',
  'deleteHistory',
  'clearHistory',
  'listBookmarks',
  'saveBookmark',
  'deleteBookmark',
  'listDownloads',
  'saveDownload',
  'deleteDownload',
  'listScripts',
  'getScript',
  'saveScript',
  'deleteScript',
  'setScriptEnabled',
  'getScriptValues',
  'setScriptValue',
  'deleteScriptValue',
  'saveTabs',
  'listTabs',
  'clearBrowsingData',
])

function systemTheme(): 'light' | 'dark' {
  return 'light'
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function envelope(data: unknown): string {
  const reply: RpcEnvelope = { ok: true, data }
  return JSON.stringify(reply)
}

function failure(error: unknown): string {
  const reply: RpcEnvelope = { ok: false, error: safeError(error) }
  return JSON.stringify(reply)
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function fetchText(url: string): Promise<string> {
  if (!isHttpUrl(url)) throw new Error('Only http(s) URLs are supported')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/plain, text/javascript, */*',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    const text = await response.text()
    if (Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES) {
      throw new Error('Response is larger than 2 MB')
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    return text
  } finally {
    clearTimeout(timer)
  }
}

async function xhr(
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = String(params.url ?? '')
  if (!isHttpUrl(url)) {
    return {
      error: 'Only http(s) URLs are supported',
      status: 0,
      responseText: '',
    }
  }
  const method = String(params.method ?? 'GET').toUpperCase()
  const headers = (params.headers ?? {}) as Record<string, string>
  const body = params.data == null ? undefined : String(params.data)
  const timeout = Number(params.timeout ?? 25_000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeout))
  try {
    const response = await fetch(url, {
      method,
      headers: { 'user-agent': USER_AGENT, ...headers },
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
      redirect: 'follow',
      signal: controller.signal,
    })
    const text = await response.text()
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    return {
      status: response.status,
      statusText: response.statusText,
      responseText: text,
      responseHeaders,
      finalUrl: response.url,
    }
  } catch (error) {
    return { error: safeError(error), status: 0, responseText: '' }
  } finally {
    clearTimeout(timer)
  }
}

async function start(): Promise<void> {
  const data = app.getPath('userData')
  const downloads = path.join(app.getPath('downloads'), APP_NAME)
  const database = path.join(data, 'maibrowser.duckdb')
  const paths: AppPaths = { data, database, downloads }

  app.setName(APP_NAME)
  app.setAppUserModelId('com.maibrowser')
  cefWebview.initialize()
  const store = await openStore(paths)

  const win = new LynxWindow({
    width: 1320,
    height: 860,
    minWidth: 920,
    minHeight: 600,
    frame: false,
    title: APP_NAME,
    backgroundColor: '#0a0f13',
    show: false,
    lynxPreference: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.setTitle(APP_NAME)

  const rpc = async (request: RpcRequest): Promise<unknown> => {
    const method = request.method ?? ''
    const params = request.params ?? {}
    if (method === 'app:info') {
      return {
        name: APP_NAME,
        version: app.getVersion(),
        platform: 'windows',
        dataPath: paths.data,
        dbPath: paths.database,
        downloadsPath: paths.downloads,
        engine: 'Lynxtron + CEF',
        versionLabel: `${app.getVersion()} · Windows`,
      }
    }
    if (method === 'app:theme') return systemTheme()
    if (method === 'store:getSettings') {
      const raw = await store.getSetting('browser.settings', '{}')
      try {
        return JSON.parse(raw) as Record<string, unknown>
      } catch {
        return {}
      }
    }
    if (method === 'store:saveSettings') {
      await store.setSetting(
        'browser.settings',
        JSON.stringify(params.settings ?? {}),
      )
      return true
    }
    if (method === 'store:call') {
      const storeMethod = String(params.method ?? '')
      const args = Array.isArray(params.args) ? params.args : []
      if (!STORE_METHODS.has(storeMethod)) {
        throw new Error(`Unknown store method: ${storeMethod}`)
      }
      const fn = (
        store as unknown as Record<string, (...values: unknown[]) => unknown>
      )[storeMethod]
      if (typeof fn !== 'function')
        throw new Error(`Store method is unavailable: ${storeMethod}`)
      return await fn.apply(store, args)
    }
    if (method === 'net:fetchText') {
      return fetchText(String(params.url ?? ''))
    }
    if (method === 'net:xhr') {
      return xhr(params)
    }
    if (method === 'shell:openExternal') {
      const url = String(params.url ?? '')
      if (!isHttpUrl(url) && !url.startsWith('mailto:')) {
        throw new Error('Unsupported external URL')
      }
      await shell.openExternal(url)
      return true
    }
    if (method === 'shell:openPath') {
      const target = String(params.path ?? '')
      if (!target) throw new Error('Missing path')
      return shell.openPath(target)
    }
    if (method === 'shell:showItemInFolder') {
      const target = String(params.path ?? '')
      if (!target) throw new Error('Missing path')
      shell.showItemInFolder(target)
      return true
    }
    if (method === 'bookmarks:export') {
      const html = String(params.html ?? '')
      if (Buffer.byteLength(html, 'utf8') > 20 * 1024 * 1024) {
        throw new Error('Bookmark export is larger than 20 MB')
      }
      const result = await dialog.showSaveDialog({
        title: 'Export bookmarks',
        defaultPath: path.join(
          app.getPath('downloads'),
          'MaiBrowser-bookmarks.html',
        ),
        filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
      })
      if (result.canceled || !result.filePath) return null
      await fs.promises.writeFile(result.filePath, html, 'utf8')
      return result.filePath
    }
    if (method === 'bookmarks:import') {
      const result = await dialog.showOpenDialog({
        title: 'Import bookmarks',
        properties: ['openFile'],
        filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      const file = result.filePaths[0]
      const stat = await fs.promises.stat(file)
      if (stat.size > 10 * 1024 * 1024)
        throw new Error('Bookmark file is larger than 10 MB')
      return await fs.promises.readFile(file, 'utf8')
    }
    if (method === 'clipboard:readText') {
      return clipboard.readText()
    }
    if (method === 'clipboard:writeText') {
      clipboard.writeText(String(params.text ?? ''))
      return true
    }
    if (method === 'dialog:message') {
      await dialog.showMessageBox({
        type: 'info',
        title: APP_NAME,
        message: String(params.message ?? ''),
        detail: params.detail ? String(params.detail) : undefined,
      })
      return true
    }
    if (method === 'window:minimize') {
      win.minimize()
      return true
    }
    if (method === 'window:toggleMaximize') {
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
      return true
    }
    if (method === 'window:close') {
      win.close()
      return true
    }
    if (method === 'downloads:openFolder') {
      return shell.openPath(paths.downloads)
    }
    throw new Error(`Unknown RPC method: ${method}`)
  }

  win.on('-lynx-invoke', async (event, methodName, data) => {
    if (methodName !== 'rpc') {
      event.sendReply(failure(new Error(`Unknown bridge call: ${methodName}`)))
      return
    }
    try {
      const request = (data ?? {}) as RpcRequest
      event.sendReply(envelope(await rpc(request)))
    } catch (error) {
      console.error('[MaiBrowser] RPC failed:', error)
      event.sendReply(failure(error))
    }
  })

  win.show()
  win.on(
    '--lynx-error' as never,
    ((...args: unknown[]) => {
      console.error('[MaiBrowser Lynx error]', ...args)
    }) as never,
  )
  if (isDev) {
    win.loadURL('http://localhost:5969/main.lynx.bundle')
  } else {
    win.loadFile(LYNX_BUNDLE_PATH)
  }
}

app.whenReady().then(() => {
  start().catch((error) => {
    console.error('[MaiBrowser] startup failed', error)
    dialog.showErrorBox(
      `${APP_NAME} could not start`,
      `${safeError(error)}\n\nMaiBrowser could not start its local engine.`,
    )
    app.quit()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
