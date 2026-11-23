import { describe, expect, test } from 'bun:test'
import {
  buildInjection,
  isUserScriptSource,
  matchPattern,
  matchUrl,
  parseMetadata,
} from './index'

const source = `// ==UserScript==
// @name         Example Script
// @name:zh-CN   示例脚本
// @namespace    https://example.com/
// @version      1.2.3
// @description  Adds a badge
// @match        https://example.com/*
// @match        *://*.example.org/*
// @include      https://docs.example.com/*
// @exclude      https://example.com/private/*
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.example.com
// @run-at       document-end
// @noframes
// ==/UserScript==

const badge = document.createElement('div')
badge.textContent = 'MaiBrowser'
document.body.appendChild(badge)
`

describe('userscript metadata', () => {
  test('parses a Tampermonkey header', () => {
    const meta = parseMetadata(source, 'zh-Hans')
    expect(meta).not.toBeNull()
    expect(meta?.name).toBe('示例脚本')
    expect(meta?.version).toBe('1.2.3')
    expect(meta?.namespace).toBe('https://example.com/')
    expect(meta?.match).toHaveLength(2)
    expect(meta?.include).toEqual(['https://docs.example.com/*'])
    expect(meta?.exclude).toEqual(['https://example.com/private/*'])
    expect(meta?.grant).toEqual(['GM_setValue', 'GM_getValue'])
    expect(meta?.connect).toEqual(['api.example.com'])
    expect(meta?.runAt).toBe('document-end')
    expect(meta?.noframes).toBe(true)
  })

  test('rejects plain JavaScript', () => {
    expect(parseMetadata('console.log("hello")')).toBeNull()
    expect(isUserScriptSource('console.log("hello")')).toBe(false)
    expect(isUserScriptSource(source)).toBe(true)
  })

  test('matches @match and @include patterns', () => {
    expect(matchPattern('https://example.com/*', 'https://example.com/a')).toBe(
      true,
    )
    expect(
      matchPattern('*://*.example.org/*', 'https://sub.example.org/a'),
    ).toBe(true)
    expect(matchPattern('*://*.example.org/*', 'https://example.org/a')).toBe(
      true,
    )
    expect(matchPattern('https://example.com/*', 'https://other.com/a')).toBe(
      false,
    )
  })

  test('matches without the URL constructor', () => {
    const original = globalThis.URL
    // Lynx's JS runtime does not provide the URL constructor.
    delete (globalThis as { URL?: typeof URL }).URL
    try {
      expect(
        matchPattern('https://example.com/*', 'https://example.com/a?b=1#c'),
      ).toBe(true)
      expect(
        matchPattern('https://example.com/a', 'https://example.com/a'),
      ).toBe(true)
      expect(
        matchPattern('https://example.com/a', 'https://example.com/b'),
      ).toBe(false)
    } finally {
      globalThis.URL = original
    }
  })

  test('handles ports, queries, hashes, and file URLs', () => {
    expect(
      matchPattern('http://localhost:5173/*', 'http://localhost:5173/a'),
    ).toBe(true)
    expect(
      matchPattern(
        'https://example.com/*',
        'https://example.com/path?q=1#hash',
      ),
    ).toBe(true)
    expect(matchPattern('file:///*', 'file:///C:/tmp/page.html')).toBe(true)
    expect(
      matchPattern('https://example.com/*', 'https://example.com.evil.test/a'),
    ).toBe(false)
  })

  test('honors excludes', () => {
    const meta = parseMetadata(source, 'en')
    expect(meta).not.toBeNull()
    if (!meta) return
    expect(matchUrl(meta, 'https://example.com/page')).toBe(true)
    expect(matchUrl(meta, 'https://example.com/private/page')).toBe(false)
    expect(matchUrl(meta, 'https://docs.example.com/page')).toBe(true)
    expect(matchUrl(meta, 'maibrowser://settings')).toBe(false)
  })

  test('builds an injection with the GM shim and source', () => {
    const meta = parseMetadata(source, 'en')
    expect(meta).not.toBeNull()
    if (!meta) return
    const code = buildInjection(
      [{ id: 'u_test', meta, source, enabled: true }],
      {
        url: 'https://example.com/page',
        values: { u_test: { token: 'value with $& and $1' } },
      },
    )
    expect(code).toContain('GM_setValue')
    expect(code).toContain('GM_xmlhttpRequest')
    expect(code).toContain("badge.textContent = 'MaiBrowser'")
    expect(code).toContain('value with $& and $1')
    expect(code).not.toContain('__MB_ID__')
    expect(
      buildInjection([{ id: 'u_test', meta, source, enabled: true }], {
        url: 'https://unmatched.test/',
      }),
    ).toBe('')
  })

  test('injects required libraries and named resources', () => {
    const meta = parseMetadata(source, 'en')
    expect(meta).not.toBeNull()
    if (!meta) return
    const code = buildInjection(
      [{ id: 'u_test', meta, source, enabled: true }],
      {
        url: 'https://example.com/page',
        requires: { u_test: ['window.__required = true;'] },
        resources: { u_test: { logo: 'data:image/png;base64,AA==' } },
      },
    )
    expect(code).toContain('window.__required = true;')
    expect(code).toContain('"logo":"data:image/png;base64,AA=="')
    expect(code).toContain('data:text/plain;charset=utf-8,')
    expect(code.indexOf('window.__required = true;')).toBeLessThan(
      code.indexOf('GM_setValue'),
    )
  })
})
