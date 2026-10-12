import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/PageHeader'
import { NewButton } from '../components/PrimaryButton'
import { ReferenceCard } from '../components/ReferenceCard'
import { ReferenceEditor, type ReferenceForm } from '../components/ReferenceEditor'
import { ReferenceViewer } from '../components/ReferenceViewer'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { REFERENCE_TABS } from '../lib/constants'
import type { Reference } from '../lib/types'

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
      <div className="mb-6.5 flex flex-wrap gap-4.5 font-mono text-[10px] tracking-[0.16em] text-cream/40 uppercase">
        {REFERENCE_TABS.map((t) => (
          <span key={t.id}>[{t.label.toLowerCase()}]</span>
        ))}
      </div>

      <div className="mb-8.5 flex items-center gap-7 border-b border-cream/10">
        {REFERENCE_TABS.map((t) => (
          <Link
            key={t.id}
            to={`/referencias/${t.id}`}
            data-hot="1"
            className="relative px-0.5 pb-3.5 text-sm font-semibold tracking-[-0.01em]"
            style={{ color: t.id === tab ? '#FFFFFF' : 'rgba(232,224,213,0.55)' }}
          >
            <span>{t.label}</span>
            {t.id === tab && <div className="absolute inset-x-0 -bottom-px h-px bg-paper" />}
          </Link>
        ))}
      </div>

      <div className="mb-10 flex items-end justify-between gap-8">
        <div className="flex min-w-0 flex-1 items-end gap-4.5">
          <span className="font-condensed text-[clamp(120px,15.5vw,300px)] leading-[0.76] tracking-[-0.065em] text-paper uppercase">
            {tabLabel}
          </span>
          <span className="pb-3.5 font-mono text-[11px] tracking-[0.14em] text-cream/45">
            /{String(references.length).padStart(3, '0')}
          </span>
        </div>
        <div className="flex flex-none items-center gap-3.5 pb-3.5">{newButton}</div>
      </div>

      {!loading && references.length === 0 && (
        <EmptyState title={tabLabel} tracking="-0.06em" message="Nada guardado nessa aba ainda." action={newButton} />
      )}

      {groups.map((group) => (
        <div key={group.family} className="mb-13 flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <span className="font-mono text-[11px] tracking-[0.18em] text-cream uppercase">{group.family}</span>
            <div className="h-px flex-1 bg-cream/10" />
            <span className="font-mono text-[10px] tracking-[0.14em] text-cream/35">
              /{String(group.items.length).padStart(3, '0')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-6">
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
        </div>
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
