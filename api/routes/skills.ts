import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { createSkill, deleteSkill, getSkill, listSkills, relatedSkills, updateSkill } from '../db/skills'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const category = c.req.query('category') || undefined
  const skills = await listSkills(c.env.DB, category)
  return c.json(skills)
})

app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.name || !body.category || !body.description) {
    return c.json({ error: 'name, category e description são obrigatórios' }, 400)
  }
  const skill = await createSkill(c.env.DB, body)
  return c.json(skill, 201)
})

app.get('/:id', async (c) => {
  const skill = await getSkill(c.env.DB, c.req.param('id'))
  if (!skill) return c.json({ error: 'não encontrada' }, 404)
  const related = await relatedSkills(c.env.DB, skill)
  return c.json({ ...skill, related })
})

app.put('/:id', async (c) => {
  const body = await c.req.json()
  const skill = await updateSkill(c.env.DB, c.req.param('id'), body)
  if (!skill) return c.json({ error: 'não encontrada' }, 404)
  return c.json(skill)
})

app.delete('/:id', async (c) => {
  const ok = await deleteSkill(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'não encontrada' }, 404)
  return c.json({ ok: true })
})

export default app
