import { cn } from '../lib/utils'

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E")`

/** Brilho com granulado que aparece no hover de um elemento com a classe `group`. */
export function HoverGlow({ direction = 'up', className }: { direction?: 'up' | 'right'; className?: string }) {
  const gradient =
    direction === 'up'
      ? 'linear-gradient(to top, rgba(255,255,255,0.30) 0%, rgba(232,224,213,0.18) 34%, rgba(232,224,213,0.06) 62%, rgba(9,9,11,0) 92%)'
      : 'linear-gradient(to right, rgba(255,255,255,0.30) 0%, rgba(232,224,213,0.14) 40%, rgba(232,224,213,0) 100%)'
  return (
    <>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute opacity-0 transition-opacity duration-[180ms] ease-out group-hover:opacity-100 group-focus-visible:opacity-100',
          className,
        )}
        style={{ backgroundImage: gradient }}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute opacity-0 mix-blend-overlay transition-opacity duration-[180ms] ease-out group-hover:opacity-60 group-focus-visible:opacity-60',
          className,
        )}
        style={{ backgroundImage: NOISE, backgroundSize: '220px 220px' }}
      />
    </>
  )
}
