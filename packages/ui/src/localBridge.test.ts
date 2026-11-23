import { beforeEach, describe, expect, test } from 'bun:test'
import type { Bookmark, HistoryEntry, TabRecord } from '@maibrowser/storage'
import { createLocalBridge } from './localBridge'
import type { BrowserSettings } from './types'

function freshBridge() {
  delete (globalThis as Record<string, unknown>).__MAIBROWSER_LOCAL_STATE__
  return createLocalBridge()
}

async function call<T>(
  bridge: ReturnType<typeof createLocalBridge>,
  method: string,
  args: unknown[],
): Promise<T> {
  return bridge.call<T>('store:call', { method, args })
}

describe('local bridge', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__MAIBROWSER_LOCAL_STATE__
  })

  test('records and searches history', async () => {
    const bridge = freshBridge()
    await call(bridge, 'addVisit', ['https://example.com/', 'Example', 'load'])
    await call(bridge, 'addVisit', ['https://lynxjs.org/', 'Lynx', 'typed'])
    const rows = await call<HistoryEntry[]>(bridge, 'listHistory', [10])
    expect(rows).toHaveLength(2)
    expect(rows.map((entry) => entry.url).sort()).toEqual([
      'https://example.com/',
      'https://lynxjs.org/',
    ])
    const matched = await call<HistoryEntry[]>(bridge, 'searchHistory', [
      'example',
      10,
    ])
    expect(matched.map((entry) => entry.url)).toEqual(['https://example.com/'])
  })

  test('saves bookmarks and sorts them by position', async () => {
    const bridge = freshBridge()
    const first = await call<Bookmark>(bridge, 'saveBookmark', [
      { title: 'One', url: 'https://one.example/', position: 5 },
    ])
    await call(bridge, 'saveBookmark', [
      { title: 'Two', url: 'https://two.example/', position: 0 },
    ])
    const rows = await call<Bookmark[]>(bridge, 'listBookmarks', [])
    expect(rows.map((bookmark) => bookmark.title)).toEqual(['Two', 'One'])
    expect(first.parentId).toBeNull()
  })

  test('persists settings and tab sessions', async () => {
    const bridge = freshBridge()
    const defaults = await bridge.call<BrowserSettings>('store:getSettings')
    expect(defaults.showBookmarksBar).toBe(true)
    await bridge.call('store:saveSettings', {
      settings: { locale: 'en', restoreTabs: false },
    })
    const saved = await bridge.call<BrowserSettings>('store:getSettings')
    expect(saved.locale).toBe('en')
    expect(saved.restoreTabs).toBe(false)
    expect(saved.theme).toBe('system')

    const record: TabRecord = {
      id: 't_1',
      windowId: 'main',
      url: 'https://example.com/',
      title: 'Example',
      favicon: '',
      pinned: false,
      muted: false,
      position: 0,
      kind: 'web',
      internalRoute: null,
      updatedAt: 1,
    }
    await call(bridge, 'saveTabs', [[record]])
    const tabs = await call<TabRecord[]>(bridge, 'listTabs', [])
    expect(tabs[0].url).toBe('https://example.com/')
  })

  test('caches script requirements and resources', async () => {
    const bridge = freshBridge()
    await call(bridge, 'saveScriptResources', [
      {
        scriptId: 'u_resource',
        resources: [
          {
            scriptId: 'u_resource',
            name: 'require:https://cdn.example.test/lib.js',
            mime: 'application/javascript',
            content: 'window.lib = true;',
          },
          {
            scriptId: 'u_resource',
            name: 'resource:logo',
            mime: 'text/plain',
            content: 'mai-browser',
          },
        ],
      },
    ])
    const rows = await call<Array<{ name: string; content: string }>>(
      bridge,
      'listScriptResources',
      ['u_resource'],
    )
    expect(rows).toHaveLength(2)
    expect(rows.find((row) => row.name === 'resource:logo')?.content).toBe(
      'mai-browser',
    )
  })
})
