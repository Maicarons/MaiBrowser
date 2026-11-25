import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { DownloadRecord, Store } from '@maibrowser/storage'
import { downloadFile } from 'ipull'

type Engine = Awaited<ReturnType<typeof downloadFile>>

interface Task {
  id: string
  engine: Engine
  record: DownloadRecord
  settled: boolean
  saveTimer: ReturnType<typeof setTimeout> | null
}

export interface StartDownloadInput {
  id?: string
  url?: string
  fileName?: string
  mime?: string
  referrer?: string
}

function safeFileName(input: string): string {
  const base = Array.from(path.basename(input))
    .map((character) =>
      character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)
        ? '_'
        : character,
    )
    .join('')
    .trim()
    .replace(/^\.+/, '')
  return base || `download-${Date.now()}.bin`
}

function fileNameFromUrl(value: string): string {
  try {
    const parsed = new URL(value)
    const name = decodeURIComponent(path.basename(parsed.pathname))
    if (name && name !== '/') return safeFileName(name)
  } catch {
    // use the fallback below
  }
  return `download-${Date.now()}.bin`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class DownloadManager {
  private readonly tasks = new Map<string, Task>()

  constructor(
    private readonly store: Store,
    private readonly directory: string,
    private readonly userAgent: string,
  ) {}

  async init(): Promise<void> {
    await fs.promises.mkdir(this.directory, { recursive: true })
    const rows = await this.store.listDownloads(200)
    for (const record of rows) {
      if (
        record.state === 'downloading' ||
        record.state === 'queued' ||
        record.state === 'paused'
      ) {
        await this.store.saveDownload({
          ...record,
          state: 'failed',
          error: 'Download interrupted by app restart',
          finishedAt: Date.now(),
        })
      }
    }
  }

  async start(input: StartDownloadInput): Promise<DownloadRecord> {
    const url = String(input.url ?? '')
    if (!/^https?:\/\//i.test(url)) {
      throw new Error('Only http(s) download URLs are supported')
    }
    const id = String(input.id || `d_${randomUUID()}`)
    const existing = this.tasks.get(id)
    if (existing) await this.cancel(id)

    await fs.promises.mkdir(this.directory, { recursive: true })
    const fileName = this.uniqueFileName(
      safeFileName(String(input.fileName ?? '').trim() || fileNameFromUrl(url)),
    )
    const savePath = path.join(this.directory, fileName)
    const record: DownloadRecord = {
      id,
      url,
      fileName,
      filePath: savePath,
      mime: String(input.mime ?? ''),
      totalBytes: 0,
      receivedBytes: 0,
      state: 'queued',
      startedAt: Date.now(),
      finishedAt: null,
      error: '',
    }
    await this.store.saveDownload(record)

    try {
      const referrer = String(input.referrer ?? '')
      const engine = await downloadFile({
        url,
        savePath,
        parallelStreams: 4,
        autoIncreaseParallelStreams: true,
        retry: { retries: 2 },
        cliProgress: false,
        headers: {
          'User-Agent': this.userAgent,
          ...(referrer && /^https?:\/\//i.test(referrer)
            ? { Referer: referrer }
            : {}),
        },
      })
      const fileEngine = (
        engine as unknown as {
          _engine?: { options?: { onPausedAsync?: () => Promise<void> } }
        }
      )._engine
      if (fileEngine?.options) {
        fileEngine.options.onPausedAsync = async () => undefined
      }
      const task: Task = {
        id,
        engine,
        record: {
          ...record,
          fileName: engine.fileName || fileName,
          filePath: engine.finalFileAbsolutePath || savePath,
        },
        settled: false,
        saveTimer: null,
      }
      this.tasks.set(id, task)
      await this.store.saveDownload(task.record)
      engine.on('progress', (progress) => {
        if (task.settled) return
        task.record.totalBytes = progress.totalBytes || task.record.totalBytes
        task.record.receivedBytes = progress.transferredBytes
        task.record.state = this.stateFor(progress.downloadStatus)
        this.persist(task)
      })
      engine.on('paused', () => {
        if (task.settled) return
        task.record.state = 'paused'
        this.persist(task)
      })
      engine.on('resumed', () => {
        if (task.settled) return
        task.record.state = 'downloading'
        this.persist(task)
      })
      void engine
        .download()
        .then(() => this.finish(task, 'completed'))
        .catch((error: unknown) => this.finish(task, 'failed', error))
      return task.record
    } catch (error) {
      record.state = 'failed'
      record.error = errorMessage(error)
      record.finishedAt = Date.now()
      await this.store.saveDownload(record)
      throw error
    }
  }

  async pause(id: string): Promise<DownloadRecord> {
    const task = this.tasks.get(id)
    if (!task || task.settled) throw new Error('Download is not active')
    await task.engine.pause()
    task.record.state = 'paused'
    await this.store.saveDownload(task.record)
    return task.record
  }

  async resume(id: string): Promise<DownloadRecord> {
    const task = this.tasks.get(id)
    if (!task || task.settled) throw new Error('Download is not active')
    task.engine.resume()
    task.record.state = 'downloading'
    await this.store.saveDownload(task.record)
    return task.record
  }

  async cancel(id: string): Promise<DownloadRecord | null> {
    const task = this.tasks.get(id)
    if (!task) return null
    task.settled = true
    if (task.saveTimer) {
      clearTimeout(task.saveTimer)
      task.saveTimer = null
    }
    try {
      await task.engine.close({ deleteFile: true, deleteTempFile: true })
    } catch {
      // the record still needs to reflect cancellation
    }
    task.record.state = 'cancelled'
    task.record.finishedAt = Date.now()
    task.record.error = ''
    await this.store.saveDownload(task.record)
    this.tasks.delete(id)
    return task.record
  }

  async list(): Promise<DownloadRecord[]> {
    return this.store.listDownloads(100)
  }

  async dispose(): Promise<void> {
    for (const task of this.tasks.values()) {
      task.settled = true
      if (task.saveTimer) clearTimeout(task.saveTimer)
      await task.engine.close({ deleteTempFile: false }).catch(() => undefined)
    }
    this.tasks.clear()
  }

  private async finish(
    task: Task,
    state: 'completed' | 'failed',
    error?: unknown,
  ): Promise<void> {
    if (task.settled) return
    task.settled = true
    if (task.saveTimer) {
      clearTimeout(task.saveTimer)
      task.saveTimer = null
    }
    task.record.state = state
    task.record.finishedAt = Date.now()
    task.record.error =
      state === 'failed' ? errorMessage(error ?? 'Download failed') : ''
    if (state === 'completed') {
      task.record.totalBytes =
        task.record.totalBytes || task.record.receivedBytes
      task.record.receivedBytes = task.record.totalBytes
    }
    await this.store.saveDownload(task.record)
    this.tasks.delete(task.id)
  }

  private persist(task: Task): void {
    if (task.saveTimer) return
    task.saveTimer = setTimeout(() => {
      task.saveTimer = null
      if (!task.settled) {
        void this.store.saveDownload(task.record).catch(() => undefined)
      }
    }, 250)
  }

  private stateFor(status: string): string {
    if (status === 'Paused') return 'paused'
    if (status === 'Cancelled') return 'cancelled'
    if (status === 'Error') return 'failed'
    if (status === 'NotStarted') return 'queued'
    return 'downloading'
  }

  private uniqueFileName(input: string): string {
    const extension = path.extname(input)
    const stem = input.slice(0, input.length - extension.length) || 'download'
    let candidate = input
    let index = 1
    while (fs.existsSync(path.join(this.directory, candidate))) {
      candidate = `${stem} (${index})${extension}`
      index += 1
    }
    return candidate
  }
}
