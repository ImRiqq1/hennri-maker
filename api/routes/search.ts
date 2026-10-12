import { Hono } from 'hono'
import type { AppEnv } from '../types'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const q = (c.req.query('q') || '').trim()
  if (!q) return c.json([])
  const like = `%${q}%`
  const db = c.env.DB

  const [prompts, skills, refs, aulas] = await Promise.all([
    db
      .prepare('SELECT id, title, category FROM prompts WHERE title LIKE ? OR prompt_text LIKE ? LIMIT 6')
      .bind(like, like)
      .all<{ id: string; title: string; category: string }>(),
    db
      .prepare('SELECT id, name, category FROM skills WHERE name LIKE ? OR description LIKE ? LIMIT 6')
      .bind(like, like)
      .all<{ id: string; name: string; category: string }>(),
    db
      .prepare('SELECT id, name, tab, family FROM references_ WHERE name LIKE ? OR term LIKE ? LIMIT 6')
      .bind(like, like)
      .all<{ id: string; name: string; tab: string; family: string }>(),
    db
      .prepare(
        `SELECT mi.id, mi.name, m.course_id AS course_id, m.name AS module_name
         FROM module_items mi JOIN modules m ON m.id = mi.module_id
         WHERE mi.type = 'aula' AND mi.name LIKE ? LIMIT 6`,
      )
      .bind(like)
      .all<{ id: string; name: string; course_id: string; module_name: string }>(),
  ])

  const results = [
    ...prompts.results.map((p) => ({
      type: 'prompt',
      id: p.id,
      title: p.title,
      meta: `[${p.category}]`,
      href: `/prompts?open=${p.id}`,
    })),
    ...skills.results.map((s) => ({
      type: 'skill',
      id: s.id,
      title: s.name,
      meta: s.category,
      href: `/skills?open=${s.id}`,
    })),
    ...refs.results.map((r) => ({
      type: 'referencia',
      id: r.id,
      title: r.name,
      meta: `${r.family} · ${r.tab}`,
      href: `/referencias/${r.tab}?open=${r.id}`,
    })),
    ...aulas.results.map((a) => ({
      type: 'aula',
      id: a.id,
      title: a.name,
      meta: a.module_name,
      href: `/cursos/${a.course_id}/aula/${a.id}`,
    })),
  ]
  return c.json(results)
})

export default app
