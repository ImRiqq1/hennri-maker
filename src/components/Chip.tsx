import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

/** Pílula de filtro/opção (fica Abyss quando selecionada). Fica bem dentro de um <ChipGroup>. */
export function Chip({
  active,
  onClick,
  children,
  className = 'h-9 px-4',
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'press inline-flex items-center rounded-[var(--r-control)] text-[13px] font-medium outline-none transition-[background-color,color,box-shadow] duration-300 ease-apple',
        'focus-visible:ring-4 focus-visible:ring-ice-200',
        className,
        active
          ? 'bg-[var(--chip-active-bg)] text-[var(--chip-active-text)] shadow-[0_6px_14px_-8px_rgb(4_26_33/0.7)]'
          : 'text-[var(--chip-text)] hover:bg-[var(--chip-hover-bg)] hover:text-[var(--chip-text-hover)]',
      )}
    >
      {children}
    </button>
  )
}
