import { fileUrl } from '../lib/api'
import { REFERENCE_TABS } from '../lib/constants'
import { indexLabel } from '../lib/format'
import type { Reference } from '../lib/types'
import { FIELD_LABEL } from './EditorPanel'
import { Kbd } from './PageHeader'
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
        className="grid max-h-[88vh] w-[min(1080px,calc(100%-2rem))] max-w-none grid-cols-1 gap-0 overflow-hidden rounded-[32px] border border-mist-200 bg-surface p-0 ring-0 sm:max-w-none md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
      >
        <DialogTitle className="sr-only">{reference.name}</DialogTitle>

        {/* mídia */}
        <div className="flex items-center bg-mist-100 p-3">
          {media ? (
            <img src={media} alt={reference.name} className="aspect-video w-full rounded-[22px] object-cover" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-[22px] bg-gradient-to-br from-mist-100 to-ice-100">
              <i className="ri-film-line text-[34px] text-abyss-500/35" />
            </div>
          )}
        </div>

        {/* detalhes */}
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <div className="flex flex-none items-center justify-between gap-4 px-7 pt-6">
            <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
              <span className="rounded-full bg-ice-100 px-2.5 py-1 font-medium text-abyss-600">{tabLabel}</span>
              <span className="rounded-full border border-mist-200 px-2.5 py-1 text-sub lowercase first-letter:uppercase">
                {reference.family}
              </span>
              <span className="tnum px-1 text-mist-400">{indexLabel(index, 2)}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Kbd>Esc</Kbd>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-mist-100 text-sub outline-none transition-colors hover:bg-mist-200 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
              >
                <i className="ri-close-line text-[18px]" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-5 px-7 pt-6 pb-7">
            <span className="text-[34px] leading-[1.05] font-light tracking-[-0.045em] text-fg">{reference.name}</span>
            {reference.description && (
              <span className="text-[14.5px] leading-[1.6] text-abyss-700">{reference.description}</span>
            )}

            <div className="mt-auto flex flex-col gap-2.5 pt-4">
              <span className={FIELD_LABEL}>Termo</span>
              <div
                className="relative flex flex-col gap-5 overflow-hidden rounded-[22px] p-5 text-white"
                style={{ background: 'var(--hero-gradient)' }}
              >
                <span className="relative font-code text-[14px] leading-[1.55] break-words text-ice-300">{reference.term}</span>
                <button
                  type="button"
                  onClick={onCopy}
                  className="relative flex h-10 items-center gap-2 self-start rounded-full bg-white px-4 text-[13.5px] font-medium whitespace-nowrap text-abyss-950 outline-none transition-colors hover:bg-[#eaf7fb] focus-visible:ring-2 focus-visible:ring-ice-400"
                >
                  <i className="ri-file-copy-line text-[15px] text-abyss-500" />
                  <span>Copiar termo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
