export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  ASSETS: Fetcher
  SITE_PASSWORD: string
}

export type AppEnv = { Bindings: Env }

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

export interface Course {
  id: string
  name: string
  author: string | null
  cover_key: string | null
  created_at: number
}

export interface Module {
  id: string
  course_id: string
  name: string
  track: string | null
  order_index: number
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

export interface LessonNote {
  item_id: string
  content: string
  updated_at: number | null
}

export type JobType = 'download' | 'music' | 'separate' | 'enhance' | 'open' | 'update_tools'
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
  target_helper_id: string | null
}

export interface HelperToken {
  id: string
  name: string
  token_hash: string
  created_at: number
  last_seen: number | null
  info: string | null
  platform: string | null
}

export interface PairRequest {
  id: string
  code: string
  poll_secret_hash: string
  name: string
  platform: string | null
  status: 'pending' | 'approved' | 'delivered'
  token: string | null
  helper_id: string | null
  created_at: number
  expires_at: number
}

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
}

export interface Playlist {
  id: string
  name: string
  created_at: number
}

export interface Project {
  id: string
  name: string
  created_at: number
}

export interface RefFolder {
  id: string
  name: string
  created_at: number
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
