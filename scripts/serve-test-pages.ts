import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../test-pages',
)
const port = Number(process.env.PORT ?? 4173)

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url)
    const relative = decodeURIComponent(
      url.pathname === '/' ? '/index.html' : url.pathname,
    )
    const target = path.resolve(root, `.${relative}`)
    if (!target.startsWith(root + path.sep)) {
      return new Response('Forbidden', { status: 403 })
    }
    const file = Bun.file(target)
    if (!(await file.exists())) {
      return new Response('Not found', { status: 404 })
    }
    return new Response(file)
  },
})

console.log(`MaiBrowser test pages: http://localhost:${server.port}`)
