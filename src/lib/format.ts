/** 7 -> "07" */
export function indexLabel(n: number, width = 3) {
  return String(n).padStart(width, '0')
}

/** segundos -> "1h 05min" ou "12 min" */
export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m} min`
}

/** MB -> "820 MB" ou "1,2 GB" */
export function formatSize(mb: number | null | undefined) {
  if (!mb) return ''
  return mb >= 1000 ? `${(mb / 1000).toFixed(1).replace('.', ',')} GB` : `${mb} MB`
}

/** timestamp -> "12 de out de 2026" */
export function formatDate(ts: number) {
  return new Date(ts)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '')
}

/** Extrai o id de um link do Google Drive (/d/<id> ou ?id=<id>). */
export function driveId(url: string | null | undefined) {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  const q = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return q ? q[1] : null
}

/** timestamp -> "hoje", "ontem", "há 3 dias", "há 2 meses" */
export function formatRelative(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  return months === 1 ? 'há 1 mês' : `há ${months} meses`
}
