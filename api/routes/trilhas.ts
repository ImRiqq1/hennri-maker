import { Hono } from 'hono'
import type { AppEnv, Playlist, Project } from '../types'
import {
  addToPlaylist,
  createNamed,
  createTrack,
  deleteNamed,
  deleteTrack,
  listNamed,
  listTracks,
  removeFromPlaylist,
  renameNamed,
  updateTrack,
} from '../db/tracks'

const app = new Hono<AppEnv>()

// ---------------------------------------------------------------- trilhas

app.get('/tracks', async (c) => c.json(await listTracks(c.env.DB)))

// trilha a partir de um áudio enviado pelo site (/api/upload) — ex.: pra separar a voz de um arquivo seu
app.post('/tracks', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
  if (!title || typeof body.audio_key !== 'string') return c.json({ error: 'title e audio_key são obrigatórios' }, 400)
  const track = await createTrack(c.env.DB, {
    title,
    artist: typeof body.artist === 'string' ? body.artist.trim() || null : null,
    source: 'upload',
    audio_key: body.audio_key,
    cover_key: typeof body.cover_key === 'string' ? body.cover_key : null,
    duration_seconds: typeof body.duration_seconds === 'number' ? Math.round(body.duration_seconds) : null,
    intents: Array.isArray(body.intents) ? body.intents : undefined,
  })
  return c.json(track, 201)
})

// edita nome, artista, capa, intenções e projetos
app.patch('/tracks/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const allowed: Record<string, unknown> = {}
  for (const k of ['title', 'artist', 'cover_key', 'intents', 'project_ids'] as const) {
    if (body[k] !== undefined) allowed[k] = body[k]
  }
  if (allowed.title !== undefined && !String(allowed.title).trim()) return c.json({ error: 'title não pode ficar vazio' }, 400)
  const track = await updateTrack(c.env.DB, c.req.param('id'), allowed)
  if (!track) return c.json({ error: 'não encontrada' }, 404)
  return c.json(track)
})

// apaga a trilha do site (o arquivo no PC continua)
app.delete('/tracks/:id', async (c) => {
  const keys = await deleteTrack(c.env.DB, c.req.param('id'))
  if (!keys) return c.json({ error: 'não encontrada' }, 404)
  if (keys.length) await c.env.BUCKET.delete(keys)
  return c.json({ ok: true })
})

// ---------------------------------------------------------------- playlists e projetos

for (const table of ['playlists', 'projects'] as const) {
  app.get(`/${table}`, async (c) => c.json(await listNamed<Playlist | Project>(c.env.DB, table)))

  app.post(`/${table}`, async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
    if (!name) return c.json({ error: 'name é obrigatório' }, 400)
    return c.json(await createNamed(c.env.DB, table, name), 201)
  })

  app.patch(`/${table}/:id`, async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
    if (!name) return c.json({ error: 'name é obrigatório' }, 400)
    const ok = await renameNamed(c.env.DB, table, c.req.param('id'), name)
    if (!ok) return c.json({ error: 'não encontrado' }, 404)
    return c.json({ ok: true })
  })

  app.delete(`/${table}/:id`, async (c) => {
    const ok = await deleteNamed(c.env.DB, table, c.req.param('id'))
    if (!ok) return c.json({ error: 'não encontrado' }, 404)
    return c.json({ ok: true })
  })
}

app.post('/playlists/:id/tracks', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.track_ids) ? body.track_ids : body.track_id ? [body.track_id] : []
  if (!ids.length) return c.json({ error: 'track_id ou track_ids é obrigatório' }, 400)
  await addToPlaylist(c.env.DB, c.req.param('id'), ids)
  return c.json({ ok: true })
})

app.delete('/playlists/:id/tracks/:trackId', async (c) => {
  const ok = await removeFromPlaylist(c.env.DB, c.req.param('id'), c.req.param('trackId'))
  if (!ok) return c.json({ error: 'não estava na playlist' }, 404)
  return c.json({ ok: true })
})

export default app
