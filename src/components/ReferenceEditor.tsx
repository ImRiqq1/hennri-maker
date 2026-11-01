import { useEffect, useMemo, useRef, useState } from 'react'
import { fileUrl, uploadFile } from '../lib/api'
import { REFERENCE_TABS } from '../lib/constants'
import type { Reference } from '../lib/types'
import { Chip } from './Chip'
import { EditorPanel, FIELD_LABEL } from './EditorPanel'
import { ChipGroup } from './PageHeader'

const INPUT =
  'h-11 rounded-2xl border border-mist-200 bg-mist-50 px-4 text-[14px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60'
const TEXTAREA =
  'rounded-2xl border border-mist-200 bg-mist-50 p-4 text-[14px] leading-[1.6] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60'

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
        onClick={() => fileRef.current?.click()}
        className="relative flex h-[180px] flex-none flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[22px] border border-dashed border-mist-300 bg-mist-50 text-sub outline-none transition-colors hover:border-ice-400 hover:bg-ice-50 hover:text-abyss-600 focus-visible:ring-4 focus-visible:ring-ice-200"
      >
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-abyss-600 shadow-soft">
              <i className="ri-video-add-line text-[19px]" />
            </span>
            <span className="text-[13.5px]">{uploading ? 'Enviando…' : 'Arraste o vídeo ou clique pra escolher'}</span>
            <span className="text-[11.5px] text-mist-400">MP4 / GIF / PNG</span>
          </>
        )}
      </button>

      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do movimento" className={INPUT} />
      </div>

      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Termo pra colar</span>
        <textarea
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="low angle dolly-in, 35mm"
          rows={2}
          className={`resize-none font-code text-[13px] ${TEXTAREA}`}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>Aba</span>
        <ChipGroup className="self-start shadow-none">
          {REFERENCE_TABS.map((t) => (
            <Chip
              key={t.id}
              active={tab === t.id}
              className="h-8 px-3.5"
              onClick={() => {
                setTab(t.id)
                setFamily('')
              }}
            >
              {t.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>Família</span>
        {families.length > 0 && (
          <ChipGroup className="self-start shadow-none">
            {families.map((f) => (
              <Chip
                key={f}
                active={family === f && !newFamily}
                className="h-8 px-3.5"
                onClick={() => {
                  setFamily(f)
                  setNewFamily('')
                }}
              >
                {f}
              </Chip>
            ))}
          </ChipGroup>
        )}
        <input
          value={newFamily}
          onChange={(e) => setNewFamily(e.target.value)}
          placeholder="ou nova família"
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>Quando usar</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`min-h-[96px] ${TEXTAREA}`} />
      </div>
    </EditorPanel>
  )
}
