import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { fileUrl } from '../../lib/api'
import { clock, isSeparated } from '../../lib/trilhas'
import type { Track } from '../../lib/types'
import { cn } from '../../lib/utils'

export type Version = 'original' | 'instrumental' | 'voz'

const VERSION_LABEL: Record<Version, string> = { original: 'Original', instrumental: 'Instrumental', voz: 'Voz' }

function keyFor(t: Track, v: Version) {
  if (v === 'instrumental') return t.instrumental_key ?? t.audio_key
  if (v === 'voz') return t.vocals_key ?? t.audio_key
  return t.audio_key
}

type PlayerCtx = {
  current: Track | null
  queue: Track[]
  playing: boolean
  version: Version
  /** toca a trilha; `list` vira a fila (pra próxima/anterior) */
  play: (track: Track, list?: Track[], version?: Version) => void
  toggle: () => void
  addToQueue: (track: Track) => void
  isCurrent: (id: string) => boolean
}

const Ctx = createContext<PlayerCtx | null>(null)

export function usePlayer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>')
  return ctx
}

/** Player global: a música continua tocando quando você troca de página. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [index, setIndex] = useState(-1)
  const [version, setVersionState] = useState<Version>('original')
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    try {
      const v = Number(localStorage.getItem('hm-volume'))
      return v > 0 && v <= 1 ? v : 0.9
    } catch {
      return 0.9
    }
  })
  const resumeAt = useRef<number | null>(null)
  const current = index >= 0 ? (queue[index] ?? null) : null
  const src = current ? fileUrl(keyFor(current, version)) : undefined

  // espaço no fim da página pra barra não cobrir o conteúdo
  useEffect(() => {
    document.documentElement.style.setProperty('--player-space', current ? '112px' : '0px')
  }, [current])

  useEffect(() => {
    const a = audioRef.current
    if (a) a.volume = volume
    try {
      localStorage.setItem('hm-volume', String(volume))
    } catch {}
  }, [volume])

  useEffect(() => {
    const a = audioRef.current
    if (!a || !src) return
    setDuration(0)
    a.load()
    a.play().catch(() => setPlaying(false))
  }, [src])

  const play = useCallback((track: Track, list?: Track[], v: Version = 'original') => {
    const items = list && list.some((t) => t.id === track.id) ? list : [track]
    setQueue(items)
    setIndex(items.findIndex((t) => t.id === track.id))
    setVersionState(isSeparated(track) ? v : 'original')
    resumeAt.current = null
    setTime(0)
  }, [])

  const toggle = useCallback(() => {
    const a = audioRef.current
    if (!a || !src) return
    if (a.paused) a.play().catch(() => {})
    else a.pause()
  }, [src])

  const addToQueue = useCallback(
    (track: Track) => {
      if (index < 0) return play(track)
      setQueue((q) => (q.some((t) => t.id === track.id) ? q : [...q, track]))
    },
    [index, play],
  )

  const step = useCallback(
    (delta: number) => {
      if (!queue.length) return
      const a = audioRef.current
      if (delta < 0 && a && a.currentTime > 3) {
        a.currentTime = 0
        return
      }
      const next = index + delta
      if (next < 0 || next >= queue.length) return
      setIndex(next)
      setVersionState((v) => (isSeparated(queue[next]) ? v : 'original'))
    },
    [index, queue],
  )

  // troca Original/Instrumental/Voz no mesmo ponto da música
  const setVersion = useCallback((v: Version) => {
    resumeAt.current = audioRef.current?.currentTime ?? 0
    setVersionState(v)
  }, [])

  const close = useCallback(() => {
    audioRef.current?.pause()
    setQueue([])
    setIndex(-1)
  }, [])

  const isCurrent = useCallback((id: string) => current?.id === id, [current])

  return (
    <Ctx.Provider value={{ current, queue, playing, version, play, toggle, addToQueue, isCurrent }}>
      {children}
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || current?.duration_seconds || 0)
          if (resumeAt.current != null) {
            e.currentTarget.currentTime = resumeAt.current
            resumeAt.current = null
          }
        }}
        onEnded={() => step(1)}
      />
      {current && (
        <PlayerBar
          track={current}
          queue={queue}
          index={index}
          playing={playing}
          version={version}
          time={time}
          duration={duration || current.duration_seconds || 0}
          volume={volume}
          onToggle={toggle}
          onStep={step}
          onSeek={(s) => {
            if (audioRef.current) audioRef.current.currentTime = s
          }}
          onVersion={setVersion}
          onVolume={setVolume}
          onPick={(i) => {
            setIndex(i)
            setVersionState((v) => (isSeparated(queue[i]) ? v : 'original'))
          }}
          onRemove={(i) => {
            setQueue((q) => q.filter((_, j) => j !== i))
            if (i < index) setIndex((x) => x - 1)
          }}
          onClose={close}
        />
      )}
    </Ctx.Provider>
  )
}

function PlayerBar({
  track,
  queue,
  index,
  playing,
  version,
  time,
  duration,
  volume,
  onToggle,
  onStep,
  onSeek,
  onVersion,
  onVolume,
  onPick,
  onRemove,
  onClose,
}: {
  track: Track
  queue: Track[]
  index: number
  playing: boolean
  version: Version
  time: number
  duration: number
  volume: number
  onToggle: () => void
  onStep: (d: number) => void
  onSeek: (s: number) => void
  onVersion: (v: Version) => void
  onVolume: (v: number) => void
  onPick: (i: number) => void
  onRemove: (i: number) => void
  onClose: () => void
}) {
  const [showQueue, setShowQueue] = useState(false)
  const cover = fileUrl(track.cover_key)
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0
  const separated = isSeparated(track)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.code !== 'Space' || el.closest('input, textarea, select, button, [contenteditable="true"]')) return
      e.preventDefault()
      onToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggle])

  return (
    <div
      role="region"
      aria-label="Player"
      className="fixed bottom-5 left-1/2 z-[500] w-[min(880px,calc(100%-32px))] -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
    >
      {showQueue && (
        <div
          className="absolute right-0 bottom-full mb-2 max-h-80 w-[340px] overflow-y-auto rounded-[22px] border border-white/8 p-1.5 text-white shadow-float animate-in fade-in-0 slide-in-from-bottom-1"
          style={{ background: 'var(--floating-gradient)' }}
        >
          <span className="block px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.06em] text-white/40 uppercase">Fila</span>
          {queue.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              className={cn('group flex items-center gap-2 rounded-[14px] px-2 py-1.5', i === index ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]')}
            >
              <button type="button" onClick={() => onPick(i)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none">
                <span className="tnum w-5 text-center text-[11px] text-white/40">
                  {i === index ? <i className="ri-volume-up-line text-ice-300" /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px]">{t.title}</span>
                  <span className="truncate text-[11px] text-white/45">{t.artist ?? '—'}</span>
                </span>
              </button>
              {i !== index && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label="Tirar da fila"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
                >
                  <i className="ri-close-line" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        className="flex items-center gap-4 rounded-[26px] border border-white/8 px-3 py-2.5 text-white shadow-float"
        style={{ background: 'var(--floating-gradient)' }}
      >
        <span className="relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-abyss-600 to-abyss-900">
          {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {!cover && <i className="ri-music-2-fill text-[18px] text-ice-300" />}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13.5px] font-medium">{track.title}</span>
              <span className="truncate text-[11.5px] text-white/50">
                {VERSION_LABEL[version]}
                {track.artist ? ` · ${track.artist}` : ''}
              </span>
            </span>
            {separated && (
              <div className="ml-auto hidden flex-none items-center gap-0.5 rounded-full bg-white/[0.07] p-0.5 sm:flex">
                {(['original', 'instrumental', 'voz'] as Version[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onVersion(v)}
                    aria-pressed={version === v}
                    className={cn(
                      'press h-7 rounded-full px-3 text-[11.5px] font-medium outline-none transition-colors',
                      version === v ? 'bg-ice-400 text-abyss-950' : 'text-white/65 hover:text-white',
                    )}
                  >
                    {VERSION_LABEL[v]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="tnum w-10 text-right text-[11px] text-white/50">{clock(time)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              onChange={(e) => onSeek(Number(e.target.value))}
              aria-label="Posição da música"
              className="hm-range h-1 flex-1"
              style={{ ['--pct' as string]: `${pct}%` }}
            />
            <span className="tnum w-10 text-[11px] text-white/50">{clock(duration)}</span>
          </div>
        </div>

        <div className="flex flex-none items-center gap-1">
          <button type="button" onClick={() => onStep(-1)} aria-label="Anterior" className="press flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:text-white">
            <i className="ri-skip-back-fill text-[17px]" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={playing ? 'Pausar' : 'Tocar'}
            className="press flex h-11 w-11 items-center justify-center rounded-full bg-ice-400 text-abyss-950 shadow-[0_6px_16px_-6px_rgb(134_203_221/0.6)]"
          >
            <i className={cn(playing ? 'ri-pause-fill' : 'ri-play-fill', 'text-[20px]')} />
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            disabled={index >= queue.length - 1}
            aria-label="Próxima"
            className="press flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:text-white disabled:opacity-30"
          >
            <i className="ri-skip-forward-fill text-[17px]" />
          </button>
        </div>

        <div className="hidden flex-none items-center gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => onVolume(volume > 0 ? 0 : 0.9)}
            aria-label={volume > 0 ? 'Silenciar' : 'Ligar o som'}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:text-white"
          >
            <i className={volume === 0 ? 'ri-volume-mute-line' : 'ri-volume-up-line'} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            aria-label="Volume"
            className="hm-range h-1 w-20"
            style={{ ['--pct' as string]: `${volume * 100}%` }}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowQueue((s) => !s)}
          aria-label="Fila"
          aria-pressed={showQueue}
          className={cn('press flex h-9 w-9 flex-none items-center justify-center rounded-full', showQueue ? 'bg-white/[0.12] text-white' : 'text-white/60 hover:text-white')}
        >
          <i className="ri-play-list-2-line text-[16px]" />
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar o player" className="press flex h-9 w-9 flex-none items-center justify-center rounded-full text-white/50 hover:text-white">
          <i className="ri-close-line text-[17px]" />
        </button>
      </div>
    </div>
  )
}
