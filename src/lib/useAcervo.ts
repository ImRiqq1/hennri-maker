import { useEffect, useState } from 'react'
import { api } from './api'
import type { CourseSummary, Prompt, Reference, Skill } from './types'

export type AcervoKind = 'prompt' | 'skill' | 'referencia'

/** Um item qualquer do acervo, no formato usado pelas listas da página inicial. */
export interface AcervoItem {
  kind: AcervoKind
  id: string
  name: string
  meta: string
  image: string | null
  href: string
  created_at: number
  /** texto pra copiar: prompt, nome da skill ou termo da referência */
  copy: string
  /** resumo mostrado nos detalhes */
  detail: string
  fields: { label: string; value: string }[]
}

export const KIND_INFO: Record<AcervoKind, { label: string; plural: string; icon: string }> = {
  prompt: { label: 'Prompt', plural: 'Prompts', icon: 'ri-sparkling-2-line' },
  skill: { label: 'Skill', plural: 'Skills', icon: 'ri-stack-line' },
  referencia: { label: 'Referência', plural: 'Referências', icon: 'ri-camera-lens-line' },
}

/** Carrega prompts, skills, referências e cursos (dados da página inicial). */
export function useAcervo() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [courses, setCourses] = useState<CourseSummary[]>([])

  useEffect(() => {
    api.get('/prompts').then(setPrompts)
    api.get('/skills').then(setSkills)
    api.get('/references').then(setReferences)
    api.get('/courses').then(setCourses)
  }, [])

  const items: AcervoItem[] = [
    ...prompts.map((p) => ({
      kind: 'prompt' as const,
      id: p.id,
      name: p.title,
      meta: p.category,
      image: p.image_key,
      href: `/prompts?open=${p.id}`,
      created_at: p.created_at,
      copy: p.prompt_text,
      detail: p.prompt_text,
      fields: [
        { label: 'Categoria', value: p.category },
        { label: 'Modelo', value: p.model ?? '—' },
        { label: 'Proporção', value: p.aspect_ratio ?? '—' },
      ],
    })),
    ...skills.map((s) => ({
      kind: 'skill' as const,
      id: s.id,
      name: s.name,
      meta: s.category,
      image: null,
      href: `/skills?open=${s.id}`,
      created_at: s.created_at,
      copy: s.name,
      detail: s.description,
      fields: [
        { label: 'Categoria', value: s.category },
        { label: 'Gatilhos', value: s.triggers ? String(s.triggers.split('\n').filter(Boolean).length) : '0' },
      ],
    })),
    ...references.map((r) => ({
      kind: 'referencia' as const,
      id: r.id,
      name: r.name,
      meta: r.family,
      image: r.media_key,
      href: `/referencias/${r.tab}?open=${r.id}`,
      created_at: r.created_at,
      copy: r.term,
      detail: r.description || r.term,
      fields: [
        { label: 'Aba', value: r.tab },
        { label: 'Família', value: r.family },
        { label: 'Termo', value: r.term },
      ],
    })),
  ].sort((a, b) => b.created_at - a.created_at)

  const coursesInProgress = courses.filter((c) => c.status === 'andamento')
  const lessonsTotal = courses.reduce((n, c) => n + c.total, 0)
  const lessonsDone = courses.reduce((n, c) => n + c.done, 0)

  return {
    prompts,
    skills,
    references,
    courses,
    items,
    coursesInProgress,
    lessonsTotal,
    lessonsDone,
    lessonsPct: lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0,
    totalItems: prompts.length + skills.length + references.length + courses.length,
  }
}
