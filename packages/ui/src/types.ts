import type { Locale, Platform, SearchEngine } from '@maibrowser/core'
import type { AccentId } from './theme'

export type ThemePreference = 'system' | 'light' | 'dark'

export interface BrowserSettings {
  theme: ThemePreference
  accent: AccentId
  motion: boolean
  locale: Locale
  searchEngineId: string
  homepage: string
  downloadDir: string
  restoreTabs: boolean
  showBookmarksBar: boolean
  blockThirdPartyCookies: boolean
}

export const DEFAULT_SETTINGS: BrowserSettings = {
  theme: 'system',
  accent: 'teal',
  motion: true,
  locale: 'zh-Hans',
  searchEngineId: 'bing',
  homepage: 'maibrowser://newtab',
  downloadDir: '',
  restoreTabs: true,
  showBookmarksBar: true,
  blockThirdPartyCookies: false,
}

export interface AppInfo {
  name: string
  version: string
  platform: Platform
  dataPath: string
  dbPath: string
  downloadsPath: string
  engine: string
  versionLabel: string
}

export interface DownloadItem {
  id: string
  url: string
  fileName: string
  filePath: string
  mime: string
  totalBytes: number
  receivedBytes: number
  state: string
  startedAt: number
  finishedAt: number | null
  error: string
}

export interface ScriptItem {
  id: string
  name: string
  namespace: string
  version: string
  description: string
  source: string
  metadata: string
  enabled: boolean
  installedAt: number
  updatedAt: number
  updateUrl: string
}

export interface InternalPageProps {
  page: string
  settings: BrowserSettings
  appInfo: AppInfo | null
  history: import('@maibrowser/storage').HistoryEntry[]
  bookmarks: import('@maibrowser/storage').Bookmark[]
  downloads: DownloadItem[]
  scripts: ScriptItem[]
  theme: import('./theme').Theme
  locale: Locale
  t: import('@maibrowser/i18n').Translator['t']
  searchEngine: SearchEngine
  searchEngines: SearchEngine[]
  currentUrl: string
  currentTitle: string
  navigate: (url: string) => void
  openInternal: (page: string) => void
  addBookmark: (title: string, url: string) => void
  deleteBookmark: (id: string) => void
  importBookmarks: () => Promise<number>
  exportBookmarks: () => Promise<string | null>
  clearHistory: () => void
  deleteHistory: (id: string) => void
  refreshHistory: (query?: string) => void
  refreshScripts: () => void
  refreshDownloads: () => void
  deleteDownload: (id: string) => void
  deleteScript: (id: string) => void
  toggleScript: (id: string, enabled: boolean) => void
  checkScriptUpdates: () => Promise<number>
  installScript: (source: string, sourceUrl?: string) => Promise<void>
  fetchScript: (url: string) => Promise<string>
  openExternal: (url: string) => void
  openPath: (path: string) => void
  showInFolder: (path: string) => void
  clearBrowsingData: () => void
  updateSettings: (patch: Partial<BrowserSettings>) => void
  notify: (message: string) => void
}
