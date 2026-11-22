import { describe, expect, test } from 'bun:test'
import {
  buildAddressSuggestions,
  buildBookmarksHtml,
  displayUrl,
  formatBytes,
  internalRoute,
  isInternalUrl,
  isLikelyUrl,
  newTab,
  normalizeLocale,
  normalizeNavigationInput,
  parseBookmarksHtml,
  securityState,
  setTabPinned,
  tabTitle,
  truncate,
} from './index'

describe('navigation helpers', () => {
  test('detects internal pages', () => {
    expect(isInternalUrl('maibrowser://history')).toBe(true)
    expect(isInternalUrl('https://maibrowser.dev')).toBe(false)
    expect(internalRoute('maibrowser://settings/appearance')).toBe('settings')
    expect(internalRoute('maibrowser://')).toBe('newtab')
  })

  test('normalizes typed URLs and searches', () => {
    expect(
      normalizeNavigationInput('example.com', 'https://search.test/?q=%s'),
    ).toBe('https://example.com')
    expect(
      normalizeNavigationInput('localhost:5173', 'https://search.test/?q=%s'),
    ).toBe('http://localhost:5173')
    expect(
      normalizeNavigationInput('what is lynx', 'https://search.test/?q=%s'),
    ).toBe('https://search.test/?q=what%20is%20lynx')
    expect(
      normalizeNavigationInput(
        'maibrowser://bookmarks',
        'https://search.test/?q=%s',
      ),
    ).toBe('maibrowser://bookmarks')
  })

  test('classifies likely URLs', () => {
    expect(isLikelyUrl('example.com')).toBe(true)
    expect(isLikelyUrl('127.0.0.1:8080')).toBe(true)
    expect(isLikelyUrl('localhost')).toBe(true)
    expect(isLikelyUrl('hello world')).toBe(false)
    expect(isLikelyUrl('')).toBe(false)
  })

  test('formats display URLs without the scheme', () => {
    expect(displayUrl('https://example.com/a?b=1#c')).toBe(
      'example.com/a?b=1#c',
    )
    expect(displayUrl('maibrowser://history')).toBe('maibrowser://history')
    expect(displayUrl('not a url')).toBe('not a url')
  })

  test('reports security state', () => {
    expect(securityState('https://example.com')).toBe('secure')
    expect(securityState('http://example.com')).toBe('insecure')
    expect(securityState('maibrowser://newtab')).toBe('internal')
    expect(securityState('about:blank')).toBe('unknown')
  })

  test('builds tab titles and tabs', () => {
    const tab = newTab('t_1')
    expect(tab.url).toBe('maibrowser://newtab')
    expect(tab.kind).toBe('internal')
    expect(tab.internalRoute).toBe('newtab')
    expect(tabTitle(tab, 'New Tab')).toBe('New Tab')
    expect(tabTitle({ ...tab, title: 'History' }, 'New Tab')).toBe('History')
  })
})

describe('misc helpers', () => {
  test('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB')
  })

  test('truncates strings safely', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('hello world', 8)).toBe('hello w…')
    expect(truncate(undefined as unknown as string, 8)).toBe('')
  })

  test('normalizes locales', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh-Hans')
    expect(normalizeLocale('zh-TW')).toBe('zh-Hans')
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale(undefined)).toBe('zh-Hans')
  })
})

describe('address suggestions', () => {
  const history = [{ url: 'https://example.com/docs', title: 'Example docs' }]
  const bookmarks = [{ url: 'https://example.com/', title: 'Example' }]

  test('returns search and direct URL choices', () => {
    const search = buildAddressSuggestions(
      'lynx browser',
      'https://search.test/?q=%s',
      'Test',
      [],
      [],
    )
    expect(search).toHaveLength(1)
    expect(search[0].kind).toBe('search')
    expect(search[0].url).toBe('https://search.test/?q=lynx%20browser')

    const direct = buildAddressSuggestions(
      'example.com',
      'https://search.test/?q=%s',
      'Test',
      [],
      [],
    )
    expect(direct[0].kind).toBe('url')
    expect(direct[0].url).toBe('https://example.com')
  })

  test('ranks bookmarks before history and removes duplicate URLs', () => {
    const result = buildAddressSuggestions(
      'example',
      'https://search.test/?q=%s',
      'Test',
      history,
      [...bookmarks, { url: 'https://example.com/', title: 'Duplicate' }],
    )
    expect(result.map((item) => item.kind)).toEqual([
      'bookmark',
      'history',
      'search',
    ])
    expect(
      result.filter((item) => item.url === 'https://example.com/'),
    ).toHaveLength(1)
  })

  test('keeps internal routes and respects the limit', () => {
    expect(
      buildAddressSuggestions(
        'maibrowser://settings',
        'https://search.test/?q=%s',
        'Test',
        [],
        [],
      )[0].url,
    ).toBe('maibrowser://settings')
    expect(
      buildAddressSuggestions(
        'e',
        'https://search.test/?q=%s',
        'Test',
        [],
        [],
        0,
      ),
    ).toEqual([])
  })
})

describe('tab pinning', () => {
  const tabs = [{ ...newTab('a'), pinned: true }, newTab('b'), newTab('c')]

  test('moves a pinned tab into the pinned section', () => {
    const result = setTabPinned(tabs, 'c', true)
    expect(result.map((tab) => tab.id)).toEqual(['a', 'c', 'b'])
  })

  test('moves an unpinned tab after the pinned section', () => {
    const result = setTabPinned(tabs, 'a', false)
    expect(result.map((tab) => tab.id)).toEqual(['a', 'b', 'c'])
    expect(result[0].pinned).toBe(false)
  })
})

describe('bookmark HTML import and export', () => {
  test('parses Netscape bookmark files', () => {
    const html = `<DL><p>
      <DT><A HREF="https://example.com/?a=1&amp;b=2" ADD_DATE="1">Example &amp; Co</A>
      <DT><A HREF='https://lynxjs.org/'>Lynx</A>
      <DT><A HREF="javascript:alert(1)">Bad</A>
      <DT><A HREF="https://example.com/?a=1&amp;b=2">Duplicate</A>
    </DL>`
    expect(parseBookmarksHtml(html)).toEqual([
      { title: 'Example & Co', url: 'https://example.com/?a=1&b=2' },
      { title: 'Lynx', url: 'https://lynxjs.org/' },
    ])
  })

  test('exports escaped bookmark HTML and ignores internal URLs', () => {
    const html = buildBookmarksHtml([
      {
        title: 'A "quoted" <page>',
        url: 'https://example.com/?a=1&b=2',
        createdAt: 1_700_000_000_000,
      },
      { title: 'Settings', url: 'maibrowser://settings' },
    ])
    expect(html).toContain('HREF="https://example.com/?a=1&amp;b=2"')
    expect(html).toContain('A &quot;quoted&quot; &lt;page&gt;')
    expect(html).not.toContain('maibrowser://settings')
  })
})
