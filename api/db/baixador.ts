import type { Download, RefFolder } from '../types'

function slug(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'pasta'
  )
}

export async function listFolders(db: D1Database): Promise<(RefFolder & { downloads: number })[]> {
  const { results } = await db
    .prepare(
      `SELECT f.*, (SELECT COUNT(*) FROM downloads d WHERE d.folder_id = f.id) AS downloads
       FROM ref_folders f ORDER BY f.created_at ASC`,
    )
    .all<RefFolder & { downloads: number }>()
  return results
}

export async function getFolder(db: D1Database, id: string): Promise<RefFolder | null> {
  return db.prepare('SELECT * FROM ref_folders WHERE id = ?').bind(id).first<RefFolder>()
}

/** Cria a pasta; devolve null se já existir uma com o mesmo nome. */
export async function createFolder(db: D1Database, name: string): Promise<RefFolder | null> {
  const id = slug(name)
  if (await getFolder(db, id)) return null
  const folder: RefFolder = { id, name, created_at: Date.now() }
  await db.prepare('INSERT INTO ref_folders (id, name, created_at) VALUES (?, ?, ?)').bind(id, name, folder.created_at).run()
  return folder
}

/** Tira a pasta da lista (os arquivos continuam no PC; o histórico fica sem pasta). */
export async function deleteFolder(db: D1Database, id: string): Promise<boolean> {
  const [, res] = await db.batch([
    db.prepare('UPDATE downloads SET folder_id = NULL WHERE folder_id = ?').bind(id),
    db.prepare('DELETE FROM ref_folders WHERE id = ?').bind(id),
  ])
  return res.meta.changes > 0
}

export async function listDownloads(db: D1Database, folderId?: string, limit = 200): Promise<Download[]> {
  const stmt = folderId
    ? db.prepare('SELECT * FROM downloads WHERE folder_id = ? ORDER BY created_at DESC LIMIT ?').bind(folderId, limit)
    : db.prepare('SELECT * FROM downloads ORDER BY created_at DESC LIMIT ?').bind(limit)
  const { results } = await stmt.all<Download>()
  return results
}

export type DownloadInput = {
  folder_id?: string | null
  job_id?: string | null
  url: string
  platform: string
  mode: string
  title?: string | null
  files?: string[]
  bytes?: number | null
  thumb_key?: string | null
}

export async function createDownload(db: D1Database, input: DownloadInput): Promise<Download> {
  const d: Download = {
    id: crypto.randomUUID(),
    folder_id: input.folder_id ?? null,
    job_id: input.job_id ?? null,
    url: input.url,
    platform: input.platform,
    mode: input.mode,
    title: input.title ?? null,
    files: input.files ? JSON.stringify(input.files) : null,
    bytes: input.bytes ?? null,
    thumb_key: input.thumb_key ?? null,
    created_at: Date.now(),
  }
  await db
    .prepare(
      `INSERT INTO downloads (id, folder_id, job_id, url, platform, mode, title, files, bytes, thumb_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(d.id, d.folder_id, d.job_id, d.url, d.platform, d.mode, d.title, d.files, d.bytes, d.thumb_key, d.created_at)
    .run()
  return d
}

/** Tira da lista (não apaga o arquivo do PC). Devolve a chave da miniatura pra apagar do R2. */
export async function deleteDownload(db: D1Database, id: string): Promise<{ thumb_key: string | null } | null> {
  const d = await db.prepare('SELECT thumb_key FROM downloads WHERE id = ?').bind(id).first<{ thumb_key: string | null }>()
  if (!d) return null
  await db.prepare('DELETE FROM downloads WHERE id = ?').bind(id).run()
  return d
}
