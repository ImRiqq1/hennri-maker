import { fileUrl } from '../lib/api'
import { REFERENCE_TABS } from '../lib/constants'
import { indexLabel } from '../lib/format'
import type { Reference } from '../lib/types'
import { FIELD_LABEL } from './EditorPanel'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

export function ReferenceViewer({
  reference,
  index,
  onClose,
  onCopy,
}: {
  reference: Reference | null
  index: number
  onClose: () => void
  onCopy: () => void
}) {
  if (!reference) return null
  const media = fileUrl(reference.media_key)
  const tabLabel = REFERENCE_TABS.find((t) => t.id === reference.tab)?.label ?? reference.tab

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[88vh] w-[min(1000px,calc(100%-2rem))] max-w-none flex-col sm:max-w-none gap-0 overflow-y-auto rounded-none border border-cream/14 bg-smoke p-0 ring-0"
      >
        <DialogTitle className="sr-only">{reference.name}</DialogTitle>
        <div className="flex flex-none items-center justify-between gap-6 border-b border-cream/10 px-[22px] py-4">
          <div className="flex items-center gap-3.5 font-mono text-[10px] tracking-[0.14em] text-cream/55 uppercase">
            <span>{tabLabel}</span>
            <span className="text-cream/25">/</span>
            <span>{reference.family}</span>
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

        <div className="bg-ink p-6">
          {media ? (
            <img src={media} alt={reference.name} className="aspect-video w-full border border-cream/10 object-cover" />
          ) : (
            <div className="flex aspect-video flex-col justify-end border border-cream/10 bg-[#101013] p-4">
              <span className="font-mono text-[10px] tracking-[0.14em] text-cream/30 uppercase">[vídeo 16:9]</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5.5 px-7 pt-[26px] pb-[30px]">
          <span className="text-[22px] font-semibold tracking-[-0.02em] text-paper">{reference.name}</span>
          {reference.description && (
            <span className="text-[14.5px] leading-[1.6] text-white/85">{reference.description}</span>
          )}
          <div className="flex flex-col gap-2.5">
            <span className={FIELD_LABEL}>termo</span>
            <div className="flex items-center justify-between gap-5 border border-cream/12 bg-[#101013] px-4.5 py-4">
              <span className="font-mono text-[13px] leading-snug break-words text-cream">{reference.term}</span>
              <button
                type="button"
                data-hot="1"
                onClick={onCopy}
                className="flex flex-none items-center gap-2 bg-paper px-3.5 py-2.5 text-[12.5px] font-semibold whitespace-nowrap text-ink outline-none hover:bg-cream"
              >
                <i className="ri-file-copy-line text-sm" />
                <span>Copiar termo</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
