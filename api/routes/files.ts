import { Hono } from 'hono'
import type { AppEnv } from '../types'

const app = new Hono<AppEnv>()

// Range (206) pra o player de áudio poder pular pra qualquer ponto da música
app.get('/:key', async (c) => {
  const rangeHeader = c.req.header('range')
  const object = await c.env.BUCKET.get(c.req.param('key'), rangeHeader ? { range: c.req.raw.headers } : undefined)
  if (!object) return c.json({ error: 'não encontrado' }, 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('etag', object.httpEtag)
  headers.set('accept-ranges', 'bytes')
  if (!('body' in object)) return new Response(null, { status: 304, headers })

  const range = object.range as { offset?: number; length?: number; suffix?: number } | undefined
  if (rangeHeader && range) {
    const offset = range.suffix !== undefined ? object.size - range.suffix : (range.offset ?? 0)
    const length = range.suffix !== undefined ? range.suffix : (range.length ?? object.size - offset)
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`)
    headers.set('content-length', String(length))
    return new Response(object.body, { status: 206, headers })
  }
  headers.set('content-length', String(object.size))
  return new Response(object.body, { headers })
})

export default app
