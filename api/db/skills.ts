import type { Skill } from '../types'

export type SkillInput = {
  name: string
  category: string
  description: string
  triggers?: string[]
}

export async function listSkills(db: D1Database, category?: string): Promise<Skill[]> {
  const stmt =
    category && category !== 'Todas'
      ? db.prepare('SELECT * FROM skills WHERE category = ? ORDER BY name ASC').bind(category)
      : db.prepare('SELECT * FROM skills ORDER BY name ASC')
  const { results } = await stmt.all<Skill>()
  return results
}

export async function getSkill(db: D1Database, id: string): Promise<Skill | null> {
  return db.prepare('SELECT * FROM skills WHERE id = ?').bind(id).first<Skill>()
}

export async function relatedSkills(db: D1Database, skill: Skill, limit = 4): Promise<Skill[]> {
  if (skill.related_skill_ids) {
    const ids: string[] = JSON.parse(skill.related_skill_ids)
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',')
      const { results } = await db
        .prepare(`SELECT * FROM skills WHERE id IN (${placeholders}) LIMIT ?`)
        .bind(...ids, limit)
        .all<Skill>()
      return results
    }
  }
  const { results } = await db
    .prepare('SELECT * FROM skills WHERE category = ? AND id != ? ORDER BY name ASC LIMIT ?')
    .bind(skill.category, skill.id, limit)
    .all<Skill>()
  return results
}

export async function createSkill(db: D1Database, input: SkillInput): Promise<Skill> {
  const id = crypto.randomUUID()
  const now = Date.now()
  const triggers = input.triggers && input.triggers.length ? JSON.stringify(input.triggers) : null
  await db
    .prepare(
      `INSERT INTO skills (id, name, category, description, triggers, related_skill_ids, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    )
    .bind(id, input.name, input.category, input.description, triggers, now)
    .run()
  return {
    id,
    name: input.name,
    category: input.category,
    description: input.description,
    triggers,
    related_skill_ids: null,
    created_at: now,
  }
}

export async function updateSkill(db: D1Database, id: string, input: Partial<SkillInput>): Promise<Skill | null> {
  const existing = await getSkill(db, id)
  if (!existing) return null
  const triggers = input.triggers ? JSON.stringify(input.triggers) : existing.triggers
  const merged = { ...existing, ...input, triggers }
  await db
    .prepare('UPDATE skills SET name = ?, category = ?, description = ?, triggers = ? WHERE id = ?')
    .bind(merged.name, merged.category, merged.description, merged.triggers, id)
    .run()
  return merged
}

export async function deleteSkill(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM skills WHERE id = ?').bind(id).run()
  return res.meta.changes > 0
}
