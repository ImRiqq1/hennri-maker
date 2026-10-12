import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { createReference, deleteReference, getReference, listReferences, updateReference } from '../db/references'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const tab = c.req.query('tab') || undefined
  const refs = await listReferences(c.env.DB, tab)
  return c.json(refs)
})

app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.tab || !body.family || !body.name || !body.term) {
    return c.json({ error: 'tab, family, name e term são obrigatórios' }, 400)
  }
  const ref = await createReference(c.env.DB, body)
  return c.json(ref, 201)
})

app.get('/:id', async (c) => {
  const ref = await getReference(c.env.DB, c.req.param('id'))
  if (!ref) return c.json({ error: 'não encontrada' }, 404)
  return c.json(ref)
})

app.put('/:id', async (c) => {
  const body = await c.req.json()
  const ref = await updateReference(c.env.DB, c.req.param('id'), body)
  if (!ref) return c.json({ error: 'não encontrada' }, 404)
  return c.json(ref)
})

app.delete('/:id', async (c) => {
  const ok = await deleteReference(c.env.DB, c.req.param('id'))
  if (!ok) return c.json({ error: 'não encontrada' }, 404)
  return c.json({ ok: true })
})

export default app
