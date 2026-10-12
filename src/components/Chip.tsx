import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

/** Botão de filtro/opção (fica branco quando selecionado). */
export function Chip({
  active,
  onClick,
  children,
  className = 'px-3.5 py-1.5 tracking-[0.14em] uppercase',
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      data-hot="1"
      onClick={onClick}
      className={cn(
        'border font-mono text-[10px] outline-none',
        className,
        active ? 'border-paper bg-paper text-ink' : 'border-cream/16 text-cream/70 hover:border-cream/40',
      )}
    >
      {children}
    </button>
  )
}
