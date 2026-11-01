import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV, isNavActive, logout } from '../../lib/nav'
import { cn } from '../../lib/utils'
import { SearchBox } from '../SearchBox'
import { SettingsMenu } from '../SettingsMenu'

/** Botão "+ Novo …" do topo, conforme a seção aberta. */
function newAction(pathname: string) {
  if (pathname.startsWith('/skills')) return { label: 'Nova skill', to: '/skills?new=1' }
  if (pathname.startsWith('/referencias')) return { label: 'Nova referência', to: `${pathname}?new=1` }
  if (pathname === '/cursos') return { label: 'Novo curso', to: '/cursos?new=1' }
  return { label: 'Novo prompt', to: '/prompts?new=1' }
}

/** cores da onda (Abyss 600 → 800) */
const WAVE_TOP = '#1d5770'
const WAVE_BOTTOM = '#0b3341'

const RAIL_BUTTON =
  'flex h-11 w-11 items-center justify-center rounded-[14px] outline-none transition-[background-color,color,box-shadow] duration-300 ease-apple focus-visible:ring-2 focus-visible:ring-ice-300'

/**
 * Design system Workspace: um quadro claro sobre fundo cinza, com a barra lateral de ícones
 * em cima de uma "onda" Abyss e o topo com busca e o botão de criar.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const current = NAV.find((n) => isNavActive(location.pathname, n.match)) ?? NAV[0]
  const action = newAction(location.pathname)

  return (
    <div className="flex h-screen bg-[#dfe6ea] p-4 text-fg">
      <div className="relative flex min-w-0 flex-1 overflow-hidden rounded-[40px] bg-canvas shadow-[0_40px_80px_-40px_rgb(4_26_33/0.35)]">
        {/* barra lateral: tudo centrado no mesmo eixo (coluna de 76px) */}
        <aside className="relative flex w-[88px] flex-none flex-col">
          <div className="flex h-[84px] w-[76px] flex-none items-center justify-center">
            <Link
              to="/"
              title="HENNRI IA Maker"
              className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ice-300"
            >
              <img src="/brand/iso-white.png" alt="HENNRI" className="h-3.5 w-auto" />
            </Link>
          </div>

          {/* onda Abyss: curvas de tamanho fixo em cima e embaixo, corpo reto no meio */}
          <div className="flex min-h-0 flex-1 items-center">
            <div className="flex w-[76px] flex-col">
              <svg aria-hidden viewBox="0 0 76 56" className="-mb-px block h-[56px] w-[76px]">
                <path d="M0 0 C0 34 76 22 76 56 L0 56 Z" fill={WAVE_TOP} />
              </svg>
              <nav
                className="flex flex-col items-center gap-2.5 py-3"
                style={{ background: `linear-gradient(180deg, ${WAVE_TOP} 0%, ${WAVE_BOTTOM} 100%)` }}
              >
                {NAV.map((item) => {
                  const active = isNavActive(location.pathname, item.match)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-label={item.label}
                      className={cn(
                        'group/rail relative',
                        RAIL_BUTTON,
                        active
                          ? 'bg-white text-abyss-700 shadow-[0_8px_18px_-8px_rgb(0_0_0/0.45)]'
                          : 'text-white/65 hover:bg-white/12 hover:text-white',
                      )}
                    >
                      <i className={cn(active ? item.activeIcon : item.icon, 'text-[19px]')} />
                      <span
                        className="pointer-events-none absolute left-full z-20 ml-5 rounded-full px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap text-white opacity-0 shadow-float transition-[opacity,transform] duration-200 group-hover/rail:translate-x-0.5 group-hover/rail:opacity-100"
                        style={{ background: 'var(--floating-gradient)' }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </nav>
              <svg aria-hidden viewBox="0 0 76 56" className="-mt-px block h-[56px] w-[76px]">
                <path d="M0 0 L76 0 C76 34 0 22 0 56 Z" fill={WAVE_BOTTOM} />
              </svg>
            </div>
          </div>

          <div className="flex w-[76px] flex-none flex-col items-center gap-2 pb-[18px]">
            <SettingsMenu
              align="left"
              buttonClassName={cn(RAIL_BUTTON, 'border border-mist-200 bg-surface text-sub hover:text-fg')}
            />
            <button
              type="button"
              onClick={logout}
              title="Sair"
              aria-label="Sair"
              className={cn(RAIL_BUTTON, 'text-sub hover:bg-mist-100 hover:text-fg')}
            >
              <i className="ri-logout-circle-r-line text-[18px]" />
            </button>
          </div>
        </aside>

        {/* topo + conteúdo */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[84px] flex-none items-center justify-between gap-6 pr-10 pl-4">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-[14px] font-semibold text-fg">
                <i className={cn(current.activeIcon, 'text-[17px] text-abyss-600')} />
                {current.label}
              </span>
              <span className="hidden h-5 w-px bg-mist-200 md:block" />
              <span className="hidden items-center gap-1.5 text-[13px] text-sub md:flex">
                <img src="/brand/wordmark-white.png" alt="" className="h-[11px] w-auto invert" />
                <span>IA Maker</span>
              </span>
            </div>

            <SearchBox
              className="w-full max-w-[360px]"
              placeholder="Buscar ou digitar comando"
              fieldClassName="h-11 rounded-[14px] border border-mist-200 bg-surface px-3.5 transition-[border-color,box-shadow] focus-within:border-ice-400 focus-within:ring-4 focus-within:ring-ice-200/60"
              inputClassName="text-fg placeholder:text-mist-400"
              mutedClassName="text-sub"
            />

            <button
              type="button"
              onClick={() => navigate(action.to)}
              className="flex h-11 flex-none items-center gap-2 rounded-[14px] bg-primary px-4.5 text-[13.5px] font-semibold text-primary-foreground shadow-soft outline-none transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300"
            >
              <i className="ri-add-line text-[16px]" />
              {action.label}
            </button>
          </header>

          <main id="page-scroll" className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
            <div className="mx-auto w-full max-w-[1480px] px-4 pt-2 pb-12 pr-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
