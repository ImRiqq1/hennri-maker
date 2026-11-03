import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { AppEnv, Env, HelperToken } from '../types'
import {
  approvePair,
  claimNextJob,
  createHelperToken,
  deleteHelper,
  findHelperByToken,
  findPendingPair,
  finishJob,
  getJob,
  listHelpers,
  pollPair,
  reportProgress,
  startPair,
  touchHelper,
} from '../db/jobs'
import { createTrack, getTrack, updateTrack } from '../db/tracks'
import { createDownload, listFolders } from '../db/baixador'

/** Ajudante "online" = deu sinal de vida nos últimos 40s. */
const ONLINE_MS = 40_000

// ================================================================ lado do site (login normal)

export const helperSite = new Hono<AppEnv>()

helperSite.get('/status', async (c) => {
  const helpers = await listHelpers(c.env.DB)
  const now = Date.now()
  const online = helpers.find((h) => h.last_seen && now - h.last_seen < ONLINE_MS)
  return c.json({
    online: !!online,
    paired: helpers.length > 0,
    last_seen: helpers.reduce<number | null>((m, h) => (h.last_seen && (!m || h.last_seen > m) ? h.last_seen : m), null),
    info: online?.info ? JSON.parse(online.info) : null,
  })
})

helperSite.get('/', async (c) => c.json(await listHelpers(c.env.DB)))

// gera uma chave nova pra conectar o ajudante (aparece uma vez só)
helperSite.post('/pair', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : 'Meu PC'
  const { token, helper } = await createHelperToken(c.env.DB, name)
  return c.json({ token, id: helper.id, name: helper.name }, 201)
})

// tela "Conectar este computador?": mostra o que pediu o código
helperSite.get('/pair/:code', async (c) => {
  const req = await findPendingPair(c.env.DB, c.req.param('code'))
  if (!req) return c.json({ error: 'Código não encontrado ou expirado.' }, 404)
  return c.json({ code: req.code, name: req.name, platform: req.platform, expires_at: req.expires_at })
})

helperSite.post('/pair/:code/approve', async (c) => {
  const req = await approvePair(c.env.DB, c.req.param('code'))
  if (!req) return c.json({ error: 'Código não encontrado ou expirado.' }, 404)
  return c.json({ ok: true, id: req.helper_id, name: req.name, platform: req.platform })
})

helperSite.delete('/:id', async (c) => {
  const ok = await deleteHelper(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'não encontrado' }, 404)
  return c.json({ ok: true })
})

// ================================================================ lado do ajudante (chave Bearer)

type AgentEnv = { Bindings: Env; Variables: { helper: HelperToken } }

const requireHelper = createMiddleware<AgentEnv>(async (c, next) => {
  const auth = c.req.header('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const helper = token ? await findHelperByToken(c.env.DB, token) : null
  if (!helper) return c.json({ error: 'chave do ajudante inválida' }, 401)
  c.set('helper', helper)
  await next()
})

export const helperAgent = new Hono<AgentEnv>()
helperAgent.use('*', requireHelper)

// sinal de vida + informações (versões, placa de vídeo, pasta dos arquivos)
helperAgent.post('/heartbeat', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await touchHelper(c.env.DB, c.get('helper').id, body.info ?? undefined)
  return c.json({ ok: true })
})

// pega o próximo pedido da fila; 204 = nada pra fazer
helperAgent.post('/jobs/claim', async (c) => {
  await touchHelper(c.env.DB, c.get('helper').id)
  const job = await claimNextJob(c.env.DB, c.get('helper').id)
  if (!job) return c.body(null, 204)
  return c.json({ ...job, payload: JSON.parse(job.payload) })
})

// andamento; a resposta diz se o site cancelou ({ cancel: true })
helperAgent.post('/jobs/:id/progress', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const progress = typeof body.progress === 'number' ? Math.max(0, Math.min(100, body.progress)) : null
  const message = typeof body.message === 'string' ? body.message.slice(0, 300) : null
  const detail = body.detail && typeof body.detail === 'object' ? body.detail : undefined
  const status = await reportProgress(c.env.DB, c.req.param('id'), progress, message, detail)
  if (!status) return c.json({ error: 'pedido não encontrado' }, 404)
  return c.json({ status, cancel: status === 'cancelado' })
})

helperAgent.post('/jobs/:id/done', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const ok = await finishJob(c.env.DB, c.req.param('id'), 'ok', body.result, typeof body.message === 'string' ? body.message : null)
  if (!ok) return c.json({ error: 'pedido não está rodando (cancelado?)' }, 409)
  return c.json({ ok: true })
})

helperAgent.post('/jobs/:id/fail', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const message = typeof body.error === 'string' ? body.error.slice(0, 300) : 'Erro desconhecido.'
  const ok = await finishJob(c.env.DB, c.req.param('id'), 'erro', body.result, message)
  if (!ok) return c.json({ error: 'pedido não está rodando (cancelado?)' }, 409)
  return c.json({ ok: true })
})

helperAgent.get('/jobs/:id', async (c) => {
  const job = await getJob(c.env.DB, c.req.param('id'))
  if (!job) return c.json({ error: 'não encontrado' }, 404)
  return c.json({ ...job, payload: JSON.parse(job.payload) })
})

// envia um arquivo pro R2 (corpo cru). ?ext=mp3 &type=audio/mpeg → { key }
helperAgent.put('/files', async (c) => {
  const ext = (c.req.query('ext') || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase()
  const contentType = c.req.query('type') || c.req.header('content-type') || 'application/octet-stream'
  if (!c.req.raw.body) return c.json({ error: 'corpo vazio' }, 400)
  const key = `${crypto.randomUUID()}.${ext}`
  await c.env.BUCKET.put(key, c.req.raw.body, { httpMetadata: { contentType } })
  return c.json({ key }, 201)
})

// baixa um arquivo do R2 (ex.: áudio que você enviou pelo site pra separar a voz)
helperAgent.get('/files/:key', async (c) => {
  const object = await c.env.BUCKET.get(c.req.param('key'))
  if (!object) return c.json({ error: 'não encontrado' }, 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  return new Response(object.body, { headers })
})

helperAgent.get('/folders', async (c) => c.json(await listFolders(c.env.DB)))

helperAgent.get('/tracks/:id', async (c) => {
  const track = await getTrack(c.env.DB, c.req.param('id'))
  if (!track) return c.json({ error: 'não encontrada' }, 404)
  return c.json(track)
})

helperAgent.post('/tracks', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!body.title || !body.source) return c.json({ error: 'title e source são obrigatórios' }, 400)
  return c.json(await createTrack(c.env.DB, body), 201)
})

helperAgent.patch('/tracks/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const track = await updateTrack(c.env.DB, c.req.param('id'), body)
  if (!track) return c.json({ error: 'não encontrada' }, 404)
  return c.json(track)
})

helperAgent.post('/downloads', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!body.url || !body.platform || !body.mode) return c.json({ error: 'url, platform e mode são obrigatórios' }, 400)
  return c.json(await createDownload(c.env.DB, body), 201)
})

// ================================================================ conectar por código (sem login)

export const pairPublic = new Hono<AppEnv>()

// o ajudante sem chave pede um código pra mostrar na tela
pairPublic.post('/start', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Computador'
  const platform = ['windows', 'mac', 'linux'].includes(body.platform) ? body.platform : null
  const started = await startPair(c.env.DB, name, platform)
  if (!started) return c.json({ error: 'Muitos pedidos de conexão agora. Tente de novo em alguns minutos.' }, 429)
  const { request, pollSecret } = started
  return c.json({ request_id: request.id, poll_secret: pollSecret, code: request.code, expires_at: request.expires_at }, 201)
})

// e pergunta se você já confirmou no site (202 = ainda não, 410 = expirou)
pairPublic.post('/poll', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (typeof body.request_id !== 'string' || typeof body.poll_secret !== 'string') {
    return c.json({ error: 'request_id e poll_secret são obrigatórios' }, 400)
  }
  const r = await pollPair(c.env.DB, body.request_id, body.poll_secret)
  if (r.status === 'approved') return c.json(r)
  if (r.status === 'pending') return c.json(r, 202)
  return c.json({ status: 'expired' }, 410)
})
