import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { DuckDBInstance } from '@duckdb/node-api'
import { createStore, type Store } from '@maibrowser/storage'
import { DuckDbAdapter } from './duckdb'

let store: Store
let adapter: DuckDbAdapter

beforeAll(async () => {
  const instance = await DuckDBInstance.create(':memory:')
  const connection = await instance.connect()
  adapter = new DuckDbAdapter(connection, instance)
  store = createStore(adapter)
  await store.init()
})

afterAll(async () => {
  await adapter.close()
})

describe('DuckDB storage', () => {
  test('persists settings', async () => {
    await store.setSetting('theme', 'dark')
    expect(await store.getSetting('theme')).toBe('dark')
    expect(await store.getSetting('missing', 'fallback')).toBe('fallback')
    const all = await store.listSettings()
    expect(
      all.some((entry) => entry.key === 'theme' && entry.value === 'dark'),
    ).toBe(true)
  })

  test('deduplicates repeated history visits', async () => {
    await store.addVisit('https://example.com/', 'Example', 'load')
    await store.addVisit('https://example.com/', 'Example Domain', 'load')
    const rows = await store.listHistory(10)
    expect(rows).toHaveLength(1)
    expect(rows[0].visitCount).toBe(2)
    expect(rows[0].title).toBe('Example Domain')
    expect((await store.searchHistory('example')).length).toBe(1)
  })

  test('stores bookmarks with optional folders', async () => {
    await store.saveBookmark({
      id: 'b_1',
      parentId: null,
      title: 'Lynx',
      url: 'https://lynxjs.org',
      position: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const rows = await store.listBookmarks()
    expect(rows[0].title).toBe('Lynx')
    expect(rows[0].parentId).toBeNull()
    await store.deleteBookmark('b_1')
    expect(await store.listBookmarks()).toHaveLength(0)
  })

  test('persists tabs and internal routes', async () => {
    const now = Date.now()
    await store.saveTabs([
      {
        id: 't_1',
        windowId: 'main',
        url: 'maibrowser://history',
        title: '',
        favicon: '',
        pinned: false,
        muted: false,
        position: 0,
        kind: 'internal',
        internalRoute: 'history',
        updatedAt: now,
      },
      {
        id: 't_2',
        windowId: 'main',
        url: 'https://example.com/',
        title: 'Example',
        favicon: '',
        pinned: true,
        muted: false,
        position: 1,
        kind: 'web',
        internalRoute: null,
        updatedAt: now,
      },
    ])
    const rows = await store.listTabs()
    expect(rows).toHaveLength(2)
    expect(rows[0].internalRoute).toBe('history')
    expect(rows[1].pinned).toBe(true)
  })

  test('stores userscripts and values', async () => {
    const now = Date.now()
    await store.saveScript({
      id: 'u_1',
      name: 'Test',
      namespace: 'https://example.test/',
      version: '1.0.0',
      description: '',
      source: '// ==UserScript==\n// @name Test\n// ==/UserScript==\n',
      metadata: '{}',
      enabled: true,
      installedAt: now,
      updatedAt: now,
      updateUrl: '',
    })
    await store.setScriptValue('u_1', 'token', 'abc')
    expect(await store.getScriptValues('u_1')).toEqual({ token: 'abc' })
    await store.deleteScriptValue('u_1', 'token')
    expect(await store.getScriptValues('u_1')).toEqual({})
    await store.saveScriptResources('u_1', [
      {
        scriptId: 'u_1',
        name: 'require:https://cdn.example.test/lib.js',
        mime: 'application/javascript',
        content: 'window.lib = true;',
      },
      {
        scriptId: 'u_1',
        name: 'resource:logo',
        mime: 'text/plain',
        content: 'mai-browser',
      },
    ])
    const resources = await store.listScriptResources('u_1')
    expect(resources).toHaveLength(2)
    expect(
      resources.find((item) => item.name === 'resource:logo')?.content,
    ).toBe('mai-browser')
    await store.setScriptEnabled('u_1', false)
    const scripts = await store.listScripts()
    expect(scripts[0].enabled).toBe(false)
    await store.deleteScript('u_1')
    expect(await store.listScripts()).toHaveLength(0)
  })

  test('clears browsing data', async () => {
    await store.addVisit('https://clear.test/', 'Clear', 'typed')
    await store.clearBrowsingData()
    expect(await store.listHistory()).toHaveLength(0)
    expect(await store.listDownloads()).toHaveLength(0)
  })
})
