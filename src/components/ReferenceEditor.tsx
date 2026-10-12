import { useEffect, useMemo, useRef, useState } from 'react'
import { fileUrl, uploadFile } from '../lib/api'
import { REFERENCE_TABS } from '../lib/constants'
import type { Reference } from '../lib/types'
import { Chip } from './Chip'
import { EditorPanel, FIELD_LABEL } from './EditorPanel'

export type ReferenceForm = {
  tab: string
  family: string
  name: string
  term: string
  description: string
  media_key: string | null
}

export function ReferenceEditor({
  open,
  defaultTab,
  references,
  onClose,
  onSave,
}: {
  open: boolean
  defaultTab: string
  references: Reference[]
  onClose: () => void
  onSave: (form: ReferenceForm) => Promise<void>
}) {
  const [tab, setTab] = useState(defaultTab)
  const [family, setFamily] = useState('')
  const [newFamily, setNewFamily] = useState('')
  const [name, setName] = useState('')
  const [term, setTerm] = useState('')
  const [description, setDescription] = useState('')
  const [mediaKey, setMediaKey] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTab(defaultTab)
      setFamily('')
      setNewFamily('')
      setName('')
      setTerm('')
      setDescription('')
      setMediaKey(null)
    }
  }, [open, defaultTab])

  // famílias que já existem na aba escolhida
  const families = useMemo(
    () => [...new Set(references.filter((r) => r.tab === tab).map((r) => r.family))],
    [references, tab],
  )

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const { key } = await uploadFile(file)
      setMediaKey(key)
    } finally {
      setUploading(false)
    }
  }

  const chosenFamily = newFamily.trim() || family

  async function handleSave() {
    if (!name.trim() || !term.trim() || !chosenFamily) return
    setSaving(true)
    try {
      await onSave({
        tab,
        family: chosenFamily,
        name: name.trim(),
        term: term.trim(),
        description: description.trim(),
        media_key: mediaKey,
      })
    } finally {
      setSaving(false)
    }
  }

  const preview = fileUrl(mediaKey)

  return (
    <EditorPanel
      open={open}
      title="Nova referência"
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={saving || !name.trim() || !term.trim() || !chosenFamily}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      <button
        type="button"
        data-hot="1"
        onClick={() => fileRef.current?.click()}
        className="relative flex h-[170px] flex-none flex-col items-center justify-center gap-3 overflow-hidden border border-dashed border-cream/28 text-cream/60 outline-none hover:border-paper hover:text-paper"
      >
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <i className="ri-video-add-line text-[22px]" />
            <span className="text-[13px]">{uploading ? 'enviando…' : 'Arraste o vídeo ou clique pra escolher'}</span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-cream/35">MP4 / GIF / PNG</span>
          </>
        )}
      </button>

      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do movimento"
          className="border-b border-cream/22 bg-transparent pb-2 text-[22px] font-semibold tracking-[-0.02em] text-paper outline-none placeholder:text-cream/28 focus:border-paper"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>termo pra colar</span>
        <div className="border border-cream/14 bg-[#101013] p-3.5">
          <textarea
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="low angle dolly-in, 35mm"
            rows={2}
            className="w-full resize-none bg-transparent font-mono text-[13px] leading-[1.6] text-cream outline-none placeholder:text-cream/28"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>aba</span>
        <div className="flex flex-wrap gap-1.5">
          {REFERENCE_TABS.map((t) => (
            <Chip
              key={t.id}
              active={tab === t.id}
              onClick={() => {
                setTab(t.id)
                setFamily('')
              }}
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>família</span>
        <div className="flex flex-wrap gap-1.5">
          {families.map((f) => (
            <Chip
              key={f}
              active={family === f && !newFamily}
              onClick={() => {
                setFamily(f)
                setNewFamily('')
              }}
            >
              {f}
            </Chip>
          ))}
        </div>
        <input
          value={newFamily}
          onChange={(e) => setNewFamily(e.target.value)}
          placeholder="ou nova família"
          className="border-b border-cream/16 bg-transparent py-1.5 font-mono text-[11px] tracking-[0.1em] text-paper uppercase outline-none placeholder:text-cream/30 focus:border-paper"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>quando usar</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[90px] border border-cream/14 bg-[#101013] p-3.5 text-[13.5px] leading-[1.6] text-paper outline-none"
        />
      </div>
    </EditorPanel>
  )
}
