import { useEffect, useRef, useState } from 'react'
import { DESIGNS, useDesign, type DesignId } from '../lib/design'
import { THEMES, type ThemeId } from '../lib/theme'
import { cn } from '../lib/utils'

/** Botão redondo da barra do topo do Abyss (segue as cores da moldura de cada tema). */
export const FRAME_ICON_BUTTON =
  'flex h-12 w-12 flex-none items-center justify-center rounded-full border border-[var(--frame-field-border)] bg-[var(--frame-field-bg)] text-[var(--frame-field-muted)] outline-none backdrop-blur-md transition-colors hover:text-[var(--frame-field-text)] focus-visible:ring-2 focus-visible:ring-ice-400'

/** Miniatura das cores do Abyss: moldura, aba, menu e cards. */
function ThemePreview({ frame, panel, accent }: { frame: string; panel: string; accent: string }) {
  return (
    <div className="relative h-[64px] w-full overflow-hidden rounded-[12px] p-1.5" style={{ background: frame }}>
      <div className="flex h-2.5 items-center gap-1 pl-[38%]">
        <span className="h-1.5 w-5 rounded-full" style={{ background: accent, opacity: 0.9 }} />
        <span className="h-1.5 w-3 rounded-full bg-white/30" />
      </div>
      <div className="absolute top-1.5 left-1.5 h-2.5 w-[34%] rounded-t-[6px]" style={{ background: panel }} />
      <div className="h-[44px] rounded-[8px] rounded-tl-none p-1" style={{ background: panel }}>
        <div className="grid h-full grid-cols-[1.4fr_1fr] gap-1">
          <span className="rounded-[5px]" style={{ background: 'linear-gradient(160deg,#1f4a5e,#041a21)' }} />
          <span className="flex flex-col gap-1">
            <span className="flex-1 rounded-[5px] border border-black/5 bg-white/70" />
            <span className="flex-1 rounded-[5px] border border-black/5 bg-white/70" />
          </span>
        </div>
      </div>
    </div>
  )
}

/** Miniatura de cada design system: mostra a estrutura, não só as cores. */
function DesignPreview({ id }: { id: DesignId }) {
  if (id === 'workspace') {
    return (
      <div className="relative h-[88px] w-full overflow-hidden rounded-[14px] bg-[#dfe6ea] p-1.5">
        <div className="relative flex h-full overflow-hidden rounded-[10px] bg-[#f6f8f9]">
          {/* onda + ícones */}
          <svg viewBox="0 0 20 80" preserveAspectRatio="none" className="absolute inset-y-0 left-0 h-full w-[16px]">
            <path d="M0 14 C10 14 14 20 14 30 L14 58 C14 66 10 70 0 72 Z" fill="#1d5770" />
          </svg>
          <div className="relative flex w-[16px] flex-col items-center gap-1 pt-6">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn('h-1.5 w-1.5 rounded-[2px]', i === 0 ? 'bg-white' : 'bg-white/50')} />
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-1.5">
            <div className="flex gap-1">
              <span className="h-5 flex-[1.3] rounded-[3px] bg-[#041a21]/80" style={{ clipPath: 'inset(0 0 55% 0)' }} />
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-5 flex-1 rounded-[4px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08)]" />
              ))}
            </div>
            <div className="grid flex-1 grid-cols-3 gap-1">
              <span className="relative rounded-[4px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08)]">
                <span className="absolute top-1.5 -left-1 h-2.5 w-[80%] rounded-[3px] bg-white shadow-[0_2px_5px_rgb(0_0_0/0.18)]" />
              </span>
              <span className="rounded-[4px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08)]" />
              <span className="rounded-[4px] bg-[#13445a]" />
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (id === 'command') {
    return (
      <div className="flex h-[88px] w-full flex-col gap-1 overflow-hidden rounded-[14px] bg-[#1f2326] p-1.5">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-white/60" />
          <span className="flex h-2.5 items-center gap-0.5 rounded-full bg-white px-0.5">
            <span className="h-1.5 w-3 rounded-full bg-[#86cbdd]" />
            <span className="h-1 w-2 rounded-full bg-black/20" />
            <span className="h-1 w-2 rounded-full bg-black/20" />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full border border-white/25" />
          ))}
        </div>
        <span className="h-2 w-10 rounded-full bg-white/70" />
        <div className="grid h-4 grid-cols-[2fr_1fr] gap-1">
          <span className="rounded-[4px] border border-white/10 bg-white/[0.06]" />
          <span className="rounded-[4px] border border-white/10 bg-white/[0.06]" />
        </div>
        <div className="relative flex flex-1 gap-1 rounded-[6px] bg-white p-1">
          <span className="absolute -top-0.5 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-b-[4px] bg-[#1f2326]" />
          <span className="flex-1 rounded-[3px] bg-black/5" />
          <span className="flex-[1.6] rounded-[4px] bg-[#2c3135]" />
        </div>
      </div>
    )
  }
  return (
    <div className="h-[88px] w-full">
      <ThemePreview frame="#072630" panel="#F2F4F5" accent="#FFFFFF" />
    </div>
  )
}

/** Engrenagem: abre as configurações (design system e, no Abyss, as cores). */
export function SettingsMenu({ buttonClassName, align = 'right' }: { buttonClassName: string; align?: 'right' | 'left' }) {
  const [open, setOpen] = useState(false)
  const { design, theme, setDesign, setTheme } = useDesign()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Configurações"
        aria-label="Configurações"
        aria-expanded={open}
        className={buttonClassName}
      >
        <i className={cn('ri-settings-4-line text-[18px] transition-transform duration-500 ease-apple', open && 'rotate-90')} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Configurações"
          className={cn(
            'absolute z-[300] w-[440px] rounded-[26px] border border-white/8 p-4 text-white shadow-float animate-in fade-in-0 duration-200',
            align === 'right' ? 'top-full right-0 mt-2 slide-in-from-top-1' : 'bottom-0 left-full ml-3 slide-in-from-left-1',
          )}
          style={{ background: 'var(--floating-gradient)' }}
        >
          <div className="flex items-center justify-between px-1 pb-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[16px] font-medium tracking-[-0.02em]">Configurações</span>
              <span className="text-[12px] text-white/45">Escolha como o acervo se organiza</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/60 outline-none transition-colors hover:bg-white/[0.14] hover:text-white focus-visible:ring-2 focus-visible:ring-ice-400"
            >
              <i className="ri-close-line text-[16px]" />
            </button>
          </div>

          <span className="px-1 text-[11.5px] font-medium tracking-[0.06em] text-white/40 uppercase">Design system</span>
          <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Design system">
            {DESIGNS.map((d) => (
              <OptionCard key={d.id} active={design === d.id} onClick={() => setDesign(d.id)} label={d.label} description={d.description}>
                <DesignPreview id={d.id} />
              </OptionCard>
            ))}
          </div>

          {design === 'abyss' && (
            <>
              <span className="mt-5 block px-1 text-[11.5px] font-medium tracking-[0.06em] text-white/40 uppercase">
                Cores do Abyss
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cores">
                {THEMES.map((t) => (
                  <OptionCard
                    key={t.id}
                    active={theme === t.id}
                    onClick={() => setTheme(t.id as ThemeId)}
                    label={t.label}
                    description={t.description}
                  >
                    <ThemePreview frame={t.frame} panel={t.panel} accent={t.accent} />
                  </OptionCard>
                ))}
              </div>
            </>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-white/[0.05] px-3 py-2.5 text-[11.5px] text-white/50">
            <i className="ri-information-line text-[14px] text-ice-300" />A escolha fica salva neste navegador.
          </div>
        </div>
      )}
    </div>
  )
}

function OptionCard({
  active,
  onClick,
  label,
  description,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-[18px] border p-1.5 pb-2.5 text-left outline-none transition-[border-color,background-color] duration-300',
        'focus-visible:ring-2 focus-visible:ring-ice-400',
        active ? 'border-ice-400 bg-white/[0.08]' : 'border-white/8 hover:border-white/20 hover:bg-white/[0.04]',
      )}
    >
      {children}
      <span className="flex items-center justify-between gap-1 px-1">
        <span className="text-[13px] font-medium">{label}</span>
        <span
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
            active ? 'border-ice-400 bg-ice-400 text-abyss-950' : 'border-white/25',
          )}
        >
          {active && <i className="ri-check-line text-[11px]" />}
        </span>
      </span>
      <span className="px-1 text-[11px] leading-[1.35] text-white/45">{description}</span>
    </button>
  )
}
