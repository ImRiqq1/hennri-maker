import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { driveId, formatDuration } from '../lib/format'
import type { CourseDetail, LessonNote, ModuleItem } from '../lib/types'
import { cn } from '../lib/utils'

const TABS = ['Anotações', 'Anexos', 'Sobre'] as const
type Tab = (typeof TABS)[number]

const HATCH_DARK = 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 7px)'

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
        className="mb-6 inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-mist-200 bg-surface pr-4 pl-3 text-[13px] font-medium text-abyss-700 shadow-soft outline-none transition-colors hover:bg-mist-50 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
      >
        <i className="ri-arrow-left-line text-[15px]" />
        <span className="truncate">{course.name}</span>
      </Link>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Sidebar do curso */}
        <aside className="flex min-w-0 flex-col gap-5 rounded-[28px] border border-mist-200 bg-surface p-5 shadow-soft lg:sticky lg:top-0">
          <div
            className="relative flex flex-col gap-3 overflow-hidden rounded-[22px] p-5 text-white"
            style={{ background: 'var(--hero-gradient)' }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-50 blur-2xl"
              style={{ background: 'radial-gradient(closest-side, rgba(79,170,194,0.7), transparent)' }}
            />
            <div className="relative flex flex-col gap-1">
              <span className="truncate text-[16px] font-medium tracking-[-0.02em]">{course.name}</span>
              {course.author && <span className="truncate text-[12.5px] text-white/55">{course.author}</span>}
            </div>
            <div className="relative flex items-baseline gap-1 pt-2">
              <span className="tnum text-[56px] leading-[0.85] font-light tracking-[-0.055em]">{course.pct}</span>
              <span className="text-[16px] text-white/55">%</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full" style={{ backgroundImage: HATCH_DARK }}>
              <div
                className="h-full rounded-full bg-ice-400 transition-[width] duration-700 ease-apple"
                style={{ width: `${course.pct > 0 ? Math.max(course.pct, 4) : 0}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {course.modules.map((m) => {
              const isOpen = openModule === m.id
              const aulas = m.items.filter((i) => i.type === 'aula')
              return (
                <div key={m.id}>
                  <button
                    type="button"
                    onClick={() => setOpenModule(isOpen ? null : m.id)}
                    className="flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-mist-100 focus-visible:ring-4 focus-visible:ring-ice-200"
                  >
                    <span className="tnum flex h-8 w-8 flex-none items-center justify-center rounded-full bg-mist-100 text-[11.5px] font-medium text-abyss-700">
                      {String(m.order_index).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium tracking-[-0.01em] text-fg">{m.name}</span>
                    <span className="tnum flex-none text-[11.5px] text-sub">
                      {aulas.filter((i) => i.completed_at).length}/{aulas.length}
                    </span>
                    <i
                      className={cn(
                        'ri-arrow-down-s-line flex-none text-sub transition-transform duration-300 ease-apple',
                        isOpen && 'rotate-180',
                      )}
                      style={{ fontSize: 16 }}
                    />
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-0.5 py-1 pl-2">
                      {aulas.map((a) => {
                        const current = a.id === item.id
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => navigate(`/cursos/${course.id}/aula/${a.id}`)}
                            className={cn(
                              'flex items-center gap-2.5 rounded-[14px] px-3 py-2 text-left outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ice-200',
                              current ? 'bg-abyss-950 text-white' : 'text-abyss-700 hover:bg-mist-100',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-4.5 w-4.5 flex-none items-center justify-center rounded-full border',
                                a.completed_at
                                  ? 'border-success bg-success text-white'
                                  : current
                                    ? 'border-white/40'
                                    : 'border-mist-300',
                              )}
                            >
                              {a.completed_at && <i className="ri-check-line text-[11px]" />}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13px]">{a.name}</span>
                            <span className={cn('tnum flex-none text-[11.5px]', current ? 'text-white/55' : 'text-sub')}>
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
        </aside>

        {/* Player + abas */}
        <div className="flex min-w-0 flex-col gap-6">
          {loadingPlayer ? (
            <div className="aspect-video animate-pulse rounded-[28px] bg-gradient-to-br from-mist-200 to-mist-100 p-6">
              <div className="flex h-full w-3/5 flex-col justify-end gap-2.5">
                <div className="h-3 rounded-full bg-mist-300/60" />
                <div className="h-3 w-[55%] rounded-full bg-mist-300/40" />
              </div>
            </div>
          ) : videoId ? (
            <iframe
              src={`https://drive.google.com/file/d/${videoId}/preview`}
              allow="autoplay"
              allowFullScreen
              className="aspect-video w-full rounded-[28px] bg-abyss-950 shadow-lift"
            />
          ) : (
            <div
              className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[28px] text-white shadow-lift"
              style={{ background: 'var(--hero-gradient)' }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
                style={{ background: 'radial-gradient(closest-side, rgba(79,170,194,0.7), transparent)' }}
              />
              <span className="absolute top-5 left-5 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-[12px] text-white/70 backdrop-blur">
                Sem link do Drive ainda
              </span>
              <div className="relative flex h-18 w-18 items-center justify-center rounded-full bg-white text-abyss-950 shadow-float">
                <i className="ri-play-fill text-[28px]" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-[220px] flex-1 flex-col gap-2">
              <span className="text-[13px] text-sub">
                Módulo {mod.order_index} · {formatDuration(item.duration_seconds)}
              </span>
              <h1 className="text-[clamp(30px,3vw,44px)] leading-[1.02] font-light tracking-[-0.045em] text-fg">{item.name}</h1>
            </div>
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/cursos/${course.id}/aula/${prev.id}`)}
                title="Aula anterior"
                aria-label="Aula anterior"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-mist-200 bg-surface text-abyss-700 outline-none transition-colors hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200"
              >
                <i className="ri-arrow-left-line text-[17px]" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/cursos/${course.id}/aula/${next.id}`)}
                title="Próxima aula"
                aria-label="Próxima aula"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-mist-200 bg-surface text-abyss-700 outline-none transition-colors hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200"
              >
                <i className="ri-arrow-right-line text-[17px]" />
              </button>
              <button
                type="button"
                onClick={toggleComplete}
                className={cn(
                  'flex h-11 items-center gap-2 rounded-full pr-5 pl-4 text-[14px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ice-300',
                  completed
                    ? 'border border-success/30 bg-success/10 text-success hover:bg-success/15'
                    : 'bg-abyss-950 text-white hover:bg-abyss-800',
                )}
              >
                <i className={completed ? 'ri-check-line' : 'ri-check-double-line'} style={{ fontSize: 16 }} />
                <span>{completed ? 'Concluída' : 'Marcar como concluída'}</span>
              </button>
            </div>
          </div>

          <div className="flex w-fit items-center gap-1 rounded-full border border-mist-200 bg-surface p-1 shadow-soft">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={cn(
                  'h-9 rounded-full px-4 text-[13px] font-medium outline-none transition-[background-color,color] duration-300 ease-apple focus-visible:ring-4 focus-visible:ring-ice-200',
                  tab === t ? 'bg-abyss-950 text-white' : 'text-abyss-700 hover:bg-mist-100',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Anotações' && (
            <div className="flex flex-col gap-2 rounded-[28px] border border-mist-200 bg-surface p-2 shadow-soft">
              <textarea
                value={notes}
                onChange={(e) => changeNotes(e.target.value)}
                placeholder="Escreva suas anotações da aula…"
                className="min-h-[220px] resize-y rounded-[22px] bg-mist-50 p-5 text-[14.5px] leading-[1.7] text-fg outline-none transition-[box-shadow] placeholder:text-mist-400 focus:ring-4 focus:ring-ice-200/60"
              />
              <span className="flex items-center gap-1.5 self-end px-3 pb-1.5 text-[12px] text-sub">
                <i className="ri-cloud-line text-[13px]" />
                Salvo automaticamente
              </span>
            </div>
          )}

          {tab === 'Anexos' && (
            <div className="flex flex-col gap-2">
              {materials.length === 0 ? (
                <span className="rounded-[28px] border border-dashed border-mist-300 bg-surface/60 px-6 py-10 text-center text-[13.5px] text-sub">
                  Nenhum material neste módulo.
                </span>
              ) : (
                materials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 rounded-[20px] border border-mist-200 bg-surface p-3 shadow-soft transition-colors hover:bg-mist-50"
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-mist-100 text-abyss-600">
                      <i className="ri-file-zip-line text-[17px]" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-[-0.01em] text-fg">{m.name}</span>
                    <span className="text-[12px] whitespace-nowrap text-sub">
                      {m.file_format} · {m.file_size_mb} MB
                    </span>
                    <div className="flex h-9 items-center gap-1.5 rounded-full border border-mist-200 px-3.5 text-[13px] font-medium whitespace-nowrap text-abyss-700">
                      <i className="ri-arrow-down-line text-[14px]" />
                      <span>Baixar</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'Sobre' && (
            <p className="max-w-[70ch] rounded-[28px] border border-mist-200 bg-surface p-6 text-[14.5px] leading-[1.7] text-abyss-700 shadow-soft">
              Aula do módulo {mod.order_index} — {mod.name}. O arquivo vem do Drive; o player aqui é só o container do
              embed.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
