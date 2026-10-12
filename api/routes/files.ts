import { Hono } from 'hono'
import type { AppEnv } from '../types'

const app = new Hono<AppEnv>()

app.get('/:key', async (c) => {
  const object = await c.env.BUCKET.get(c.req.param('key'))
  if (!object) return c.json({ error: 'não encontrado' }, 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('etag', object.httpEtag)
  return new Response(object.body, { headers })
})

export default app
