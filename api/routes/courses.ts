import { Hono } from 'hono'
import type { AppEnv } from '../types'
import {
  addModule,
  addModuleItem,
  createCourse,
  deleteModule,
  deleteModuleItem,
  getCourseDetail,
  listCourses,
  toggleItemComplete,
  updateModule,
  updateModuleItem,
} from '../db/courses'
import { getNote, saveNote } from '../db/notes'

const app = new Hono<AppEnv>()

app.get('/courses', async (c) => c.json(await listCourses(c.env.DB)))

app.post('/courses', async (c) => {
  const body = await c.req.json()
  if (!body.name) return c.json({ error: 'name é obrigatório' }, 400)
  const course = await createCourse(c.env.DB, body)
  return c.json(course, 201)
})

app.get('/courses/:id', async (c) => {
  const course = await getCourseDetail(c.env.DB, c.req.param('id'))
  if (!course) return c.json({ error: 'não encontrado' }, 404)
  return c.json(course)
})

app.post('/courses/:id/modules', async (c) => {
  const body = await c.req.json()
  if (!body.name) return c.json({ error: 'name é obrigatório' }, 400)
  const mod = await addModule(c.env.DB, c.req.param('id'), body)
  return c.json(mod, 201)
})

app.put('/modules/:id', async (c) => {
  const body = await c.req.json()
  const mod = await updateModule(c.env.DB, c.req.param('id'), body)
  if (!mod) return c.json({ error: 'não encontrado' }, 404)
  return c.json(mod)
})

app.delete('/modules/:id', async (c) => {
  const ok = await deleteModule(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'não encontrado' }, 404)
  return c.json({ ok: true })
})

app.post('/modules/:id/items', async (c) => {
  const body = await c.req.json()
  if (!body.type || !body.name) return c.json({ error: 'type e name são obrigatórios' }, 400)
  const item = await addModuleItem(c.env.DB, c.req.param('id'), body)
  return c.json(item, 201)
})

app.put('/items/:id', async (c) => {
  const body = await c.req.json()
  const item = await updateModuleItem(c.env.DB, c.req.param('id'), body)
  if (!item) return c.json({ error: 'não encontrado' }, 404)
  return c.json(item)
})

app.delete('/items/:id', async (c) => {
  const ok = await deleteModuleItem(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'não encontrado' }, 404)
  return c.json({ ok: true })
})

app.post('/items/:id/complete', async (c) => {
  const item = await toggleItemComplete(c.env.DB, c.req.param('id'))
  if (!item) return c.json({ error: 'não encontrado' }, 404)
  return c.json(item)
})

app.get('/items/:id/notes', async (c) => {
  const note = await getNote(c.env.DB, c.req.param('id'))
  return c.json(note ?? { item_id: c.req.param('id'), content: '', updated_at: null })
})

app.put('/items/:id/notes', async (c) => {
  const body = await c.req.json()
  const note = await saveNote(c.env.DB, c.req.param('id'), body.content ?? '')
  return c.json(note)
})

export default app
