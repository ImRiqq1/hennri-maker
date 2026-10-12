import app from './app'
import type { Env } from './types'
import { SESSION_COOKIE, parseCookie, verifySessionCookieValue } from './lib/session'

// Arquivos com extensão (JS, CSS, fontes, imagens) e a tela de login são públicos.
// Todo o resto (as páginas do SPA) exige o cookie de sessão.
const ASSET_PATH = /\.[a-zA-Z0-9]+$/

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx)
    }

    if (ASSET_PATH.test(url.pathname) || url.pathname === '/login') {
      return env.ASSETS.fetch(request)
    }

    const cookie = parseCookie(request.headers.get('cookie'), SESSION_COOKIE)
    const authed = await verifySessionCookieValue(cookie, env.SITE_PASSWORD)
    if (!authed) {
      const loginUrl = new URL('/login', url)
      loginUrl.searchParams.set('next', url.pathname + url.search)
      return Response.redirect(loginUrl.toString(), 302)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
