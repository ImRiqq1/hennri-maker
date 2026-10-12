import { useEffect } from 'react'
import { fileUrl } from '../lib/api'
import { formatDate, indexLabel } from '../lib/format'
import { splitPromptBlocks } from '../lib/promptText'
import type { Prompt } from '../lib/types'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

function ImagePlaceholder({ aspect, className }: { aspect: string | null; className: string }) {
  return (
    <div className={className}>
      <span className="font-mono text-[10px] tracking-[0.14em] text-cream/30 uppercase">[imagem {aspect || ''}]</span>
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <button
        type="button"
        data-hot="1"
        onClick={onPrev}
        className="fixed top-1/2 left-7 z-[401] flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-cream/20 text-cream outline-none hover:border-paper hover:text-paper"
      >
        <i className="ri-arrow-left-s-line text-[22px]" />
      </button>
      <button
        type="button"
        data-hot="1"
        onClick={onNext}
        className="fixed top-1/2 right-7 z-[401] flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-cream/20 text-cream outline-none hover:border-paper hover:text-paper"
      >
        <i className="ri-arrow-right-s-line text-[22px]" />
      </button>

      <DialogContent
        showCloseButton={false}
        className="flex max-h-[88vh] w-[min(1080px,calc(100%-2rem))] max-w-none flex-col sm:max-w-none gap-0 rounded-none border border-cream/14 bg-smoke p-0 ring-0"
      >
        <DialogTitle className="sr-only">{prompt.title}</DialogTitle>

        {/* Cabeçalho */}
        <div className="flex flex-none items-center justify-between gap-6 border-b border-cream/10 px-[22px] py-4">
          <div className="flex items-center gap-3.5 font-mono text-[10px] tracking-[0.14em] text-cream/55 uppercase">
            <span>{prompt.model || '—'}</span>
            <span className="text-cream/25">/</span>
            <span>{prompt.aspect_ratio || '—'}</span>
            <span className="text-cream/25">/</span>
            <span>{formatDate(prompt.created_at)}</span>
            <span className="text-cream/25">/</span>
            <span>{prompt.category}</span>
            <span className="text-cream/25">/</span>
            <span className="text-paper">{indexLabel(index)}</span>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="font-mono text-[10px] tracking-[0.16em] text-cream/35">ESC</span>
            <button type="button" data-hot="1" onClick={onClose} className="flex text-cream outline-none hover:text-paper">
              <i className="ri-close-line text-[19px]" />
            </button>
          </div>
        </div>

        {/* Imagens */}
        {refImage ? (
          <div className="flex h-[52vh] flex-none gap-4 bg-ink p-6">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <span className="flex-none font-mono text-[10px] tracking-[0.16em] text-cream/40 uppercase">Referência</span>
              <div className="min-h-0 flex-1">
                <img src={refImage} alt="" className="h-full w-full border border-cream/10 object-contain" />
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <span className="flex-none font-mono text-[10px] tracking-[0.16em] text-cream/40 uppercase">Resultado</span>
              <div className="min-h-0 flex-1">
                {image ? (
                  <img src={image} alt={prompt.title} className="h-full w-full border border-cream/10 object-contain" />
                ) : (
                  <ImagePlaceholder
                    aspect={prompt.aspect_ratio}
                    className="flex h-full flex-col items-end justify-end gap-[3px] border border-cream/10 bg-[#101013] p-3.5"
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[52vh] flex-none items-center justify-center bg-ink p-6">
            {image ? (
              <img src={image} alt={prompt.title} className="h-full w-auto border border-cream/10 object-contain" />
            ) : (
              <ImagePlaceholder
                aspect={prompt.aspect_ratio}
                className="flex aspect-3/4 h-full flex-col items-end justify-end gap-[3px] border border-cream/10 bg-[#101013] p-3.5"
              />
            )}
          </div>
        )}

        {extraImage && (
          <div className="flex flex-none items-center gap-3.5 border-t border-cream/10 bg-ink px-6 py-3.5">
            <span className="flex-none font-mono text-[10px] tracking-[0.16em] text-cream/40 uppercase">Material de apoio</span>
            <img src={extraImage} alt="" className="h-20 w-auto border border-cream/10 object-contain" />
          </div>
        )}

        {/* Texto */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-7 pt-[26px] pb-[30px]">
          <span className="text-[19px] font-semibold tracking-[-0.015em] text-paper">{prompt.title}</span>
          {blocks.map((block, i) => (
            <div key={i} className="text-sm leading-[1.55] text-white/85">
              {block.tag && (
                <span className="mr-2 font-mono text-[11.5px] font-medium tracking-[0.06em] text-cream">{block.tag}</span>
              )}
              <span>{block.text}</span>
            </div>
          ))}
        </div>

        {/* Ações */}
        <div className="flex flex-none items-center justify-between gap-5 border-t border-cream/10 bg-smoke px-[22px] py-3.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-hot="1"
              onClick={onEdit}
              className="flex items-center gap-2 border border-cream/20 px-3 py-2 text-[13px] text-cream outline-none hover:border-paper hover:text-paper"
            >
              <i className="ri-pencil-line text-[15px]" />
              <span>Editar</span>
            </button>
            <button type="button" data-hot="1" onClick={onDelete} className="flex px-2.5 py-2 text-cream/40 outline-none hover:text-paper">
              <i className="ri-delete-bin-line text-base" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-hot="1"
              onClick={onCopy}
              className="flex items-center gap-2 border border-cream/24 px-4 py-2.5 text-[13px] font-medium text-cream outline-none hover:border-paper hover:text-paper"
            >
              <i className="ri-file-copy-line text-[15px]" />
              <span>Copiar prompt</span>
            </button>
            <button
              type="button"
              data-hot="1"
              onClick={onDownload}
              disabled={!image}
              className="flex items-center gap-2 bg-paper px-4 py-2.5 text-[13px] font-semibold text-ink outline-none hover:bg-cream disabled:opacity-40"
            >
              <i className="ri-arrow-down-line text-[15px]" />
              <span>Baixar imagem</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
