import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CourseCard } from '../components/CourseCard'
import { CourseEditor, type CourseForm } from '../components/CourseEditor'
import { EmptyState, PageHeader } from '../components/PageHeader'
import { NewButton } from '../components/PrimaryButton'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import type { CourseSummary } from '../lib/types'

const SECTIONS = [
  { key: 'andamento', label: 'Em andamento' },
  { key: 'concluido', label: 'Concluídos' },
] as const

export function Courses() {
  const { flash } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    api
      .get<CourseSummary[]>('/courses')
      .then(setCourses)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (params.get('new')) {
      setEditorOpen(true)
      const next = new URLSearchParams(params)
      next.delete('new')
      setParams(next, { replace: true })
    }
  }, [params])

  async function save(form: CourseForm) {
    const created = await api.post<CourseSummary>('/courses', form)
    setEditorOpen(false)
    flash('Curso salvo')
    navigate(`/cursos/${created.id}`)
  }

  const newButton = <NewButton label="Novo curso" onClick={() => setEditorOpen(true)} />

  return (
    <div>
      <PageHeader
        tags={['em andamento', 'concluídos', 'drive', 'anotações']}
        title="CURSOS"
        count={courses.length}
        actions={newButton}
      />

      {!loading && courses.length === 0 ? (
        <EmptyState title="CURSOS" message="Nenhum curso em andamento." action={newButton} />
      ) : (
        SECTIONS.map((section) => {
          const list = courses.filter((c) => c.status === section.key)
          if (list.length === 0) return null
          return (
            <section key={section.key} className="mb-14 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <h2 className="text-[22px] leading-none font-light tracking-[-0.03em] text-fg">{section.label}</h2>
                <span className="tnum rounded-full border border-mist-200 bg-surface px-2.5 py-0.5 text-[12px] font-medium text-sub">
                  {list.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {list.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )
        })
      )}

      <CourseEditor open={editorOpen} onClose={() => setEditorOpen(false)} onSave={save} />
    </div>
  )
}
