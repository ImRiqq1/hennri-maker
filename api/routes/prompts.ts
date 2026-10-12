import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { createPrompt, deletePrompt, getPrompt, listPrompts, updatePrompt } from '../db/prompts'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const category = c.req.query('category') || undefined
  const prompts = await listPrompts(c.env.DB, category)
  return c.json(prompts)
})

app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.title || !body.category || !body.prompt_text) {
    return c.json({ error: 'title, category e prompt_text são obrigatórios' }, 400)
  }
  const prompt = await createPrompt(c.env.DB, body)
  return c.json(prompt, 201)
})

app.get('/:id', async (c) => {
  const prompt = await getPrompt(c.env.DB, c.req.param('id'))
  if (!prompt) return c.json({ error: 'não encontrado' }, 404)
  return c.json(prompt)
})

app.put('/:id', async (c) => {
  const body = await c.req.json()
  const prompt = await updatePrompt(c.env.DB, c.req.param('id'), body)
  if (!prompt) return c.json({ error: 'não encontrado' }, 404)
  return c.json(prompt)
})

app.delete('/:id', async (c) => {
  const ok = await deletePrompt(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'não encontrado' }, 404)
  return c.json({ ok: true })
})

export default app
