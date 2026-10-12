import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { clearSessionCookieHeader, createSessionCookieValue, setSessionCookieHeader } from '../lib/session'

function isHttps(c: Context<AppEnv>) {
  return new URL(c.req.url).protocol === 'https:'
}

export async function login(c: Context<AppEnv>) {
  const body = await c.req.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password : ''
  if (password !== c.env.SITE_PASSWORD) {
    return c.json({ error: 'senha incorreta' }, 401)
  }
  const value = await createSessionCookieValue(c.env.SITE_PASSWORD)
  c.header('set-cookie', setSessionCookieHeader(value, isHttps(c)))
  return c.json({ ok: true })
}

export async function logout(c: Context<AppEnv>) {
  c.header('set-cookie', clearSessionCookieHeader(isHttps(c)))
  return c.json({ ok: true })
}
