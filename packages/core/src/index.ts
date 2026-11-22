export type Platform = 'windows' | 'android'
export type Locale = 'zh-Hans' | 'en'

export interface Tab {
  id: string
  url: string
  title: string
  favicon?: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  muted: boolean
  pinned: boolean
  kind: 'web' | 'internal'
  internalRoute?: string
}

export interface WindowState {
  id: string
  tabs: Tab[]
  activeTabId: string
  private: boolean
}

export interface SearchEngine {
  id: string
  name: string
  template: string
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'bing', name: 'Bing', template: 'https://www.bing.com/search?q=%s' },
  {
    id: 'google',
    name: 'Google',
    template: 'https://www.google.com/search?q=%s',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    template: 'https://duckduckgo.com/?q=%s',
  },
  { id: 'baidu', name: '百度', template: 'https://www.baidu.com/s?wd=%s' },
]

export const DEFAULT_SEARCH_ENGINE = SEARCH_ENGINES[0]

export function now(): number {
  return Date.now()
}

export function createId(prefix = ''): string {
  const time = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}${time}${random}`
}

export function isInternalUrl(input: string): boolean {
  return input.startsWith('maibrowser://')
}

export function internalRoute(url: string): string {
  return url.replace(/^maibrowser:\/\//, '').replace(/\/.*$/, '') || 'newtab'
}

export function isLikelyUrl(input: string): boolean {
  const value = input.trim()
  if (!value || /\s/.test(value)) return false
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return true
  if (value === 'localhost' || /^localhost:\d+/.test(value)) return true
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(value)) return true
  if (value.includes('.') && !value.startsWith('.') && !value.endsWith('.'))
    return true
  return false
}

function withScheme(input: string): string {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input)) return input
  if (/^(mailto|about|data|file):/i.test(input)) return input
  if (input === 'localhost' || /^localhost:\d+/.test(input))
    return `http://${input}`
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(input))
    return `http://${input}`
  return `https://${input}`
}

export function normalizeNavigationInput(
  input: string,
  searchTemplate: string = DEFAULT_SEARCH_ENGINE.template,
): string {
  const value = input.trim()
  if (!value) return ''
  if (isInternalUrl(value)) return value
  if (isLikelyUrl(value)) return withScheme(value)
  return searchTemplate.replace('%s', encodeURIComponent(value))
}

export function displayUrl(url: string): string {
  const value = typeof url === 'string' ? url : String(url ?? '')
  if (isInternalUrl(value)) return value
  const parsed = value.match(
    /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/,
  )
  if (!parsed) return value
  const [, host, pathname, search = '', hash = ''] = parsed
  return `${host}${pathname || '/'}${search}${hash}`
}

export function securityState(
  url: string,
): 'secure' | 'insecure' | 'internal' | 'unknown' {
  if (isInternalUrl(url)) return 'internal'
  if (url.startsWith('https://')) return 'secure'
  if (url.startsWith('http://')) return 'insecure'
  return 'unknown'
}

export function tabTitle(tab: Tab, fallback: string): string {
  if (tab.title) return tab.title
  if (!tab.url || isInternalUrl(tab.url)) return fallback
  return displayUrl(tab.url)
}

export function newTab(id: string, internal = 'newtab'): Tab {
  return {
    id,
    url: `maibrowser://${internal}`,
    title: '',
    loading: false,
    canGoBack: false,
    canGoForward: false,
    muted: false,
    pinned: false,
    kind: 'internal',
    internalRoute: internal,
  }
}

export function newWindow(
  id: string,
  tab: Tab,
  isPrivate = false,
): WindowState {
  return { id, tabs: [tab], activeTabId: tab.id, private: isPrivate }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export function truncate(value: string, max: number): string {
  const text = typeof value === 'string' ? value : String(value ?? '')
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

export function normalizeLocale(input: string | undefined | null): Locale {
  if (!input) return 'zh-Hans'
  const value = input.toLowerCase()
  if (value.startsWith('zh')) return 'zh-Hans'
  return 'en'
}

export interface AddressSuggestionSource {
  url: string
  title?: string
}

export interface AddressSuggestion {
  kind: 'bookmark' | 'history' | 'url' | 'search'
  title: string
  detail: string
  url: string
}

export function buildAddressSuggestions(
  input: string,
  searchTemplate: string,
  engineName: string,
  history: AddressSuggestionSource[],
  bookmarks: AddressSuggestionSource[],
  limit = 6,
): AddressSuggestion[] {
  const query = input.trim()
  if (!query) return []
  const needle = query.toLowerCase()
  const results: AddressSuggestion[] = []
  const seen = new Set<string>()

  const collect = (
    source: AddressSuggestionSource,
    kind: 'bookmark' | 'history',
  ) => {
    if (!source.url || seen.has(source.url)) return
    const title = source.title || displayUrl(source.url)
    if (
      !source.url.toLowerCase().includes(needle) &&
      !title.toLowerCase().includes(needle)
    )
      return
    seen.add(source.url)
    results.push({
      kind,
      title,
      detail: displayUrl(source.url),
      url: source.url,
    })
  }

  for (const bookmark of bookmarks) collect(bookmark, 'bookmark')
  for (const entry of history) collect(entry, 'history')

  const target = normalizeNavigationInput(query, searchTemplate)
  if (target && !seen.has(target)) {
    if (isLikelyUrl(query) || isInternalUrl(query)) {
      results.push({
        kind: 'url',
        title: query,
        detail: displayUrl(target),
        url: target,
      })
    } else {
      results.push({
        kind: 'search',
        title: query,
        detail: engineName,
        url: target,
      })
    }
  }

  return results.slice(0, Math.max(0, limit))
}

export function setTabPinned<T extends Tab>(
  tabs: T[],
  id: string,
  pinned: boolean,
): T[] {
  const target = tabs.find((tab) => tab.id === id)
  if (!target || target.pinned === pinned) return tabs
  const next = tabs.map((tab) => (tab.id === id ? { ...tab, pinned } : tab))
  const updated = next.find((tab) => tab.id === id)
  if (!updated) return tabs
  const rest = next.filter((tab) => tab.id !== id)
  if (pinned) {
    const index = rest.findIndex((tab) => !tab.pinned)
    rest.splice(index < 0 ? rest.length : index, 0, updated)
  } else {
    let index = 0
    while (index < rest.length && rest[index].pinned) index++
    rest.splice(index, 0, updated)
  }
  return rest
}

export interface ParsedBookmark {
  title: string
  url: string
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 10)),
    )
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
}

function cleanHtmlText(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseBookmarksHtml(
  html: string,
  limit = 5000,
): ParsedBookmark[] {
  const source = String(html ?? '')
  const results: ParsedBookmark[] = []
  const seen = new Set<string>()
  const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  while (results.length < limit) {
    const match = anchor.exec(source)
    if (!match) break
    const attributes = match[1]
    const href =
      /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
        .exec(attributes)
        ?.slice(1)
        .find(Boolean) ?? ''
    const url = decodeHtmlEntities(href).trim()
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue
    const title = cleanHtmlText(match[2]) || displayUrl(url)
    seen.add(url)
    results.push({ title, url })
  }
  return results
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildBookmarksHtml(
  bookmarks: { title: string; url: string; createdAt?: number }[],
): string {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ]
  for (const bookmark of bookmarks) {
    if (!/^https?:\/\//i.test(bookmark.url)) continue
    const added = Math.floor((bookmark.createdAt ?? Date.now()) / 1000)
    lines.push(
      `    <DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${added}">${escapeHtml(bookmark.title || displayUrl(bookmark.url))}</A>`,
    )
  }
  lines.push('</DL><p>', '')
  return lines.join('\n')
}
