export interface Prompt {
  id: string
  title: string
  category: string
  prompt_text: string
  model: string | null
  aspect_ratio: string | null
  image_key: string | null
  ref_image_key: string | null
  extra_image_key: string | null
  created_at: number
  updated_at: number
}

export interface Skill {
  id: string
  name: string
  category: string
  description: string
  triggers: string | null
  related_skill_ids: string | null
  created_at: number
  related?: Skill[]
}

export interface Reference {
  id: string
  tab: string
  family: string
  name: string
  term: string
  media_key: string | null
  description: string | null
  created_at: number
}

export interface ModuleItem {
  id: string
  module_id: string
  type: 'aula' | 'material'
  name: string
  order_index: number
  drive_url: string | null
  duration_seconds: number | null
  cover_key: string | null
  file_format: string | null
  file_size_mb: number | null
  completed_at: number | null
}

export interface Module {
  id: string
  course_id: string
  name: string
  track: string | null
  order_index: number
  items: ModuleItem[]
}

export interface CourseSummary {
  id: string
  name: string
  author: string | null
  cover_key: string | null
  created_at: number
  total: number
  done: number
  status: 'concluido' | 'andamento'
}

export interface CourseDetail {
  id: string
  name: string
  author: string | null
  cover_key: string | null
  created_at: number
  modules: Module[]
  total: number
  done: number
  pct: number
  next_item_id: string | null
}

export interface SearchResult {
  type: 'prompt' | 'skill' | 'referencia' | 'aula'
  id: string
  title: string
  meta: string
  href: string
}

export interface LessonNote {
  item_id: string
  content: string
  updated_at: number | null
}

// ---------------------------------------------------------------- Trilhas / Baixador / ajudante

export interface Track {
  id: string
  title: string
  artist: string | null
  source: 'spotify' | 'youtube' | 'upload'
  source_url: string | null
  duration_seconds: number | null
  cover_key: string | null
  audio_key: string | null
  instrumental_key: string | null
  vocals_key: string | null
  local_path: string | null
  intents: string | null
  match_note: string | null
  created_at: number
  updated_at: number
  playlist_ids: string[]
  project_ids: string[]
}

export interface NamedItem {
  id: string
  name: string
  created_at: number
}

export type JobType = 'download' | 'music' | 'separate' | 'enhance' | 'open' | 'update_tools' | 'drive_scan' | 'drive' | 'drive_google'
export type JobStatus = 'fila' | 'rodando' | 'ok' | 'erro' | 'cancelado'

export interface Job {
  id: string
  type: JobType
  batch_id: string | null
  payload: string
  status: JobStatus
  progress: number | null
  message: string | null
  result: string | null
  created_at: number
  updated_at: number
}

export interface HelperInfo {
  version?: string
  platform?: 'windows' | 'mac' | 'linux'
  os?: string
  hostname?: string
  gpu?: string
  device?: string
  root?: string
  tools?: Record<string, string | null>
  separator_ready?: boolean
  /** e-mail da conta Google conectada no ajudante (pastas privadas do Drive) */
  google?: string | null
  busy?: boolean
}

export interface HelperStatus {
  online: boolean
  paired: boolean
  last_seen: number | null
  info: HelperInfo | null
}

export interface HelperPC {
  id: string
  name: string
  platform: 'windows' | 'mac' | 'linux' | null
  created_at: number
  last_seen: number | null
  info: string | null
}

export interface RefFolder {
  id: string
  name: string
  created_at: number
  downloads: number
}

export interface Download {
  id: string
  folder_id: string | null
  job_id: string | null
  url: string
  platform: string
  mode: string
  title: string | null
  files: string | null
  bytes: number | null
  thumb_key: string | null
  created_at: number
}
