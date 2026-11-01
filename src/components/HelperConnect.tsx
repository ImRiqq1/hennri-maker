import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatRelative } from '../lib/format'
import { parseJSON } from '../lib/trilhas'
import type { HelperInfo, HelperPC } from '../lib/types'
import { cn } from '../lib/utils'

const ONLINE_MS = 40_000

/**
 * Conectar o ajudante do PC: gera a chave (mostrada uma vez só), explica os 3 passos
 * e lista os PCs conectados. Feito pra fundo escuro (menu Graphite / janela escura).
 */
export function HelperConnect() {
  const [pcs, setPcs] = useState<HelperPC[] | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
                <span className={cn('h-2 w-2 flex-none rounded-full', online ? 'bg-success' : 'bg-white/25')} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium">{info?.hostname || pc.name}</span>
                  <span className="truncate text-[11.5px] text-white/45">
                    {online
                      ? `Online${info?.gpu ? ` · ${info.gpu}` : ''}`
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
          <ol className="flex flex-col gap-1.5 text-[12px] leading-[1.45] text-white/65">
            <li>
              <b className="text-white">1.</b> Pegue a pasta <code className="font-code text-white/85">helper</code> do projeto no seu PC.
            </li>
            <li>
              <b className="text-white">2.</b> Dê dois cliques em <code className="font-code text-white/85">INICIAR.bat</code> (a 1ª vez instala tudo).
            </li>
            <li>
              <b className="text-white">3.</b> Cole esta chave quando ele pedir. Pronto: o status fica verde aqui.
            </li>
          </ol>
        </div>
      ) : (
        <button
          type="button"
          onClick={pair}
          disabled={busy}
          className="press flex h-10 items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/[0.06] text-[13px] font-medium outline-none transition-colors hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-ice-400 disabled:opacity-50"
        >
          <i className="ri-link-m text-[15px] text-ice-300" />
          {pcs && pcs.length > 0 ? 'Conectar outro PC' : 'Conectar um PC'}
        </button>
      )}
      {error && <span className="text-[12px] text-[#f0a49f]">{error}</span>}
    </div>
  )
}
