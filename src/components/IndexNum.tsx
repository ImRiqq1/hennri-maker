import { indexLabel } from '../lib/format'
import { cn } from '../lib/utils'

export function IndexNum({ n, width = 3, className }: { n: number; width?: number; className?: string }) {
  return (
    <span className={cn('font-mono text-[10px] tracking-[0.14em] text-cream/40', className)}>
      {indexLabel(n, width)}
    </span>
  )
}
