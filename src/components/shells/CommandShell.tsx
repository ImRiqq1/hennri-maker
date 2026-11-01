import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV, isNavActive, logout } from '../../lib/nav'
import { cn } from '../../lib/utils'
import { SearchBox } from '../SearchBox'
import { SettingsMenu } from '../SettingsMenu'

/** Cor de fundo do app no Command (os recortes do painel branco usam a mesma cor). */
export const COMMAND_BG = '#1a1d20'

export const COMMAND_CIRCLE =
  'flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/10 text-white/70 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-ice-400'

const QUICK = [
  { to: '/prompts?new=1', label: 'Novo prompt', icon: 'ri-sparkling-2-line' },
  { to: '/skills?new=1', label: 'Nova skill', icon: 'ri-stack-line' },
  { to: '/referencias/camera?new=1', label: 'Nova referência', icon: 'ri-camera-lens-line' },
  { to: '/cursos?new=1', label: 'Novo curso', icon: 'ri-graduation-cap-line' },
]

/**
 * Design system Command: painel de controle escuro. Menu em pílula branca com o item ativo em Ice,
 * fileira de botões redondos de criar, e as páginas internas num painel branco embutido.
 */
export function CommandShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const current = NAV.find((n) => isNavActive(location.pathname, n.match)) ?? NAV[0]

  return (
    <div className="flex h-screen bg-[#0d0f10] p-3 text-white">
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-white/[0.06] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)]"
        style={{ background: COMMAND_BG }}
      >
        <header className="flex h-[84px] flex-none items-center gap-3 pr-8 pl-6">
          <Link to="/" className="mr-2 flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ice-400">
            <i className="ri-asterisk text-[22px] text-white" />
            <img src="/brand/wordmark-white.png" alt="HENNRI" className="hidden h-[15px] w-auto xl:block" />
          </Link>

          <nav className="flex h-12 items-center gap-1 rounded-full bg-white p-1 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)]">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-graphite-900 text-white">
              <i className={cn(current.icon, 'text-[16px]')} />
            </span>
            {NAV.map((item) => {
              const active = isNavActive(location.pathname, item.match)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex h-10 items-center rounded-full px-4 text-[13px] font-medium outline-none transition-[background-color,color] duration-300 ease-apple',
                    'focus-visible:ring-2 focus-visible:ring-ice-400',
                    active ? 'bg-ice-400 text-abyss-950' : 'text-graphite-600 hover:bg-mist-100 hover:text-graphite-950',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-2 2xl:flex">
            {QUICK.map((q) => (
              <button key={q.to} type="button" title={q.label} aria-label={q.label} onClick={() => navigate(q.to)} className={COMMAND_CIRCLE}>
                <i className={cn(q.icon, 'text-[17px]')} />
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SearchBox
              className="w-[180px] xl:w-[260px]"
              fieldClassName="h-11 rounded-full border border-white/10 bg-white/[0.04] px-4 transition-[border-color] focus-within:border-ice-400/70"
              inputClassName="text-white placeholder:text-white/40"
              mutedClassName="text-white/45"
            />
            <SettingsMenu buttonClassName={COMMAND_CIRCLE} />
            <button type="button" onClick={logout} title="Sair" aria-label="Sair" className={COMMAND_CIRCLE}>
              <i className="ri-logout-circle-r-line text-[18px]" />
            </button>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-abyss-950">
              H
            </span>
          </div>
        </header>

        <main id="page-scroll" className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
          {isHome ? (
            <div className="mx-auto w-full max-w-[1520px] px-6 pt-2 pb-10">{children}</div>
          ) : (
            <div className="mx-auto w-full max-w-[1520px] px-6 pt-2 pb-6">
              <div className="mb-5 flex items-center gap-4">
                <button type="button" onClick={() => navigate(-1)} aria-label="Voltar" className={COMMAND_CIRCLE}>
                  <i className="ri-arrow-left-line text-[17px]" />
                </button>
                <span className="text-[13px] text-white/45">
                  Acervo <span className="mx-1.5 text-white/25">/</span>
                  <span className="text-white">{current.label}</span>
                </span>
              </div>
              <div className="rounded-[32px] bg-canvas px-8 pt-8 pb-14 text-fg">{children}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
