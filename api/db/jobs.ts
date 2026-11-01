import type { HelperToken, Job, JobStatus, JobType } from '../types'

export const JOB_TYPES: JobType[] = ['download', 'music', 'separate', 'enhance', 'open', 'update_tools']

/** Um pedido "rodando" sem notícia há mais que isso volta pra fila (o ajudante caiu no meio). */
const STALE_MS = 15 * 60 * 1000

export async function createJobs(
  db: D1Database,
  type: JobType,
  payloads: unknown[],
  batchId: string | null = null,
): Promise<Job[]> {
  const now = Date.now()
  const jobs: Job[] = payloads.map((payload, i) => ({
    id: crypto.randomUUID(),
    type,
    batch_id: batchId,
    payload: JSON.stringify(payload),
    status: 'fila',
    progress: null,
    message: null,
    result: null,
    created_at: now + i, // mantém a ordem dos links colados
    updated_at: now + i,
  }))
  await db.batch(
    jobs.map((j) =>
      db
        .prepare(
          `INSERT INTO jobs (id, type, batch_id, payload, status, progress, message, result, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'fila', NULL, NULL, NULL, ?, ?)`,
        )
        .bind(j.id, j.type, j.batch_id, j.payload, j.created_at, j.updated_at),
    ),
  )
  return jobs
}

export async function listJobs(
  db: D1Database,
  opts: { types?: string[]; active?: boolean; batchId?: string; limit?: number },
): Promise<Job[]> {
  const where: string[] = []
  const binds: unknown[] = []
  if (opts.types?.length) {
    where.push(`type IN (${opts.types.map(() => '?').join(',')})`)
    binds.push(...opts.types)
  }
  if (opts.active) where.push(`status IN ('fila', 'rodando')`)
  if (opts.batchId) {
    where.push('batch_id = ?')
    binds.push(opts.batchId)
  }
  const sql = `SELECT * FROM jobs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ?`
  const { results } = await db
    .prepare(sql)
    .bind(...binds, opts.limit ?? 60)
    .all<Job>()
  return results
}

export async function getJob(db: D1Database, id: string): Promise<Job | null> {
  return db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first<Job>()
}

export async function cancelJob(db: D1Database, id: string): Promise<boolean> {
  const res = await db
    .prepare(`UPDATE jobs SET status = 'cancelado', updated_at = ? WHERE id = ? AND status IN ('fila', 'rodando')`)
    .bind(Date.now(), id)
    .run()
  return res.meta.changes > 0
}

export async function deleteJob(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare(`DELETE FROM jobs WHERE id = ? AND status NOT IN ('fila', 'rodando')`).bind(id).run()
  return res.meta.changes > 0
}

/** O ajudante pega o próximo pedido da fila (de forma atômica). */
export async function claimNextJob(db: D1Database): Promise<Job | null> {
  const now = Date.now()
  await db
    .prepare(`UPDATE jobs SET status = 'fila', updated_at = ? WHERE status = 'rodando' AND updated_at < ?`)
    .bind(now, now - STALE_MS)
    .run()
  return db
    .prepare(
      `UPDATE jobs SET status = 'rodando', progress = NULL, message = NULL, updated_at = ?
       WHERE id = (SELECT id FROM jobs WHERE status = 'fila' ORDER BY created_at ASC LIMIT 1) AND status = 'fila'
       RETURNING *`,
    )
    .bind(now)
    .first<Job>()
}

/** Atualiza o andamento. Devolve o status atual (o site pode ter cancelado). */
export async function reportProgress(
  db: D1Database,
  id: string,
  progress: number | null,
  message: string | null,
): Promise<JobStatus | null> {
  const job = await db
    .prepare(
      `UPDATE jobs SET progress = ?, message = ?, updated_at = ? WHERE id = ? AND status = 'rodando' RETURNING status`,
    )
    .bind(progress, message, Date.now(), id)
    .first<{ status: JobStatus }>()
  if (job) return job.status
  const current = await getJob(db, id)
  return current?.status ?? null
}

export async function finishJob(
  db: D1Database,
  id: string,
  status: 'ok' | 'erro',
  result: unknown,
  message: string | null,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE jobs SET status = ?, progress = ?, result = ?, message = ?, updated_at = ? WHERE id = ? AND status = 'rodando'`,
    )
    .bind(status, status === 'ok' ? 100 : null, result === undefined ? null : JSON.stringify(result), message, Date.now(), id)
    .run()
  return res.meta.changes > 0
}

// ---------------------------------------------------------------- chaves do ajudante

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return 'hm_' + btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/** Cria uma chave nova. A chave em texto só aparece aqui, uma vez. */
export async function createHelperToken(db: D1Database, name: string): Promise<{ token: string; helper: HelperToken }> {
  const token = randomToken()
  const helper: HelperToken = {
    id: crypto.randomUUID(),
    name,
    token_hash: await sha256(token),
    created_at: Date.now(),
    last_seen: null,
    info: null,
  }
  await db
    .prepare('INSERT INTO helper_tokens (id, name, token_hash, created_at, last_seen, info) VALUES (?, ?, ?, ?, NULL, NULL)')
    .bind(helper.id, helper.name, helper.token_hash, helper.created_at)
    .run()
  return { token, helper }
}

export async function findHelperByToken(db: D1Database, token: string): Promise<HelperToken | null> {
  return db.prepare('SELECT * FROM helper_tokens WHERE token_hash = ?').bind(await sha256(token)).first<HelperToken>()
}

export async function listHelpers(db: D1Database): Promise<Omit<HelperToken, 'token_hash'>[]> {
  const { results } = await db
    .prepare('SELECT id, name, created_at, last_seen, info FROM helper_tokens ORDER BY created_at DESC')
    .all<Omit<HelperToken, 'token_hash'>>()
  return results
}

export async function deleteHelper(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM helper_tokens WHERE id = ?').bind(id).run()
  return res.meta.changes > 0
}

/** Marca que o ajudante deu sinal de vida (no máximo uma escrita a cada 15s). */
export async function touchHelper(db: D1Database, id: string, info?: unknown): Promise<void> {
  const now = Date.now()
  if (info !== undefined) {
    await db.prepare('UPDATE helper_tokens SET last_seen = ?, info = ? WHERE id = ?').bind(now, JSON.stringify(info), id).run()
  } else {
    await db
      .prepare('UPDATE helper_tokens SET last_seen = ? WHERE id = ? AND (last_seen IS NULL OR last_seen < ?)')
      .bind(now, id, now - 15_000)
      .run()
  }
}
