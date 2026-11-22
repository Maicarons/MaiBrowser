import { createId, now } from '@maibrowser/core'

export type SqlValue = string | number | boolean | null | Uint8Array

export interface StorageAdapter {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: SqlValue[],
  ): Promise<T[]>
  execute(sql: string, params?: SqlValue[]): Promise<void>
  close?(): Promise<void>
}

export interface SettingRecord {
  key: string
  value: string
  updatedAt: number
}

export interface HistoryEntry {
  id: string
  url: string
  title: string
  visitedAt: number
  visitCount: number
}

export interface Bookmark {
  id: string
  parentId: string | null
  title: string
  url: string
  position: number
  createdAt: number
  updatedAt: number
}

export interface DownloadRecord {
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

export interface UserScriptRecord {
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

export interface TabRecord {
  id: string
  windowId: string
  url: string
  title: string
  favicon: string
  pinned: boolean
  muted: boolean
  position: number
  kind: 'web' | 'internal'
  internalRoute: string | null
  updatedAt: number
}

interface Migration {
  version: number
  statements: string[]
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS windows (
        id TEXT PRIMARY KEY,
        is_private BOOLEAN NOT NULL,
        bounds TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS tabs (
        id TEXT PRIMARY KEY,
        window_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        favicon TEXT,
        pinned BOOLEAN NOT NULL,
        muted BOOLEAN NOT NULL,
        position INTEGER NOT NULL,
        kind TEXT NOT NULL,
        internal_route TEXT,
        updated_at BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        visited_at BIGINT NOT NULL,
        visit_count INTEGER NOT NULL,
        source TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        title TEXT NOT NULL,
        url TEXT,
        position INTEGER NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT,
        mime TEXT,
        total_bytes BIGINT,
        received_bytes BIGINT NOT NULL,
        state TEXT NOT NULL,
        started_at BIGINT NOT NULL,
        finished_at BIGINT,
        error TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS permissions (
        origin TEXT NOT NULL,
        permission TEXT NOT NULL,
        decision TEXT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (origin, permission)
      )`,
      `CREATE TABLE IF NOT EXISTS userscripts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        namespace TEXT,
        version TEXT,
        description TEXT,
        source TEXT NOT NULL,
        metadata TEXT NOT NULL,
        enabled BOOLEAN NOT NULL,
        installed_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        update_url TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS userscript_values (
        script_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (script_id, key)
      )`,
      `CREATE TABLE IF NOT EXISTS userscript_resources (
        script_id TEXT NOT NULL,
        name TEXT NOT NULL,
        mime TEXT,
        content BLOB,
        PRIMARY KEY (script_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS userscript_runs (
        id TEXT PRIMARY KEY,
        script_id TEXT NOT NULL,
        url TEXT NOT NULL,
        started_at BIGINT NOT NULL,
        finished_at BIGINT,
        error TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS history_visited_idx ON history (visited_at)`,
      `CREATE INDEX IF NOT EXISTS history_url_idx ON history (url)`,
      `CREATE INDEX IF NOT EXISTS bookmarks_parent_idx ON bookmarks (parent_id)`,
      `CREATE INDEX IF NOT EXISTS downloads_started_idx ON downloads (started_at)`,
      `CREATE INDEX IF NOT EXISTS userscripts_enabled_idx ON userscripts (enabled)`,
    ],
  },
]

function asNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  return Number(value ?? 0)
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === 'true'
}

function mapHistory(row: Record<string, unknown>): HistoryEntry {
  return {
    id: String(row.id ?? ''),
    url: String(row.url ?? ''),
    title: String(row.title ?? ''),
    visitedAt: asNumber(row.visited_at),
    visitCount: asNumber(row.visit_count),
  }
}

function mapBookmark(row: Record<string, unknown>): Bookmark {
  return {
    id: String(row.id ?? ''),
    parentId: row.parent_id ? String(row.parent_id) : null,
    title: String(row.title ?? ''),
    url: String(row.url ?? ''),
    position: asNumber(row.position),
    createdAt: asNumber(row.created_at),
    updatedAt: asNumber(row.updated_at),
  }
}

function mapDownload(row: Record<string, unknown>): DownloadRecord {
  return {
    id: String(row.id ?? ''),
    url: String(row.url ?? ''),
    fileName: String(row.file_name ?? ''),
    filePath: String(row.file_path ?? ''),
    mime: String(row.mime ?? ''),
    totalBytes: asNumber(row.total_bytes),
    receivedBytes: asNumber(row.received_bytes),
    state: String(row.state ?? ''),
    startedAt: asNumber(row.started_at),
    finishedAt: row.finished_at == null ? null : asNumber(row.finished_at),
    error: String(row.error ?? ''),
  }
}

function mapScript(row: Record<string, unknown>): UserScriptRecord {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    namespace: String(row.namespace ?? ''),
    version: String(row.version ?? ''),
    description: String(row.description ?? ''),
    source: String(row.source ?? ''),
    metadata: String(row.metadata ?? '{}'),
    enabled: asBoolean(row.enabled),
    installedAt: asNumber(row.installed_at),
    updatedAt: asNumber(row.updated_at),
    updateUrl: String(row.update_url ?? ''),
  }
}

function mapTab(row: Record<string, unknown>): TabRecord {
  return {
    id: String(row.id ?? ''),
    windowId: String(row.window_id ?? ''),
    url: String(row.url ?? ''),
    title: String(row.title ?? ''),
    favicon: String(row.favicon ?? ''),
    pinned: asBoolean(row.pinned),
    muted: asBoolean(row.muted),
    position: asNumber(row.position),
    kind: row.kind === 'internal' ? 'internal' : 'web',
    internalRoute: row.internal_route ? String(row.internal_route) : null,
    updatedAt: asNumber(row.updated_at),
  }
}

export class Store {
  constructor(private readonly adapter: StorageAdapter) {}

  async init(): Promise<void> {
    await this.adapter.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at BIGINT NOT NULL
    )`)
    const rows = await this.adapter.query<{ version: unknown }>(
      'SELECT MAX(version) AS version FROM schema_migrations',
    )
    const current = rows.length > 0 ? asNumber(rows[0].version) : 0
    for (const migration of MIGRATIONS) {
      if (migration.version <= current) continue
      for (const statement of migration.statements) {
        await this.adapter.execute(statement)
      }
      await this.adapter.execute(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        [migration.version, now()],
      )
    }
  }

  async getSetting(key: string, fallback = ''): Promise<string> {
    const rows = await this.adapter.query<Record<string, unknown>>(
      'SELECT value FROM settings WHERE key = ? LIMIT 1',
      [key],
    )
    return rows.length > 0 ? String(rows[0].value ?? fallback) : fallback
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, now()],
    )
  }

  async listSettings(): Promise<SettingRecord[]> {
    const rows = await this.adapter.query<Record<string, unknown>>(
      'SELECT key, value, updated_at FROM settings ORDER BY key',
    )
    return rows.map((row) => ({
      key: String(row.key ?? ''),
      value: String(row.value ?? ''),
      updatedAt: asNumber(row.updated_at),
    }))
  }

  async addVisit(url: string, title: string, source = 'typed'): Promise<void> {
    const visitedAt = now()
    const recent = await this.adapter.query<Record<string, unknown>>(
      `SELECT id, visited_at FROM history WHERE url = ? AND visited_at >= ? ORDER BY visited_at DESC LIMIT 1`,
      [url, visitedAt - 30 * 60 * 1000],
    )
    if (recent.length > 0) {
      await this.adapter.execute(
        'UPDATE history SET visited_at = ?, visit_count = visit_count + 1, title = ? WHERE id = ?',
        [visitedAt, title, String(recent[0].id)],
      )
      return
    }
    await this.adapter.execute(
      `INSERT INTO history (id, url, title, visited_at, visit_count, source)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [createId('h_'), url, title, visitedAt, source],
    )
  }

  async listHistory(limit = 200): Promise<HistoryEntry[]> {
    const rows = await this.adapter.query<Record<string, unknown>>(
      `SELECT id, url, title, visited_at, visit_count FROM history
       ORDER BY visited_at DESC LIMIT ?`,
      [limit],
    )
    return rows.map(mapHistory)
  }

  async searchHistory(query: string, limit = 200): Promise<HistoryEntry[]> {
    const text = query.trim()
    if (!text) return this.listHistory(limit)
    const pattern = `%${text}%`
    const rows = await this.adapter.query<Record<string, unknown>>(
      `SELECT id, url, title, visited_at, visit_count FROM history
       WHERE url ILIKE ? OR title ILIKE ?
       ORDER BY visited_at DESC LIMIT ?`,
      [pattern, pattern, limit],
    )
    return rows.map(mapHistory)
  }

  async deleteHistory(id: string): Promise<void> {
    await this.adapter.execute('DELETE FROM history WHERE id = ?', [id])
  }

  async clearHistory(): Promise<void> {
    await this.adapter.execute('DELETE FROM history')
  }

  async listBookmarks(query = ''): Promise<Bookmark[]> {
    const text = query.trim()
    const rows = text
      ? await this.adapter.query<Record<string, unknown>>(
          `SELECT * FROM bookmarks WHERE title ILIKE ? OR url ILIKE ? ORDER BY position, created_at`,
          [`%${text}%`, `%${text}%`],
        )
      : await this.adapter.query<Record<string, unknown>>(
          'SELECT * FROM bookmarks ORDER BY position, created_at',
        )
    return rows.map(mapBookmark)
  }

  async saveBookmark(input: {
    id?: string
    parentId?: string | null
    title: string
    url: string
    position?: number
  }): Promise<Bookmark> {
    const id = input.id ?? createId('b_')
    const timestamp = now()
    const existing = await this.adapter.query<Record<string, unknown>>(
      'SELECT created_at FROM bookmarks WHERE id = ? LIMIT 1',
      [id],
    )
    const createdAt =
      existing.length > 0 ? asNumber(existing[0].created_at) : timestamp
    const position =
      input.position ??
      (
        await this.adapter.query<Record<string, unknown>>(
          'SELECT COALESCE(MAX(position), -1) + 1 AS position FROM bookmarks WHERE parent_id IS NULL',
        )
      )[0]?.position ??
      0
    await this.adapter.execute(
      `INSERT INTO bookmarks (id, parent_id, title, url, position, created_at, updated_at)
       VALUES (?, CAST(? AS VARCHAR), ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET parent_id = excluded.parent_id, title = excluded.title,
         url = excluded.url, position = excluded.position, updated_at = excluded.updated_at`,
      [
        id,
        input.parentId ?? null,
        input.title,
        input.url,
        asNumber(position),
        createdAt,
        timestamp,
      ],
    )
    return {
      id,
      parentId: input.parentId ?? null,
      title: input.title,
      url: input.url,
      position: asNumber(position),
      createdAt,
      updatedAt: timestamp,
    }
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.adapter.execute('DELETE FROM bookmarks WHERE id = ?', [id])
  }

  async listDownloads(limit = 100): Promise<DownloadRecord[]> {
    const rows = await this.adapter.query<Record<string, unknown>>(
      'SELECT * FROM downloads ORDER BY started_at DESC LIMIT ?',
      [limit],
    )
    return rows.map(mapDownload)
  }

  async saveDownload(record: DownloadRecord): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO downloads (id, url, file_name, file_path, mime, total_bytes, received_bytes, state, started_at, finished_at, error)
       VALUES (?, ?, ?, CAST(? AS VARCHAR), CAST(? AS VARCHAR), CAST(? AS BIGINT), ?, ?, ?, CAST(? AS BIGINT), CAST(? AS VARCHAR))
       ON CONFLICT (id) DO UPDATE SET file_path = excluded.file_path, mime = excluded.mime,
         total_bytes = excluded.total_bytes, received_bytes = excluded.received_bytes,
         state = excluded.state, finished_at = excluded.finished_at, error = excluded.error`,
      [
        record.id,
        record.url,
        record.fileName,
        record.filePath,
        record.mime,
        record.totalBytes,
        record.receivedBytes,
        record.state,
        record.startedAt,
        record.finishedAt,
        record.error,
      ],
    )
  }

  async deleteDownload(id: string): Promise<void> {
    await this.adapter.execute('DELETE FROM downloads WHERE id = ?', [id])
  }

  async listScripts(): Promise<UserScriptRecord[]> {
    const rows = await this.adapter.query<Record<string, unknown>>(
      'SELECT * FROM userscripts ORDER BY name',
    )
    return rows.map(mapScript)
  }

  async getScript(id: string): Promise<UserScriptRecord | null> {
    const rows = await this.adapter.query<Record<string, unknown>>(
      'SELECT * FROM userscripts WHERE id = ? LIMIT 1',
      [id],
    )
    return rows.length > 0 ? mapScript(rows[0]) : null
  }

  async saveScript(record: UserScriptRecord): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO userscripts (id, name, namespace, version, description, source, metadata, enabled, installed_at, updated_at, update_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, namespace = excluded.namespace,
         version = excluded.version, description = excluded.description, source = excluded.source,
         metadata = excluded.metadata, enabled = excluded.enabled, updated_at = excluded.updated_at,
         update_url = excluded.update_url`,
      [
        record.id,
        record.name,
        record.namespace,
        record.version,
        record.description,
        record.source,
        record.metadata,
        record.enabled,
        record.installedAt,
        record.updatedAt,
        record.updateUrl,
      ],
    )
  }

  async deleteScript(id: string): Promise<void> {
    await this.adapter.execute(
      'DELETE FROM userscript_values WHERE script_id = ?',
      [id],
    )
    await this.adapter.execute(
      'DELETE FROM userscript_resources WHERE script_id = ?',
      [id],
    )
    await this.adapter.execute(
      'DELETE FROM userscript_runs WHERE script_id = ?',
      [id],
    )
    await this.adapter.execute('DELETE FROM userscripts WHERE id = ?', [id])
  }

  async setScriptEnabled(id: string, enabled: boolean): Promise<void> {
    await this.adapter.execute(
      'UPDATE userscripts SET enabled = ?, updated_at = ? WHERE id = ?',
      [enabled, now(), id],
    )
  }

  async getScriptValues(scriptId: string): Promise<Record<string, string>> {
    const rows = await this.adapter.query<Record<string, unknown>>(
      'SELECT key, value FROM userscript_values WHERE script_id = ?',
      [scriptId],
    )
    const values: Record<string, string> = {}
    for (const row of rows) values[String(row.key)] = String(row.value)
    return values
  }

  async setScriptValue(
    scriptId: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO userscript_values (script_id, key, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (script_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [scriptId, key, value, now()],
    )
  }

  async deleteScriptValue(scriptId: string, key: string): Promise<void> {
    await this.adapter.execute(
      'DELETE FROM userscript_values WHERE script_id = ? AND key = ?',
      [scriptId, key],
    )
  }

  async saveTabs(tabs: TabRecord[]): Promise<void> {
    await this.adapter.execute('DELETE FROM tabs')
    for (const tab of tabs) {
      await this.adapter.execute(
        `INSERT INTO tabs (id, window_id, url, title, favicon, pinned, muted, position, kind, internal_route, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS VARCHAR), ?)`,
        [
          String(tab.id ?? ''),
          String(tab.windowId ?? 'main'),
          String(tab.url ?? ''),
          String(tab.title ?? ''),
          String(tab.favicon ?? ''),
          Boolean(tab.pinned),
          Boolean(tab.muted),
          Number(tab.position ?? 0),
          tab.kind === 'internal' ? 'internal' : 'web',
          tab.internalRoute == null || tab.internalRoute === ''
            ? null
            : String(tab.internalRoute),
          Number(tab.updatedAt ?? Date.now()),
        ],
      )
    }
  }

  async listTabs(): Promise<TabRecord[]> {
    const rows = await this.adapter.query<Record<string, unknown>>(
      'SELECT * FROM tabs ORDER BY position',
    )
    return rows.map(mapTab)
  }

  async clearBrowsingData(): Promise<void> {
    await this.clearHistory()
    await this.adapter.execute('DELETE FROM downloads')
    await this.adapter.execute('DELETE FROM permissions')
  }
}

export function createStore(adapter: StorageAdapter): Store {
  return new Store(adapter)
}
