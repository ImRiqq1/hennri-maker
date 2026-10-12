import { Hono } from 'hono'
import type { AppEnv } from '../types'

const app = new Hono<AppEnv>()

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

app.post('/', async (c) => {
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) {
    return c.json({ error: "envie um campo 'file' multipart" }, 400)
  }
  const contentType = file.type || 'application/octet-stream'
  const ext = EXT_BY_TYPE[contentType]
  const key = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID()
  await c.env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType },
  })
  return c.json({ key }, 201)
})

export default app
