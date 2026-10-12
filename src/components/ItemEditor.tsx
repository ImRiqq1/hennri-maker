import { useEffect, useState, type ReactNode } from 'react'
import { Chip } from './Chip'
import { EditorPanel } from './EditorPanel'

export type ItemForm = {
  type: 'aula' | 'material'
  name: string
  drive_url: string
  duration_seconds: number | null
  file_format: string
  file_size_mb: number | null
}

const INPUT =
  'border-b border-cream/16 bg-transparent py-1.5 font-mono text-[11.5px] text-cream outline-none placeholder:text-cream/35 focus:border-paper'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[9.5px] tracking-[0.14em] text-cream/40 uppercase">{label}</span>
      {children}
    </div>
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
      <div className="flex items-center gap-2.5">
        {(['aula', 'material'] as const).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)} className="px-3 py-1.5 tracking-[0.14em] uppercase">
            {t === 'aula' ? 'Aula' : 'Material'}
          </Chip>
        ))}
      </div>

      <Field label="nome">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT}
          placeholder={type === 'aula' ? 'Animação Completa' : 'LUTs'}
        />
      </Field>

      <Field label="link do drive">
        <input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} className={INPUT} placeholder="drive.google.com/…" />
      </Field>

      {type === 'aula' ? (
        <Field label="duração (minutos)">
          <input value={minutes} onChange={(e) => setMinutes(e.target.value)} className={INPUT} placeholder="38" inputMode="numeric" />
        </Field>
      ) : (
        <>
          <Field label="formato">
            <input value={format} onChange={(e) => setFormat(e.target.value)} className={INPUT} placeholder="ZIP" />
          </Field>
          <Field label="tamanho (MB)">
            <input value={sizeMb} onChange={(e) => setSizeMb(e.target.value)} className={INPUT} placeholder="180" inputMode="numeric" />
          </Field>
        </>
      )}
    </EditorPanel>
  )
}
