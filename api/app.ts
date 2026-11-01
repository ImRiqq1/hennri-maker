import { Hono } from 'hono'
import type { AppEnv } from './types'
import { login, logout } from './routes/auth'
import { requireAuth } from './middleware/auth'
import prompts from './routes/prompts'
import skills from './routes/skills'
import references from './routes/references'
import courses from './routes/courses'
import upload from './routes/upload'
import files from './routes/files'
import search from './routes/search'
import jobs from './routes/jobs'
import trilhas from './routes/trilhas'
import baixador from './routes/baixador'
import { helperAgent, helperSite } from './routes/helper'

const app = new Hono<AppEnv>().basePath('/api')

app.get('/health', (c) => c.json({ ok: true }))
app.post('/auth/login', login)

// o ajudante do PC entra com a própria chave (Bearer), não com o login do site
app.route('/agent', helperAgent)

app.use('*', requireAuth)
app.post('/auth/logout', logout)
app.route('/prompts', prompts)
app.route('/skills', skills)
app.route('/references', references)
app.route('/', courses)
app.route('/upload', upload)
app.route('/files', files)
app.route('/search', search)
app.route('/jobs', jobs)
app.route('/trilhas', trilhas)
app.route('/baixador', baixador)
app.route('/helper', helperSite)

export default app
