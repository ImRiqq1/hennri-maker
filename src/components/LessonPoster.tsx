import { fileUrl } from '../lib/api'
import { formatDuration, formatSize } from '../lib/format'
import type { ModuleItem } from '../lib/types'
import { cn } from '../lib/utils'

/**
 * Pôster vertical de uma aula/material dentro de um módulo.
 * Sem capa, gera um pôster com o número grande e fino sobre o degradê Abyss.
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
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      style={{ width: wide ? 240 : 200 }}
      className={cn(
        'group relative aspect-2/3 flex-none cursor-pointer overflow-hidden rounded-[24px] text-white shadow-soft outline-none transition-[transform,box-shadow] duration-500 ease-apple hover:-translate-y-1 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-ice-200',
        done && 'opacity-60',
      )}
    >
      {cover ? (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-[1.05]"
        />
      ) : (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ background: isMaterial ? 'var(--floating-gradient)' : 'var(--hero-gradient)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full opacity-50 blur-2xl"
            style={{ background: 'radial-gradient(closest-side, rgba(79,170,194,0.65), transparent)' }}
          />
          <span className="absolute top-4 right-4 left-4 truncate text-[11.5px] text-white/50">{moduleLabel}</span>
          <span
            className="tnum absolute bottom-16 left-3 leading-[0.8] font-light tracking-[-0.07em] text-white/90"
            style={{ fontSize: wide ? 150 : 116 }}
          >
            {String(number).padStart(2, '0')}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-abyss-950/90 via-abyss-950/45 to-transparent" />
      <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 py-1 pr-2.5 pl-1.5 text-[11px] font-medium text-abyss-700 backdrop-blur">
        <i className={cn(isMaterial ? 'ri-file-zip-line' : 'ri-play-circle-line', 'text-[12px] text-abyss-500')} />
        {isMaterial ? 'Material' : 'Aula'}
      </span>
      {done && (
        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-success text-white">
          <i className="ri-check-line text-[13px]" />
        </div>
      )}
      <div className="absolute right-4 bottom-4 left-4 flex flex-col gap-1">
        <span className="line-clamp-2 text-[14px] leading-tight font-medium tracking-[-0.02em] text-white">{item.name}</span>
        {meta && <span className="text-[11.5px] text-white/60">{meta}</span>}
      </div>
      <div className="pointer-events-none absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-[opacity,transform] duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-abyss-950 shadow-float">
          <i className={isMaterial ? 'ri-arrow-down-line' : 'ri-play-fill'} style={{ fontSize: 20 }} />
        </div>
      </div>
    </div>
  )
}
