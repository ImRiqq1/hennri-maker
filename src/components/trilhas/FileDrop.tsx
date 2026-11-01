import { useRef, useState } from 'react'
import { uploadFile } from '../../lib/api'
import { cn } from '../../lib/utils'

/** Área de "arraste o arquivo ou clique": sobe pro site e devolve a chave e o nome. */
export function FileDrop({
  accept,
  hint,
  onUploaded,
}: {
  accept: string
  hint: string
  onUploaded: (file: { key: string; name: string; duration: number | null }) => Promise<void> | void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function durationOf(file: File): Promise<number | null> {
    if (!file.type.startsWith('audio') && !file.type.startsWith('video')) return null
    return new Promise((resolve) => {
      const el = document.createElement(file.type.startsWith('video') ? 'video' : 'audio')
      const url = URL.createObjectURL(file)
      el.preload = 'metadata'
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(isFinite(el.duration) ? el.duration : null)
      }
      el.onerror = () => resolve(null)
      el.src = url
    })
  }

  async function handle(file: File) {
    setError('')
    if (file.size > 95 * 1024 * 1024) {
      setError('Arquivo grande demais (máx. 95 MB).')
      return
    }
    setBusy(file.name)
    try {
      const [{ key }, duration] = await Promise.all([uploadFile(file), durationOf(file)])
      await onUploaded({ key, name: file.name.replace(/\.[^.]+$/, ''), duration })
    } catch {
      setError('Não deu pra enviar. Tenta de novo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handle(f)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) handle(f)
        }}
        disabled={!!busy}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-[var(--r-inner)] border-2 border-dashed px-6 py-9 text-center outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ice-200',
          over ? 'border-ice-400 bg-ice-50' : 'border-mist-300 bg-mist-50/70 hover:border-ice-400 hover:bg-ice-50',
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary text-primary-foreground shadow-soft">
          <i className={busy ? 'ri-loader-4-line animate-spin text-[20px]' : 'ri-upload-cloud-2-line text-[20px]'} />
        </span>
        <span className="text-[14px] font-medium text-fg">{busy ? `Enviando ${busy}…` : 'Arraste o arquivo ou clique pra escolher'}</span>
        <span className="text-[12px] text-sub">{hint}</span>
      </button>
      {error && <span className="text-[12.5px] text-danger">{error}</span>}
    </div>
  )
}
