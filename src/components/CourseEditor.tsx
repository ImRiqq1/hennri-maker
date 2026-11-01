import { useEffect, useRef, useState } from 'react'
import { fileUrl, uploadFile } from '../lib/api'
import { EditorPanel, FIELD_LABEL } from './EditorPanel'

export type CourseForm = { name: string; author: string; cover_key: string | null }

const INPUT =
  'h-11 rounded-2xl border border-mist-200 bg-mist-50 px-4 text-[14px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60'

export function CourseEditor({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (form: CourseForm) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [coverKey, setCoverKey] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setAuthor('')
      setCoverKey(null)
    }
  }, [open])

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const { key } = await uploadFile(file)
      setCoverKey(key)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), author: author.trim(), cover_key: coverKey })
    } finally {
      setSaving(false)
    }
  }

  const cover = fileUrl(coverKey)

  return (
    <EditorPanel open={open} title="Novo curso" onClose={onClose} onSave={handleSave} saveDisabled={saving || !name.trim()}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Capa</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--r-inner)] border border-dashed border-mist-300 bg-mist-50 text-sub outline-none transition-colors hover:border-ice-400 hover:bg-ice-50 hover:text-abyss-600 focus-visible:ring-4 focus-visible:ring-ice-200"
        >
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-soft">
                <i className="ri-image-add-line text-[19px]" />
              </span>
              <span className="text-[12.5px]">{uploading ? 'Enviando…' : 'Adicionar capa'}</span>
            </>
          )}
        </button>
      </div>
      <label className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Nome do curso</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do curso" className={INPUT} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Autor</span>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Autor" className={INPUT} />
      </label>
      <span className="flex items-start gap-2 rounded-2xl bg-ice-50 px-4 py-3 text-[12.5px] leading-relaxed text-abyss-600">
        <i className="ri-information-line mt-px text-[14px]" />
        Depois de criar, você adiciona módulos e aulas direto na página do curso.
      </span>
    </EditorPanel>
  )
}
