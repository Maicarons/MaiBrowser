import { createId, now } from '@maibrowser/core'
import type {
  Bookmark,
  DownloadRecord,
  HistoryEntry,
  ScriptResourceRecord,
  TabRecord,
  UserScriptRecord,
} from '@maibrowser/storage'
import type { AppInfo, BrowserSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

interface LocalState {
  settings: BrowserSettings
  tabs: TabRecord[]
  history: HistoryEntry[]
  bookmarks: Bookmark[]
  downloads: DownloadRecord[]
  scripts: UserScriptRecord[]
  values: Record<string, Record<string, string>>
  scriptResources: ScriptResourceRecord[]
  schemaVersion: number
}

interface NativeModule {
  loadState?: (callback: (value: string) => void) => void
  saveState?: (json: string, callback: (value: string) => void) => void
  fetchText?: (url: string, callback: (value: string) => void) => void
  openExternal?: (url: string, callback: (value: string) => void) => void
  writeClipboard?: (text: string) => void
  readClipboard?: (callback: (value: string) => void) => void
  downloadsStart?: (json: string, callback: (value: string) => void) => void
  downloadsSync?: (json: string, callback: (value: string) => void) => void
  downloadsCancel?: (id: string, callback: (value: string) => void) => void
  openDownloadedFile?: (
    uri: string,
    mime: string,
    callback: (value: string) => void,
  ) => void
}

const HISTORY_WINDOW = 30 * 60 * 1000

function initialState(): LocalState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    tabs: [],
    history: [],
    bookmarks: [],
    downloads: [],
    scripts: [],
    values: {},
    scriptResources: [],
    schemaVersion: 1,
  }
}

function platform(): 'android' | 'windows' {
  const scope = globalThis as unknown as { __MAIBROWSER_PLATFORM__?: string }
  return scope.__MAIBROWSER_PLATFORM__ === 'android' ? 'android' : 'windows'
}

declare const NativeModules: Record<string, NativeModule> | undefined

function nativeModule(): NativeModule | null {
  try {
    if (
      typeof NativeModules !== 'undefined' &&
      NativeModules?.MaiBrowserNative
    ) {
      return NativeModules.MaiBrowserNative
    }
  } catch {
    // fall through to the global lookup
  }
  try {
    const modules = (
      globalThis as unknown as { NativeModules?: Record<string, NativeModule> }
    ).NativeModules
    return modules?.MaiBrowserNative ?? null
  } catch {
    return null
  }
}

function callNative<T>(fn: (callback: (value: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Native call timed out')),
      10_000,
    )
    try {
      fn((value) => {
        clearTimeout(timer)
        resolve(value)
      })
    } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
}

function parseNativeResult(value: string): string {
  try {
    const parsed = JSON.parse(value) as {
      ok?: boolean
      data?: string
      error?: string
    }
    if (parsed && typeof parsed === 'object' && 'ok' in parsed) {
      if (!parsed.ok) throw new Error(parsed.error || 'Native request failed')
      return parsed.data ?? ''
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message !== 'Unexpected end of JSON input'
    )
      throw error
  }
  return value
}

function sortHistory(rows: HistoryEntry[]): HistoryEntry[] {
  return [...rows].sort((a, b) => b.visitedAt - a.visitedAt)
}

export function createLocalBridge() {
  const native = nativeModule()
  const scope = globalThis as unknown as {
    __MAIBROWSER_LOCAL_STATE__?: LocalState
  }
  const existing = scope.__MAIBROWSER_LOCAL_STATE__
  let state: LocalState = existing
    ? {
        ...initialState(),
        ...existing,
        scriptResources: existing.scriptResources ?? [],
        schemaVersion: 1,
      }
    : initialState()
  let loading: Promise<void> | null = existing ? Promise.resolve() : null
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let fetchText: ((url: string) => Promise<string>) | null = null

  function ensureState(): Promise<void> {
    if (loading) return loading
    loading = (async () => {
      if (!native?.loadState) return
      try {
        const json = await callNative<string>((callback) =>
          native.loadState?.(callback),
        )
        if (json) {
          const parsed = JSON.parse(json) as Partial<LocalState>
          state = {
            ...initialState(),
            ...parsed,
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
            scriptResources: Array.isArray(parsed.scriptResources)
              ? parsed.scriptResources
              : [],
            schemaVersion: 1,
          }
        }
      } catch {
        // start with an empty state when a previous snapshot is unreadable
      }
      scope.__MAIBROWSER_LOCAL_STATE__ = state
    })()
    return loading
  }

  function persist(): void {
    if (!native?.saveState) return
    if (saveTimer !== null) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      try {
        const json = JSON.stringify(state)
        native.saveState?.(json, () => {})
      } catch {
        // ignore serialization failures
      }
    }, 120)
  }

  async function storeCall<T>(method: string, args: unknown[]): Promise<T> {
    await ensureState()
    switch (method) {
      case 'getSetting':
        return (state.settings as unknown as Record<string, string>)[
          String(args[0])
        ] as T
      case 'setSetting':
        return undefined as T
      case 'listSettings':
        return Object.entries(state.settings).map(([key, value]) => ({
          key,
          value: String(value),
          updatedAt: now(),
        })) as T
      case 'addVisit': {
        const url = String(args[0] ?? '')
        const title = String(args[1] ?? '')
        const source = String(args[2] ?? 'typed')
        const recent = state.history.find(
          (entry) =>
            entry.url === url && entry.visitedAt >= now() - HISTORY_WINDOW,
        )
        if (recent) {
          recent.visitedAt = now()
          recent.visitCount += 1
          recent.title = title
        } else {
          state.history.push({
            id: createId('h_'),
            url,
            title,
            visitedAt: now(),
            visitCount: 1,
            source,
          } as HistoryEntry)
        }
        persist()
        return undefined as T
      }
      case 'listHistory':
        return sortHistory(state.history).slice(0, Number(args[0] ?? 200)) as T
      case 'searchHistory': {
        const query = String(args[0] ?? '')
          .trim()
          .toLowerCase()
        const limit = Number(args[1] ?? 200)
        const rows = query
          ? state.history.filter(
              (entry) =>
                entry.url.toLowerCase().includes(query) ||
                entry.title.toLowerCase().includes(query),
            )
          : state.history
        return sortHistory(rows).slice(0, limit) as T
      }
      case 'deleteHistory':
        state.history = state.history.filter(
          (entry) => entry.id !== String(args[0] ?? ''),
        )
        persist()
        return undefined as T
      case 'clearHistory':
        state.history = []
        persist()
        return undefined as T
      case 'listBookmarks':
        return [...state.bookmarks].sort((a, b) => a.position - b.position) as T
      case 'saveBookmark': {
        const input = (args[0] ?? {}) as Partial<Bookmark>
        const id = input.id ?? createId('b_')
        const current = state.bookmarks.find((bookmark) => bookmark.id === id)
        const record: Bookmark = {
          id,
          parentId: input.parentId ?? null,
          title: String(input.title ?? ''),
          url: String(input.url ?? ''),
          position:
            input.position ?? current?.position ?? state.bookmarks.length,
          createdAt: current?.createdAt ?? now(),
          updatedAt: now(),
        }
        state.bookmarks = state.bookmarks.filter(
          (bookmark) => bookmark.id !== id,
        )
        state.bookmarks.push(record)
        persist()
        return record as T
      }
      case 'deleteBookmark':
        state.bookmarks = state.bookmarks.filter(
          (bookmark) => bookmark.id !== String(args[0] ?? ''),
        )
        persist()
        return undefined as T
      case 'listDownloads':
        return sortedDownloads(Number(args[0] ?? 100)) as T
      case 'saveDownload': {
        const record = args[0] as DownloadRecord
        state.downloads = state.downloads.filter(
          (item) => item.id !== record.id,
        )
        state.downloads.push(record)
        persist()
        return undefined as T
      }
      case 'deleteDownload':
        state.downloads = state.downloads.filter(
          (item) => item.id !== String(args[0] ?? ''),
        )
        persist()
        return undefined as T
      case 'listScripts':
        return [...state.scripts].sort((a, b) =>
          a.name.localeCompare(b.name),
        ) as T
      case 'getScript':
        return (state.scripts.find(
          (script) => script.id === String(args[0] ?? ''),
        ) ?? null) as T
      case 'saveScript': {
        const record = args[0] as UserScriptRecord
        state.scripts = state.scripts.filter(
          (script) => script.id !== record.id,
        )
        state.scripts.push(record)
        persist()
        return undefined as T
      }
      case 'deleteScript': {
        const id = String(args[0] ?? '')
        state.scripts = state.scripts.filter((script) => script.id !== id)
        delete state.values[id]
        state.scriptResources = state.scriptResources.filter(
          (resource) => resource.scriptId !== id,
        )
        persist()
        return undefined as T
      }
      case 'listScriptResources': {
        const scriptId = args[0] === undefined ? undefined : String(args[0])
        const rows = scriptId
          ? state.scriptResources.filter(
              (resource) => resource.scriptId === scriptId,
            )
          : state.scriptResources
        return rows.map((resource) => ({ ...resource })) as T
      }
      case 'saveScriptResources': {
        const input = (args[0] ?? {}) as {
          scriptId?: string
          resources?: ScriptResourceRecord[]
        }
        const scriptId = String(input.scriptId ?? '')
        const resources = Array.isArray(input.resources) ? input.resources : []
        state.scriptResources = state.scriptResources.filter(
          (resource) => resource.scriptId !== scriptId,
        )
        state.scriptResources.push(
          ...resources.map((resource) => ({ ...resource, scriptId })),
        )
        persist()
        return undefined as T
      }
      case 'setScriptEnabled': {
        const script = state.scripts.find(
          (item) => item.id === String(args[0] ?? ''),
        )
        if (script) script.enabled = Boolean(args[1])
        persist()
        return undefined as T
      }
      case 'getScriptValues':
        return { ...(state.values[String(args[0] ?? '')] ?? {}) } as T
      case 'setScriptValue': {
        const id = String(args[0] ?? '')
        const key = String(args[1] ?? '')
        state.values[id] = {
          ...(state.values[id] ?? {}),
          [key]: String(args[2] ?? ''),
        }
        persist()
        return undefined as T
      }
      case 'deleteScriptValue': {
        const id = String(args[0] ?? '')
        const key = String(args[1] ?? '')
        const values = { ...(state.values[id] ?? {}) }
        delete values[key]
        state.values[id] = values
        persist()
        return undefined as T
      }
      case 'saveTabs':
        state.tabs = (args[0] as TabRecord[]) ?? []
        persist()
        return undefined as T
      case 'listTabs':
        return [...state.tabs].sort((a, b) => a.position - b.position) as T
      case 'clearBrowsingData':
        state.history = []
        state.downloads = []
        persist()
        return undefined as T
      default:
        throw new Error(`Local store method is unavailable: ${method}`)
    }
  }

  function sortedDownloads(limit = 100): DownloadRecord[] {
    return [...state.downloads]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
  }

  async function syncDownloads(): Promise<DownloadRecord[]> {
    await ensureState()
    const active = state.downloads.filter(
      (record) =>
        record.id.startsWith('android:') && record.state !== 'completed',
    )
    if (active.length > 0 && native?.downloadsSync) {
      try {
        const raw = await callNative<string>((callback) =>
          native.downloadsSync?.(
            JSON.stringify(active.map((record) => record.id.slice(8))),
            callback,
          ),
        )
        const updates = JSON.parse(raw) as Record<
          string,
          {
            state?: string
            receivedBytes?: number
            totalBytes?: number
            filePath?: string
            mime?: string
            error?: string
          }
        >
        state.downloads = state.downloads.map((record) => {
          if (!record.id.startsWith('android:')) return record
          const update = updates[record.id.slice(8)]
          if (!update) return record
          const next: DownloadRecord = {
            ...record,
            state: update.state ?? record.state,
            receivedBytes: update.receivedBytes ?? record.receivedBytes,
            totalBytes: update.totalBytes ?? record.totalBytes,
            filePath: update.filePath ?? record.filePath,
            mime: update.mime || record.mime,
            error: update.error ?? record.error,
          }
          if (next.state === 'completed' && !next.finishedAt)
            next.finishedAt = Date.now()
          if (next.state === 'failed' && !next.finishedAt)
            next.finishedAt = Date.now()
          return next
        })
        persist()
      } catch {
        // keep the last known state when the system service is unavailable
      }
    }
    return sortedDownloads()
  }

  async function requestText(input: Record<string, unknown>): Promise<string> {
    const url = String(input.url ?? '')
    if (fetchText) return fetchText(url)
    if (native?.fetchText) {
      const result = await callNative<string>((callback) =>
        native.fetchText?.(url, callback),
      )
      return parseNativeResult(result)
    }
    if (typeof fetch !== 'function')
      throw new Error('Networking is unavailable')
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.text()
  }

  return {
    async call<T>(method: string, params?: unknown): Promise<T> {
      const input = (params ?? {}) as Record<string, unknown>
      if (method === 'app:info') {
        const kind = platform()
        return {
          name: 'MaiBrowser',
          version: '0.2.0',
          platform: kind,
          dataPath: '',
          dbPath: '',
          downloadsPath: '',
          engine: kind === 'android' ? 'Android System WebView' : 'Lynxtron',
          versionLabel:
            kind === 'android' ? '0.2.0 · Android' : '0.2.0 · Preview',
        } as AppInfo as T
      }
      if (method === 'app:theme') return 'light' as T
      if (method === 'store:getSettings') {
        await ensureState()
        return { ...state.settings } as T
      }
      if (method === 'store:saveSettings') {
        await ensureState()
        state.settings = {
          ...state.settings,
          ...((input.settings ?? {}) as BrowserSettings),
        }
        persist()
        return true as T
      }
      if (method === 'store:call') {
        return storeCall<T>(
          String(input.method ?? ''),
          Array.isArray(input.args) ? input.args : [],
        )
      }
      if (method === 'downloads:start') {
        await ensureState()
        if (!native?.downloadsStart) {
          throw new Error('Downloads are unavailable on this platform')
        }
        const url = String(input.url ?? '')
        if (!/^https?:\/\//i.test(url)) {
          throw new Error('Only http(s) download URLs are supported')
        }
        const raw = await callNative<string>((callback) =>
          native.downloadsStart?.(
            JSON.stringify({
              url,
              fileName: String(input.fileName ?? ''),
              mime: String(input.mime ?? ''),
            }),
            callback,
          ),
        )
        const result = JSON.parse(raw) as {
          ok?: boolean
          id?: string
          fileName?: string
          error?: string
        }
        if (!result.ok || !result.id) {
          throw new Error(result.error || 'Download could not be started')
        }
        const record: DownloadRecord = {
          id: `android:${result.id}`,
          url,
          fileName: result.fileName || `download-${Date.now()}.bin`,
          filePath: '',
          mime: String(input.mime ?? ''),
          totalBytes: 0,
          receivedBytes: 0,
          state: 'downloading',
          startedAt: Date.now(),
          finishedAt: null,
          error: '',
        }
        state.downloads = [
          record,
          ...state.downloads.filter((item) => item.id !== record.id),
        ]
        persist()
        return record as T
      }
      if (method === 'downloads:sync' || method === 'downloads:list') {
        return (await syncDownloads()) as T
      }
      if (method === 'downloads:pause' || method === 'downloads:resume') {
        throw new Error('Pause and resume are not available on Android')
      }
      if (method === 'downloads:cancel') {
        await ensureState()
        const id = String(input.id ?? '')
        const nativeId = id.replace(/^android:/, '')
        if (native?.downloadsCancel) {
          await callNative<string>((callback) =>
            native.downloadsCancel?.(nativeId, callback),
          )
        }
        state.downloads = state.downloads.map((record) =>
          record.id === id
            ? {
                ...record,
                state: 'cancelled',
                finishedAt: Date.now(),
                error: '',
              }
            : record,
        )
        persist()
        return (state.downloads.find((record) => record.id === id) ?? null) as T
      }
      if (method === 'net:fetchText') {
        return (await requestText(input)) as T
      }
      if (method === 'net:xhr') {
        const text = await requestText(input)
        return {
          status: 200,
          statusText: 'OK',
          responseText: text,
          finalUrl: String(input.url ?? ''),
        } as T
      }
      if (method === 'shell:openExternal') {
        const url = String(input.url ?? '')
        if (native?.openExternal) {
          await callNative<string>((callback) =>
            native.openExternal?.(url, callback),
          )
          return true as T
        }
        return true as T
      }
      if (method === 'shell:openPath') {
        const target = String(input.path ?? '')
        if (target && native?.openDownloadedFile) {
          await callNative<string>((callback) =>
            native.openDownloadedFile?.(target, '', callback),
          )
        }
        return true as T
      }
      if (method === 'shell:showItemInFolder') return true as T
      if (method === 'clipboard:writeText') {
        native?.writeClipboard?.(String(input.text ?? ''))
        return true as T
      }
      if (method === 'clipboard:readText') {
        if (native?.readClipboard) {
          return (await callNative<string>((callback) =>
            native.readClipboard?.(callback),
          )) as T
        }
        return '' as T
      }
      if (method === 'dialog:message') return true as T
      if (method.startsWith('window:')) return true as T
      if (method === 'downloads:openFolder') return '' as T
      throw new Error(`Local bridge method is unavailable: ${method}`)
    },
    setFetchText(provider: ((url: string) => Promise<string>) | null) {
      fetchText = provider
    },
  }
}
