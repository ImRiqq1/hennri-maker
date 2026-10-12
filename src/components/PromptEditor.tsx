import { useEffect, useRef, useState } from 'react'
import { fileUrl, uploadFile } from '../lib/api'
import { ASPECT_RATIOS, PROMPT_CATEGORIES, PROMPT_MODELS, PROMPT_TAGS } from '../lib/constants'
import { highlightTags } from '../lib/promptText'
import type { Prompt } from '../lib/types'
import { Chip } from './Chip'
import { EditorPanel, FIELD_LABEL as LABEL } from './EditorPanel'

export type PromptForm = {
  title: string
  category: string
  prompt_text: string
  model: string
  aspect_ratio: string
  image_key: string | null
}

function emptyForm(): PromptForm {
  return {
    title: '',
    category: PROMPT_CATEGORIES[0],
    prompt_text: '',
    model: PROMPT_MODELS[0],
    aspect_ratio: ASPECT_RATIOS[0],
    image_key: null,
  }
}

/** Painel lateral pra criar/editar um prompt. */
export function PromptEditor({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean
  editing: Prompt | null
  onClose: () => void
  onSave: (form: PromptForm) => Promise<void>
}) {
  const [form, setForm] = useState<PromptForm>(emptyForm())
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            title: editing.title,
            category: editing.category,
            prompt_text: editing.prompt_text,
            model: editing.model || PROMPT_MODELS[0],
            aspect_ratio: editing.aspect_ratio || ASPECT_RATIOS[0],
            image_key: editing.image_key,
          }
        : emptyForm(),
    )
  }, [open, editing])

  // mantém o realce das [Tags] alinhado com o textarea
  function syncScroll() {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const { key } = await uploadFile(file)
      setForm((f) => ({ ...f, image_key: key }))
    } finally {
      setUploading(false)
    }
  }

  function insertTag(tag: string) {
    const ta = textareaRef.current
    if (!ta) return
    const sep = form.prompt_text && !form.prompt_text.endsWith('\n') ? '\n\n' : ''
    const next = form.prompt_text + sep + tag + ' '
    setForm((f) => ({ ...f, prompt_text: next }))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(next.length, next.length)
    })
  }

  async function handleSave() {
    if (!form.title.trim() || !form.prompt_text.trim()) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  const preview = fileUrl(form.image_key)

  return (
    <EditorPanel
      open={open}
      title={editing ? 'Editar prompt' : 'Novo prompt'}
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={saving || !form.title.trim() || !form.prompt_text.trim()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      <button
        type="button"
        data-hot="1"
        onClick={() => fileRef.current?.click()}
        className="relative flex h-[180px] flex-none flex-col items-center justify-center gap-3 overflow-hidden border border-dashed border-cream/28 text-cream/60 outline-none hover:border-paper hover:text-paper"
      >
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <i className="ri-image-add-line text-[22px]" />
            <span className="text-[13px]">{uploading ? 'enviando…' : 'Arraste a imagem ou clique pra escolher'}</span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-cream/35">PNG / JPG / MP4</span>
          </>
        )}
      </button>

      <div className="flex flex-col gap-2">
        <span className={LABEL}>título</span>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Nome do prompt"
          className="border-b border-cream/22 bg-transparent pb-2 text-[22px] font-semibold tracking-[-0.02em] text-paper outline-none placeholder:text-cream/28 focus:border-paper"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={LABEL}>categoria</span>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_CATEGORIES.map((c) => (
            <Chip key={c} active={form.category === c} onClick={() => setForm((f) => ({ ...f, category: c }))}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className={LABEL}>o prompt</span>
          <span className="font-mono text-[10px] text-cream/30">{form.prompt_text.length} caracteres</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              data-hot="1"
              onClick={() => insertTag(tag)}
              className="border border-cream/18 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-cream/70 outline-none hover:border-paper hover:text-paper"
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="relative min-h-[220px] border border-cream/14 bg-[#101013]">
          <div
            ref={highlightRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden p-3.5 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap text-white/88"
          >
            {highlightTags(form.prompt_text)}
          </div>
          <textarea
            ref={textareaRef}
            value={form.prompt_text}
            onChange={(e) => setForm((f) => ({ ...f, prompt_text: e.target.value }))}
            onScroll={syncScroll}
            className="relative min-h-[220px] w-full resize-none bg-transparent p-3.5 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap text-transparent caret-white outline-none"
          />
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex flex-col gap-2.5">
          <span className={LABEL}>modelo</span>
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_MODELS.map((m) => (
              <Chip
                key={m}
                active={form.model === m}
                onClick={() => setForm((f) => ({ ...f, model: m }))}
                className="px-3 py-1.5 tracking-[0.12em]"
              >
                {m}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className={LABEL}>proporção</span>
          <div className="flex flex-wrap gap-1.5">
            {ASPECT_RATIOS.map((r) => (
              <Chip
                key={r}
                active={form.aspect_ratio === r}
                onClick={() => setForm((f) => ({ ...f, aspect_ratio: r }))}
                className="px-3 py-1.5 tracking-[0.12em]"
              >
                {r}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </EditorPanel>
  )
}
