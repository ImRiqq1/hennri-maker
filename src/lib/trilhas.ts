import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { HelperPC, HelperStatus, Job, JobType, Track } from './types'

/** Intenções da trilha (a mesma lista do Future Sound). */
export const INTENTS = [
  'Apresentação · explicação',
  'Autoridade · negócios',
  'Emocional · história',
  'Épico · impacto',
  'Luxo · lifestyle',
  'Motivacional',
  'Positivo · leve',
  'Suspense · revelação',
  'Urbano · energia',
]

export const SOURCE_LABEL: Record<Track['source'], string> = {
  spotify: 'do Spotify',
  youtube: 'do YouTube',
  upload: 'enviada',
}

export function trackIntents(t: Track): string[] {
  try {
    return t.intents ? (JSON.parse(t.intents) as string[]) : []
  } catch {
    return []
  }
}

export function isSeparated(t: Track) {
  return !!(t.instrumental_key && t.vocals_key)
}

/** 125 -> "2:05"; 3725 -> "1:02:05" */
export function clock(seconds: number | null | undefined) {
  if (seconds == null || !isFinite(seconds)) return '0:00'
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function parseJSON<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback
  try {
    return (JSON.parse(text) as T | null) ?? fallback
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------- onde rodar (PC ou Mac)

const TARGET_KEY = 'hm-target'
const ONLINE_MS = 40_000

/** Computador escolhido pra fazer os pedidos ('' = qualquer um que estiver online). */
export function getTarget(): string {
  try {
    return localStorage.getItem(TARGET_KEY) || ''
  } catch {
    return ''
  }
}

export function setTarget(id: string) {
  try {
    if (id) localStorage.setItem(TARGET_KEY, id)
    else localStorage.removeItem(TARGET_KEY)
  } catch {}
  window.dispatchEvent(new Event('hm-target'))
}

/** "hn 4821", "4821" → "HN-4821" */
export function normalizeCode(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  return digits ? `HN-${digits}` : ''
}

export function isOnline(pc: HelperPC) {
  return !!pc.last_seen && Date.now() - pc.last_seen < ONLINE_MS
}

export const PLATFORM_LABEL: Record<string, string> = { windows: 'Windows', mac: 'Mac', linux: 'Linux' }
export const PLATFORM_ICON: Record<string, string> = { windows: 'ri-windows-fill', mac: 'ri-apple-fill', linux: 'ri-ubuntu-fill' }

/** Computadores conectados (atualiza a cada 10s). */
export function useHelpers() {
  const [pcs, setPcs] = useState<HelperPC[]>([])
  useEffect(() => {
    let alive = true
    const load = () =>
      api
        .get<HelperPC[]>('/helper')
        .then((r) => alive && setPcs(r))
        .catch(() => {})
    load()
    const t = window.setInterval(load, 10_000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [])
  return pcs
}

/** Destino escolhido; se o computador escolhido foi desconectado, volta pra "qualquer um". */
export function useTarget(pcs: HelperPC[]): [string, (id: string) => void] {
  const [target, set] = useState(getTarget)
  useEffect(() => {
    const sync = () => set(getTarget())
    window.addEventListener('hm-target', sync)
    return () => window.removeEventListener('hm-target', sync)
  }, [])
  const valid = !target || pcs.length === 0 || pcs.some((p) => p.id === target)
  return [valid ? target : '', setTarget]
}

export function createJob<T = unknown>(type: JobType, payload: T) {
  return api.post<{ batch_id: string | null; jobs: Job[] }>('/jobs', { type, payload, target: getTarget() || undefined })
}

export function isActive(j: Job) {
  return j.status === 'fila' || j.status === 'rodando'
}

/** Status do ajudante do PC (atualiza a cada 10s). */
export function useHelperStatus() {
  const [status, setStatus] = useState<HelperStatus | null>(null)
  useEffect(() => {
    let alive = true
    const load = () =>
      api
        .get<HelperStatus>('/helper/status')
        .then((s) => alive && setStatus(s))
        .catch(() => {})
    load()
    const t = window.setInterval(load, 10_000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [])
  return status
}

/**
 * Lista de pedidos de um tipo; atualiza a cada 2s enquanto algum estiver na fila/rodando
 * (e a cada 10s quando está tudo parado). `onFinish` roda quando um pedido termina.
 */
export function useJobs(types: JobType[], onFinish?: (job: Job) => void) {
  const [jobs, setJobs] = useState<Job[]>([])
  const prev = useRef<Map<string, Job['status']>>(new Map())
  const finishRef = useRef(onFinish)
  finishRef.current = onFinish
  const key = types.join(',')

  const load = useCallback(async () => {
    const list = await api.get<Job[]>(`/jobs?types=${key}&limit=60`).catch(() => null)
    if (!list) return
    for (const j of list) {
      const before = prev.current.get(j.id)
      if (before && (before === 'fila' || before === 'rodando') && !isActive(j)) finishRef.current?.(j)
    }
    prev.current = new Map(list.map((j) => [j.id, j.status]))
    setJobs(list)
  }, [key])

  const anyActive = jobs.some(isActive)
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    const t = window.setInterval(load, anyActive ? 2000 : 10_000)
    return () => window.clearInterval(t)
  }, [load, anyActive])

  return { jobs, reload: load }
}

export async function cancelJob(id: string) {
  await api.post(`/jobs/${id}/cancel`)
}

export async function removeJob(id: string) {
  await api.delete(`/jobs/${id}`)
}
