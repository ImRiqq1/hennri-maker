import { useEffect } from 'react'
import { fileUrl } from '../lib/api'
import { formatDate, indexLabel } from '../lib/format'
import { splitPromptBlocks } from '../lib/promptText'
import type { Prompt } from '../lib/types'
import { Kbd } from './PageHeader'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

const ROUND_BTN =
  'flex h-10 w-10 flex-none items-center justify-center rounded-full border border-mist-200 bg-surface text-abyss-700 outline-none transition-colors hover:border-mist-300 hover:bg-mist-50 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200'

function ImagePlaceholder({ aspect, className }: { aspect: string | null; className: string }) {
  return (
    <div className={className}>
      <i className="ri-image-line text-[30px] text-abyss-500/35" />
      <span className="text-[12px] text-sub">Imagem {aspect || ''}</span>
    </div>
  )
}

/** Modal de visualização de um prompt (setas ← → navegam entre prompts). */
export function PromptViewer({
  prompt,
  index,
  onClose,
  onPrev,
  onNext,
  onEdit,
  onDelete,
  onCopy,
  onDownload,
}: {
  prompt: Prompt | null
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
  onDownload: () => void
}) {
  const open = !!prompt

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onPrev, onNext])

  if (!prompt) return null

  const blocks = splitPromptBlocks(prompt.prompt_text)
  const image = fileUrl(prompt.image_key)
  const refImage = fileUrl(prompt.ref_image_key)
  const extraImage = fileUrl(prompt.extra_image_key)

  const meta = [prompt.model || '—', prompt.aspect_ratio || '—', formatDate(prompt.created_at)]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Prompt anterior"
        className="fixed top-1/2 left-7 z-[401] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-abyss-950 shadow-lift outline-none backdrop-blur transition-colors hover:bg-white focus-visible:ring-4 focus-visible:ring-ice-300"
      >
        <i className="ri-arrow-left-s-line text-[22px]" />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Próximo prompt"
        className="fixed top-1/2 right-7 z-[401] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-abyss-950 shadow-lift outline-none backdrop-blur transition-colors hover:bg-white focus-visible:ring-4 focus-visible:ring-ice-300"
      >
        <i className="ri-arrow-right-s-line text-[22px]" />
      </button>

      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] w-[min(1160px,calc(100%-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-[var(--r-panel)] border border-mist-200 bg-surface p-0 shadow-lift ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{prompt.title}</DialogTitle>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:h-[min(80vh,780px)] lg:flex-row lg:overflow-hidden">
          {/* Imagens */}
          <div className="flex min-h-0 flex-col gap-3 bg-mist-100 p-5 lg:w-[56%]">
            {refImage ? (
              <div className="flex h-[52vh] min-h-0 gap-3 lg:h-auto lg:flex-1">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                  <span className="flex-none pl-1 text-[12px] text-sub">Referência</span>
                  <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--r-inner)] bg-surface">
                    <img src={refImage} alt="" className="h-full w-full object-contain" />
                  </div>
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                  <span className="flex-none pl-1 text-[12px] text-sub">Resultado</span>
                  <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--r-inner)] bg-surface">
                    {image ? (
                      <img src={image} alt={prompt.title} className="h-full w-full object-contain" />
                    ) : (
                      <ImagePlaceholder
                        aspect={prompt.aspect_ratio}
                        className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-mist-100 to-ice-100"
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[52vh] min-h-0 items-center justify-center lg:h-auto lg:flex-1">
                {image ? (
                  <img src={image} alt={prompt.title} className="h-full w-auto max-w-full rounded-[var(--r-inner)] object-contain" />
                ) : (
                  <ImagePlaceholder
                    aspect={prompt.aspect_ratio}
                    className="flex aspect-3/4 h-full flex-col items-center justify-center gap-2 rounded-[var(--r-inner)] bg-gradient-to-br from-mist-100 to-ice-100"
                  />
                )}
              </div>
            )}

            {extraImage && (
              <div className="flex flex-none items-center gap-3.5 rounded-[var(--r-inner)] bg-surface p-3">
                <img src={extraImage} alt="" className="h-16 w-auto rounded-xl object-contain" />
                <span className="text-[12px] text-sub">Material de apoio</span>
              </div>
            )}
          </div>

          {/* Texto */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-none items-center justify-between gap-4 px-7 pt-6 pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-ice-100 px-2.5 py-1 text-[12px] font-medium text-abyss-600">
                  {prompt.category}
                </span>
                <span className="tnum text-[12px] text-mist-400">{indexLabel(index, 2)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Kbd>Esc</Kbd>
                <button type="button" onClick={onClose} aria-label="Fechar" className={ROUND_BTN}>
                  <i className="ri-close-line text-[18px]" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-7 pt-2 pb-6">
              <h2 className="text-[30px] leading-[1.05] font-light tracking-[-0.04em] text-fg">{prompt.title}</h2>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  ['Modelo', meta[0]],
                  ['Proporção', meta[1]],
                  ['Criado em', meta[2]],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[11.5px] text-sub">{label}</span>
                    <span className="text-[13.5px] font-medium text-fg">{value}</span>
                  </div>
                ))}
              </div>

              {/* bloco Abyss com o texto do prompt */}
              <div
                className="relative flex flex-col gap-3.5 overflow-hidden rounded-[24px] p-6 text-white"
                style={{ background: 'var(--hero-gradient)' }}
              >
                {blocks.map((block, i) => (
                  <div key={i} className="relative text-[14px] leading-[1.6] text-white/85">
                    {block.tag && (
                      <span className="mr-2 inline-block rounded-full bg-white/[0.1] px-2 py-0.5 text-[11.5px] font-medium text-ice-300">
                        {block.tag}
                      </span>
                    )}
                    <span>{block.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-none items-center justify-between gap-4 border-t border-mist-200 px-7 py-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={onEdit} title="Editar" aria-label="Editar" className={ROUND_BTN}>
                  <i className="ri-pencil-line text-[16px]" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  title="Apagar"
                  aria-label="Apagar"
                  className={ROUND_BTN + ' hover:border-danger/40 hover:text-danger'}
                >
                  <i className="ri-delete-bin-line text-[16px]" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  className="flex h-11 items-center gap-2 rounded-full border border-mist-200 px-4 text-[14px] font-medium text-abyss-700 outline-none transition-colors hover:bg-mist-50 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
                >
                  <i className="ri-file-copy-line text-[15px]" />
                  <span>Copiar prompt</span>
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={!image}
                  className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300 disabled:opacity-35"
                >
                  <i className="ri-arrow-down-line text-[15px] text-ice-300" />
                  <span>Baixar imagem</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
