import { useEffect, useState } from 'react'
import { SKILL_CATEGORIES } from '../lib/constants'
import { Chip } from './Chip'
import { EditorPanel, FIELD_LABEL } from './EditorPanel'
import { ChipGroup } from './PageHeader'

export type SkillForm = { name: string; category: string; description: string; triggers: string[] }

const INPUT =
  'h-11 rounded-2xl border border-mist-200 bg-mist-50 px-4 text-[14px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60'
const TEXTAREA =
  'rounded-2xl border border-mist-200 bg-mist-50 p-4 text-[14px] leading-[1.6] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60'

export function SkillEditor({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (form: SkillForm) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(SKILL_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [triggers, setTriggers] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setCategory(SKILL_CATEGORIES[0])
      setDescription('')
      setTriggers('')
    }
  }, [open])

  async function handleSave() {
    if (!name.trim() || !description.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        category,
        description: description.trim(),
        triggers: triggers
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <EditorPanel
      open={open}
      title="Nova skill"
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={saving || !name.trim() || !description.trim()}
    >
      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="nome-da-skill" className={INPUT} />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>Categoria</span>
        <ChipGroup className="self-start shadow-none">
          {SKILL_CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)} className="h-8 px-3.5">
              {c}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>O que faz</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`min-h-[96px] ${TEXTAREA}`} />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>Gatilhos — um por linha</span>
        <textarea
          value={triggers}
          onChange={(e) => setTriggers(e.target.value)}
          className={`min-h-[140px] font-code text-[12.5px] leading-[1.7] whitespace-pre-wrap ${TEXTAREA}`}
        />
      </div>
    </EditorPanel>
  )
}
