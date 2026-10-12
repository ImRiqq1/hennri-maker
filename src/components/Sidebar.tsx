import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'

const NAV = [
  { to: '/', label: 'Início', icon: 'ri-home-4-line', match: '/' },
  { to: '/prompts', label: 'Prompts', icon: 'ri-terminal-box-line', match: '/prompts' },
  { to: '/skills', label: 'Skills', icon: 'ri-stack-line', match: '/skills' },
  { to: '/referencias/camera', label: 'Referências', icon: 'ri-camera-lens-line', match: '/referencias' },
  { to: '/cursos', label: 'Cursos', icon: 'ri-graduation-cap-line', match: '/cursos' },
]

const REFERENCE_TABS = [
  { to: '/referencias/camera', label: 'Câmera' },
  { to: '/referencias/cena', label: 'Cena' },
  { to: '/referencias/luz', label: 'Luz' },
]

export function Sidebar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const location = useLocation()
  const expanded = !collapsed
  const justify = expanded ? 'justify-start' : 'justify-center'

  return (
    <aside
      className="relative z-[1] flex w-16 flex-none flex-col overflow-hidden border-r border-cream/12 bg-ink py-8 transition-[width] duration-200"
      style={{ width: expanded ? 240 : 64 }}
    >
      <div className={cn('flex items-center px-3 pb-10', justify)}>
        {expanded ? (
          <img src="/brand/wordmark-white.png" alt="HENNRI." className="ml-2 block h-[22px] w-auto" />
        ) : (
          <img src="/brand/iso-white.png" alt="HENNRI" className="block h-4 w-auto self-center" />
        )}
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const active = item.match === '/' ? location.pathname === '/' : location.pathname.startsWith(item.match)
          const showSubnav = item.match === '/referencias' && active && expanded
          return (
            <div key={item.to}>
              <Link
                to={item.to}
                data-hot="1"
                className={cn(
                  'group/nav relative flex items-center gap-3 overflow-hidden px-3 py-2.5 outline-none',
                  justify,
                  'hover:bg-cream/5 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-paper',
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 transition-opacity duration-180"
                  style={{
                    opacity: active ? 1 : 0,
                    background:
                      'radial-gradient(120% 100% at 20% 120%, rgba(232,224,213,0.16) 0%, rgba(232,224,213,0.05) 45%, transparent 75%)',
                  }}
                />
                <div
                  className="pointer-events-none absolute right-3 bottom-0 left-3 h-px bg-paper transition-opacity duration-180"
                  style={{ opacity: active ? 1 : 0 }}
                />
                <i
                  className={cn(item.icon, 'relative flex-none text-[17px] leading-none')}
                  style={{ color: active ? '#FFFFFF' : 'rgba(232,224,213,0.45)' }}
                />
                {expanded && (
                  <span
                    className="relative text-sm font-medium tracking-[-0.01em]"
                    style={{ color: active ? '#FFFFFF' : 'rgba(232,224,213,0.72)' }}
                  >
                    {item.label}
                  </span>
                )}
              </Link>

              {showSubnav && (
                <div className="ml-[17px] flex flex-col gap-0.5 border-l border-cream/12 py-0.5 pb-1.5 pl-[22px]">
                  {REFERENCE_TABS.map((tab) => {
                    const tabActive = location.pathname === tab.to
                    return (
                      <Link
                        key={tab.to}
                        to={tab.to}
                        data-hot="1"
                        className="px-3 py-1.5 text-[13px] outline-none hover:bg-cream/5 hover:text-paper focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-paper"
                        style={{ color: tabActive ? '#FFFFFF' : 'rgba(232,224,213,0.55)' }}
                      >
                        {tab.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="relative flex-1" />

      <div className={cn('flex flex-col gap-5 px-3', expanded ? 'items-start' : 'items-center')}>
        <button
          type="button"
          data-hot="1"
          onClick={onToggleCollapse}
          className="flex items-center justify-center gap-2.5 border border-cream/20 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-cream uppercase outline-none hover:border-cream/50 hover:text-paper focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          <i
            className={expanded ? 'ri-contract-left-line' : 'ri-contract-right-line'}
            style={{ fontSize: 14, lineHeight: 1 }}
          />
          {expanded && <span>Recolher</span>}
        </button>
        <img src="/brand/iso-white.png" alt="" className="block h-3.5 w-auto opacity-20" />
      </div>
    </aside>
  )
}
