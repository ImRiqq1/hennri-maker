import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatRelative } from '../lib/format'
import { PLATFORM_ICON, PLATFORM_LABEL, normalizeCode, parseJSON } from '../lib/trilhas'
import type { HelperInfo, HelperPC } from '../lib/types'
import { cn } from '../lib/utils'

const ONLINE_MS = 40_000

/**
 * Conectar o ajudante (PC ou Mac): pelo código que aparece no computador (HN-4821) ou,
 * como plano B, gerando uma chave (mostrada uma vez só). Lista os computadores conectados.
 * Feito pra fundo escuro (menu Graphite / janela escura).
 */
export function HelperConnect() {
  const [pcs, setPcs] = useState<HelperPC[] | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [manual, setManual] = useState(false)
  const [done, setDone] = useState('')

  async function load() {
    setPcs(await api.get<HelperPC[]>('/helper').catch(() => []))
  }

  useEffect(() => {
    load()
    const t = window.setInterval(load, 10_000)
    return () => window.clearInterval(t)
  }, [])

  async function pair() {
    setBusy(true)
    setError('')
    try {
      const res = await api.post<{ token: string }>('/helper/pair', { name: 'Meu PC' })
      setToken(res.token)
      setCopied(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu pra gerar a chave.')
    } finally {
      setBusy(false)
    }
  }

  async function approve() {
    const c = normalizeCode(code)
    if (c.length < 7) return setError('O código tem 4 números, tipo HN-4821.')
    setBusy(true)
    setError('')
    try {
      const res = await api.post<{ name: string; platform: string | null }>(`/helper/pair/${c}/approve`)
      setDone(`${res.name} conectado!`)
      setCode('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu pra conectar.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Desconectar esse PC? Ele para de receber pedidos até você conectar de novo.')) return
    await api.delete(`/helper/${id}`).catch(() => {})
    load()
  }

  function copy() {
    if (!token) return
    navigator.clipboard?.writeText(token).catch(() => {})
    setCopied(true)
  }

  const now = Date.now()

  return (
    <div className="flex flex-col gap-3 text-white">
      {pcs && pcs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {pcs.map((pc) => {
            const online = !!pc.last_seen && now - pc.last_seen < ONLINE_MS
            const info = parseJSON<HelperInfo | null>(pc.info, null)
            return (
              <div key={pc.id} className="flex items-center gap-3 rounded-[14px] bg-white/[0.05] px-3 py-2.5">
                <span className="relative flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/[0.07] text-white/75">
                  <i className={cn(PLATFORM_ICON[pc.platform ?? info?.platform ?? 'windows'] ?? 'ri-computer-line', 'text-[15px]')} />
                  <span
                    className={cn(
                      'absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-graphite-800',
                      online ? 'bg-success' : 'bg-white/30',
                    )}
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium">
                    {info?.hostname || pc.name}
                    <span className="ml-1.5 text-[11px] font-normal text-white/40">
                      {PLATFORM_LABEL[pc.platform ?? info?.platform ?? ''] ?? ''}
                    </span>
                  </span>
                  <span className="truncate text-[11.5px] text-white/45">
                    {online
                      ? `Online${info?.os ? ` · ${info.os}` : info?.gpu ? ` · ${info.gpu}` : ''}`
                      : pc.last_seen
                        ? `Visto ${formatRelative(pc.last_seen)}`
                        : 'Esperando o ajudante abrir'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(pc.id)}
                  aria-label="Desconectar"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 outline-none hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-ice-400"
                >
                  <i className="ri-close-line" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* principal: o código que o ajudante mostra (e abre aqui sozinho) */}
      <div className="flex flex-col gap-2 rounded-[16px] bg-white/[0.04] p-3">
        <span className="text-[12px] text-white/55">
          Abra o ajudante no PC ou no Mac. Ele mostra um código e abre esta página sozinho; se não abrir, digite aqui:
        </span>
        <div className="flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setDone('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && approve()}
            placeholder="HN-0000"
            aria-label="Código que apareceu no computador"
            className="h-10 min-w-0 flex-1 rounded-[12px] border border-white/12 bg-black/20 px-3 font-code text-[14px] tracking-[0.12em] text-white uppercase outline-none placeholder:text-white/25 focus:border-ice-400"
          />
          <button
            type="button"
            onClick={approve}
            disabled={busy || !code.trim()}
            className="press h-10 flex-none rounded-[12px] bg-ice-400 px-4 text-[13px] font-semibold text-abyss-950 outline-none focus-visible:ring-2 focus-visible:ring-ice-300 disabled:opacity-40"
          >
            Conectar
          </button>
        </div>
        {done && (
          <span className="flex items-center gap-1.5 text-[12px] text-success">
            <i className="ri-checkbox-circle-fill" /> {done}
          </span>
        )}
      </div>

      {token ? (
        <div className="flex flex-col gap-3 rounded-[16px] border border-ice-400/30 bg-ice-400/[0.06] p-3.5">
          <span className="text-[12px] text-ice-300">Sua chave (aparece só agora — copie):</span>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-[10px] bg-black/30 px-3 py-2 font-code text-[12px] text-white/90">{token}</code>
            <button
              type="button"
              onClick={copy}
              className="press h-9 flex-none rounded-full bg-ice-400 px-3.5 text-[12.5px] font-semibold text-abyss-950 outline-none focus-visible:ring-2 focus-visible:ring-ice-300"
            >
              {copied ? 'Copiada!' : 'Copiar'}
            </button>
          </div>
          <span className="text-[12px] leading-[1.45] text-white/60">
            No ajudante, aperte Enter quando aparecer o código e cole esta chave.
          </span>
        </div>
      ) : manual ? (
        <button
          type="button"
          onClick={pair}
          disabled={busy}
          className="press flex h-10 items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/[0.06] text-[13px] font-medium outline-none transition-colors hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-ice-400 disabled:opacity-50"
        >
          <i className="ri-key-2-line text-[15px] text-ice-300" />
          Gerar uma chave
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="self-start text-[12px] text-white/45 underline-offset-2 outline-none hover:text-white/80 hover:underline focus-visible:underline"
        >
          Conectar com chave (plano B)
        </button>
      )}
      {error && <span className="text-[12px] text-[#f0a49f]">{error}</span>}
    </div>
  )
}
