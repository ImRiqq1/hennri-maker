import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, IconButton } from '../../components/PageHeader'
import { usePlayer } from '../../components/player/Player'
import { useToast } from '../../components/Toast'
import { TrackCard, TrackRow } from '../../components/trilhas/TrackCard'
import { TrackEditor, type TrackForm } from '../../components/trilhas/TrackEditor'
import { TrackMenu, type TrackAction } from '../../components/trilhas/TrackMenu'
import { TrilhasShell } from '../../components/trilhas/TrilhasShell'
import { api } from '../../lib/api'
import { INTENTS, clock, createJob, isActive, isSeparated, parseJSON, trackIntents, useJobs } from '../../lib/trilhas'
import type { NamedItem, Track } from '../../lib/types'
import { cn } from '../../lib/utils'
import { Dropdown } from '../../components/Dropdown'

type Filter =
  | { kind: 'all' }
  | { kind: 'sep' }
  | { kind: 'nosep' }
  | { kind: 'playlist'; id: string }
  | { kind: 'intent'; name: string }
  | { kind: 'project'; id: string }

type Sort = 'recentes' | 'az' | 'duracao'
const SORT_LABEL: Record<Sort, string> = { recentes: 'Mais recentes', az: 'A–Z', duracao: 'Duração' }

function savedView(): 'grid' | 'list' {
  try {
    return localStorage.getItem('hm-trilhas-view') === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function Biblioteca() {
  const navigate = useNavigate()
  const { flash } = useToast()
  const player = usePlayer()
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<NamedItem[]>([])
  const [projects, setProjects] = useState<NamedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>({ kind: 'all' })
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recentes')
  const [view, setView] = useState<'grid' | 'list'>(savedView)
  const [menu, setMenu] = useState<{ track: Track; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<Track | null>(null)

  const load = useCallback(async () => {
    const [t, pl, pr] = await Promise.all([
      api.get<Track[]>('/trilhas/tracks'),
      api.get<NamedItem[]>('/trilhas/playlists'),
      api.get<NamedItem[]>('/trilhas/projects'),
    ]).catch(() => [[], [], []] as [Track[], NamedItem[], NamedItem[]])
    setTracks(t)
    setPlaylists(pl)
    setProjects(pr)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // separações em andamento; recarrega quando uma termina
  const { jobs: sepJobs, reload: reloadJobs } = useJobs(['separate', 'music'], (job) => {
    if (job.status === 'ok') load()
  })
  const separatingIds = useMemo(
    () =>
      new Set(
        sepJobs.filter((j) => j.type === 'separate' && isActive(j)).map((j) => parseJSON<{ track_id?: string }>(j.payload, {}).track_id),
      ),
    [sepJobs],
  )

  useEffect(() => {
    try {
      localStorage.setItem('hm-trilhas-view', view)
    } catch {}
  }, [view])

  const counts = useMemo(() => {
    const intents = new Map<string, number>()
    for (const t of tracks) for (const i of trackIntents(t)) intents.set(i, (intents.get(i) ?? 0) + 1)
    const byPlaylist = new Map<string, number>()
    const byProject = new Map<string, number>()
    for (const t of tracks) {
      t.playlist_ids.forEach((p) => byPlaylist.set(p, (byPlaylist.get(p) ?? 0) + 1))
      t.project_ids.forEach((p) => byProject.set(p, (byProject.get(p) ?? 0) + 1))
    }
    const sep = tracks.filter(isSeparated).length
    return { intents, byPlaylist, byProject, sep, nosep: tracks.length - sep }
  }, [tracks])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = tracks.filter((t) => {
      switch (filter.kind) {
        case 'sep':
          return isSeparated(t)
        case 'nosep':
          return !isSeparated(t)
        case 'playlist':
          return t.playlist_ids.includes(filter.id)
        case 'intent':
          return trackIntents(t).includes(filter.name)
        case 'project':
          return t.project_ids.includes(filter.id)
        default:
          return true
      }
    })
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.artist ?? '').toLowerCase().includes(q))
    if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    if (sort === 'duracao') list = [...list].sort((a, b) => (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0))
    return list
  }, [tracks, filter, query, sort])

  const totalSeconds = visible.reduce((n, t) => n + (t.duration_seconds ?? 0), 0)
  const visibleSep = visible.filter(isSeparated).length

  function openMenu(track: Track, e: MouseEvent) {
    e.stopPropagation()
    setMenu({ track, x: e.clientX, y: e.clientY })
  }

  async function act(track: Track, action: TrackAction) {
    switch (action) {
      case 'play':
        return player.play(track, visible)
      case 'queue':
        player.addToQueue(track)
        return flash('Adicionada à fila')
      case 'edit':
        return setEditing(track)
      case 'separate':
        await createJob('separate', { track_id: track.id })
        reloadJobs()
        return flash('Separação na fila do ajudante')
      case 'open':
        await createJob('open', { kind: 'track', id: track.id })
        return flash('Abrindo a pasta no PC')
      case 'delete':
        if (!window.confirm(`Excluir "${track.title}" do site? O arquivo no PC continua.`)) return
        await api.delete(`/trilhas/tracks/${track.id}`)
        setTracks((l) => l.filter((t) => t.id !== track.id))
        return flash('Trilha excluída')
    }
  }

  async function togglePlaylist(track: Track, playlistId: string, inside: boolean) {
    if (inside) await api.delete(`/trilhas/playlists/${playlistId}/tracks/${track.id}`)
    else await api.post(`/trilhas/playlists/${playlistId}/tracks`, { track_id: track.id })
    const update = (t: Track) =>
      t.id === track.id
        ? { ...t, playlist_ids: inside ? t.playlist_ids.filter((p) => p !== playlistId) : [...t.playlist_ids, playlistId] }
        : t
    setTracks((l) => l.map(update))
    setMenu((m) => (m ? { ...m, track: update(m.track) } : m))
    flash(inside ? 'Tirada da playlist' : 'Adicionada à playlist')
  }

  async function saveTrack(form: TrackForm) {
    if (!editing) return
    await api.patch(`/trilhas/tracks/${editing.id}`, form)
    await load()
    setEditing(null)
    flash('Trilha atualizada')
  }

  async function createNamed(kind: 'playlists' | 'projects') {
    const name = window.prompt(kind === 'playlists' ? 'Nome da playlist' : 'Nome do projeto (ex.: um cliente)')?.trim()
    if (!name) return
    await api.post(`/trilhas/${kind}`, { name })
    load()
  }

  async function renameNamed(kind: 'playlists' | 'projects', item: NamedItem) {
    const name = window.prompt('Novo nome', item.name)?.trim()
    if (!name || name === item.name) return
    await api.patch(`/trilhas/${kind}/${item.id}`, { name })
    load()
  }

  async function deleteNamed(kind: 'playlists' | 'projects', item: NamedItem) {
    if (!window.confirm(`Apagar "${item.name}"? As trilhas continuam na biblioteca.`)) return
    await api.delete(`/trilhas/${kind}/${item.id}`)
    setFilter({ kind: 'all' })
    load()
  }

  const isOn = (f: Filter) => JSON.stringify(f) === JSON.stringify(filter)

  return (
    <TrilhasShell count={tracks.length}>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[264px_minmax(0,1fr)]">
        {/* lateral de filtros */}
        <aside className="flex flex-col gap-5 rounded-[var(--r-card)] border border-mist-200 bg-surface p-3 shadow-soft lg:sticky lg:top-2">
          <FilterGroup title="Trilhas">
            <FilterItem label="Todas as faixas" count={tracks.length} active={isOn({ kind: 'all' })} onClick={() => setFilter({ kind: 'all' })} />
            <FilterItem label="Com voz separada" count={counts.sep} active={isOn({ kind: 'sep' })} onClick={() => setFilter({ kind: 'sep' })} />
            <FilterItem label="Sem voz separada" count={counts.nosep} active={isOn({ kind: 'nosep' })} onClick={() => setFilter({ kind: 'nosep' })} />
          </FilterGroup>

          <FilterGroup title="Playlists" onAdd={() => createNamed('playlists')} addLabel="Nova playlist">
            {playlists.length === 0 && <span className="px-3 py-1 text-[12px] text-sub">Nenhuma ainda.</span>}
            {playlists.map((p) => (
              <FilterItem
                key={p.id}
                label={p.name}
                count={counts.byPlaylist.get(p.id) ?? 0}
                active={isOn({ kind: 'playlist', id: p.id })}
                onClick={() => setFilter({ kind: 'playlist', id: p.id })}
                onRename={() => renameNamed('playlists', p)}
                onDelete={() => deleteNamed('playlists', p)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Intenção">
            {INTENTS.map((i) => (
              <FilterItem
                key={i}
                label={i}
                count={counts.intents.get(i) ?? 0}
                active={isOn({ kind: 'intent', name: i })}
                onClick={() => setFilter({ kind: 'intent', name: i })}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Projetos" onAdd={() => createNamed('projects')} addLabel="Novo projeto">
            {projects.length === 0 && <span className="px-3 py-1 text-[12px] text-sub">Ex.: um cliente ou canal.</span>}
            {projects.map((p) => (
              <FilterItem
                key={p.id}
                label={p.name}
                count={counts.byProject.get(p.id) ?? 0}
                active={isOn({ kind: 'project', id: p.id })}
                onClick={() => setFilter({ kind: 'project', id: p.id })}
                onRename={() => renameNamed('projects', p)}
                onDelete={() => deleteNamed('projects', p)}
              />
            ))}
          </FilterGroup>
        </aside>

        {/* conteúdo */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-11 min-w-[240px] flex-1 items-center gap-2.5 rounded-[var(--r-control)] border border-mist-200 bg-surface px-4 shadow-soft focus-within:border-ice-400 focus-within:ring-4 focus-within:ring-ice-200/60">
              <i className="ri-search-line text-[16px] text-sub" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar por título ou artista"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-mist-400"
              />
            </label>
            <div className="flex items-center gap-1 rounded-[calc(var(--r-control)+4px)] border border-mist-200 bg-surface p-1 shadow-soft">
              <IconButton icon="ri-layout-grid-line" label="Grade" active={view === 'grid'} onClick={() => setView('grid')} />
              <IconButton icon="ri-list-check" label="Lista" active={view === 'list'} onClick={() => setView('list')} />
            </div>
            <Dropdown
              label="Ordem"
              icon="ri-sort-desc"
              value={sort}
              onChange={(v) => setSort(v as Sort)}
              options={(Object.keys(SORT_LABEL) as Sort[]).map((s) => ({ value: s, label: SORT_LABEL[s] }))}
              className="w-[180px]"
              alignRight
            />
          </div>

          <span className="px-1 text-[12.5px] text-sub">
            {visible.length} {visible.length === 1 ? 'faixa' : 'faixas'} · {clock(totalSeconds)} no total · {visibleSep} com voz separada
          </span>

          {!loading && visible.length === 0 ? (
            <EmptyState
              title={tracks.length ? 'Nada por aqui' : 'Biblioteca vazia'}
              message={tracks.length ? 'Nenhuma trilha com esse filtro.' : 'Cole um link do Spotify ou do YouTube pra baixar a primeira.'}
              action={
                <button
                  type="button"
                  onClick={() => navigate('/trilhas/baixar')}
                  className="press inline-flex h-11 items-center gap-2 rounded-[var(--r-control)] bg-primary px-5 text-[14px] font-medium text-primary-foreground shadow-soft"
                >
                  <i className="ri-download-2-line" /> Baixar música
                </button>
              }
            />
          ) : view === 'grid' ? (
            <div key={`g-${filter.kind}`} className="stagger grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visible.map((t) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  playing={player.isCurrent(t.id) && player.playing}
                  separating={separatingIds.has(t.id)}
                  onPlay={() => (player.isCurrent(t.id) ? player.toggle() : player.play(t, visible))}
                  onMenu={(e) => openMenu(t, e)}
                />
              ))}
            </div>
          ) : (
            <div key={`l-${filter.kind}`} className="stagger flex flex-col rounded-[var(--r-card)] border border-mist-200 bg-surface p-2 shadow-soft">
              {visible.map((t, i) => (
                <TrackRow
                  key={t.id}
                  index={i + 1}
                  track={t}
                  playing={player.isCurrent(t.id) && player.playing}
                  separating={separatingIds.has(t.id)}
                  onPlay={() => (player.isCurrent(t.id) ? player.toggle() : player.play(t, visible))}
                  onMenu={(e) => openMenu(t, e)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {menu && (
        <TrackMenu
          track={menu.track}
          x={menu.x}
          y={menu.y}
          playlists={playlists}
          separating={separatingIds.has(menu.track.id)}
          onAction={(a) => act(menu.track, a)}
          onTogglePlaylist={(pid, inside) => togglePlaylist(menu.track, pid, inside)}
          onClose={() => setMenu(null)}
        />
      )}
      <TrackEditor track={editing} projects={projects} onClose={() => setEditing(null)} onSave={saveTrack} />
    </TrilhasShell>
  )
}

function FilterGroup({ title, onAdd, addLabel, children }: { title: string; onAdd?: () => void; addLabel?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-3 pb-1">
        <span className="text-[11px] font-medium tracking-[0.06em] text-mist-400 uppercase">{title}</span>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-0.5 text-[11.5px] font-medium text-abyss-600 outline-none hover:text-fg focus-visible:underline"
          >
            <i className="ri-add-line" /> {addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function FilterItem({
  label,
  count,
  active,
  onClick,
  onRename,
  onDelete,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  onRename?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          'press flex w-full items-center justify-between gap-2 rounded-[var(--r-control)] px-3 py-2 text-left text-[13px] outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ice-200',
          active ? 'bg-primary font-medium text-primary-foreground' : 'text-abyss-700 hover:bg-mist-100',
        )}
      >
        <span className="truncate">{label}</span>
        <span className={cn('tnum flex-none text-[11.5px]', active ? 'opacity-70' : 'text-mist-400', (onRename || onDelete) && 'group-hover:opacity-0')}>
          {count}
        </span>
      </button>
      {(onRename || onDelete) && (
        <span className="absolute top-1/2 right-1.5 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onRename && (
            <button type="button" onClick={onRename} aria-label="Renomear" className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[12px]', active ? 'text-primary-foreground/80 hover:bg-white/15' : 'text-sub hover:bg-mist-200')}>
              <i className="ri-pencil-line" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} aria-label="Apagar" className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[12px]', active ? 'text-primary-foreground/80 hover:bg-white/15' : 'text-sub hover:bg-mist-200')}>
              <i className="ri-delete-bin-line" />
            </button>
          )}
        </span>
      )}
    </div>
  )
}
