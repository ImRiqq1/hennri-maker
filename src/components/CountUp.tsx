import { useCountUp } from '../lib/motion'

/** Mostra um número que conta até o valor quando ele chega ou muda. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value)
  return (
    <span className={className} aria-label={String(value)}>
      {shown}
    </span>
  )
}
