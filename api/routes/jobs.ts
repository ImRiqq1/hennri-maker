import { Hono } from 'hono'
import type { AppEnv, JobType } from '../types'
import { JOB_TYPES, cancelJob, createJobs, deleteJob, listJobs } from '../db/jobs'

const app = new Hono<AppEnv>()

const MAX_BATCH = 100

/** Confere o mínimo de cada tipo de pedido antes de pôr na fila. */
function invalidPayload(type: JobType, p: Record<string, unknown>): string | null {
  const str = (k: string) => typeof p[k] === 'string' && (p[k] as string).trim() !== ''
  switch (type) {
    case 'download':
      if (!str('url')) return 'url é obrigatório'
      if (!['premiere', 'max', 'audio'].includes(String(p.mode ?? 'premiere'))) return 'mode inválido'
      return null
    case 'music':
      return str('url') ? null : 'url é obrigatório'
    case 'separate':
      return str('track_id') ? null : 'track_id é obrigatório'
    case 'enhance':
      return str('file_key') || str('track_id') ? null : 'file_key ou track_id é obrigatório'
    case 'open':
      return str('kind') ? null : 'kind é obrigatório'
    case 'update_tools':
      return null
    case 'drive_scan':
    case 'drive':
      if (!str('url') || !/^https?:\/\/(drive|docs)\.google\.com\//.test(String(p.url))) return 'link do Google Drive inválido'
      if (p.dest !== undefined && typeof p.dest !== 'string') return 'dest inválido'
      return null
    case 'drive_google':
      if (p.action === 'logout') return null
      return str('client_id') && str('client_secret') ? null : 'client_id e client_secret são obrigatórios'
  }
}

// cria um pedido ({ type, payload }) ou vários de uma vez ({ type, payloads: [...] })
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const type = body.type as JobType
  if (!JOB_TYPES.includes(type)) return c.json({ error: 'type inválido' }, 400)
  const payloads: Record<string, unknown>[] = Array.isArray(body.payloads) ? body.payloads : [body.payload ?? {}]
  if (!payloads.length) return c.json({ error: 'nada pra fazer' }, 400)
  if (payloads.length > MAX_BATCH) return c.json({ error: `no máximo ${MAX_BATCH} por vez` }, 400)
  for (const p of payloads) {
    const err = invalidPayload(type, p ?? {})
    if (err) return c.json({ error: err }, 400)
  }
  const batchId = payloads.length > 1 ? crypto.randomUUID() : null
  // target = id do ajudante (PC ou Mac) que deve fazer; sem target, qualquer um online pega
  const target = typeof body.target === 'string' && body.target ? body.target : null
  const jobs = await createJobs(c.env.DB, type, payloads, batchId, target)
  return c.json({ batch_id: batchId, jobs }, 201)
})

// lista: ?types=download,music &active=1 &batch=<id> &limit=50
app.get('/', async (c) => {
  const types = c.req.query('types')?.split(',').filter(Boolean)
  const jobs = await listJobs(c.env.DB, {
    types,
    active: c.req.query('active') === '1',
    batchId: c.req.query('batch') || undefined,
    limit: Math.min(200, Number(c.req.query('limit')) || 60),
  })
  return c.json(jobs)
})

app.post('/:id/cancel', async (c) => {
  const ok = await cancelJob(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'pedido não está na fila nem rodando' }, 404)
  return c.json({ ok: true })
})

app.delete('/:id', async (c) => {
  const ok = await deleteJob(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'não encontrado (ou ainda rodando)' }, 404)
  return c.json({ ok: true })
})

export default app
