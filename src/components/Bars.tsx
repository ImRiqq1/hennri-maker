import { cn } from '../lib/utils'

/** As três barrinhas inclinadas "///" da marca. */
export function Bars({
  barWidth = 7,
  barHeight = 18,
  gap = 4,
  colorClassName = 'bg-paper',
  className,
}: {
  barWidth?: number
  barHeight?: number
  gap?: number
  colorClassName?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-none -skew-x-[20deg]', className)} style={{ gap }} aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className={colorClassName} style={{ width: barWidth, height: barHeight }} />
      ))}
    </div>
  )
}
