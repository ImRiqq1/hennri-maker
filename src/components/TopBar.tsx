import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSlidingIndicator } from '../lib/motion'
import { NAV, isNavActive, logout } from '../lib/nav'
import { cn } from '../lib/utils'
import { SearchBox } from './SearchBox'
import { FRAME_ICON_BUTTON, SettingsMenu } from './SettingsMenu'

const TAB_RADIUS = 32

/** Topo do design system Abyss: aba com o logo, menu em pílulas, busca global (Ctrl K) e sair. */
export function TopBar() {
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const activeKey = NAV.find((n) => isNavActive(location.pathname, n.match))?.match ?? ''
  const pill = useSlidingIndicator(navRef, activeKey)

  return (
    <header className="relative z-[5] flex h-[84px] flex-none items-stretch pt-3">
      {/* aba do painel com o logo */}
      <Link
        to="/"
        className="relative flex w-[92px] flex-none items-center gap-3 rounded-t-[32px] bg-canvas px-7 outline-none md:w-[232px]"
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
        <nav ref={navRef} className="relative flex items-center gap-1 rounded-full border border-[var(--nav-group-border)] bg-[var(--nav-group-bg)] p-1 shadow-[0_10px_28px_-18px_rgb(0_0_0/0.45)] backdrop-blur-md">
          <span
            aria-hidden
            className="absolute top-0 left-0 rounded-full bg-[var(--nav-active-bg)] shadow-[0_6px_16px_-8px_rgb(0_0_0/0.5)] transition-[transform,width,opacity] duration-500 ease-[var(--ease-out)]"
            style={pill}
          />
          {NAV.map((item) => {
            const active = isNavActive(location.pathname, item.match)
            return (
              <Link
                key={item.to}
                to={item.to}
                data-nav-key={item.match}
                title={item.label}
                className={cn(
                  'press relative flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium outline-none transition-[background-color,color] duration-300 ease-apple',
                  'focus-visible:ring-2 focus-visible:ring-ice-400',
                  active
                    ? 'text-[var(--nav-active-text)]'
                    : 'text-[var(--nav-text)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-text-hover)]',
                )}
              >
                <i className={cn(item.icon, 'text-[16px] leading-none', active ? 'text-[var(--nav-active-icon)]' : '')} />
                <span className={active ? 'hidden md:inline' : 'hidden 2xl:inline'}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-none items-center gap-2">
          <SearchBox
            className="w-[200px] xl:w-[320px]"
            fieldClassName="h-12 rounded-full border border-[var(--frame-field-border)] bg-[var(--frame-field-bg)] px-4 backdrop-blur-md transition-[border-color,box-shadow] focus-within:border-ice-400/70 focus-within:ring-4 focus-within:ring-ice-400/15"
            inputClassName="text-[var(--frame-field-text)] placeholder:text-[var(--frame-field-muted)]"
            mutedClassName="text-[var(--frame-field-muted)]"
          />
          <SettingsMenu buttonClassName={FRAME_ICON_BUTTON} />
          <button type="button" onClick={logout} title="Sair" aria-label="Sair" className={FRAME_ICON_BUTTON}>
            <i className="ri-logout-circle-r-line text-[18px]" />
          </button>
        </div>
      </div>
    </header>
  )
}
