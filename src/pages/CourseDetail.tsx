import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ItemEditor, type ItemForm } from '../components/ItemEditor'
import { LessonPoster } from '../components/LessonPoster'
import { useToast } from '../components/Toast'
import { api, fileUrl } from '../lib/api'
import type { CourseDetail as Course, Module } from '../lib/types'

const ROUND_BTN =
  'flex h-9 w-9 items-center justify-center rounded-full border border-mist-200 bg-surface text-abyss-700 outline-none transition-colors hover:border-mist-300 hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200'

const INPUT =
  'h-11 rounded-2xl border border-mist-200 bg-mist-50 px-4 text-[14px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60'

const HATCH_DARK = 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 7px)'

function minutesLabel(seconds: number | null) {
  return seconds ? `${Math.round(seconds / 60)} min.` : ''
}

export function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { flash } = useToast()
  const [course, setCourse] = useState<Course | null>(null)
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null)
  const [addingModule, setAddingModule] = useState(false)
  const [moduleName, setModuleName] = useState('')
  const [moduleTrack, setModuleTrack] = useState('')
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const structureRef = useRef<HTMLDivElement>(null)
  const loadedFor = useRef<string | null>(null)

  async function load() {
    if (!courseId) return
    const data = await api.get<Course>(`/courses/${courseId}`)
    setCourse(data)
    // na primeira carga do curso, todos os módulos começam abertos
    if (loadedFor.current !== courseId) {
      loadedFor.current = courseId
      setOpenModules(new Set(data.modules.map((m) => m.id)))
    }
  }

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    load()
  }, [courseId])

  if (!course) return null

  const cover = fileUrl(course.cover_key)
  const pct = course.total > 0 ? Math.round((course.done / course.total) * 100) : 0
  const nextItem = course.modules.flatMap((m) => m.items).find((i) => i.id === course.next_item_id)

  // agrupa os módulos por trilha
  const tracks: { track: string; modules: Module[] }[] = []
  for (const m of course.modules) {
    const name = m.track || 'Sem trilha'
    let group = tracks.find((t) => t.track === name)
    if (!group) {
      group = { track: name, modules: [] }
      tracks.push(group)
    }
    group.modules.push(m)
  }

  function scrollRow(moduleId: string, dir: number) {
    const el = rowRefs.current[moduleId]
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  async function addModule() {
    if (!moduleName.trim() || !courseId) return
    await api.post(`/courses/${courseId}/modules`, { name: moduleName.trim(), track: moduleTrack.trim() || null })
    setModuleName('')
    setModuleTrack('')
    setAddingModule(false)
    flash('Módulo adicionado')
    load()
  }

  async function moveModule(id: string, dir: number) {
    if (!course) return
    const i = course.modules.findIndex((m) => m.id === id)
    const other = course.modules[i + dir]
    if (!other) return
    const current = course.modules[i]
    await Promise.all([
      api.put(`/modules/${current.id}`, { order_index: other.order_index }),
      api.put(`/modules/${other.id}`, { order_index: current.order_index }),
    ])
    load()
  }

  async function moveItem(mod: Module, itemId: string, dir: number) {
    const i = mod.items.findIndex((it) => it.id === itemId)
    const other = mod.items[i + dir]
    if (!other) return
    const current = mod.items[i]
    await Promise.all([
      api.put(`/items/${current.id}`, { order_index: other.order_index }),
      api.put(`/items/${other.id}`, { order_index: current.order_index }),
    ])
    load()
  }

  async function addItem(form: ItemForm) {
    if (!addingItemTo) return
    await api.post(`/modules/${addingItemTo}/items`, form)
    setAddingItemTo(null)
    flash('Item adicionado')
    load()
  }

  return (
    <div>
      <Link
        to="/cursos"
        className="mb-6 inline-flex h-10 items-center gap-2 rounded-full border border-mist-200 bg-surface pr-4 pl-3 text-[13px] font-medium text-abyss-700 shadow-soft outline-none transition-colors hover:bg-mist-50 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
      >
        <i className="ri-arrow-left-line text-[15px]" />
        <span>Cursos</span>
      </Link>

      {/* Herói Abyss */}
      <section
        className="relative mb-14 flex min-h-[440px] flex-col justify-end overflow-hidden rounded-[36px] text-white shadow-lift"
        style={{ background: 'var(--hero-gradient)' }}
      >
        {cover && (
          <>
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-abyss-950 via-abyss-950/60 to-abyss-950/10" />
          </>
        )}

        <div className="relative flex flex-wrap items-end justify-between gap-8 p-10">
          <div className="flex min-w-0 flex-col gap-4">
            {course.author && (
              <span className="w-fit rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-[12.5px] font-medium text-ice-300 backdrop-blur">
                {course.author}
              </span>
            )}
            <h1 className="max-w-[16ch] text-[clamp(52px,6vw,96px)] leading-[0.9] font-light tracking-[-0.055em]">
              {course.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13.5px] text-white/60">
              <span>
                <span className="tnum text-white">{course.modules.length}</span> módulos
              </span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>
                <span className="tnum text-white">{course.total}</span> aulas
              </span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>
                <span className="tnum text-white">{pct}%</span> concluído
              </span>
            </div>
          </div>

          <div className="flex flex-none flex-col items-start gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => nextItem && navigate(`/cursos/${course.id}/aula/${nextItem.id}`)}
                disabled={!nextItem}
                className="flex h-12 items-center gap-2 rounded-full bg-white pr-6 pl-4 text-[14.5px] font-medium whitespace-nowrap text-abyss-950 outline-none transition-[background-color,transform] hover:bg-[#eaf7fb] focus-visible:ring-2 focus-visible:ring-ice-400 active:scale-[0.98] disabled:opacity-40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <i className="ri-play-fill text-[15px]" />
                </span>
                <span>Continuar</span>
              </button>
              <button
                type="button"
                onClick={() => structureRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex h-12 items-center rounded-full border border-white/14 bg-white/[0.06] px-5 text-[14px] font-medium whitespace-nowrap text-white outline-none transition-colors hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-ice-400"
              >
                Ver estrutura
              </button>
            </div>
            {nextItem && (
              <span className="max-w-[320px] truncate text-[12.5px] text-white/50">
                Próxima: <span className="text-white/75">{nextItem.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="relative mx-10 mb-9 h-2.5 overflow-hidden rounded-full" style={{ backgroundImage: HATCH_DARK }}>
          <div
            className="h-full rounded-full bg-ice-400 transition-[width] duration-700 ease-apple"
            style={{ width: `${pct > 0 ? Math.max(pct, 3) : 0}%` }}
          />
        </div>
      </section>

      {/* Estrutura */}
      <div ref={structureRef} className="flex scroll-mt-6 flex-col gap-14">
        {tracks.map((group) => (
          <section key={group.track} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <h2 className="text-[22px] leading-none font-light tracking-[-0.03em] text-fg">{group.track}</h2>
              <span className="tnum rounded-full border border-mist-200 bg-surface px-2.5 py-0.5 text-[12px] font-medium text-sub">
                {group.modules.length} módulos
              </span>
            </div>

            {group.modules.map((mod) => {
              const single = mod.items.length === 1
              const isOpen = openModules.has(mod.id)
              const allMaterial = mod.items.every((i) => i.type === 'material')
              const doneCount = mod.items.filter((i) => i.completed_at).length
              return (
                <div key={mod.id} className="flex flex-col gap-5 rounded-[28px] border border-mist-200 bg-surface p-5 shadow-soft">
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className="flex min-w-0 flex-1 items-center gap-3.5 rounded-[18px] text-left outline-none focus-visible:ring-4 focus-visible:ring-ice-200"
                    >
                      <span className="tnum flex h-11 w-11 flex-none items-center justify-center rounded-full bg-mist-100 text-[13px] font-medium text-abyss-700">
                        {String(mod.order_index).padStart(2, '0')}
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[12px] text-sub">Módulo {mod.order_index}</span>
                        <span className="truncate text-[16px] font-medium tracking-[-0.02em] text-fg">{mod.name}</span>
                      </div>
                    </button>
                    <span
                      className={
                        !allMaterial && mod.items.length > 0 && doneCount === mod.items.length
                          ? 'tnum flex-none rounded-full bg-success/12 px-3 py-1 text-[12px] font-medium text-success'
                          : 'tnum flex-none rounded-full bg-mist-100 px-3 py-1 text-[12px] font-medium text-abyss-700'
                      }
                    >
                      {allMaterial ? `${mod.items.length} arquivos` : `${doneCount}/${mod.items.length}`}
                    </span>
                    <div className="flex flex-none gap-1.5">
                      {isOpen && (
                        <>
                          <button type="button" onClick={() => scrollRow(mod.id, -1)} aria-label="Rolar pra esquerda" className={ROUND_BTN}>
                            <i className="ri-arrow-left-s-line text-[17px]" />
                          </button>
                          <button type="button" onClick={() => scrollRow(mod.id, 1)} aria-label="Rolar pra direita" className={ROUND_BTN}>
                            <i className="ri-arrow-right-s-line text-[17px]" />
                          </button>
                        </>
                      )}
                      <button type="button" onClick={() => moveModule(mod.id, -1)} aria-label="Subir módulo" className={ROUND_BTN}>
                        <i className="ri-arrow-up-line text-[15px]" />
                      </button>
                      <button type="button" onClick={() => moveModule(mod.id, 1)} aria-label="Descer módulo" className={ROUND_BTN}>
                        <i className="ri-arrow-down-line text-[15px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        title={isOpen ? 'Fechar módulo' : 'Abrir módulo'}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300"
                      >
                        <i
                          className={`ri-arrow-down-s-line text-[18px] transition-transform duration-300 ease-apple ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div
                      ref={(el) => {
                        rowRefs.current[mod.id] = el
                      }}
                      className="-mx-5 flex gap-4 overflow-x-auto px-5 pt-1 pb-3"
                      style={{
                        maskImage:
                          'linear-gradient(to right, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)',
                      }}
                    >
                      {mod.items.map((item, i) => (
                        <div key={item.id} className="group/item relative flex-none pt-1">
                          <LessonPoster
                            item={item}
                            moduleLabel={`Módulo ${mod.order_index}`}
                            number={i + 1}
                            wide={single}
                            onOpen={() =>
                              item.type === 'aula'
                                ? navigate(`/cursos/${course.id}/aula/${item.id}`)
                                : flash('Arquivo baixado')
                            }
                          />
                          <div className="absolute bottom-[88px] left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-surface/90 p-1 opacity-0 shadow-float backdrop-blur transition-opacity group-hover/item:opacity-100">
                            <button
                              type="button"
                              onClick={() => moveItem(mod, item.id, -1)}
                              aria-label="Mover pra esquerda"
                              className="flex h-7 w-7 items-center justify-center rounded-full text-abyss-700 outline-none hover:bg-mist-100"
                            >
                              <i className="ri-arrow-left-s-line text-[15px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(mod, item.id, 1)}
                              aria-label="Mover pra direita"
                              className="flex h-7 w-7 items-center justify-center rounded-full text-abyss-700 outline-none hover:bg-mist-100"
                            >
                              <i className="ri-arrow-right-s-line text-[15px]" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {single && (
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-2">
                          <span className="text-[20px] font-light tracking-[-0.03em] text-fg">{mod.items[0].name}</span>
                          <span className="max-w-[60ch] text-[13.5px] leading-relaxed text-sub">
                            Uma aula só neste módulo.{' '}
                            {mod.items[0].type === 'aula' ? minutesLabel(mod.items[0].duration_seconds) : ''}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setAddingItemTo(mod.id)}
                        className="mt-1 flex aspect-2/3 w-[150px] flex-none flex-col items-center justify-center gap-2.5 rounded-[24px] border border-dashed border-mist-300 bg-mist-50 text-sub outline-none transition-colors hover:border-ice-400 hover:bg-ice-50 hover:text-abyss-600 focus-visible:ring-4 focus-visible:ring-ice-200"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-soft">
                          <i className="ri-add-line text-[18px]" />
                        </span>
                        <span className="text-[12.5px] font-medium">Item</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        ))}

        {/* Adicionar módulo */}
        <div className="flex flex-col gap-3">
          {addingModule ? (
            <div className="flex flex-wrap items-center gap-2.5 rounded-[28px] border border-mist-200 bg-surface p-4 shadow-soft">
              <input
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="Nome do módulo"
                className={`${INPUT} min-w-[220px] flex-1`}
              />
              <input
                value={moduleTrack}
                onChange={(e) => setModuleTrack(e.target.value)}
                placeholder="Trilha (opcional)"
                className={`${INPUT} w-[220px]`}
              />
              <button
                type="button"
                onClick={addModule}
                className="h-11 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => setAddingModule(false)}
                className="h-11 rounded-full px-4 text-[14px] font-medium text-sub outline-none transition-colors hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingModule(true)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[28px] border border-dashed border-mist-300 bg-surface/60 text-[14px] font-medium text-sub outline-none transition-colors hover:border-ice-400 hover:bg-ice-50 hover:text-abyss-600 focus-visible:ring-4 focus-visible:ring-ice-200"
            >
              <i className="ri-add-line text-[17px]" />
              <span>Adicionar módulo</span>
            </button>
          )}
        </div>
      </div>

      <ItemEditor open={!!addingItemTo} onClose={() => setAddingItemTo(null)} onSave={addItem} />
    </div>
  )
}
