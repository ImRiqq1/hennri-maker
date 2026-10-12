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
