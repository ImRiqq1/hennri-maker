import type { Reference } from '../types'

export type ReferenceInput = {
  tab: string
  family: string
  name: string
  term: string
  media_key?: string | null
  description?: string | null
}

export async function listReferences(db: D1Database, tab?: string): Promise<Reference[]> {
  const stmt = tab
    ? db.prepare('SELECT * FROM references_ WHERE tab = ? ORDER BY family ASC, name ASC').bind(tab)
    : db.prepare('SELECT * FROM references_ ORDER BY tab ASC, family ASC, name ASC')
  const { results } = await stmt.all<Reference>()
  return results
}

export async function getReference(db: D1Database, id: string): Promise<Reference | null> {
  return db.prepare('SELECT * FROM references_ WHERE id = ?').bind(id).first<Reference>()
}

export async function createReference(db: D1Database, input: ReferenceInput): Promise<Reference> {
  const id = crypto.randomUUID()
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO references_ (id, tab, family, name, term, media_key, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, input.tab, input.family, input.name, input.term, input.media_key ?? null, input.description ?? null, now)
    .run()
  return { id, media_key: null, description: null, created_at: now, ...input }
}

export async function updateReference(
  db: D1Database,
  id: string,
  input: Partial<ReferenceInput>,
): Promise<Reference | null> {
  const existing = await getReference(db, id)
  if (!existing) return null
  const merged = { ...existing, ...input }
  await db
    .prepare(`UPDATE references_ SET tab = ?, family = ?, name = ?, term = ?, media_key = ?, description = ? WHERE id = ?`)
    .bind(merged.tab, merged.family, merged.name, merged.term, merged.media_key, merged.description, id)
    .run()
  return merged as Reference
}

export async function deleteReference(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM references_ WHERE id = ?').bind(id).run()
  return res.meta.changes > 0
}
