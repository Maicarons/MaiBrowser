export type Platform = 'windows' | 'android'

export type EngineEvent =
  | 'tab-created'
  | 'tab-closed'
  | 'load-started'
  | 'load-finished'
  | 'load-failed'
  | 'title-changed'
  | 'url-changed'
  | 'favicon-changed'
  | 'progress'
  | 'crashed'
  | 'download-started'
  | 'download-updated'
  | 'permission-requested'
  | 'context-menu'
  | 'new-window'

export interface CreateTabOptions {
  id: string
  url?: string
  private?: boolean
  active?: boolean
}

export interface FindOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  backwards?: boolean
}

export interface FindResult {
  matches: number
  activeMatch: number
}

export interface EngineCapabilities {
  canFind: boolean
  canPrint: boolean
  canDevTools: boolean
  canPauseDownload: boolean
  canIsolateScripts: boolean
  canUseProxy: boolean
}

export interface TabState {
  id: string
  url: string
  title: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
}

export interface BrowserEngine {
  readonly capabilities: EngineCapabilities
  createTab(options: CreateTabOptions): Promise<void>
  closeTab(tabId: string): Promise<void>
  activateTab(tabId: string): Promise<void>
  navigate(tabId: string, url: string): Promise<void>
  back(tabId: string): Promise<void>
  forward(tabId: string): Promise<void>
  reload(tabId: string, ignoreCache?: boolean): Promise<void>
  stop(tabId: string): Promise<void>
  find(tabId: string, query: string, options?: FindOptions): Promise<FindResult>
  setZoom(tabId: string, level: number): Promise<void>
  print(tabId: string): Promise<void>
  openDevTools(tabId: string): Promise<void>
  executeScript(
    tabId: string,
    script: string,
    world: 'page' | 'isolated',
  ): Promise<unknown>
  on(event: EngineEvent, handler: (payload: unknown) => void): () => void
}
