import type { LessonNote } from '../types'

export async function getNote(db: D1Database, itemId: string): Promise<LessonNote | null> {
  return db.prepare('SELECT * FROM lesson_notes WHERE item_id = ?').bind(itemId).first<LessonNote>()
}

export async function saveNote(db: D1Database, itemId: string, content: string): Promise<LessonNote> {
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO lesson_notes (item_id, content, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    )
    .bind(itemId, content, now)
    .run()
  return { item_id: itemId, content, updated_at: now }
}
