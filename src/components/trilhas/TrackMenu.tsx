import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isSeparated } from '../../lib/trilhas'
import type { NamedItem, Track } from '../../lib/types'
import { cn } from '../../lib/utils'

export type TrackAction = 'play' | 'queue' | 'edit' | 'separate' | 'open' | 'delete'

/** Menu de contexto da trilha (clique direito ou ⋯), superfície Graphite flutuante. */
export function TrackMenu({
  track,
  x,
  y,
  playlists,
  separating,
  onAction,
  onTogglePlaylist,
  onClose,
}: {
  track: Track
  x: number
  y: number
  playlists: NamedItem[]
  separating: boolean
  onAction: (a: TrackAction) => void
  onTogglePlaylist: (playlistId: string, inside: boolean) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [showPlaylists, setShowPlaylists] = useState(false)

  // mantém o menu dentro da tela
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)),
    })
  }, [x, y, showPlaylists])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // fecha se a página rolar de verdade (não por um ajuste pequeno de rolagem)
    const scroller = document.getElementById('page-scroll')
    const startTop = scroller?.scrollTop ?? 0
    const onScroll = () => Math.abs((scroller?.scrollTop ?? 0) - startTop) > 40 && onClose()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
      scroller?.removeEventListener('scroll', onScroll)
    }
  }, [onClose])

  const item = (label: string, icon: string, action: TrackAction, opts?: { disabled?: boolean; danger?: boolean; hint?: string }) => (
    <button
      type="button"
      disabled={opts?.disabled}
      onClick={() => {
        onAction(action)
        onClose()
      }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2 text-left text-[13px] outline-none transition-colors disabled:opacity-40',
        opts?.danger ? 'text-[#f0a49f] hover:bg-danger/15' : 'hover:bg-white/[0.08] focus-visible:bg-white/[0.08]',
      )}
    >
      <i className={cn(icon, 'text-[15px]', opts?.danger ? '' : 'text-white/55')} />
      <span className="flex-1">{label}</span>
      {opts?.hint && <span className="text-[11px] text-white/35">{opts.hint}</span>}
    </button>
  )

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[700] w-[248px] rounded-[18px] border border-white/8 p-1.5 text-white shadow-float animate-in fade-in-0 zoom-in-[0.97] duration-150"
      style={{ ...pos, background: 'var(--floating-gradient)' }}
    >
      <span className="block truncate px-3 pt-1.5 pb-1 text-[10.5px] font-medium tracking-[0.06em] text-white/40 uppercase">
        {track.title}
      </span>
      {item('Tocar', 'ri-play-line', 'play')}
      {item('Adicionar à fila', 'ri-play-list-add-line', 'queue')}
      <div className="my-1 h-px bg-white/8" />
      {item('Editar nome e capa', 'ri-edit-line', 'edit')}
      {item('Intenções e projetos', 'ri-price-tag-3-line', 'edit')}
      <button
        type="button"
        onClick={() => setShowPlaylists((s) => !s)}
        aria-expanded={showPlaylists}
        className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2 text-left text-[13px] outline-none transition-colors hover:bg-white/[0.08]"
      >
        <i className="ri-play-list-line text-[15px] text-white/55" />
        <span className="flex-1">Playlists</span>
        <i className={cn('ri-arrow-down-s-line text-white/40 transition-transform', showPlaylists && 'rotate-180')} />
      </button>
      {showPlaylists && (
        <div className="mx-1 mb-1 flex flex-col rounded-[12px] bg-black/20 p-1">
          {playlists.length === 0 && <span className="px-3 py-2 text-[12px] text-white/45">Crie uma playlist na lateral.</span>}
          {playlists.map((p) => {
            const inside = track.playlist_ids.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onTogglePlaylist(p.id, inside)}
                className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-left text-[12.5px] outline-none hover:bg-white/[0.08]"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 flex-none items-center justify-center rounded-[5px] border',
                    inside ? 'border-ice-400 bg-ice-400 text-abyss-950' : 'border-white/25',
                  )}
                >
                  {inside && <i className="ri-check-line text-[11px]" />}
                </span>
                <span className="truncate">{p.name}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="my-1 h-px bg-white/8" />
      {item(isSeparated(track) ? 'Separar voz de novo' : 'Separar voz', 'ri-scissors-cut-line', 'separate', {
        disabled: separating || !track.audio_key,
        hint: separating ? 'na fila' : undefined,
      })}
      {item('Mostrar na pasta', 'ri-folder-open-line', 'open', { disabled: !track.local_path, hint: 'no PC' })}
      <div className="my-1 h-px bg-white/8" />
      {item('Excluir', 'ri-delete-bin-line', 'delete', { danger: true })}
    </div>
  )
}
