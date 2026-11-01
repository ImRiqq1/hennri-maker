import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChipGroup, EmptyState } from '../components/PageHeader'
import { NewButton } from '../components/PrimaryButton'
import { ReferenceCard } from '../components/ReferenceCard'
import { ReferenceEditor, type ReferenceForm } from '../components/ReferenceEditor'
import { ReferenceViewer } from '../components/ReferenceViewer'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { REFERENCE_TABS } from '../lib/constants'
import type { Reference } from '../lib/types'
import { cn } from '../lib/utils'

export function References() {
  const { tab = 'camera' } = useParams()
  const { flash } = useToast()
  const [params, setParams] = useSearchParams()
  const [references, setReferences] = useState<Reference[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setReferences(await api.get<Reference[]>(`/references?tab=${tab}`))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tab])

  useEffect(() => {
    const open = params.get('open')
    const isNew = params.get('new')
    if (open) setOpenId(open)
    if (isNew) setEditorOpen(true)
    if (open || isNew) {
      const next = new URLSearchParams(params)
      next.delete('open')
      next.delete('new')
      setParams(next, { replace: true })
    }
  }, [params])

  // agrupa por família (MOVIMENTO, ÂNGULO, LENTE…)
  const groups = useMemo(
    () =>
      [...new Set(references.map((r) => r.family))].map((family) => ({
        family,
        items: references.filter((r) => r.family === family),
      })),
    [references],
  )

  const openIndex = openId ? references.findIndex((r) => r.id === openId) + 1 : 0
  const openRef = references.find((r) => r.id === openId) ?? null
  const tabLabel = REFERENCE_TABS.find((t) => t.id === tab)?.label ?? tab

  function copy(term: string) {
    navigator.clipboard?.writeText(term).catch(() => {})
    flash('Termo copiado')
  }

  async function save(form: ReferenceForm) {
    const created = await api.post<Reference>('/references', form)
    if (created.tab === tab) setReferences((list) => [...list, created])
    setEditorOpen(false)
    flash('Referência salva')
  }

  const newButton = <NewButton label="Nova referência" onClick={() => setEditorOpen(true)} />

  return (
    <div>
      <div className="mb-10 flex items-end justify-between gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-start gap-3">
            <h1 className="font-display text-[length:var(--title-size)] leading-[0.95] tracking-[var(--title-track)] text-fg [font-weight:var(--title-weight)]">
              {tabLabel}
            </h1>
            <span className="tnum mt-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2.5 text-[13px] font-medium text-primary-foreground">
              {references.length}
            </span>
          </div>
          <ChipGroup className="self-start">
            {REFERENCE_TABS.map((t) => {
              const active = t.id === tab
              return (
                <Link
                  key={t.id}
                  to={`/referencias/${t.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium outline-none transition-[background-color,color,box-shadow] duration-300 ease-apple focus-visible:ring-4 focus-visible:ring-ice-200',
                    active
                      ? 'bg-primary text-primary-foreground shadow-[0_6px_14px_-8px_rgb(4_26_33/0.7)] hover:text-primary-foreground'
                      : 'text-abyss-700 hover:bg-mist-100 hover:text-fg',
                  )}
                >
                  {t.label}
                </Link>
              )
            })}
          </ChipGroup>
        </div>
        <div data-page-actions className="flex flex-none items-center gap-3">{newButton}</div>
      </div>

      {!loading && references.length === 0 && (
        <EmptyState title={tabLabel} message="Nada guardado nessa aba ainda." action={newButton} />
      )}

      {groups.map((group) => (
        <section key={group.family} className="mb-12 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] leading-none font-light tracking-[-0.03em] text-fg lowercase first-letter:uppercase">
              {group.family}
            </h2>
            <span className="tnum rounded-full border border-mist-200 bg-surface px-2.5 py-0.5 text-[12px] text-sub">
              {group.items.length}
            </span>
            <div className="h-px flex-1 bg-mist-200" />
          </div>
          <div className="stagger grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((r) => (
              <ReferenceCard
                key={r.id}
                reference={r}
                index={references.findIndex((x) => x.id === r.id) + 1}
                onOpen={() => setOpenId(r.id)}
                onCopy={() => copy(r.term)}
              />
            ))}
          </div>
        </section>
      ))}

      <ReferenceViewer
        reference={openRef}
        index={openIndex}
        onClose={() => setOpenId(null)}
        onCopy={() => openRef && copy(openRef.term)}
      />
      <ReferenceEditor
        open={editorOpen}
        defaultTab={tab}
        references={references}
        onClose={() => setEditorOpen(false)}
        onSave={save}
      />
    </div>
  )
}
