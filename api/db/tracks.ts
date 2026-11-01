import type { Playlist, Project, Track } from '../types'

/** Trilha com as playlists e projetos em que ela está. */
export type TrackWithLinks = Track & { playlist_ids: string[]; project_ids: string[] }

export type TrackInput = {
  title: string
  artist?: string | null
  source: Track['source']
  source_url?: string | null
  duration_seconds?: number | null
  cover_key?: string | null
  audio_key?: string | null
  instrumental_key?: string | null
  vocals_key?: string | null
  local_path?: string | null
  intents?: string[]
  match_note?: string | null
}

const TRACK_FIELDS = [
  'title',
  'artist',
  'source',
  'source_url',
  'duration_seconds',
  'cover_key',
  'audio_key',
  'instrumental_key',
  'vocals_key',
  'local_path',
  'match_note',
] as const

export async function listTracks(db: D1Database): Promise<TrackWithLinks[]> {
  const [tracks, pl, pr] = await db.batch([
    db.prepare('SELECT * FROM tracks ORDER BY created_at DESC'),
    db.prepare('SELECT playlist_id, track_id FROM playlist_tracks'),
    db.prepare('SELECT project_id, track_id FROM track_projects'),
  ])
  const playlistsBy = new Map<string, string[]>()
  for (const r of pl.results as { playlist_id: string; track_id: string }[]) {
    playlistsBy.set(r.track_id, [...(playlistsBy.get(r.track_id) ?? []), r.playlist_id])
  }
  const projectsBy = new Map<string, string[]>()
  for (const r of pr.results as { project_id: string; track_id: string }[]) {
    projectsBy.set(r.track_id, [...(projectsBy.get(r.track_id) ?? []), r.project_id])
  }
  return (tracks.results as Track[]).map((t) => ({
    ...t,
    playlist_ids: playlistsBy.get(t.id) ?? [],
    project_ids: projectsBy.get(t.id) ?? [],
  }))
}

export async function getTrack(db: D1Database, id: string): Promise<Track | null> {
  return db.prepare('SELECT * FROM tracks WHERE id = ?').bind(id).first<Track>()
}

export async function createTrack(db: D1Database, input: TrackInput): Promise<Track> {
  const now = Date.now()
  const track: Track = {
    id: crypto.randomUUID(),
    title: input.title,
    artist: input.artist ?? null,
    source: input.source,
    source_url: input.source_url ?? null,
    duration_seconds: input.duration_seconds ?? null,
    cover_key: input.cover_key ?? null,
    audio_key: input.audio_key ?? null,
    instrumental_key: input.instrumental_key ?? null,
    vocals_key: input.vocals_key ?? null,
    local_path: input.local_path ?? null,
    intents: input.intents?.length ? JSON.stringify(input.intents) : null,
    match_note: input.match_note ?? null,
    created_at: now,
    updated_at: now,
  }
  await db
    .prepare(
      `INSERT INTO tracks (id, title, artist, source, source_url, duration_seconds, cover_key, audio_key,
         instrumental_key, vocals_key, local_path, intents, match_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      track.id,
      track.title,
      track.artist,
      track.source,
      track.source_url,
      track.duration_seconds,
      track.cover_key,
      track.audio_key,
      track.instrumental_key,
      track.vocals_key,
      track.local_path,
      track.intents,
      track.match_note,
      track.created_at,
      track.updated_at,
    )
    .run()
  return track
}

/** Atualiza só os campos enviados. `intents` e `project_ids` substituem a lista inteira. */
export async function updateTrack(
  db: D1Database,
  id: string,
  input: Partial<TrackInput> & { project_ids?: string[] },
): Promise<Track | null> {
  const existing = await getTrack(db, id)
  if (!existing) return null
  const sets: string[] = []
  const binds: unknown[] = []
  for (const f of TRACK_FIELDS) {
    if (input[f] !== undefined) {
      sets.push(`${f} = ?`)
      binds.push(input[f])
    }
  }
  if (input.intents !== undefined) {
    sets.push('intents = ?')
    binds.push(input.intents.length ? JSON.stringify(input.intents) : null)
  }
  const stmts: D1PreparedStatement[] = []
  if (sets.length) {
    stmts.push(
      db.prepare(`UPDATE tracks SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).bind(...binds, Date.now(), id),
    )
  }
  if (input.project_ids !== undefined) {
    stmts.push(db.prepare('DELETE FROM track_projects WHERE track_id = ?').bind(id))
    for (const pid of input.project_ids) {
      stmts.push(db.prepare('INSERT OR IGNORE INTO track_projects (project_id, track_id) VALUES (?, ?)').bind(pid, id))
    }
  }
  if (stmts.length) await db.batch(stmts)
  return getTrack(db, id)
}

/** Apaga a trilha e devolve as chaves do R2 que ela usava (pra apagar os arquivos). */
export async function deleteTrack(db: D1Database, id: string): Promise<string[] | null> {
  const t = await getTrack(db, id)
  if (!t) return null
  await db.batch([
    db.prepare('DELETE FROM playlist_tracks WHERE track_id = ?').bind(id),
    db.prepare('DELETE FROM track_projects WHERE track_id = ?').bind(id),
    db.prepare('DELETE FROM tracks WHERE id = ?').bind(id),
  ])
  return [t.audio_key, t.instrumental_key, t.vocals_key, t.cover_key].filter((k): k is string => !!k)
}

// ---------------------------------------------------------------- playlists e projetos

type Named = 'playlists' | 'projects'

export async function listNamed<T extends Playlist | Project>(db: D1Database, table: Named): Promise<T[]> {
  const { results } = await db.prepare(`SELECT * FROM ${table} ORDER BY created_at ASC`).all<T>()
  return results
}

export async function createNamed<T extends Playlist | Project>(db: D1Database, table: Named, name: string): Promise<T> {
  const row = { id: crypto.randomUUID(), name, created_at: Date.now() }
  await db.prepare(`INSERT INTO ${table} (id, name, created_at) VALUES (?, ?, ?)`).bind(row.id, row.name, row.created_at).run()
  return row as T
}

export async function renameNamed(db: D1Database, table: Named, id: string, name: string): Promise<boolean> {
  const res = await db.prepare(`UPDATE ${table} SET name = ? WHERE id = ?`).bind(name, id).run()
  return res.meta.changes > 0
}

export async function deleteNamed(db: D1Database, table: Named, id: string): Promise<boolean> {
  const link = table === 'playlists' ? 'DELETE FROM playlist_tracks WHERE playlist_id = ?' : 'DELETE FROM track_projects WHERE project_id = ?'
  const [, res] = await db.batch([db.prepare(link).bind(id), db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id)])
  return res.meta.changes > 0
}

export async function addToPlaylist(db: D1Database, playlistId: string, trackIds: string[]): Promise<void> {
  const now = Date.now()
  await db.batch(
    trackIds.map((tid, i) =>
      db
        .prepare('INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, added_at) VALUES (?, ?, ?)')
        .bind(playlistId, tid, now + i),
    ),
  )
}

export async function removeFromPlaylist(db: D1Database, playlistId: string, trackId: string): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?')
    .bind(playlistId, trackId)
    .run()
  return res.meta.changes > 0
}
