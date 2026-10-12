import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'
import { SESSION_COOKIE, parseCookie, verifySessionCookieValue } from '../lib/session'

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const cookie = parseCookie(c.req.header('cookie') ?? null, SESSION_COOKIE)
  const ok = await verifySessionCookieValue(cookie, c.env.SITE_PASSWORD)
  if (!ok) return c.json({ error: 'não autenticado' }, 401)
  await next()
})
