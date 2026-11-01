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
        'inline-flex items-center rounded-full text-[13px] font-medium outline-none transition-[background-color,color,box-shadow] duration-300 ease-apple',
        'focus-visible:ring-4 focus-visible:ring-ice-200',
        className,
        active
          ? 'bg-abyss-950 text-white shadow-[0_6px_14px_-8px_rgb(4_26_33/0.7)]'
          : 'text-abyss-700 hover:bg-mist-100 hover:text-abyss-950',
      )}
    >
      {children}
    </button>
  )
}
