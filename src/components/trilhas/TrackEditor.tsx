import { useEffect, useRef, useState } from 'react'
import { fileUrl, uploadFile } from '../../lib/api'
import { INTENTS, trackIntents } from '../../lib/trilhas'
import type { NamedItem, Track } from '../../lib/types'
import { cn } from '../../lib/utils'
import { EditorPanel, FIELD_LABEL } from '../EditorPanel'

export const INPUT =
  'h-11 rounded-2xl border border-mist-200 bg-mist-50 px-4 text-[14px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60'

export type TrackForm = {
  title: string
  artist: string | null
  cover_key: string | null
  intents: string[]
  project_ids: string[]
}

/** Painel "Editar trilha": nome, artista, capa, intenções e projetos. */
export function TrackEditor({
  track,
  projects,
  onClose,
  onSave,
}: {
  track: Track | null
  projects: NamedItem[]
  onClose: () => void
  onSave: (form: TrackForm) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [coverKey, setCoverKey] = useState<string | null>(null)
  const [intents, setIntents] = useState<string[]>([])
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!track) return
    setTitle(track.title)
    setArtist(track.artist ?? '')
    setCoverKey(track.cover_key)
    setIntents(trackIntents(track))
    setProjectIds(track.project_ids)
  }, [track])

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      setCoverKey((await uploadFile(file)).key)
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), artist: artist.trim() || null, cover_key: coverKey, intents, project_ids: projectIds })
    } finally {
      setSaving(false)
    }
  }

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const cover = fileUrl(coverKey)

  return (
    <EditorPanel open={!!track} title="Editar trilha" onClose={onClose} onSave={save} saveDisabled={saving || uploading || !title.trim()}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleUpload(f)
          e.target.value = ''
        }}
      />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative flex h-28 w-28 flex-none items-center justify-center overflow-hidden rounded-[var(--r-inner)] border border-dashed border-mist-300 bg-mist-50 outline-none focus-visible:ring-4 focus-visible:ring-ice-200"
        >
          {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <span
            className={cn(
              'relative flex flex-col items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-medium transition-opacity',
              cover ? 'bg-surface/90 text-fg opacity-0 group-hover:opacity-100' : 'text-sub',
            )}
          >
            <i className={uploading ? 'ri-loader-4-line animate-spin text-[18px]' : 'ri-image-add-line text-[18px]'} />
            {cover ? 'Trocar' : 'Capa'}
          </span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Nome</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} placeholder="Nome da música" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Artista</span>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} className={INPUT} placeholder="Artista" />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Intenções da trilha</span>
        <div className="flex flex-wrap gap-1.5">
          {INTENTS.map((i) => {
            const on = intents.includes(i)
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                onClick={() => setIntents((l) => toggle(l, i))}
                className={cn(
                  'press rounded-[var(--r-control)] border px-3 py-1.5 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ice-200',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-mist-200 bg-surface text-abyss-700 hover:bg-mist-50',
                )}
              >
                {i}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Projetos onde ela é usada</span>
        {projects.length === 0 ? (
          <span className="text-[12.5px] text-sub">Crie projetos na lateral da Biblioteca (ex.: um cliente).</span>
        ) : (
          <div className="flex flex-col gap-1">
            {projects.map((p) => {
              const on = projectIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProjectIds((l) => toggle(l, p.id))}
                  className="flex items-center gap-3 rounded-[14px] px-3 py-2 text-left text-[13.5px] text-fg outline-none hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-mist-300 bg-surface',
                    )}
                  >
                    {on && <i className="ri-check-line text-[13px]" />}
                  </span>
                  {p.name}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </EditorPanel>
  )
}
