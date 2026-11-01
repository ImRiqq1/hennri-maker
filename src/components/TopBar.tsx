import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { SearchResult } from '../lib/types'
import { cn } from '../lib/utils'
import { FRAME_ICON_BUTTON, SettingsMenu } from './SettingsMenu'

const NAV = [
  { to: '/', label: 'Início', icon: 'ri-home-5-line', match: '/' },
  { to: '/prompts', label: 'Prompts', icon: 'ri-sparkling-2-line', match: '/prompts' },
  { to: '/skills', label: 'Skills', icon: 'ri-stack-line', match: '/skills' },
  { to: '/referencias/camera', label: 'Referências', icon: 'ri-camera-lens-line', match: '/referencias' },
  { to: '/cursos', label: 'Cursos', icon: 'ri-graduation-cap-line', match: '/cursos' },
]

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  referencia: 'Referência',
  aula: 'Aula',
}

const TYPE_ICON: Record<SearchResult['type'], string> = {
  prompt: 'ri-sparkling-2-line',
  skill: 'ri-stack-line',
  referencia: 'ri-camera-lens-line',
  aula: 'ri-play-circle-line',
}

const TAB_RADIUS = 32

/** Topo de todas as páginas: aba com o logo, menu em pílulas, busca global (Ctrl K) e sair. */
export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const t = window.setTimeout(() => {
      api
        .get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`)
        .then((r) => {
          setResults(r)
          setOpen(true)
        })
        .catch(() => setResults([]))
    }, 180)
    return () => window.clearTimeout(t)
  }, [query])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    navigate(href)
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {})
    window.location.href = '/login'
  }

  return (
    <header className="relative z-[5] flex h-[84px] flex-none items-stretch pt-3">
      {/* aba do painel com o logo */}
      <Link
        to="/"
        className="relative flex w-[92px] flex-none items-center gap-3 rounded-t-[32px] bg-canvas px-7 md:w-[232px] outline-none"
      >
        <img src="/brand/wordmark-white.png" alt="HENNRI" className="block h-[17px] w-auto [filter:var(--logo-filter)]" />
        <span className="hidden h-4 w-px bg-mist-300 md:block" />
        <span className="hidden text-[13px] font-medium tracking-[-0.01em] text-abyss-600 md:inline">IA Maker</span>
        {/* curva côncava que liga a aba ao painel */}
        <span
          aria-hidden
          className="absolute bottom-0 left-full"
          style={{
            width: TAB_RADIUS,
            height: TAB_RADIUS,
            background: `radial-gradient(circle at 100% 0, transparent ${TAB_RADIUS - 0.5}px, var(--canvas) ${TAB_RADIUS}px)`,
          }}
        />
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-1 pb-3 pl-8 xl:gap-6 xl:pl-10">
        <nav className="flex items-center gap-1 rounded-full border border-[var(--nav-group-border)] bg-[var(--nav-group-bg)] p-1 shadow-[0_10px_28px_-18px_rgb(0_0_0/0.45)] backdrop-blur-md">
          {NAV.map((item) => {
            const active = item.match === '/' ? location.pathname === '/' : location.pathname.startsWith(item.match)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium outline-none transition-[background-color,color] duration-300 ease-apple',
                  'focus-visible:ring-2 focus-visible:ring-ice-400',
                  active
                    ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] shadow-[0_6px_16px_-8px_rgb(0_0_0/0.5)]'
                    : 'text-[var(--nav-text)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-text-hover)]',
                )}
              >
                <i className={cn(item.icon, 'text-[16px] leading-none', active ? 'text-[var(--nav-active-icon)]' : '')} />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-none items-center gap-2">
          <div ref={wrapRef} className="relative w-[200px] xl:w-[320px]">
            <div
              onClick={() => inputRef.current?.focus()}
              className="flex h-12 cursor-text items-center gap-2.5 rounded-full border border-[var(--frame-field-border)] bg-[var(--frame-field-bg)] px-4 backdrop-blur-md transition-[border-color,box-shadow] focus-within:border-ice-400/70 focus-within:ring-4 focus-within:ring-ice-400/15"
            >
              <i className="ri-search-line flex-none text-[16px] text-[var(--frame-field-muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setOpen(true)}
                onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                placeholder="Buscar em tudo"
                className="w-full flex-1 bg-transparent text-[14px] text-[var(--frame-field-text)] outline-none placeholder:text-[var(--frame-field-muted)]"
              />
              <kbd className="flex-none rounded-md border border-[var(--frame-field-border)] px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-[var(--frame-field-muted)]">
                Ctrl K
              </kbd>
            </div>

            {open && query.trim() && (
              <div
                className="absolute top-full right-0 left-0 z-[300] mt-2 max-h-96 overflow-y-auto rounded-[22px] border border-white/8 p-1.5 text-white shadow-float animate-in fade-in-0 slide-in-from-top-1"
                style={{ background: 'var(--floating-gradient)' }}
              >
                {results.length === 0 ? (
                  <div className="px-4 py-4 text-[13px] text-white/55">Nada encontrado.</div>
                ) : (
                  results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      type="button"
                      onClick={() => go(r.href)}
                      className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.08] focus-visible:bg-white/[0.08]"
                    >
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/[0.08]">
                        <i className={`${TYPE_ICON[r.type]} text-[15px] text-ice-300`} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">{r.title}</span>
                      <span className="flex-none text-[11.5px] text-white/45">
                        {TYPE_LABEL[r.type]}
                        {r.meta ? ` · ${r.meta}` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <SettingsMenu />
          <button
            type="button"
            onClick={logout}
            title="Sair"
            aria-label="Sair"
            className={FRAME_ICON_BUTTON}
          >
            <i className="ri-logout-circle-r-line text-[18px]" />
          </button>
        </div>
      </div>
    </header>
  )
}
