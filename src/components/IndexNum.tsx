import { indexLabel } from '../lib/format'
import { cn } from '../lib/utils'

/** Número do item na lista ("07"), discreto. */
export function IndexNum({ n, width = 2, className }: { n: number; width?: number; className?: string }) {
  return <span className={cn('tnum text-[11.5px] font-medium text-mist-400', className)}>{indexLabel(n, width)}</span>
}
