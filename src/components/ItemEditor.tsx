import { useEffect, useState, type ReactNode } from 'react'
import { ChipGroup } from './PageHeader'
import { Chip } from './Chip'
import { EditorPanel, FIELD_LABEL } from './EditorPanel'

export type ItemForm = {
  type: 'aula' | 'material'
  name: string
  drive_url: string
  duration_seconds: number | null
  file_format: string
  file_size_mb: number | null
}

const INPUT =
  'h-11 rounded-2xl border border-mist-200 bg-mist-50 px-4 text-[14px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className={FIELD_LABEL}>{label}</span>
      {children}
    </label>
  )
}

/** Painel "Novo item" de um módulo: uma aula (vídeo do Drive) ou um material (arquivo). */
export function ItemEditor({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (form: ItemForm) => Promise<void>
}) {
  const [type, setType] = useState<'aula' | 'material'>('aula')
  const [name, setName] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [minutes, setMinutes] = useState('')
  const [format, setFormat] = useState('')
  const [sizeMb, setSizeMb] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setType('aula')
      setName('')
      setDriveUrl('')
      setMinutes('')
      setFormat('')
      setSizeMb('')
    }
  }, [open])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        type,
        name: name.trim(),
        drive_url: driveUrl.trim(),
        duration_seconds: minutes ? Math.round(Number(minutes) * 60) : null,
        file_format: format.trim(),
        file_size_mb: sizeMb ? Number(sizeMb) : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <EditorPanel
      open={open}
      title="Novo item"
      compact
      saveLabel="Adicionar"
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={saving || !name.trim()}
    >
      <ChipGroup className="self-start shadow-none">
        {(['aula', 'material'] as const).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)} className="h-9 gap-1.5 px-4">
            <i className={t === 'aula' ? 'ri-play-circle-line text-[15px]' : 'ri-file-zip-line text-[15px]'} />
            {t === 'aula' ? 'Aula' : 'Material'}
          </Chip>
        ))}
      </ChipGroup>

      <Field label="Nome">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT}
          placeholder={type === 'aula' ? 'Animação Completa' : 'LUTs'}
        />
      </Field>

      <Field label="Link do Drive">
        <input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} className={INPUT} placeholder="drive.google.com/…" />
      </Field>

      {type === 'aula' ? (
        <Field label="Duração (minutos)">
          <input value={minutes} onChange={(e) => setMinutes(e.target.value)} className={INPUT} placeholder="38" inputMode="numeric" />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Formato">
            <input value={format} onChange={(e) => setFormat(e.target.value)} className={INPUT} placeholder="ZIP" />
          </Field>
          <Field label="Tamanho (MB)">
            <input value={sizeMb} onChange={(e) => setSizeMb(e.target.value)} className={INPUT} placeholder="180" inputMode="numeric" />
          </Field>
        </div>
      )}
    </EditorPanel>
  )
}
