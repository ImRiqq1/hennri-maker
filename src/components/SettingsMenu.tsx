import { useEffect, useRef, useState } from 'react'
import { THEMES, applyTheme, getTheme, type ThemeId } from '../lib/theme'
import { cn } from '../lib/utils'

/** Botão redondo da barra do topo (segue as cores da moldura de cada tema). */
export const FRAME_ICON_BUTTON =
  'flex h-12 w-12 flex-none items-center justify-center rounded-full border border-[var(--frame-field-border)] bg-[var(--frame-field-bg)] text-[var(--frame-field-muted)] outline-none backdrop-blur-md transition-colors hover:text-[var(--frame-field-text)] focus-visible:ring-2 focus-visible:ring-ice-400'

/** Miniatura do tema: moldura, aba, menu e cards. */
function ThemePreview({ frame, panel, accent }: { frame: string; panel: string; accent: string }) {
  return (
    <div className="relative h-[76px] w-full overflow-hidden rounded-[14px] p-1.5" style={{ background: frame }}>
      <div className="flex h-3 items-center gap-1 pl-[38%]">
        <span className="h-1.5 w-5 rounded-full" style={{ background: accent, opacity: 0.9 }} />
        <span className="h-1.5 w-3 rounded-full bg-white/30" />
        <span className="h-1.5 w-3 rounded-full bg-white/30" />
      </div>
      <div className="absolute top-1.5 left-1.5 h-3 w-[34%] rounded-t-[7px]" style={{ background: panel }} />
      <div className="mt-0 h-[52px] rounded-[9px] rounded-tl-none p-1.5" style={{ background: panel }}>
        <div className="grid h-full grid-cols-[1.4fr_1fr] gap-1">
          <span className="rounded-[6px]" style={{ background: 'linear-gradient(135deg,#1f4a5e,#041a21)' }} />
          <span className="flex flex-col gap-1">
            <span className="flex-1 rounded-[6px] border border-black/5 bg-white/70" />
            <span className="flex-1 rounded-[6px] border border-black/5 bg-white/70" />
          </span>
        </div>
      </div>
    </div>
  )
}

/** Engrenagem na barra do topo: abre as configurações (por enquanto, a aparência). */
export function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeId>(getTheme)
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

  function choose(id: ThemeId) {
    applyTheme(id)
    setTheme(id)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Configurações"
        aria-label="Configurações"
        aria-expanded={open}
        className={cn(FRAME_ICON_BUTTON, open && 'text-[var(--frame-field-text)]')}
      >
        <i className={cn('ri-settings-4-line text-[18px] transition-transform duration-500 ease-apple', open && 'rotate-90')} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Configurações"
          className="absolute top-full right-0 z-[300] mt-2 w-[400px] rounded-[26px] border border-white/8 p-4 text-white shadow-float animate-in fade-in-0 slide-in-from-top-1 duration-200"
          style={{ background: 'var(--floating-gradient)' }}
        >
          <div className="flex items-center justify-between px-1 pb-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[16px] font-medium tracking-[-0.02em]">Configurações</span>
              <span className="text-[12px] text-white/45">Aparência do acervo</span>
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

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
            {THEMES.map((t) => {
              const active = theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choose(t.id)}
                  className={cn(
                    'group flex flex-col gap-2.5 rounded-[18px] border p-1.5 pb-2.5 text-left outline-none transition-[border-color,background-color] duration-300',
                    'focus-visible:ring-2 focus-visible:ring-ice-400',
                    active ? 'border-ice-400 bg-white/[0.08]' : 'border-white/8 hover:border-white/20 hover:bg-white/[0.04]',
                  )}
                >
                  <ThemePreview frame={t.frame} panel={t.panel} accent={t.accent} />
                  <span className="flex items-center justify-between gap-1 px-1">
                    <span className="text-[13px] font-medium">{t.label}</span>
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                        active ? 'border-ice-400 bg-ice-400 text-abyss-950' : 'border-white/25',
                      )}
                    >
                      {active && <i className="ri-check-line text-[11px]" />}
                    </span>
                  </span>
                  <span className="px-1 text-[11px] leading-[1.35] text-white/45">{t.description}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-white/[0.05] px-3 py-2.5 text-[11.5px] text-white/50">
            <i className="ri-information-line text-[14px] text-ice-300" />A escolha fica salva neste navegador.
          </div>
        </div>
      )}
    </div>
  )
}
