import { useEffect, useState } from 'react'
import { SKILL_CATEGORIES } from '../lib/constants'
import { Chip } from './Chip'
import { EditorPanel, FIELD_LABEL } from './EditorPanel'

export type SkillForm = { name: string; category: string; description: string; triggers: string[] }

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
        <span className={FIELD_LABEL}>nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nome-da-skill"
          className="border-b border-cream/22 bg-transparent pb-2 font-mono text-[17px] text-paper outline-none placeholder:text-cream/28 focus:border-paper"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>categoria</span>
        <div className="flex flex-wrap gap-1.5">
          {SKILL_CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>o que faz</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[88px] border border-cream/14 bg-[#101013] p-3.5 text-[13.5px] leading-[1.6] text-paper outline-none"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>gatilhos — um por linha</span>
        <textarea
          value={triggers}
          onChange={(e) => setTriggers(e.target.value)}
          className="min-h-[140px] border border-cream/14 bg-[#101013] p-3.5 font-mono text-xs leading-[1.7] whitespace-pre-wrap text-paper outline-none"
        />
      </div>
    </EditorPanel>
  )
}
