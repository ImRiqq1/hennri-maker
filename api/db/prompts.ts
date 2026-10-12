import type { Prompt } from '../types'

export type PromptInput = {
  title: string
  category: string
  prompt_text: string
  model?: string | null
  aspect_ratio?: string | null
  image_key?: string | null
  ref_image_key?: string | null
  extra_image_key?: string | null
}

export async function listPrompts(db: D1Database, category?: string): Promise<Prompt[]> {
  const stmt = category
    ? db.prepare('SELECT * FROM prompts WHERE category = ? ORDER BY created_at DESC').bind(category)
    : db.prepare('SELECT * FROM prompts ORDER BY created_at DESC')
  const { results } = await stmt.all<Prompt>()
  return results
}

export async function getPrompt(db: D1Database, id: string): Promise<Prompt | null> {
  return db.prepare('SELECT * FROM prompts WHERE id = ?').bind(id).first<Prompt>()
}

export async function createPrompt(db: D1Database, input: PromptInput): Promise<Prompt> {
  const id = crypto.randomUUID()
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO prompts (id, title, category, prompt_text, model, aspect_ratio, image_key, ref_image_key, extra_image_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.title,
      input.category,
      input.prompt_text,
      input.model ?? null,
      input.aspect_ratio ?? null,
      input.image_key ?? null,
      input.ref_image_key ?? null,
      input.extra_image_key ?? null,
      now,
      now,
    )
    .run()
  return {
    id,
    created_at: now,
    updated_at: now,
    model: null,
    aspect_ratio: null,
    image_key: null,
    ref_image_key: null,
    extra_image_key: null,
    ...input,
  }
}

export async function updatePrompt(db: D1Database, id: string, input: Partial<PromptInput>): Promise<Prompt | null> {
  const existing = await getPrompt(db, id)
  if (!existing) return null
  const merged = { ...existing, ...input }
  const now = Date.now()
  await db
    .prepare(
      `UPDATE prompts SET title = ?, category = ?, prompt_text = ?, model = ?, aspect_ratio = ?, image_key = ?, ref_image_key = ?, extra_image_key = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      merged.title,
      merged.category,
      merged.prompt_text,
      merged.model,
      merged.aspect_ratio,
      merged.image_key,
      merged.ref_image_key,
      merged.extra_image_key,
      now,
      id,
    )
    .run()
  return { ...merged, updated_at: now } as Prompt
}

export async function deletePrompt(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM prompts WHERE id = ?').bind(id).run()
  return res.meta.changes > 0
}
