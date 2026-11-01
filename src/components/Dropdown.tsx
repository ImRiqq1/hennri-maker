import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'

export type DropdownOption = { value: string; label: string; icon?: string }

const TRIGGER = {
  light:
    'border-mist-200 bg-surface text-abyss-700 shadow-soft hover:border-mist-300 focus-visible:ring-4 focus-visible:ring-ice-200',
  dark: 'border-white/10 bg-white/[0.04] text-white hover:border-white/20 focus-visible:ring-2 focus-visible:ring-ice-400',
}

/**
 * Seleção em pílula com o menu numa superfície Graphite flutuante (no lugar do <select> do sistema).
 * Teclado: setas, Home/End, Enter/Espaço escolhe, Esc fecha.
 */
export function Dropdown({
  value,
  options,
  onChange,
  label,
  icon,
  tone = 'light',
  placeholder = 'Escolher…',
  className,
  alignRight = false,
}: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  /** nome pra leitor de tela */
  label: string
  icon?: string
  tone?: 'light' | 'dark'
  placeholder?: string
  className?: string
  /** alinha o menu pela direita do botão */
  alignRight?: boolean
}) {
  const id = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<CSSProperties>({})
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    listRef.current?.focus()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!wrapRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', close)
    document.getElementById('page-scroll')?.addEventListener('scroll', close, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', close)
      document.getElementById('page-scroll')?.removeEventListener('scroll', close)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // o menu abre num portal (por cima de tudo), alinhado ao botão; vira pra cima se não couber embaixo
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const up = below < 300 && r.top > below
    setPos({
      position: 'fixed',
      minWidth: r.width,
      ...(alignRight ? { right: window.innerWidth - r.right } : { left: r.left }),
      ...(up ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }),
    })
  }, [open, alignRight])

  // mantém o item ativo visível na lista
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function choose(i: number) {
    const o = options[i]
    if (o) onChange(o.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onListKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') setActive((a) => Math.min(options.length - 1, a + 1))
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') choose(active)
    else if (e.key === 'Escape') {
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Tab') setOpen(false)
    else return
    e.preventDefault()
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'press flex h-11 w-full items-center gap-2 rounded-[var(--r-control)] border pr-3 pl-4 text-[13px] font-medium outline-none transition-[border-color,box-shadow]',
          TRIGGER[tone],
        )}
      >
        {(selected?.icon ?? icon) && (
          <i className={cn(selected?.icon ?? icon, 'flex-none text-[15px]', tone === 'dark' ? 'text-white/45' : 'text-sub')} />
        )}
        <span className={cn('min-w-0 flex-1 truncate text-left', !selected && (tone === 'dark' ? 'text-white/45' : 'text-mist-400'))}>
          {selected?.label ?? placeholder}
        </span>
        <i
          className={cn(
            'ri-arrow-down-s-line flex-none text-[16px] transition-transform duration-300 ease-apple',
            open && 'rotate-180',
            tone === 'dark' ? 'text-white/55' : 'text-sub',
          )}
        />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onListKey}
            className="z-[800] max-h-72 overflow-y-auto rounded-[18px] border border-white/8 p-1.5 text-white shadow-float outline-none animate-in fade-in-0 slide-in-from-top-1 duration-200"
            style={{ ...pos, background: 'var(--floating-gradient)' }}
          >
            {options.map((o, i) => {
              const isSel = o.value === value
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-[12px] px-3 py-2 text-[13px] whitespace-nowrap transition-colors',
                    i === active ? 'bg-white/[0.09]' : '',
                  )}
                >
                  {o.icon && <i className={cn(o.icon, 'text-[15px] text-white/55')} />}
                  <span className="flex-1 truncate">{o.label}</span>
                  <i className={cn('ri-check-line text-[15px] text-ice-300', !isSel && 'invisible')} />
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}
