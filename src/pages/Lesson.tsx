import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { driveId, formatDuration } from '../lib/format'
import type { CourseDetail, LessonNote, ModuleItem } from '../lib/types'
import { cn } from '../lib/utils'

const TABS = ['Anotações', 'Anexos', 'Sobre'] as const
type Tab = (typeof TABS)[number]

export function Lesson() {
  const { courseId, itemId } = useParams()
  const navigate = useNavigate()
  const { flash } = useToast()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Anotações')
  const [notes, setNotes] = useState('')
  const [loadingPlayer, setLoadingPlayer] = useState(true)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (courseId) api.get<CourseDetail>(`/courses/${courseId}`).then(setCourse)
  }, [courseId])

  // pequeno skeleton ao trocar de aula
  useEffect(() => {
    setLoadingPlayer(true)
    const t = window.setTimeout(() => setLoadingPlayer(false), 500)
    return () => window.clearTimeout(t)
  }, [itemId])

  const allItems = useMemo(() => (course ? course.modules.flatMap((m) => m.items) : []), [course])
  const item = allItems.find((i) => i.id === itemId) ?? null
  const mod = course?.modules.find((m) => m.id === item?.module_id) ?? null

  useEffect(() => {
    if (mod && !openModule) setOpenModule(mod.id)
  }, [mod, openModule])

  useEffect(() => {
    if (itemId) api.get<LessonNote>(`/items/${itemId}/notes`).then((n) => setNotes(n.content))
  }, [itemId])

  // salva as anotações 700ms depois de parar de digitar
  function changeNotes(value: string) {
    setNotes(value)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      if (itemId) api.put(`/items/${itemId}/notes`, { content: value })
    }, 700)
  }

  if (!course || !item || !mod) return null

  const lessons = course.modules.flatMap((m) => m.items.filter((i) => i.type === 'aula'))
  const pos = lessons.findIndex((l) => l.id === item.id)
  const prev = lessons[(pos - 1 + lessons.length) % lessons.length]
  const next = lessons[(pos + 1) % lessons.length]
  const completed = !!item.completed_at
  const videoId = driveId(item.drive_url)
  const materials = mod.items.filter((i) => i.type === 'material')

  async function toggleComplete() {
    const updated = await api.post<ModuleItem>(`/items/${item!.id}/complete`)
    setCourse((c) => {
      if (!c) return c
      const modules = c.modules.map((m) => ({ ...m, items: m.items.map((i) => (i.id === updated.id ? updated : i)) }))
      const aulas = modules.flatMap((m) => m.items).filter((i) => i.type === 'aula')
      const done = aulas.filter((i) => i.completed_at).length
      const total = aulas.length
      return { ...c, modules, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
    })
    flash(updated.completed_at ? 'Aula concluída' : 'Aula reaberta')
  }

  return (
    <div>
      <Link
        to={`/cursos/${course.id}`}
        data-hot="1"
        className="mb-5.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-cream/50 uppercase hover:text-paper"
      >
        <i className="ri-arrow-left-line text-sm" />
        <span>{course.name}</span>
      </Link>

      <div className="grid items-start gap-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Sidebar do curso */}
        <div className="flex max-w-[340px] min-w-0 flex-none flex-col gap-6.5 border border-cream/10 bg-smoke p-5.5">
          <div className="flex flex-col gap-3">
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-paper">{course.name}</span>
            {course.author && (
              <span className="font-mono text-[10px] tracking-[0.16em] text-cream/50 uppercase">{course.author}</span>
            )}
            <div className="flex items-end gap-1.5 pt-1.5">
              <span className="font-ultra text-[64px] leading-[0.84] tracking-[-0.04em] text-paper">{course.pct}</span>
              <span className="pb-3 font-mono text-[13px] text-cream">%</span>
            </div>
            <div className="h-0.5 bg-cream/14">
              <div className="h-0.5 bg-paper" style={{ width: `${course.pct}%` }} />
            </div>
          </div>

          <div className="flex flex-col">
            {course.modules.map((m) => {
              const isOpen = openModule === m.id
              const aulas = m.items.filter((i) => i.type === 'aula')
              return (
                <div key={m.id} className="border-t border-cream/10">
                  <button
                    type="button"
                    data-hot="1"
                    onClick={() => setOpenModule(isOpen ? null : m.id)}
                    className="flex w-full items-center gap-3 px-1 py-3.5 text-left outline-none hover:bg-cream/4"
                  >
                    <span className="flex-none font-mono text-[9.5px] tracking-[0.14em] text-cream/45">
                      MÓDULO {String(m.order_index).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-paper">{m.name}</span>
                    <span className="flex-none font-mono text-[9.5px] tracking-[0.1em] text-cream/45">
                      {aulas.filter((i) => i.completed_at).length}/{aulas.length}
                    </span>
                    <i
                      className={cn('flex-none text-cream/50', isOpen ? 'ri-subtract-line' : 'ri-add-line')}
                      style={{ fontSize: 15 }}
                    />
                  </button>
                  {isOpen && (
                    <div className="flex flex-col pb-2">
                      {aulas.map((a, i) => {
                        const current = a.id === item.id
                        return (
                          <button
                            key={a.id}
                            type="button"
                            data-hot="1"
                            onClick={() => navigate(`/cursos/${course.id}/aula/${a.id}`)}
                            className={cn(
                              'relative flex items-center gap-2.5 px-2.5 py-2 text-left outline-none hover:bg-cream/5',
                              current && 'bg-ink',
                            )}
                          >
                            {current && <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-paper" />}
                            <div
                              className="h-2.5 w-2.5 flex-none rounded-full border"
                              style={{
                                borderColor: current ? '#FFFFFF' : 'rgba(232,224,213,0.4)',
                                background: a.completed_at ? '#FFFFFF' : 'transparent',
                              }}
                            />
                            <span className="flex-none font-mono text-[9.5px] tracking-[0.1em] text-cream/40">
                              {String(i + 1).padStart(3, '0')}
                            </span>
                            <span
                              className={cn('min-w-0 flex-1 truncate text-[12.5px]', current ? 'text-paper' : 'text-cream/70')}
                            >
                              {a.name}
                            </span>
                            <span className="flex-none font-mono text-[9.5px] tracking-[0.1em] text-cream/40">
                              {formatDuration(a.duration_seconds)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Player + abas */}
        <div className="flex min-w-0 flex-col gap-6.5">
          {loadingPlayer ? (
            <div className="aspect-video animate-pulse rounded-xl border border-cream/10 bg-smoke p-4.5">
              <div className="flex h-full w-3/5 flex-col justify-end gap-2.5">
                <div className="h-3 bg-cream/10" />
                <div className="h-3 w-[55%] bg-cream/7" />
              </div>
            </div>
          ) : videoId ? (
            <iframe
              src={`https://drive.google.com/file/d/${videoId}/preview`}
              allow="autoplay"
              allowFullScreen
              className="aspect-video w-full rounded-xl border border-cream/10"
            />
          ) : (
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-cream/10 bg-[#101013]">
              <span className="absolute top-4 left-4.5 font-mono text-[10px] tracking-[0.14em] text-cream/30 uppercase">
                [sem link do drive ainda]
              </span>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cream/40 text-paper">
                <i className="ri-play-fill text-[26px]" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-[220px] flex-1 flex-col gap-2.5">
              <span className="text-2xl font-semibold tracking-[-0.025em] text-paper">{item.name}</span>
              <span className="truncate font-mono text-[10.5px] tracking-[0.14em] text-cream/50 uppercase">
                MÓDULO {mod.order_index} · {formatDuration(item.duration_seconds)}
              </span>
            </div>
            <button
              type="button"
              data-hot="1"
              onClick={toggleComplete}
              className={cn(
                'flex flex-none items-center gap-2.5 border px-4.5 py-3 text-[13px] font-semibold whitespace-nowrap outline-none hover:border-paper',
                completed ? 'border-cream/30 bg-transparent text-cream' : 'border-paper bg-paper text-ink',
              )}
            >
              <i className={completed ? 'ri-check-line' : 'ri-check-double-line'} style={{ fontSize: 15 }} />
              <span>{completed ? 'Concluída' : 'Marcar como concluída'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-5 border-t border-b border-cream/10 py-3.5">
            <button
              type="button"
              data-hot="1"
              onClick={() => navigate(`/cursos/${course.id}/aula/${prev.id}`)}
              className="flex items-center gap-2 text-[13px] text-cream/70 outline-none hover:text-paper"
            >
              <i className="ri-arrow-left-line text-[15px]" />
              <span>Aula anterior</span>
            </button>
            <button
              type="button"
              data-hot="1"
              onClick={() => navigate(`/cursos/${course.id}/aula/${next.id}`)}
              className="flex items-center gap-2 text-[13px] text-cream/70 outline-none hover:text-paper"
            >
              <span>Próxima aula</span>
              <i className="ri-arrow-right-line text-[15px]" />
            </button>
          </div>

          <div className="flex items-center gap-6.5 border-b border-cream/10">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                data-hot="1"
                onClick={() => setTab(t)}
                className="relative px-0.5 pb-3 text-[13.5px] font-semibold outline-none"
                style={{ color: tab === t ? '#FFFFFF' : 'rgba(232,224,213,0.55)' }}
              >
                <span>{t}</span>
                {tab === t && <div className="absolute inset-x-0 -bottom-px h-px bg-paper" />}
              </button>
            ))}
          </div>

          {tab === 'Anotações' && (
            <div className="flex flex-col gap-2.5">
              <textarea
                value={notes}
                onChange={(e) => changeNotes(e.target.value)}
                className="min-h-[200px] border border-cream/12 bg-[#101013] p-4.5 text-sm leading-[1.7] text-paper outline-none"
              />
              <span className="self-end font-mono text-[9.5px] tracking-[0.14em] text-cream/35 uppercase">
                Salvo automaticamente
              </span>
            </div>
          )}

          {tab === 'Anexos' && (
            <div className="flex flex-col">
              {materials.length === 0 ? (
                <span className="py-6 text-[13.5px] text-cream/50">Nenhum material neste módulo.</span>
              ) : (
                materials.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-cream/8 py-3.5 hover:bg-cream/4"
                  >
                    <i className="ri-file-zip-line text-[17px] text-cream/60" />
                    <span className="min-w-0 truncate text-[13.5px] text-paper">{m.name}</span>
                    <span className="font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-cream/50">
                      {m.file_format} · {m.file_size_mb} MB
                    </span>
                    <div className="flex items-center gap-1.5 border border-cream/20 px-3 py-1.5 text-[12.5px] whitespace-nowrap text-cream">
                      <i className="ri-arrow-down-line text-sm" />
                      <span>Baixar</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'Sobre' && (
            <span className="max-w-[70ch] text-[14.5px] leading-[1.7] text-white/85">
              Aula do módulo {mod.order_index} — {mod.name}. O arquivo vem do Drive; o player aqui é só o container do
              embed.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
