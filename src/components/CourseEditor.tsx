import { useEffect, useRef, useState } from 'react'
import { fileUrl, uploadFile } from '../lib/api'
import { EditorPanel } from './EditorPanel'

export type CourseForm = { name: string; author: string; cover_key: string | null }

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
      <div className="flex gap-4.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <button
          type="button"
          data-hot="1"
          onClick={() => fileRef.current?.click()}
          className="relative flex aspect-video w-[180px] flex-none flex-col items-center justify-center gap-2 overflow-hidden border border-dashed border-cream/28 text-cream/60 outline-none hover:border-paper hover:text-paper"
        >
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <i className="ri-image-add-line text-xl" />
              <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase">{uploading ? 'enviando…' : 'capa'}</span>
            </>
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-4.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do curso"
            className="border-b border-cream/22 bg-transparent pb-2 text-[22px] font-semibold tracking-[-0.02em] text-paper outline-none placeholder:text-cream/28 focus:border-paper"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="autor"
            className="border-b border-cream/16 bg-transparent pb-2 font-mono text-xs tracking-[0.12em] text-cream uppercase outline-none placeholder:text-cream/28 focus:border-paper"
          />
        </div>
      </div>
      <span className="text-[12.5px] leading-relaxed text-cream/55">
        Depois de criar, você adiciona módulos e aulas direto na página do curso.
      </span>
    </EditorPanel>
  )
}
