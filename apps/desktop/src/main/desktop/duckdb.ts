import fs from 'node:fs'
import type { DuckDBConnection } from '@duckdb/node-api'
import { DuckDBInstance } from '@duckdb/node-api'
import type { SqlValue, StorageAdapter } from '@maibrowser/storage'
import { createStore, type Store } from '@maibrowser/storage'

export class DuckDbAdapter implements StorageAdapter {
  constructor(
    private readonly connection: DuckDBConnection,
    private readonly instance: DuckDBInstance,
  ) {}

  async query<T = Record<string, unknown>>(
    sql: string,
    params: SqlValue[] = [],
  ): Promise<T[]> {
    const reader = await this.connection.runAndReadAll(sql, params as never)
    return reader.getRowObjectsJS() as T[]
  }

  async execute(sql: string, params: SqlValue[] = []): Promise<void> {
    await this.connection.run(sql, params as never)
  }

  async close(): Promise<void> {
    this.connection.closeSync()
    this.instance.closeSync()
  }
}

export async function openStore(paths: {
  data: string
  database: string
  downloads: string
}): Promise<Store> {
  fs.mkdirSync(paths.data, { recursive: true })
  fs.mkdirSync(paths.downloads, { recursive: true })
  const instance = await DuckDBInstance.create(paths.database)
  const connection = await instance.connect()
  const store = createStore(new DuckDbAdapter(connection, instance))
  await store.init()
  return store
}
