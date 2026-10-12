import type { Course, Module, ModuleItem } from '../types'

export async function listCourses(db: D1Database) {
  const { results: courses } = await db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all<Course>()
  const out = []
  for (const course of courses) {
    const progress = await db
      .prepare(
        `SELECT
           COUNT(*) FILTER (WHERE mi.type = 'aula') AS total,
           COUNT(*) FILTER (WHERE mi.type = 'aula' AND mi.completed_at IS NOT NULL) AS done
         FROM module_items mi
         JOIN modules m ON m.id = mi.module_id
         WHERE m.course_id = ?`,
      )
      .bind(course.id)
      .first<{ total: number; done: number }>()
    const total = progress?.total ?? 0
    const done = progress?.done ?? 0
    out.push({ ...course, total, done, status: total > 0 && done === total ? 'concluido' : 'andamento' })
  }
  return out
}

export async function getCourseDetail(db: D1Database, id: string) {
  const course = await db.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first<Course>()
  if (!course) return null
  const { results: modules } = await db
    .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC')
    .bind(id)
    .all<Module>()
  const { results: items } = await db
    .prepare(
      `SELECT mi.* FROM module_items mi JOIN modules m ON m.id = mi.module_id
       WHERE m.course_id = ? ORDER BY m.order_index ASC, mi.order_index ASC`,
    )
    .bind(id)
    .all<ModuleItem>()

  const byModule = new Map<string, ModuleItem[]>()
  for (const item of items) {
    const list = byModule.get(item.module_id) ?? []
    list.push(item)
    byModule.set(item.module_id, list)
  }
  const modulesWithItems = modules.map((m) => ({ ...m, items: byModule.get(m.id) ?? [] }))

  const aulas = items.filter((i) => i.type === 'aula')
  const total = aulas.length
  const done = aulas.filter((i) => i.completed_at !== null).length
  const nextItem = aulas.find((i) => i.completed_at === null) ?? aulas[0] ?? null

  return {
    ...course,
    modules: modulesWithItems,
    total,
    done,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
    next_item_id: nextItem?.id ?? null,
  }
}

export async function createCourse(
  db: D1Database,
  input: { name: string; author?: string | null; cover_key?: string | null },
): Promise<Course> {
  const id = crypto.randomUUID()
  const now = Date.now()
  await db
    .prepare('INSERT INTO courses (id, name, author, cover_key, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, input.name, input.author ?? null, input.cover_key ?? null, now)
    .run()
  return { id, name: input.name, author: input.author ?? null, cover_key: input.cover_key ?? null, created_at: now }
}

export async function addModule(
  db: D1Database,
  courseId: string,
  input: { name: string; track?: string | null; order_index?: number },
): Promise<Module> {
  const id = crypto.randomUUID()
  let orderIndex = input.order_index
  if (orderIndex === undefined) {
    const max = await db
      .prepare('SELECT COALESCE(MAX(order_index), 0) AS n FROM modules WHERE course_id = ?')
      .bind(courseId)
      .first<{ n: number }>()
    orderIndex = (max?.n ?? 0) + 1
  }
  await db
    .prepare('INSERT INTO modules (id, course_id, name, track, order_index) VALUES (?, ?, ?, ?, ?)')
    .bind(id, courseId, input.name, input.track ?? null, orderIndex)
    .run()
  return { id, course_id: courseId, name: input.name, track: input.track ?? null, order_index: orderIndex }
}

export async function updateModule(db: D1Database, id: string, input: Partial<Module>): Promise<Module | null> {
  const existing = await db.prepare('SELECT * FROM modules WHERE id = ?').bind(id).first<Module>()
  if (!existing) return null
  const merged = { ...existing, ...input }
  await db
    .prepare('UPDATE modules SET name = ?, track = ?, order_index = ? WHERE id = ?')
    .bind(merged.name, merged.track, merged.order_index, id)
    .run()
  return merged
}

export async function deleteModule(db: D1Database, id: string): Promise<boolean> {
  await db.prepare('DELETE FROM module_items WHERE module_id = ?').bind(id).run()
  const res = await db.prepare('DELETE FROM modules WHERE id = ?').bind(id).run()
  return res.meta.changes > 0
}

export type ModuleItemInput = {
  type: 'aula' | 'material'
  name: string
  order_index?: number
  drive_url?: string | null
  duration_seconds?: number | null
  cover_key?: string | null
  file_format?: string | null
  file_size_mb?: number | null
}

export async function addModuleItem(db: D1Database, moduleId: string, input: ModuleItemInput): Promise<ModuleItem> {
  const id = crypto.randomUUID()
  let orderIndex = input.order_index
  if (orderIndex === undefined) {
    const max = await db
      .prepare('SELECT COALESCE(MAX(order_index), 0) AS n FROM module_items WHERE module_id = ?')
      .bind(moduleId)
      .first<{ n: number }>()
    orderIndex = (max?.n ?? 0) + 1
  }
  await db
    .prepare(
      `INSERT INTO module_items (id, module_id, type, name, order_index, drive_url, duration_seconds, cover_key, file_format, file_size_mb, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      id,
      moduleId,
      input.type,
      input.name,
      orderIndex,
      input.drive_url ?? null,
      input.duration_seconds ?? null,
      input.cover_key ?? null,
      input.file_format ?? null,
      input.file_size_mb ?? null,
    )
    .run()
  return {
    id,
    module_id: moduleId,
    type: input.type,
    name: input.name,
    order_index: orderIndex,
    drive_url: input.drive_url ?? null,
    duration_seconds: input.duration_seconds ?? null,
    cover_key: input.cover_key ?? null,
    file_format: input.file_format ?? null,
    file_size_mb: input.file_size_mb ?? null,
    completed_at: null,
  }
}

export async function getModuleItem(db: D1Database, id: string): Promise<ModuleItem | null> {
  return db.prepare('SELECT * FROM module_items WHERE id = ?').bind(id).first<ModuleItem>()
}

export async function updateModuleItem(
  db: D1Database,
  id: string,
  input: Partial<ModuleItemInput>,
): Promise<ModuleItem | null> {
  const existing = await getModuleItem(db, id)
  if (!existing) return null
  const merged = { ...existing, ...input }
  await db
    .prepare(
      `UPDATE module_items SET type = ?, name = ?, order_index = ?, drive_url = ?, duration_seconds = ?, cover_key = ?, file_format = ?, file_size_mb = ?
       WHERE id = ?`,
    )
    .bind(
      merged.type,
      merged.name,
      merged.order_index,
      merged.drive_url,
      merged.duration_seconds,
      merged.cover_key,
      merged.file_format,
      merged.file_size_mb,
      id,
    )
    .run()
  return merged as ModuleItem
}

export async function deleteModuleItem(db: D1Database, id: string): Promise<boolean> {
  await db.prepare('DELETE FROM lesson_notes WHERE item_id = ?').bind(id).run()
  const res = await db.prepare('DELETE FROM module_items WHERE id = ?').bind(id).run()
  return res.meta.changes > 0
}

export async function toggleItemComplete(db: D1Database, id: string): Promise<ModuleItem | null> {
  const existing = await getModuleItem(db, id)
  if (!existing) return null
  const completed_at = existing.completed_at ? null : Date.now()
  await db.prepare('UPDATE module_items SET completed_at = ? WHERE id = ?').bind(completed_at, id).run()
  return { ...existing, completed_at }
}
