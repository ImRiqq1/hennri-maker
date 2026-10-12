import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bars } from '../components/Bars'
import { ItemEditor, type ItemForm } from '../components/ItemEditor'
import { LessonPoster } from '../components/LessonPoster'
import { useToast } from '../components/Toast'
import { api, fileUrl } from '../lib/api'
import type { CourseDetail as Course, Module } from '../lib/types'

const SQUARE_BTN =
  'flex h-7 w-7 items-center justify-center border border-cream/18 text-cream outline-none hover:border-paper hover:text-paper'

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
        data-hot="1"
        className="mb-5.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-cream/50 uppercase hover:text-paper"
      >
        <i className="ri-arrow-left-line text-sm" />
        <span>Cursos</span>
      </Link>

      {/* Capa */}
      <div className="relative mb-14 h-[60vh] min-h-[420px] overflow-hidden border border-cream/10 bg-[#101013]">
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute top-5 left-12 font-mono text-[10px] tracking-[0.14em] text-cream/28 uppercase">
            [capa do curso — 1440×640]
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/15" />
        <div className="absolute right-0 bottom-0 left-0 flex flex-wrap items-end justify-between gap-6 px-12 pb-8.5">
          <div className="flex min-w-0 flex-col gap-3.5">
            {course.author && (
              <span className="font-mono text-[11px] tracking-[0.18em] text-cream/60 uppercase">{course.author}</span>
            )}
            <span className="font-condensed text-[112px] leading-[0.8] tracking-[-0.045em] text-paper uppercase">
              {course.name}
            </span>
            <span className="truncate font-mono text-[11px] tracking-[0.16em] text-cream uppercase">
              {course.modules.length} MÓDULOS · {course.total} AULAS · {pct}% CONCLUÍDO
            </span>
          </div>
          <div className="flex flex-none items-end gap-3">
            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                data-hot="1"
                onClick={() => nextItem && navigate(`/cursos/${course.id}/aula/${nextItem.id}`)}
                disabled={!nextItem}
                className="flex items-center gap-2 bg-paper px-5 py-3 text-[13.5px] font-semibold whitespace-nowrap text-ink outline-none hover:bg-cream disabled:opacity-40"
              >
                <i className="ri-play-fill text-[17px]" />
                <span>Continuar</span>
              </button>
              {nextItem && <span className="font-mono text-[10px] text-cream/55">{nextItem.name}</span>}
            </div>
            <button
              type="button"
              data-hot="1"
              onClick={() => structureRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="border border-cream/30 px-4.5 py-3 text-[13.5px] font-medium whitespace-nowrap text-cream outline-none hover:border-paper hover:text-paper"
            >
              Ver estrutura
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-cream/14">
          <div className="h-0.5 bg-paper" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Estrutura */}
      <div ref={structureRef} className="flex flex-col gap-16">
        {tracks.map((group) => (
          <div key={group.track} className="flex flex-col gap-9.5">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] tracking-[0.2em] text-paper uppercase">{group.track}</span>
              <div className="h-px flex-1 bg-cream/14" />
              <span className="font-mono text-[10px] tracking-[0.14em] text-cream/40 uppercase">
                {group.modules.length} módulos
              </span>
            </div>

            {group.modules.map((mod) => {
              const single = mod.items.length === 1
              const isOpen = openModules.has(mod.id)
              const allMaterial = mod.items.every((i) => i.type === 'material')
              return (
                <div key={mod.id} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      data-hot="1"
                      onClick={() => toggleModule(mod.id)}
                      className="flex flex-none items-center gap-3.5 outline-none"
                    >
                      <Bars barWidth={4} barHeight={12} gap={3} colorClassName="bg-cream/45" />
                      <span className="font-mono text-[10.5px] tracking-[0.16em] text-cream/50">
                        MÓDULO {String(mod.order_index).padStart(2, '0')}
                      </span>
                    </button>
                    <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-paper">{mod.name}</span>
                    <div className="h-px flex-1 bg-cream/8" />
                    <span className="flex-none font-mono text-[10.5px] tracking-[0.12em] text-cream/50">
                      {allMaterial
                        ? `${mod.items.length} arquivos`
                        : `${mod.items.filter((i) => i.completed_at).length}/${mod.items.length}`}
                    </span>
                    <div className="flex flex-none gap-1">
                      <button
                        type="button"
                        data-hot="1"
                        onClick={() => toggleModule(mod.id)}
                        title={isOpen ? 'Fechar módulo' : 'Abrir módulo'}
                        className={SQUARE_BTN}
                      >
                        <i className={isOpen ? 'ri-subtract-line text-sm' : 'ri-add-line text-sm'} />
                      </button>
                      <button type="button" data-hot="1" onClick={() => moveModule(mod.id, -1)} className={SQUARE_BTN}>
                        <i className="ri-arrow-up-line text-sm" />
                      </button>
                      <button type="button" data-hot="1" onClick={() => moveModule(mod.id, 1)} className={SQUARE_BTN}>
                        <i className="ri-arrow-down-line text-sm" />
                      </button>
                      {isOpen && (
                        <>
                          <button type="button" data-hot="1" onClick={() => scrollRow(mod.id, -1)} className={SQUARE_BTN}>
                            <i className="ri-arrow-left-s-line text-base" />
                          </button>
                          <button type="button" data-hot="1" onClick={() => scrollRow(mod.id, 1)} className={SQUARE_BTN}>
                            <i className="ri-arrow-right-s-line text-base" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div
                      ref={(el) => {
                        rowRefs.current[mod.id] = el
                      }}
                      className="flex gap-4 overflow-x-auto px-6 py-0.5"
                      style={{
                        maskImage:
                          'linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
                      }}
                    >
                      {mod.items.map((item, i) => (
                        <div key={item.id} className="group/item relative flex-none">
                          <LessonPoster
                            item={item}
                            moduleLabel={`MÓDULO ${mod.order_index}`}
                            number={i + 1}
                            wide={single}
                            onOpen={() =>
                              item.type === 'aula'
                                ? navigate(`/cursos/${course.id}/aula/${item.id}`)
                                : flash('Arquivo baixado')
                            }
                          />
                          <div className="absolute -top-1 left-1/2 flex -translate-x-1/2 -translate-y-full gap-1 opacity-0 group-hover/item:opacity-100">
                            <button
                              type="button"
                              data-hot="1"
                              onClick={() => moveItem(mod, item.id, -1)}
                              className="flex h-6 w-6 items-center justify-center border border-cream/18 bg-smoke text-cream outline-none hover:border-paper"
                            >
                              <i className="ri-arrow-left-s-line text-xs" />
                            </button>
                            <button
                              type="button"
                              data-hot="1"
                              onClick={() => moveItem(mod, item.id, 1)}
                              className="flex h-6 w-6 items-center justify-center border border-cream/18 bg-smoke text-cream outline-none hover:border-paper"
                            >
                              <i className="ri-arrow-right-s-line text-xs" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {single && (
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 px-1.5">
                          <span className="text-[15px] font-semibold tracking-[-0.01em] text-paper">{mod.items[0].name}</span>
                          <span className="max-w-[60ch] text-[13.5px] leading-relaxed text-cream">
                            Uma aula só neste módulo.{' '}
                            {mod.items[0].type === 'aula' ? minutesLabel(mod.items[0].duration_seconds) : ''}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        data-hot="1"
                        onClick={() => setAddingItemTo(mod.id)}
                        className="flex aspect-2/3 w-[140px] flex-none flex-col items-center justify-center gap-2 border border-dashed border-cream/24 text-cream/55 outline-none hover:border-paper hover:text-paper"
                      >
                        <i className="ri-add-line text-lg" />
                        <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase">item</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Adicionar módulo */}
        <div className="flex flex-col gap-3 border-t border-cream/10 pt-9.5">
          {addingModule ? (
            <div className="flex flex-wrap items-end gap-3.5">
              <input
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="Nome do módulo"
                className="border-b border-cream/22 bg-transparent py-1.5 text-[15px] text-paper outline-none placeholder:text-cream/30 focus:border-paper"
              />
              <input
                value={moduleTrack}
                onChange={(e) => setModuleTrack(e.target.value)}
                placeholder="trilha (opcional)"
                className="border-b border-cream/16 bg-transparent py-1.5 font-mono text-[11px] tracking-[0.1em] text-cream uppercase outline-none placeholder:text-cream/30 focus:border-paper"
              />
              <button
                type="button"
                data-hot="1"
                onClick={addModule}
                className="bg-paper px-4 py-2 text-[13px] font-semibold text-ink outline-none hover:bg-cream"
              >
                Adicionar
              </button>
              <button
                type="button"
                data-hot="1"
                onClick={() => setAddingModule(false)}
                className="text-[13px] text-cream/60 outline-none hover:text-paper"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-hot="1"
              onClick={() => setAddingModule(true)}
              className="flex w-fit items-center gap-2 border border-dashed border-cream/28 px-4 py-2.5 text-[13px] text-cream outline-none hover:border-paper hover:text-paper"
            >
              <i className="ri-add-line text-[15px]" />
              <span>Adicionar módulo</span>
            </button>
          )}
        </div>
      </div>

      <ItemEditor open={!!addingItemTo} onClose={() => setAddingItemTo(null)} onSave={addItem} />
    </div>
  )
}
