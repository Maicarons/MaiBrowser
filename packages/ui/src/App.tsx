import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from '@lynx-js/react'
import type { Locale, Tab } from '@maibrowser/core'
import {
  buildAddressSuggestions,
  buildBookmarksHtml,
  createId,
  DEFAULT_SEARCH_ENGINE,
  displayUrl,
  internalRoute,
  isInternalUrl,
  newTab,
  normalizeNavigationInput,
  parseBookmarksHtml,
  SEARCH_ENGINES,
  securityState,
  setTabPinned,
} from '@maibrowser/core'
import { createTranslator } from '@maibrowser/i18n'
import type {
  Bookmark,
  HistoryEntry,
  ScriptResourceRecord,
  TabRecord,
} from '@maibrowser/storage'
import type { UserScript, UserScriptMeta } from '@maibrowser/userscript'
import { buildInjection, parseMetadata } from '@maibrowser/userscript'
import { createBridge } from './bridge'
import type { MenuAction } from './Chrome'
import {
  AddressSuggestions,
  AppMenu,
  BookmarkBar,
  FindBar,
  StatusBar,
  TabStrip,
  TitleBar,
  Toolbar,
} from './Chrome'
import { MotionView } from './motion'
import { InternalPage } from './pages'
import { PrimaryButton } from './primitives'
import { themeFor } from './theme'
import type {
  AppInfo,
  BrowserSettings,
  DownloadItem,
  DownloadStartRequest,
  ScriptItem,
} from './types'
import { DEFAULT_SETTINGS } from './types'
import { PAGE_BOOTSTRAP, WebPanel } from './WebPanel'
import './styles.css'

interface UiTab extends Tab {
  navId: number
  error?: string
  private?: boolean
  zoom?: number
}

function toRecord(tab: UiTab, index: number): TabRecord {
  return {
    id: tab.id,
    windowId: 'main',
    url: tab.url,
    title: tab.title,
    favicon: tab.favicon ?? '',
    pinned: tab.pinned,
    muted: tab.muted,
    position: index,
    kind: tab.kind,
    internalRoute: tab.internalRoute ?? null,
    updatedAt: Date.now(),
  }
}

function fromRecord(record: TabRecord): UiTab {
  return {
    id: record.id,
    url: record.url,
    title: record.title,
    loading: false,
    canGoBack: false,
    canGoForward: false,
    muted: record.muted,
    pinned: record.pinned,
    kind: record.kind,
    internalRoute:
      record.kind === 'internal'
        ? (record.internalRoute ?? internalRoute(record.url))
        : undefined,
    favicon: record.favicon,
    navId: 0,
    private: false,
  }
}

function initialTab(privateMode = false): UiTab {
  return { ...newTab(createId('t_')), navId: 1, private: privateMode }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function LoadingScreen(props: {
  theme: ReturnType<typeof themeFor>
  label: string
}) {
  return (
    <view className="app-root" style={{ backgroundColor: props.theme.bg }}>
      <view className="loading-screen">
        <text className="loading-text" style={{ color: props.theme.textMuted }}>
          {props.label}
        </text>
      </view>
    </view>
  )
}

function ErrorOverlay(props: {
  theme: ReturnType<typeof themeFor>
  title: string
  message: string
  retryLabel: string
  backLabel: string
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <view
      className="internal-layer"
      style={{ backgroundColor: props.theme.bg }}
    >
      <view className="page" style={{ backgroundColor: props.theme.bg }}>
        <view className="hero">
          <view
            className="hero-mark"
            style={{ backgroundColor: props.theme.dangerSoft }}
          >
            <text
              className="hero-mark-text"
              style={{ color: props.theme.danger }}
            >
              !
            </text>
          </view>
          <text className="hero-title" style={{ color: props.theme.text }}>
            {props.title}
          </text>
          <text className="hero-sub" style={{ color: props.theme.textMuted }}>
            {props.message}
          </text>
          <view className="hero-search" style={{ justifyContent: 'center' }}>
            <PrimaryButton
              label={props.backLabel}
              theme={props.theme}
              kind="ghost"
              onTap={props.onBack}
            />
            <view style={{ width: '8px' }} />
            <PrimaryButton
              label={props.retryLabel}
              theme={props.theme}
              onTap={props.onRetry}
            />
          </view>
        </view>
      </view>
    </view>
  )
}

export function App() {
  const bridge = useMemo(() => createBridge(), [])
  const [settings, setSettings] = useState<BrowserSettings>(DEFAULT_SETTINGS)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')
  const [tabs, setTabs] = useState<UiTab[]>([initialTab()])
  const [activeId, setActiveId] = useState(tabs[0].id)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [scripts, setScripts] = useState<ScriptItem[]>([])
  const [scriptValues, setScriptValues] = useState<
    Record<string, Record<string, string>>
  >({})
  const [scriptResources, setScriptResources] = useState<
    ScriptResourceRecord[]
  >([])
  const [address, setAddress] = useState('')
  const [addressFocused, setAddressFocused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [booting, setBooting] = useState(true)
  const [bootError, setBootError] = useState('')
  const [bootAttempt, setBootAttempt] = useState(0)
  const [ready, setReady] = useState(false)
  const [closedCount, setClosedCount] = useState(0)
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')

  const settingsRef = useRef(settings)
  const closedTabsRef = useRef<Array<{ tab: UiTab; index: number }>>([])
  const tabsRef = useRef(tabs)
  const activeIdRef = useRef(activeId)
  const scriptsRef = useRef(scripts)
  const scriptValuesRef = useRef(scriptValues)
  const scriptResourcesRef = useRef(scriptResources)
  const visitedRef = useRef<Record<string, string>>({})
  const toastTimer = useRef<number | null>(null)

  settingsRef.current = settings
  tabsRef.current = tabs
  activeIdRef.current = activeId
  scriptsRef.current = scripts
  scriptValuesRef.current = scriptValues
  scriptResourcesRef.current = scriptResources

  const storeCall = useCallback(
    function call<T>(method: string, ...args: unknown[]): Promise<T> {
      return bridge.call<T>('store:call', { method, args })
    },
    [bridge],
  )

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(
      () => setToast(''),
      2600,
    ) as unknown as number
  }, [])

  const translator = useMemo(
    () => createTranslator(settings.locale),
    [settings.locale],
  )
  const t = translator.t

  const syncAddress = useCallback((value: string) => {
    setAddress(value)
  }, [])

  const invokeWebview = useCallback(
    (tabId: string, method: string, params?: Record<string, unknown>) => {
      try {
        lynx
          .createSelectorQuery()
          .select(`#webview-${tabId}`)
          .invoke({ method, params, success: () => {}, fail: () => {} })
          .exec()
      } catch {
        // the webview is not mounted yet
      }
    },
    [],
  )

  const evalInWebview = useCallback(
    (tabId: string, code: string) => {
      if (!code) return
      invokeWebview(tabId, 'eval', { func: code })
    },
    [invokeWebview],
  )

  const refreshHistory = useCallback(
    async (query?: string) => {
      const rows = query
        ? await storeCall<HistoryEntry[]>('searchHistory', query, 200)
        : await storeCall<HistoryEntry[]>('listHistory', 200)
      setHistory(rows)
    },
    [storeCall],
  )

  const refreshBookmarks = useCallback(async () => {
    setBookmarks(await storeCall<Bookmark[]>('listBookmarks'))
  }, [storeCall])

  const refreshDownloads = useCallback(async () => {
    const rows = await bridge
      .call<DownloadItem[]>('downloads:sync')
      .catch(() => storeCall<DownloadItem[]>('listDownloads', 100))
    setDownloads(rows)
  }, [bridge, storeCall])

  const startDownload = useCallback(
    async (request: DownloadStartRequest): Promise<DownloadItem | null> => {
      try {
        const item = await bridge.call<DownloadItem>('downloads:start', {
          url: request.url,
          fileName: request.fileName ?? '',
          mime: request.mime ?? '',
          referrer: request.referrer ?? '',
        })
        setDownloads((current) => [
          item,
          ...current.filter((row) => row.id !== item.id),
        ])
        notify(t('downloads.started'))
        return item
      } catch (error) {
        notify(errorMessage(error))
        return null
      }
    },
    [bridge, notify, t],
  )

  const pauseDownload = useCallback(
    (item: DownloadItem) => {
      void bridge
        .call('downloads:pause', { id: item.id })
        .then(() => refreshDownloads())
        .catch((error) => notify(errorMessage(error)))
    },
    [bridge, notify, refreshDownloads],
  )

  const resumeDownload = useCallback(
    (item: DownloadItem) => {
      void bridge
        .call('downloads:resume', { id: item.id })
        .then(() => refreshDownloads())
        .catch((error) => notify(errorMessage(error)))
    },
    [bridge, notify, refreshDownloads],
  )

  const cancelDownload = useCallback(
    (item: DownloadItem) => {
      void bridge
        .call('downloads:cancel', { id: item.id })
        .then(() => {
          notify(t('downloads.cancelledNotice'))
          return refreshDownloads()
        })
        .catch((error) => notify(errorMessage(error)))
    },
    [bridge, notify, refreshDownloads, t],
  )

  const retryDownload = useCallback(
    (item: DownloadItem) => {
      void startDownload({
        url: item.url,
        fileName: item.fileName,
        mime: item.mime,
      })
    },
    [startDownload],
  )

  const fetchScriptResources = useCallback(
    async (
      meta: UserScriptMeta,
      scriptId = meta.id,
    ): Promise<ScriptResourceRecord[]> => {
      const rows = new Map<string, ScriptResourceRecord>()
      const fetchOne = async (
        url: string,
        name: string,
        mime: string,
      ): Promise<void> => {
        if (!/^https?:\/\//i.test(url)) return
        const content = await bridge.call<string>('net:fetchText', { url })
        if (content.length > 2 * 1024 * 1024)
          throw new Error(`Script resource is too large: ${url}`)
        rows.set(name, { scriptId, name, mime, content })
      }
      await Promise.all([
        ...meta.require.map((url) =>
          fetchOne(url, `require:${url}`, 'application/javascript'),
        ),
        ...meta.resource.map((resource) =>
          fetchOne(resource.url, `resource:${resource.name}`, 'text/plain'),
        ),
      ])
      return [...rows.values()]
    },
    [bridge],
  )

  const ensureScriptResources = useCallback(
    async (records: ScriptItem[], cached: ScriptResourceRecord[]) => {
      const pending: Array<{ script: ScriptItem; meta: UserScriptMeta }> = []
      for (const script of records) {
        if (!script.enabled) continue
        const meta = parseMetadata(script.source, settingsRef.current.locale)
        if (!meta) continue
        const have = new Set(
          cached
            .filter((resource) => resource.scriptId === script.id)
            .map((resource) => resource.name),
        )
        const expected = [
          ...meta.require
            .filter((url) => /^https?:\/\//i.test(url))
            .map((url) => `require:${url}`),
          ...meta.resource
            .filter((resource) => /^https?:\/\//i.test(resource.url))
            .map((resource) => `resource:${resource.name}`),
        ]
        if (expected.length > 0 && !expected.every((name) => have.has(name))) {
          pending.push({ script, meta })
        }
      }
      if (pending.length === 0) return
      let next = cached
      for (const { script, meta } of pending) {
        try {
          const resources = await fetchScriptResources(meta, script.id)
          await storeCall('saveScriptResources', {
            scriptId: script.id,
            resources,
          })
          next = [
            ...next.filter((resource) => resource.scriptId !== script.id),
            ...resources,
          ]
        } catch {}
      }
      setScriptResources(next)
    },
    [fetchScriptResources, storeCall],
  )

  const loadScriptValues = useCallback(
    async (records: ScriptItem[]) => {
      const entries = await Promise.all(
        records.map(async (script) => {
          try {
            const values = await storeCall<Record<string, string>>(
              'getScriptValues',
              script.id,
            )
            return [script.id, values] as const
          } catch {
            return [script.id, {}] as const
          }
        }),
      )
      setScriptValues(Object.fromEntries(entries))
    },
    [storeCall],
  )

  const refreshScripts = useCallback(async () => {
    const [records, resources] = await Promise.all([
      storeCall<ScriptItem[]>('listScripts'),
      storeCall<ScriptResourceRecord[]>('listScriptResources'),
    ])
    setScripts(records)
    setScriptResources(resources)
    await loadScriptValues(records)
    await ensureScriptResources(records, resources)
  }, [ensureScriptResources, loadScriptValues, storeCall])

  const refreshAll = useCallback(async () => {
    const [
      nextHistory,
      nextBookmarks,
      nextDownloads,
      nextScripts,
      nextResources,
    ] = await Promise.all([
      storeCall<HistoryEntry[]>('listHistory', 200),
      storeCall<Bookmark[]>('listBookmarks'),
      storeCall<DownloadItem[]>('listDownloads', 100),
      storeCall<ScriptItem[]>('listScripts'),
      storeCall<ScriptResourceRecord[]>('listScriptResources'),
    ])
    setHistory(nextHistory)
    setBookmarks(nextBookmarks)
    setDownloads(nextDownloads)
    setScripts(nextScripts)
    setScriptResources(nextResources)
    await loadScriptValues(nextScripts)
    await ensureScriptResources(nextScripts, nextResources)
  }, [ensureScriptResources, loadScriptValues, storeCall])

  useEffect(() => {
    let alive = true
    setBooting(true)
    setBootError('')
    ;(async () => {
      try {
        const [
          info,
          storedSettings,
          savedTabs,
          historyRows,
          bookmarkRows,
          downloadRows,
          scriptRows,
          scriptResourceRows,
          theme,
        ] = await Promise.all([
          bridge.call<AppInfo>('app:info'),
          bridge.call<Partial<BrowserSettings> | null>('store:getSettings'),
          storeCall<TabRecord[]>('listTabs'),
          storeCall<HistoryEntry[]>('listHistory', 200),
          storeCall<Bookmark[]>('listBookmarks'),
          storeCall<DownloadItem[]>('listDownloads', 100),
          storeCall<ScriptItem[]>('listScripts'),
          storeCall<ScriptResourceRecord[]>('listScriptResources'),
          bridge.call<'light' | 'dark'>('app:theme'),
        ])
        if (!alive) return
        const merged: BrowserSettings = {
          ...DEFAULT_SETTINGS,
          ...(storedSettings ?? {}),
        }
        if (!merged.downloadDir && info.downloadsPath)
          merged.downloadDir = info.downloadsPath
        const restored = savedTabs
          .filter((record) => record.url)
          .map(fromRecord)
        const nextTabs =
          merged.restoreTabs && restored.length > 0 ? restored : [initialTab()]
        setAppInfo(info)
        setSystemTheme(theme === 'dark' ? 'dark' : 'light')
        setSettings(merged)
        settingsRef.current = merged
        const valueEntries = await Promise.all(
          scriptRows.map(async (script) => {
            try {
              return [
                script.id,
                await storeCall<Record<string, string>>(
                  'getScriptValues',
                  script.id,
                ),
              ] as const
            } catch {
              return [script.id, {}] as const
            }
          }),
        )
        if (!alive) return
        setHistory(historyRows)
        setBookmarks(bookmarkRows)
        setDownloads(downloadRows)
        setScripts(scriptRows)
        setScriptResources(scriptResourceRows)
        setScriptValues(Object.fromEntries(valueEntries))
        setTabs(nextTabs)
        setActiveId(nextTabs[0].id)
        syncAddress(displayUrl(nextTabs[0].url))
        setReady(true)
        void bridge
          .call('store:saveSettings', { settings: merged })
          .catch(() => {})
      } catch (error) {
        if (alive) setBootError(errorMessage(error))
      } finally {
        if (alive) setBooting(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [bridge, bootAttempt, storeCall, syncAddress])

  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      const records = tabsRef.current
        .filter((tab) => !tab.private)
        .map(toRecord)
      void storeCall('saveTabs', records).catch(() => {})
    }, 600)
    return () => clearTimeout(timer)
  }, [tabs, ready, storeCall])

  const updateTab = useCallback((id: string, patch: Partial<UiTab>) => {
    setTabs((previous) =>
      previous.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)),
    )
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<BrowserSettings>) => {
      const next = { ...settingsRef.current, ...patch }
      settingsRef.current = next
      setSettings(next)
      void bridge.call('store:saveSettings', { settings: next }).catch(() => {})
    },
    [bridge],
  )

  const themeMode = settings.theme === 'system' ? systemTheme : settings.theme
  const theme = useMemo(
    () => themeFor(themeMode, settings.accent),
    [settings.accent, themeMode],
  )
  const searchEngine =
    SEARCH_ENGINES.find((engine) => engine.id === settings.searchEngineId) ??
    DEFAULT_SEARCH_ENGINE
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0]

  useEffect(() => {
    if (activeTab?.internalRoute !== 'downloads') return
    const active = downloads.some(
      (item) =>
        item.state === 'downloading' ||
        item.state === 'queued' ||
        item.state === 'paused',
    )
    if (!active) return
    const timer = setInterval(() => {
      void refreshDownloads().catch(() => undefined)
    }, 1000)
    return () => clearInterval(timer)
  }, [activeTab?.internalRoute, downloads, refreshDownloads])
  const webTabs = tabs.filter(
    (tab) => tab.kind === 'web' && tab.url && !isInternalUrl(tab.url),
  )
  const suggestions = useMemo(
    () =>
      addressFocused || address.trim() !== displayUrl(activeTab?.url ?? '')
        ? buildAddressSuggestions(
            address,
            searchEngine.template,
            searchEngine.name,
            history,
            bookmarks,
            5,
          )
        : [],
    [address, addressFocused, bookmarks, history, searchEngine],
  )
  const bookmarkBarItems = bookmarks
    .filter((bookmark) => bookmark.url && !bookmark.parentId)
    .slice(0, 24)

  useEffect(() => {
    if (addressFocused) return
    syncAddress(displayUrl(activeTab?.url ?? ''))
  }, [activeId, activeTab?.url, addressFocused])

  const createTab = useCallback(
    (input?: string, options?: { private?: boolean }) => {
      const id = createId('t_')
      const raw = input?.trim() ?? ''
      let tab: UiTab
      if (raw) {
        const target = isInternalUrl(raw)
          ? raw
          : normalizeNavigationInput(raw, searchEngine.template)
        const internal = isInternalUrl(target)
        tab = {
          id,
          url: target,
          title: '',
          loading: !internal,
          canGoBack: false,
          canGoForward: false,
          muted: false,
          pinned: false,
          kind: internal ? 'internal' : 'web',
          internalRoute: internal ? internalRoute(target) : undefined,
          navId: 1,
          private: options?.private ?? false,
        }
      } else {
        tab = initialTab(options?.private ?? false)
        tab.id = id
      }
      tabsRef.current = [...tabsRef.current, tab]
      setTabs(tabsRef.current)
      activeIdRef.current = id
      setActiveId(id)
      syncAddress(displayUrl(tab.url))
      setAddressFocused(false)
      return id
    },
    [searchEngine.template],
  )

  const closeTab = useCallback((id: string) => {
    const current = tabsRef.current
    const index = current.findIndex((tab) => tab.id === id)
    if (index < 0) return
    const closed = current[index]
    closedTabsRef.current = [
      ...closedTabsRef.current.slice(-19),
      { tab: closed, index },
    ]
    setClosedCount(closedTabsRef.current.length)
    const next = current.filter((tab) => tab.id !== id)
    if (next.length === 0) {
      const tab = initialTab(closed.private)
      tabsRef.current = [tab]
      activeIdRef.current = tab.id
      setTabs([tab])
      setActiveId(tab.id)
      syncAddress(displayUrl(tab.url))
      return
    }
    tabsRef.current = next
    setTabs(next)
    if (activeIdRef.current === id) {
      const pick = next[Math.max(0, index - 1)] ?? next[0]
      activeIdRef.current = pick.id
      setActiveId(pick.id)
      syncAddress(displayUrl(pick.url))
    }
  }, [])

  const activateTab = useCallback((id: string) => {
    const tab = tabsRef.current.find((item) => item.id === id)
    if (!tab) return
    activeIdRef.current = id
    setActiveId(id)
    syncAddress(displayUrl(tab.url))
    setAddressFocused(false)
    setMenuOpen(false)
    setFindOpen(false)
  }, [])

  const restoreClosedTab = useCallback(() => {
    const entry = closedTabsRef.current.pop()
    setClosedCount(closedTabsRef.current.length)
    if (!entry) return
    const current = tabsRef.current
    const tab: UiTab = {
      ...entry.tab,
      id: createId('t_'),
      navId: (entry.tab.navId ?? 0) + 1,
      loading: entry.tab.kind === 'web',
    }
    const index = Math.min(Math.max(0, entry.index), current.length)
    const next = [...current.slice(0, index), tab, ...current.slice(index)]
    tabsRef.current = next
    activeIdRef.current = tab.id
    setTabs(next)
    setActiveId(tab.id)
    syncAddress(displayUrl(tab.url))
  }, [])

  const togglePin = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab) return
    const next = setTabPinned(tabsRef.current, tab.id, !tab.pinned)
    tabsRef.current = next
    setTabs(next)
  }, [])

  const duplicateTab = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab) return
    createTab(tab.url, { private: tab.private })
  }, [createTab])

  const copyUrl = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab) return
    void bridge
      .call('clipboard:writeText', { text: tab.url })
      .then(() => notify(t('common.copied')))
      .catch((error) => notify(errorMessage(error)))
  }, [bridge, notify, t])

  const navigate = useCallback(
    (input: string) => {
      const raw = input.trim()
      if (!raw) return
      const target = isInternalUrl(raw)
        ? raw
        : normalizeNavigationInput(raw, searchEngine.template)
      const tab = tabsRef.current.find(
        (item) => item.id === activeIdRef.current,
      )
      if (!tab) {
        createTab(target)
        return
      }
      if (isInternalUrl(target)) {
        const page = internalRoute(target)
        updateTab(tab.id, {
          url: `maibrowser://${page}`,
          kind: 'internal',
          internalRoute: page,
          title: '',
          loading: false,
          error: undefined,
          navId: (tab.navId ?? 0) + 1,
        })
        syncAddress(`maibrowser://${page}`)
        return
      }
      updateTab(tab.id, {
        url: target,
        kind: 'web',
        internalRoute: undefined,
        title: '',
        loading: true,
        error: undefined,
        canGoBack: false,
        canGoForward: false,
        navId: (tab.navId ?? 0) + 1,
      })
      syncAddress(target)
      setAddressFocused(false)
    },
    [createTab, searchEngine.template, updateTab],
  )

  const pasteAndGo = useCallback(async () => {
    try {
      const text = await bridge.call<string>('clipboard:readText')
      if (!text.trim()) {
        notify(t('common.empty'))
        return
      }
      navigate(text)
    } catch (error) {
      notify(errorMessage(error))
    }
  }, [bridge, navigate, notify, t])

  const openInternal = useCallback(
    (page: string, asNewTab = false) => {
      if (asNewTab) {
        createTab(`maibrowser://${page}`)
        return
      }
      const tab = tabsRef.current.find(
        (item) => item.id === activeIdRef.current,
      )
      if (!tab) {
        createTab(`maibrowser://${page}`)
        return
      }
      updateTab(tab.id, {
        url: `maibrowser://${page}`,
        kind: 'internal',
        internalRoute: page,
        title: '',
        loading: false,
        error: undefined,
        navId: (tab.navId ?? 0) + 1,
      })
      syncAddress(`maibrowser://${page}`)
    },
    [createTab, updateTab],
  )

  const goBack = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab) return
    if (tab.kind === 'internal') {
      openInternal('newtab')
      return
    }
    evalInWebview(tab.id, 'window.history.back()')
  }, [evalInWebview, openInternal])

  const goForward = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab || tab.kind === 'internal') return
    evalInWebview(tab.id, 'window.history.forward()')
  }, [evalInWebview])

  const reload = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab) return
    if (tab.kind === 'web') {
      invokeWebview(tab.id, 'reload', {})
      updateTab(tab.id, { loading: true })
      return
    }
    void refreshAll().catch((error) => notify(errorMessage(error)))
  }, [notify, refreshAll, updateTab])

  const stop = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab || tab.kind !== 'web') return
    evalInWebview(tab.id, 'window.stop()')
    updateTab(tab.id, { loading: false })
  }, [updateTab])

  const openFind = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab || tab.kind !== 'web' || isInternalUrl(tab.url)) {
      notify(t('find.unavailable'))
      return
    }
    setFindOpen(true)
    setMenuOpen(false)
  }, [notify, t])

  const runFind = useCallback(
    (backward: boolean) => {
      const tab = tabsRef.current.find(
        (item) => item.id === activeIdRef.current,
      )
      const query = findQuery.trim()
      if (!tab || tab.kind !== 'web' || !query) return
      evalInWebview(
        tab.id,
        `window.find(${JSON.stringify(query)}, false, ${backward ? 'true' : 'false'}, true, false, false, false)`,
      )
    },
    [evalInWebview, findQuery],
  )

  const changeZoom = useCallback(
    (next: number | 'in' | 'out' | 'reset') => {
      const tab = tabsRef.current.find(
        (item) => item.id === activeIdRef.current,
      )
      if (!tab || tab.kind !== 'web') return
      const current = tab.zoom ?? 100
      const raw =
        next === 'in'
          ? current + 10
          : next === 'out'
            ? current - 10
            : next === 'reset'
              ? 100
              : next
      const zoom = Math.max(25, Math.min(300, Math.round(raw / 10) * 10))
      updateTab(tab.id, { zoom })
      evalInWebview(tab.id, `document.documentElement.style.zoom=${zoom / 100}`)
    },
    [evalInWebview, updateTab],
  )

  const printPage = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab || tab.kind !== 'web') return
    evalInWebview(tab.id, 'window.print()')
  }, [evalInWebview])

  const addBookmark = useCallback(
    async (title: string, url: string) => {
      if (!url || isInternalUrl(url)) {
        notify(t('bookmarks.url'))
        return
      }
      try {
        await storeCall('saveBookmark', {
          title: title.trim() || displayUrl(url),
          url,
        })
        await refreshBookmarks()
        notify(t('common.save'))
      } catch (error) {
        notify(errorMessage(error))
      }
    },
    [notify, refreshBookmarks, storeCall, t],
  )

  const deleteBookmark = useCallback(
    async (id: string) => {
      await storeCall('deleteBookmark', id).catch(() => {})
      await refreshBookmarks().catch(() => {})
    },
    [refreshBookmarks, storeCall],
  )

  const clearHistory = useCallback(async () => {
    await storeCall('clearHistory').catch(() => {})
    await refreshHistory().catch(() => {})
    notify(t('history.clear'))
  }, [notify, refreshHistory, storeCall, t])

  const deleteHistory = useCallback(
    async (id: string) => {
      await storeCall('deleteHistory', id).catch(() => {})
      await refreshHistory().catch(() => {})
    },
    [refreshHistory, storeCall],
  )

  const deleteDownload = useCallback(
    async (id: string) => {
      await storeCall('deleteDownload', id).catch(() => {})
      await refreshDownloads().catch(() => {})
    },
    [refreshDownloads, storeCall],
  )

  const toggleScript = useCallback(
    async (id: string, enabled: boolean) => {
      await storeCall('setScriptEnabled', id, enabled).catch(() => {})
      await refreshScripts().catch(() => {})
    },
    [refreshScripts, storeCall],
  )

  const deleteScript = useCallback(
    async (id: string) => {
      await storeCall('deleteScript', id).catch(() => {})
      await refreshScripts().catch(() => {})
    },
    [refreshScripts, storeCall],
  )

  const fetchScript = useCallback(
    async (url: string): Promise<string> => {
      return bridge.call<string>('net:fetchText', { url })
    },
    [bridge],
  )

  const installScript = useCallback(
    async (source: string, sourceUrl?: string) => {
      const meta = parseMetadata(source, settingsRef.current.locale)
      if (!meta) {
        throw new Error('Missing // ==UserScript== metadata block')
      }
      const existing = scriptsRef.current.find(
        (script) => script.id === meta.id,
      )
      const timestamp = Date.now()
      const record: ScriptItem = {
        id: meta.id,
        name: meta.name,
        namespace: meta.namespace,
        version: meta.version,
        description: meta.description,
        source,
        metadata: JSON.stringify(meta),
        enabled: existing?.enabled ?? true,
        installedAt: existing?.installedAt ?? timestamp,
        updatedAt: timestamp,
        updateUrl: meta.downloadUrl || sourceUrl || meta.updateUrl,
      }
      const resources = await fetchScriptResources(meta)
      await storeCall('saveScript', record)
      await storeCall('saveScriptResources', {
        scriptId: meta.id,
        resources,
      })
      await refreshScripts()
    },
    [fetchScriptResources, refreshScripts, storeCall],
  )

  const clearBrowsingData = useCallback(async () => {
    await storeCall('clearBrowsingData').catch(() => {})
    await Promise.all([refreshHistory(), refreshDownloads()]).catch(() => {})
    notify(t('settings.clearData'))
  }, [notify, refreshDownloads, refreshHistory, storeCall, t])

  const importBookmarks = useCallback(async (): Promise<number> => {
    if (appInfo?.platform === 'android') {
      notify(t('bookmarks.exportUnavailable'))
      return 0
    }
    try {
      const html = await bridge.call<string | null>('bookmarks:import')
      if (!html) return 0
      const parsed = parseBookmarksHtml(html)
      const existing = new Set(bookmarks.map((bookmark) => bookmark.url))
      let imported = 0
      for (const item of parsed) {
        if (existing.has(item.url)) continue
        await storeCall('saveBookmark', { title: item.title, url: item.url })
        existing.add(item.url)
        imported++
      }
      await refreshBookmarks()
      notify(t('bookmarks.imported', { count: imported }))
      return imported
    } catch (error) {
      notify(errorMessage(error))
      return 0
    }
  }, [
    appInfo?.platform,
    bookmarks,
    bridge,
    notify,
    refreshBookmarks,
    storeCall,
    t,
  ])

  const exportBookmarks = useCallback(async (): Promise<string | null> => {
    if (appInfo?.platform === 'android') {
      notify(t('bookmarks.exportUnavailable'))
      return null
    }
    try {
      const file = await bridge.call<string | null>('bookmarks:export', {
        html: buildBookmarksHtml(bookmarks),
      })
      if (file) notify(t('bookmarks.exported'))
      return file
    } catch (error) {
      notify(errorMessage(error))
      return null
    }
  }, [appInfo?.platform, bookmarks, bridge, notify, t])

  const checkScriptUpdates = useCallback(async (): Promise<number> => {
    let updated = 0
    for (const script of scriptsRef.current) {
      if (!script.updateUrl) continue
      try {
        const source = await fetchScript(script.updateUrl)
        const meta = parseMetadata(source, settingsRef.current.locale)
        if (!meta || !meta.version || meta.version === script.version) continue
        const resources = await fetchScriptResources(meta, script.id)
        await storeCall('saveScript', {
          ...script,
          name: meta.name,
          version: meta.version,
          description: meta.description,
          source,
          metadata: JSON.stringify(meta),
          updatedAt: Date.now(),
        })
        await storeCall('saveScriptResources', {
          scriptId: script.id,
          resources,
        })
        updated++
      } catch {
        // a broken update source must not stop the remaining scripts
      }
    }
    await refreshScripts()
    notify(
      updated > 0
        ? t('scripts.updated', { count: updated })
        : t('scripts.upToDate'),
    )
    return updated
  }, [fetchScript, fetchScriptResources, notify, refreshScripts, storeCall, t])

  const openExternal = useCallback(
    (url: string) => {
      void bridge
        .call('shell:openExternal', { url })
        .catch((error) => notify(errorMessage(error)))
    },
    [bridge, notify],
  )

  const openPath = useCallback(
    (path: string) => {
      void bridge
        .call('shell:openPath', { path })
        .catch((error) => notify(errorMessage(error)))
    },
    [bridge, notify],
  )

  const showInFolder = useCallback(
    (path: string) => {
      void bridge
        .call('shell:showItemInFolder', { path })
        .catch((error) => notify(errorMessage(error)))
    },
    [bridge, notify],
  )

  const buildPageInit = useCallback((url: string) => {
    const enabled = scriptsRef.current.filter((script) => script.enabled)
    if (enabled.length === 0) return ''
    const injections: UserScript[] = []
    const requires: Record<string, string[]> = {}
    const resources: Record<string, Record<string, string>> = {}
    for (const script of enabled) {
      const meta = parseMetadata(script.source, settingsRef.current.locale)
      if (!meta) continue
      const cached = scriptResourcesRef.current.filter(
        (resource) => resource.scriptId === script.id,
      )
      requires[script.id] = meta.require
        .map(
          (url) =>
            cached.find((resource) => resource.name === `require:${url}`)
              ?.content,
        )
        .filter((content): content is string => typeof content === 'string')
      const named: Record<string, string> = {}
      for (const resource of cached) {
        if (resource.name.startsWith('resource:'))
          named[resource.name.slice('resource:'.length)] = resource.content
      }
      resources[script.id] = named
      injections.push({
        id: script.id,
        meta,
        source: script.source,
        enabled: true,
      })
    }
    return buildInjection(injections, {
      url,
      values: scriptValuesRef.current,
      requires,
      resources,
      locale: settingsRef.current.locale,
    })
  }, [])

  const handleWebMessage = useCallback(
    (tabId: string, message: string | Record<string, unknown>) => {
      const raw =
        typeof message === 'string' ? message : JSON.stringify(message)
      if (raw.startsWith('__MB_DOWNLOAD__')) {
        try {
          const request = JSON.parse(raw.slice(15)) as {
            url?: string
            fileName?: string
            mime?: string
          }
          if (request.url) {
            void startDownload({
              url: request.url,
              fileName: request.fileName ?? '',
              mime: request.mime ?? '',
            })
          }
        } catch {
          // ignore malformed download messages
        }
        return
      }
      if (raw.startsWith('__MB_META__')) {
        try {
          const meta = JSON.parse(raw.slice(11)) as {
            title?: string
            url?: string
          }
          if (meta.url) {
            updateTab(tabId, { title: meta.title ?? '', url: meta.url })
            if (activeIdRef.current === tabId) syncAddress(displayUrl(meta.url))
            const tab = tabsRef.current.find((item) => item.id === tabId)
            if (
              !tab?.private &&
              !isInternalUrl(meta.url) &&
              visitedRef.current[tabId] !== meta.url
            ) {
              visitedRef.current[tabId] = meta.url
              void storeCall(
                'addVisit',
                meta.url,
                meta.title || meta.url,
                'load',
              )
                .then(() => {
                  if (activeIdRef.current === tabId)
                    void refreshHistory().catch(() => {})
                })
                .catch(() => {})
            }
          }
        } catch {
          // ignore malformed page messages
        }
        return
      }
      if (!raw.startsWith('__MB__')) return
      let payload: {
        scriptId?: string
        method?: string
        params?: Record<string, unknown>
      }
      try {
        payload = JSON.parse(raw.slice(6)) as typeof payload
      } catch {
        return
      }
      const method = payload.method ?? ''
      const params = (payload.params ?? {}) as Record<string, unknown>
      const scriptId = payload.scriptId ?? ''
      if (!scriptId) return
      if (method === 'gm:setValue') {
        const key = String(params.key ?? '')
        const value = String(params.value ?? '')
        setScriptValues((current) => ({
          ...current,
          [scriptId]: { ...(current[scriptId] ?? {}), [key]: value },
        }))
        void storeCall('setScriptValue', scriptId, key, value).catch(() => {})
      } else if (method === 'gm:deleteValue') {
        const key = String(params.key ?? '')
        setScriptValues((current) => {
          const next = { ...(current[scriptId] ?? {}) }
          delete next[key]
          return { ...current, [scriptId]: next }
        })
        void storeCall('deleteScriptValue', scriptId, key).catch(() => {})
      } else if (method === 'gm:openInTab') {
        if (typeof params.url === 'string') createTab(params.url)
      } else if (method === 'gm:setClipboard') {
        void bridge
          .call('clipboard:writeText', { text: String(params.data ?? '') })
          .catch(() => {})
        notify(t('common.copied'))
      } else if (method === 'gm:notification') {
        notify(String(params.text || params.title || 'Userscript'))
      } else if (method === 'gm:xhr') {
        const requestId = String(params.id ?? '')
        void bridge
          .call<Record<string, unknown>>('net:xhr', params)
          .then((response) => {
            if (!requestId) return
            const json = JSON.stringify(response)
            evalInWebview(
              tabId,
              `window.__MB_XHR__ && window.__MB_XHR__[${JSON.stringify(requestId)}] && window.__MB_XHR__[${JSON.stringify(requestId)}](${json})`,
            )
          })
          .catch((error) => {
            if (!requestId) return
            const json = JSON.stringify({ error: errorMessage(error) })
            evalInWebview(
              tabId,
              `window.__MB_XHR__ && window.__MB_XHR__[${JSON.stringify(requestId)}] && window.__MB_XHR__[${JSON.stringify(requestId)}](${json})`,
            )
          })
      } else if (method === 'gm:download') {
        const url = String(params.url ?? '')
        if (!/^https?:\/\//i.test(url)) {
          notify(t('downloads.invalidUrl'))
          return
        }
        void startDownload({
          url,
          fileName: String(params.name ?? params.fileName ?? ''),
          mime: String(params.mime ?? ''),
          referrer: String(params.referrer ?? ''),
        })
      }
    },
    [
      bridge,
      createTab,
      evalInWebview,
      notify,
      refreshHistory,
      startDownload,
      storeCall,
      t,
      updateTab,
    ],
  )

  const onLoad = useCallback(
    (tabId: string, url: string) => {
      updateTab(tabId, { loading: false, error: undefined })
      evalInWebview(tabId, PAGE_BOOTSTRAP)
      const tab = tabsRef.current.find((item) => item.id === tabId)
      if (tab?.zoom && tab.zoom !== 100) {
        evalInWebview(
          tabId,
          `document.documentElement.style.zoom=${tab.zoom / 100}`,
        )
      }
      setTimeout(() => {
        evalInWebview(tabId, buildPageInit(url))
      }, 60)
    },
    [buildPageInit, evalInWebview, updateTab],
  )

  const onError = useCallback(
    (tabId: string, message: string) => {
      updateTab(tabId, {
        loading: false,
        error: message || 'Page failed to load',
      })
    },
    [updateTab],
  )

  const onLocationChange = useCallback(
    (tabId: string, url: string) => {
      updateTab(tabId, { url })
      if (activeIdRef.current === tabId) syncAddress(displayUrl(url))
    },
    [updateTab],
  )

  const onOpenWindow = useCallback(
    (url: string) => {
      createTab(url)
    },
    [createTab],
  )

  const windowCall = useCallback(
    (method: string) => {
      void bridge.call(method, {}).catch((error) => notify(errorMessage(error)))
    },
    [bridge, notify],
  )

  const bookmarked = bookmarks.some(
    (bookmark) => bookmark.url === activeTab?.url,
  )

  const toggleBookmark = useCallback(() => {
    const tab = tabsRef.current.find((item) => item.id === activeIdRef.current)
    if (!tab || isInternalUrl(tab.url)) {
      notify(t('bookmarks.add'))
      return
    }
    const existing = bookmarks.find((bookmark) => bookmark.url === tab.url)
    if (existing) void deleteBookmark(existing.id)
    else void addBookmark(tab.title || displayUrl(tab.url), tab.url)
  }, [addBookmark, bookmarks, deleteBookmark, notify, t])

  const openMenuPage = useCallback(
    (page: string) => {
      const tab = tabsRef.current.find(
        (item) => item.id === activeIdRef.current,
      )
      openInternal(page, tab?.kind === 'web')
    },
    [openInternal],
  )

  const menuActions: MenuAction[] = [
    { icon: 'add', label: t('menu.newTab'), onTap: () => createTab() },
    {
      icon: 'incognito',
      label: t('tabs.privateTab'),
      onTap: () => createTab(undefined, { private: true }),
    },
    {
      icon: 'history',
      label:
        closedCount > 0
          ? `${t('tabs.restore')} (${closedCount})`
          : t('tabs.restore'),
      separatorBefore: true,
      onTap: restoreClosedTab,
    },
    {
      icon: activeTab?.pinned ? 'unpin' : 'pin',
      label: activeTab?.pinned ? t('tabs.unpin') : t('tabs.pin'),
      onTap: togglePin,
    },
    { icon: 'duplicate', label: t('tabs.duplicate'), onTap: duplicateTab },
    {
      icon: 'close',
      label: t('menu.closeTab'),
      onTap: () => closeTab(activeIdRef.current),
    },
    { icon: 'copy', label: t('menu.copyUrl'), onTap: copyUrl },
    {
      icon: 'paste',
      label: t('menu.pasteAndGo'),
      onTap: () => void pasteAndGo(),
    },
    {
      icon: 'search',
      label: t('find.placeholder'),
      separatorBefore: true,
      onTap: openFind,
    },
    {
      icon: 'zoomIn',
      label: `${t('zoom.in')} (${activeTab?.zoom ?? 100}%)`,
      onTap: () => changeZoom('in'),
    },
    { icon: 'zoomOut', label: t('zoom.out'), onTap: () => changeZoom('out') },
    { icon: 'reset', label: t('zoom.reset'), onTap: () => changeZoom('reset') },
    { icon: 'print', label: t('nav.print'), onTap: printPage },
    {
      icon: 'history',
      label: t('menu.history'),
      separatorBefore: true,
      onTap: () => openMenuPage('history'),
    },
    {
      icon: 'bookmark',
      label: t('menu.bookmarks'),
      onTap: () => openMenuPage('bookmarks'),
    },
    {
      icon: 'download',
      label: t('menu.downloads'),
      onTap: () => openMenuPage('downloads'),
    },
    {
      icon: 'script',
      label: t('menu.scripts'),
      onTap: () => openMenuPage('scripts'),
    },
    {
      icon: 'palette',
      label: t('menu.appearance'),
      onTap: () => openMenuPage('appearance'),
    },
    {
      icon: 'settings',
      label: t('menu.settings'),
      onTap: () => openMenuPage('settings'),
    },
    {
      icon: 'info',
      label: t('menu.about'),
      onTap: () => openMenuPage('about'),
    },
  ]

  if (booting) {
    return <LoadingScreen theme={theme} label={t('common.loading')} />
  }

  if (bootError) {
    return (
      <view className="app-root" style={{ backgroundColor: theme.bg }}>
        <view className="loading-screen">
          <view
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <text
              style={{ color: theme.text, fontSize: '18px', fontWeight: '700' }}
            >
              {t('error.title')}
            </text>
            <text
              style={{
                color: theme.textMuted,
                fontSize: '12px',
                marginTop: '8px',
                maxWidth: '560px',
                textAlign: 'center',
              }}
            >
              {bootError}
            </text>
            <view style={{ marginTop: '16px' }}>
              <PrimaryButton
                label={t('common.retry')}
                theme={theme}
                onTap={() => setBootAttempt((value) => value + 1)}
              />
            </view>
          </view>
        </view>
      </view>
    )
  }

  const internalProps = {
    page: activeTab?.internalRoute ?? 'newtab',
    settings,
    appInfo,
    history,
    bookmarks,
    downloads,
    scripts,
    theme,
    locale: settings.locale as Locale,
    t,
    searchEngine,
    searchEngines: SEARCH_ENGINES,
    currentUrl: activeTab?.url ?? '',
    currentTitle: activeTab?.title ?? '',
    navigate,
    openInternal,
    addBookmark: (title: string, url: string) => void addBookmark(title, url),
    deleteBookmark: (id: string) => void deleteBookmark(id),
    importBookmarks,
    exportBookmarks,
    clearHistory: () => void clearHistory(),
    deleteHistory: (id: string) => void deleteHistory(id),
    refreshHistory: (query?: string) => void refreshHistory(query),
    refreshScripts: () => void refreshScripts(),
    refreshDownloads: () => void refreshDownloads(),
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    deleteDownload: (id: string) => void deleteDownload(id),
    deleteScript: (id: string) => void deleteScript(id),
    toggleScript: (id: string, enabled: boolean) =>
      void toggleScript(id, enabled),
    checkScriptUpdates,
    installScript,
    fetchScript,
    openExternal,
    openPath,
    showInFolder,
    clearBrowsingData: () => void clearBrowsingData(),
    updateSettings,
    notify,
  }

  return (
    <view className="app-root" style={{ backgroundColor: theme.bg }}>
      {appInfo?.platform !== 'android' ? (
        <TitleBar
          theme={theme}
          platform={appInfo?.platform ?? 'windows'}
          onMinimize={() => windowCall('window:minimize')}
          onMaximize={() => windowCall('window:toggleMaximize')}
          onClose={() => windowCall('window:close')}
        />
      ) : null}
      <TabStrip
        theme={theme}
        tabs={tabs}
        activeId={activeId}
        t={t}
        onActivate={activateTab}
        onClose={closeTab}
        onNewTab={() => createTab()}
      />
      <Toolbar
        theme={theme}
        t={t}
        address={address}
        onAddressChange={(value) => {
          setAddress(value)
          setAddressFocused(true)
        }}
        onFocus={() => setAddressFocused(true)}
        onBlur={() => {}}
        onSubmit={() => navigate(address)}
        onBack={goBack}
        onForward={goForward}
        onReload={reload}
        onStop={stop}
        onHome={() => navigate(settings.homepage || 'maibrowser://newtab')}
        onToggleBookmark={toggleBookmark}
        onMenu={() => setMenuOpen((open) => !open)}
        loading={activeTab?.loading ?? false}
        bookmarked={bookmarked}
        security={securityState(activeTab?.url ?? '')}
        engineName={searchEngine.name}
      />
      <AddressSuggestions
        theme={theme}
        t={t}
        suggestions={suggestions}
        onSelect={(url) => {
          setAddressFocused(false)
          navigate(url)
        }}
      />
      {settings.showBookmarksBar ? (
        <BookmarkBar
          theme={theme}
          bookmarks={bookmarkBarItems}
          onOpen={(url) => navigate(url)}
        />
      ) : null}
      {findOpen ? (
        <FindBar
          theme={theme}
          t={t}
          value={findQuery}
          onChange={setFindQuery}
          onNext={() => runFind(false)}
          onPrev={() => runFind(true)}
          onClose={() => setFindOpen(false)}
        />
      ) : null}
      <view className="content" style={{ backgroundColor: theme.bg }}>
        {webTabs.map((tab) => (
          <WebPanel
            key={tab.id}
            tab={tab}
            active={tab.id === activeId}
            background={theme.bg}
            onLoad={onLoad}
            onError={onError}
            onLocationChange={onLocationChange}
            onMessage={handleWebMessage}
            onOpenWindow={onOpenWindow}
          />
        ))}
        {activeTab?.kind === 'internal' ? (
          <view
            className="internal-layer"
            style={{ backgroundColor: theme.bg }}
          >
            <InternalPage {...internalProps} />
          </view>
        ) : null}
        {activeTab?.kind === 'web' && activeTab.error ? (
          <ErrorOverlay
            theme={theme}
            title={t('error.title')}
            message={activeTab.error}
            retryLabel={t('error.retry')}
            backLabel={t('error.back')}
            onRetry={reload}
            onBack={goBack}
          />
        ) : null}
        {menuOpen ? (
          <AppMenu
            theme={theme}
            actions={menuActions}
            motionEnabled={settings.motion}
            onDismiss={() => setMenuOpen(false)}
          />
        ) : null}
      </view>
      <StatusBar
        theme={theme}
        t={t}
        tabCount={tabs.length}
        url={activeTab?.url ?? ''}
        privateMode={activeTab?.private ?? false}
      />
      {toast ? (
        <view className="toast">
          <MotionView
            key={toast}
            enabled={settings.motion}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <view
              className="toast-inner"
              style={{ backgroundColor: theme.text, borderColor: theme.border }}
            >
              <text className="toast-text" style={{ color: theme.bg }}>
                {toast}
              </text>
            </view>
          </MotionView>
        </view>
      ) : null}
    </view>
  )
}
