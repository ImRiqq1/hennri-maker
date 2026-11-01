import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { createFolder, deleteDownload, deleteFolder, listDownloads, listFolders } from '../db/baixador'

const app = new Hono<AppEnv>()

app.get('/pastas', async (c) => c.json(await listFolders(c.env.DB)))

app.post('/pastas', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 60) : ''
  if (!name) return c.json({ error: 'name é obrigatório' }, 400)
  const folder = await createFolder(c.env.DB, name)
  if (!folder) return c.json({ error: 'Já existe uma pasta com esse nome.' }, 409)
  return c.json(folder, 201)
})

// tira a pasta da lista; os arquivos continuam no PC
app.delete('/pastas/:id', async (c) => {
  const ok = await deleteFolder(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'não encontrada' }, 404)
  return c.json({ ok: true })
})

app.get('/downloads', async (c) => {
  const folder = c.req.query('pasta') || undefined
  return c.json(await listDownloads(c.env.DB, folder, Math.min(500, Number(c.req.query('limit')) || 200)))
})

app.delete('/downloads/:id', async (c) => {
  const d = await deleteDownload(c.env.DB, c.req.param('id'))
  if (!d) return c.json({ error: 'não encontrado' }, 404)
  if (d.thumb_key) await c.env.BUCKET.delete(d.thumb_key)
  return c.json({ ok: true })
})

export default app
