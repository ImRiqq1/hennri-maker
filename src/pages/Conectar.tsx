import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { PLATFORM_ICON, PLATFORM_LABEL, normalizeCode } from '../lib/trilhas'

type PairInfo = { code: string; name: string; platform: string | null; expires_at: number }
type State = 'loading' | 'ask' | 'done' | 'missing'

/**
 * Aberta pelo ajudante (PC ou Mac) em /conectar?codigo=HN-4821:
 * você confirma e o computador passa a receber os pedidos do site.
 */
export function Conectar() {
  const [params, setParams] = useSearchParams()
  const code = normalizeCode(params.get('codigo') ?? '')
  const [info, setInfo] = useState<PairInfo | null>(null)
  const [state, setState] = useState<State>(code ? 'loading' : 'missing')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) {
      setState('missing')
      return
    }
    setState('loading')
    setError('')
    api
      .get<PairInfo>(`/helper/pair/${code}`)
      .then((r) => {
        setInfo(r)
        setState('ask')
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Código não encontrado ou expirado.')
        setState('missing')
      })
  }, [code])

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await api.post(`/helper/pair/${code}/approve`)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu pra conectar.')
    } finally {
      setBusy(false)
    }
  }

  const platform = info?.platform ?? 'windows'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6" style={{ background: 'var(--hero-gradient)' }}>
      <div className="relative flex w-full max-w-[420px] flex-col items-center gap-8 animate-in fade-in-0 zoom-in-[0.97] slide-in-from-bottom-4 duration-700 ease-[var(--ease-out)]">
        <div className="flex flex-col items-center gap-3">
          <img src="/brand/wordmark-white.png" alt="HENNRI." className="h-6 w-auto" />
          <span className="text-[12px] font-medium tracking-[0.14em] text-ice-300/80 uppercase">Ajudante</span>
        </div>

        <div className="flex w-full flex-col items-center gap-5 rounded-[28px] border border-white/10 bg-white/[0.06] p-7 text-center text-white shadow-float backdrop-blur-xl">
          {state === 'loading' && <span className="py-6 text-[14px] text-white/60">Procurando o computador…</span>}

          {state === 'ask' && info && (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/[0.08] text-ice-300">
                <i className={`${PLATFORM_ICON[platform] ?? 'ri-computer-line'} text-[28px]`} />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="text-[20px] font-semibold tracking-[-0.02em]">Conectar este computador?</span>
                <span className="text-[14px] text-white/60">
                  {info.name} · {PLATFORM_LABEL[platform] ?? platform}
                </span>
              </div>
              <span className="rounded-full border border-white/12 px-4 py-1.5 font-code text-[15px] tracking-[0.14em] text-white/90">
                {info.code}
              </span>
              <span className="max-w-[32ch] text-[12.5px] leading-[1.5] text-white/45">
                Confira se é o mesmo código que apareceu no computador. Depois disso ele passa a fazer os pedidos do site.
              </span>
              <div className="flex w-full gap-2">
                <Link
                  to="/"
                  className="press flex h-12 flex-1 items-center justify-center rounded-full border border-white/12 text-[14px] font-medium text-white/75 outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-ice-400"
                >
                  Cancelar
                </Link>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy}
                  className="press flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-full bg-ice-400 text-[14px] font-semibold text-abyss-950 outline-none hover:bg-ice-300 focus-visible:ring-2 focus-visible:ring-ice-300 disabled:opacity-50"
                >
                  {busy ? 'Conectando…' : 'Confirmar'}
                </button>
              </div>
            </>
          )}

          {state === 'done' && (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-white animate-in zoom-in-50 duration-500">
                <i className="ri-check-line text-[30px]" />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="text-[20px] font-semibold tracking-[-0.02em]">Conectado!</span>
                <span className="text-[14px] text-white/60">
                  {info?.name} já está pegando os pedidos. O ícone perto do relógio fica verde em alguns segundos.
                </span>
              </div>
              <Link
                to="/trilhas"
                className="press flex h-12 w-full items-center justify-center rounded-full bg-white text-[14px] font-semibold text-abyss-950 outline-none hover:bg-[#eaf7fb] focus-visible:ring-2 focus-visible:ring-ice-400"
              >
                Ir pras Trilhas
              </Link>
            </>
          )}

          {state === 'missing' && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-[20px] font-semibold tracking-[-0.02em]">Digite o código</span>
                <span className="text-[13.5px] text-white/55">O ajudante mostra um código tipo HN-4821 quando abre.</span>
              </div>
              <div className="flex w-full gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && normalizeCode(typed) && setParams({ codigo: normalizeCode(typed) })}
                  placeholder="HN-0000"
                  aria-label="Código do ajudante"
                  autoFocus
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-white/12 bg-white/[0.07] px-4 text-center font-code text-[16px] tracking-[0.14em] text-white uppercase outline-none placeholder:text-white/25 focus:border-ice-400"
                />
                <button
                  type="button"
                  onClick={() => normalizeCode(typed) && setParams({ codigo: normalizeCode(typed) })}
                  className="press h-12 flex-none rounded-full bg-ice-400 px-5 text-[14px] font-semibold text-abyss-950 outline-none focus-visible:ring-2 focus-visible:ring-ice-300"
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {error && (
            <span className="flex items-center gap-1.5 text-[13px] text-[#f0a49f]">
              <i className="ri-error-warning-line" />
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
