import type { MouseEvent } from 'react'
import { fileUrl } from '../../lib/api'
import { SOURCE_LABEL, clock, isSeparated, trackIntents } from '../../lib/trilhas'
import type { Track } from '../../lib/types'
import { cn } from '../../lib/utils'

/** Barrinhas animadas de "tocando agora". */
export function PlayingBars({ className }: { className?: string }) {
  return (
    <span className={cn('flex h-3.5 items-end gap-[2px]', className)} aria-label="Tocando">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] animate-pulse rounded-full bg-current"
          style={{ height: `${[60, 100, 40][i]}%`, animationDelay: `${i * 160}ms`, animationDuration: '700ms' }}
        />
      ))}
    </span>
  )
}

export function TrackCover({ track, className }: { track: Track; className?: string }) {
  const cover = fileUrl(track.cover_key)
  return (
    <span
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-abyss-600 via-abyss-800 to-abyss-950',
        className,
      )}
    >
      {cover ? (
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
      ) : null}
      {!cover && <i className="ri-music-2-fill text-[28px] text-ice-300/60" />}
    </span>
  )
}

function IntentChips({ track, max = 1 }: { track: Track; max?: number }) {
  const intents = trackIntents(track)
  if (!intents.length) return <span className="w-fit rounded-full border border-mist-200 px-2 py-0.5 text-[10.5px] whitespace-nowrap text-sub">sem intenção</span>
  return (
    <span className="flex w-fit max-w-full min-w-0 items-center gap-1">
      {intents.slice(0, max).map((i) => (
        <span key={i} className="truncate rounded-full bg-ice-100 px-2 py-0.5 text-[10.5px] font-medium text-abyss-600">
          {i.split(' · ')[0]}
        </span>
      ))}
      {intents.length > max && (
        <span className="flex-none rounded-full bg-mist-100 px-1.5 py-0.5 text-[10.5px] font-medium text-sub">+{intents.length - max}</span>
      )}
    </span>
  )
}

type CardProps = {
  track: Track
  playing: boolean
  separating: boolean
  onPlay: () => void
  onMenu: (e: MouseEvent) => void
}

/** Card da biblioteca (grade). */
export function TrackCard({ track, playing, separating, onPlay, onMenu }: CardProps) {
  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(e)
      }}
      className={cn(
        'group flex flex-col gap-3 rounded-[var(--r-card)] border bg-surface p-2 pb-3.5 shadow-soft transition-[transform,box-shadow,border-color] duration-500 ease-apple hover:-translate-y-1 hover:shadow-lift',
        playing ? 'border-ice-400' : 'border-mist-200',
      )}
    >
      <div className="relative">
        <button type="button" onClick={onPlay} className="block w-full outline-none focus-visible:ring-4 focus-visible:ring-ice-200" aria-label={`Tocar ${track.title}`}>
          <TrackCover track={track} className="aspect-square w-full rounded-[var(--r-inner)]" />
        </button>
        {isSeparated(track) && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-surface/90 py-1 pr-2.5 pl-2 text-[11px] font-medium text-abyss-700 shadow-soft backdrop-blur">
            <i className="ri-scissors-cut-line text-abyss-500" /> separada
          </span>
        )}
        {separating && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-primary py-1 pr-2.5 pl-2 text-[11px] font-medium text-primary-foreground shadow-soft">
            <i className="ri-loader-4-line animate-spin" /> separando…
          </span>
        )}
        <button
          type="button"
          onClick={onPlay}
          aria-label={playing ? 'Tocando' : 'Tocar'}
          className={cn(
            'press absolute right-2.5 bottom-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift outline-none transition-[opacity,transform] duration-300 focus-visible:opacity-100',
            playing ? 'opacity-100' : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100',
          )}
        >
          {playing ? <PlayingBars /> : <i className="ri-play-fill text-[18px]" />}
        </button>
        <button
          type="button"
          onClick={(e) => onMenu(e)}
          aria-label="Mais opções"
          className="press absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-abyss-700 opacity-0 shadow-soft outline-none backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <i className="ri-more-fill" />
        </button>
      </div>
      <div className="flex min-w-0 flex-col gap-1 px-1.5">
        <span className="truncate text-[14.5px] font-medium tracking-[-0.02em] text-fg">{track.title}</span>
        <span className="truncate text-[12px] text-sub">
          {track.artist ?? 'Artista desconhecido'} · {SOURCE_LABEL[track.source]}
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="tnum flex-none text-[11.5px] text-sub">{clock(track.duration_seconds)}</span>
          <IntentChips track={track} />
        </span>
      </div>
    </div>
  )
}

/** Linha da biblioteca (lista). */
export function TrackRow({ track, playing, separating, onPlay, onMenu, index }: CardProps & { index: number }) {
  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(e)
      }}
      onDoubleClick={onPlay}
      className={cn(
        'group grid grid-cols-[28px_44px_minmax(0,1.6fr)_minmax(0,1fr)_64px_36px] items-center gap-3 rounded-[16px] px-2 py-2 transition-colors',
        playing ? 'bg-ice-100/70' : 'hover:bg-mist-50',
      )}
    >
      <button type="button" onClick={onPlay} aria-label="Tocar" className="flex h-7 w-7 items-center justify-center rounded-full text-sub outline-none hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200">
        {playing ? (
          <PlayingBars className="text-abyss-600" />
        ) : (
          <>
            <span className="tnum text-[11.5px] group-hover:hidden">{String(index).padStart(2, '0')}</span>
            <i className="ri-play-fill hidden text-[16px] group-hover:block" />
          </>
        )}
      </button>
      <TrackCover track={track} className="h-11 w-11 rounded-[12px]" />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium text-fg">{track.title}</span>
          {isSeparated(track) && <i className="ri-scissors-cut-line flex-none text-[13px] text-abyss-500" title="Voz separada" />}
          {separating && <i className="ri-loader-4-line flex-none animate-spin text-[13px] text-abyss-500" title="Separando" />}
        </span>
        <span className="truncate text-[11.5px] text-sub">
          {track.artist ?? 'Artista desconhecido'} · {SOURCE_LABEL[track.source]}
        </span>
      </span>
      <IntentChips track={track} max={2} />
      <span className="tnum text-right text-[12px] text-sub">{clock(track.duration_seconds)}</span>
      <button
        type="button"
        onClick={(e) => onMenu(e)}
        aria-label="Mais opções"
        className="flex h-8 w-8 items-center justify-center rounded-full text-sub opacity-0 outline-none transition-opacity group-hover:opacity-100 hover:bg-mist-100 hover:text-fg focus-visible:opacity-100"
      >
        <i className="ri-more-fill" />
      </button>
    </div>
  )
}
