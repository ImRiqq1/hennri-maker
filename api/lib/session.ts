export const SESSION_COOKIE = 'hm_session'
const PAYLOAD = 'authenticated'

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createSessionCookieValue(secret: string): Promise<string> {
  const sig = await hmac(secret, PAYLOAD)
  return `${PAYLOAD}.${sig}`
}

export async function verifySessionCookieValue(value: string | undefined, secret: string): Promise<boolean> {
  if (!value) return false
  const [payload, sig] = value.split('.')
  if (payload !== PAYLOAD || !sig) return false
  const expected = await hmac(secret, payload)
  return timingSafeEqual(sig, expected)
}

export function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return undefined
}

// Secure só em HTTPS (produção). Em http://localhost o Safari recusaria o cookie.
function flags(secure: boolean) {
  return `Path=/; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax`
}

export function setSessionCookieHeader(value: string, secure = true): string {
  const maxAge = 60 * 60 * 24 * 30
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; ${flags(secure)}; Max-Age=${maxAge}`
}

export function clearSessionCookieHeader(secure = true): string {
  return `${SESSION_COOKIE}=; ${flags(secure)}; Max-Age=0`
}
