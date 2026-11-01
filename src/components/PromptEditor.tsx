import { useEffect, useRef, useState } from 'react'
import { fileUrl, uploadFile } from '../lib/api'
import { ASPECT_RATIOS, PROMPT_CATEGORIES, PROMPT_MODELS, PROMPT_TAGS } from '../lib/constants'
import { highlightTags } from '../lib/promptText'
import type { Prompt } from '../lib/types'
import { Chip } from './Chip'
import { EditorPanel, FIELD_LABEL as LABEL } from './EditorPanel'
import { ChipGroup } from './PageHeader'

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
        onClick={() => fileRef.current?.click()}
        className="relative flex h-[188px] flex-none flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[22px] border border-dashed border-mist-300 bg-mist-50 text-sub outline-none transition-colors hover:border-ice-400 hover:bg-ice-50 hover:text-abyss-600 focus-visible:ring-4 focus-visible:ring-ice-200"
      >
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-abyss-600 shadow-soft">
              <i className="ri-image-add-line text-[20px]" />
            </span>
            <span className="text-[13.5px] font-medium text-fg">{uploading ? 'Enviando…' : 'Arraste a imagem ou clique pra escolher'}</span>
            <span className="text-[12px] text-sub">PNG, JPG ou MP4</span>
          </>
        )}
      </button>

      <div className="flex flex-col gap-2">
        <span className={LABEL}>Título</span>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Nome do prompt"
          className="h-12 rounded-2xl border border-mist-200 bg-mist-50 px-4 text-[17px] font-medium tracking-[-0.02em] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={LABEL}>Categoria</span>
        <ChipGroup className="self-start shadow-none">
          {PROMPT_CATEGORIES.map((c) => (
            <Chip key={c} active={form.category === c} onClick={() => setForm((f) => ({ ...f, category: c }))}>
              {c}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className={LABEL}>O prompt</span>
          <span className="tnum text-[12px] text-mist-400">{form.prompt_text.length} caracteres</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => insertTag(tag)}
              className="rounded-full border border-mist-200 bg-surface px-3 py-1 text-[12px] font-medium text-abyss-600 outline-none transition-colors hover:border-ice-300 hover:bg-ice-100 focus-visible:ring-4 focus-visible:ring-ice-200"
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-mist-200 bg-mist-50 transition-[border-color,box-shadow] focus-within:border-ice-400 focus-within:ring-4 focus-within:ring-ice-200/60">
          <div
            ref={highlightRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden p-4 font-code text-[12.5px] leading-[1.7] whitespace-pre-wrap text-fg"
          >
            {highlightTags(form.prompt_text)}
          </div>
          <textarea
            ref={textareaRef}
            value={form.prompt_text}
            onChange={(e) => setForm((f) => ({ ...f, prompt_text: e.target.value }))}
            onScroll={syncScroll}
            className="relative min-h-[240px] w-full resize-none bg-transparent p-4 font-code text-[12.5px] leading-[1.7] whitespace-pre-wrap text-transparent caret-abyss-950 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <span className={LABEL}>Modelo</span>
          <ChipGroup className="self-start shadow-none">
            {PROMPT_MODELS.map((m) => (
              <Chip
                key={m}
                active={form.model === m}
                onClick={() => setForm((f) => ({ ...f, model: m }))}
                className="h-8 px-3.5"
              >
                {m}
              </Chip>
            ))}
          </ChipGroup>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className={LABEL}>Proporção</span>
          <ChipGroup className="self-start shadow-none">
            {ASPECT_RATIOS.map((r) => (
              <Chip
                key={r}
                active={form.aspect_ratio === r}
                onClick={() => setForm((f) => ({ ...f, aspect_ratio: r }))}
                className="h-8 px-3.5"
              >
                {r}
              </Chip>
            ))}
          </ChipGroup>
        </div>
      </div>
    </EditorPanel>
  )
}
