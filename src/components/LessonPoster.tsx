import { fileUrl } from '../lib/api'
import { formatDuration, formatSize } from '../lib/format'
import type { ModuleItem } from '../lib/types'
import { cn } from '../lib/utils'
import { HoverGlow } from './HoverGlow'

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E")`

/**
 * Pôster vertical de uma aula/material dentro de um módulo.
 * Sem capa, gera um pôster tipográfico com o número gigante.
 */
export function LessonPoster({
  item,
  moduleLabel,
  number,
  wide,
  onOpen,
}: {
  item: ModuleItem
  moduleLabel: string
  number: number
  wide: boolean
  onOpen: () => void
}) {
  const isMaterial = item.type === 'material'
  const cover = fileUrl(item.cover_key)
  const done = !isMaterial && !!item.completed_at
  const meta = isMaterial ? `${item.file_format ?? ''} · ${formatSize(item.file_size_mb)}` : formatDuration(item.duration_seconds)

  return (
    <div
      data-hot="1"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      style={{
        width: wide ? 240 : 200,
        borderTopWidth: isMaterial ? 2 : 1,
        borderTopColor: isMaterial ? 'rgba(232,224,213,0.5)' : 'rgba(232,224,213,0.12)',
      }}
      className={cn(
        'group relative aspect-2/3 flex-none cursor-none overflow-hidden border border-cream/12 bg-ink outline-none transition-transform duration-180 hover:scale-[1.02] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-paper',
        done && 'opacity-55',
      )}
    >
      {cover ? (
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <span className="absolute top-3 right-2.5 left-2.5 truncate font-mono text-[9px] tracking-[0.14em] text-cream/45 uppercase">
            {moduleLabel}
          </span>
          <span
            className="font-condensed absolute bottom-13 -left-3.5 leading-[0.72] tracking-[-0.05em] text-white/92 uppercase"
            style={{ fontSize: wide ? 210 : 150 }}
          >
            {String(number).padStart(2, '0')}
          </span>
          <div
            className="pointer-events-none absolute inset-0 opacity-35 mix-blend-overlay"
            style={{ backgroundImage: NOISE, backgroundSize: '220px 220px' }}
          />
        </div>
      )}
      <HoverGlow className="inset-x-0 bottom-0 h-[76%]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/92 to-transparent" />
      {done && (
        <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center border border-cream/60 text-cream">
          <i className="ri-check-line text-xs" />
        </div>
      )}
      <div className="absolute right-3 bottom-3 left-3 flex flex-col gap-1.5">
        <span className="line-clamp-2 text-[13px] leading-tight font-semibold tracking-[-0.01em] text-paper">{item.name}</span>
        {meta && <span className="font-mono text-[9.5px] tracking-[0.12em] text-cream/60 uppercase">{meta}</span>}
      </div>
      <div className="pointer-events-none absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-[opacity,transform] duration-180 group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-cream/40 bg-smoke/80 text-paper">
          <i className={isMaterial ? 'ri-arrow-down-line' : 'ri-play-fill'} style={{ fontSize: 18 }} />
        </div>
      </div>
    </div>
  )
}
