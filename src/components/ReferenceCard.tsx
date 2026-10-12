import { fileUrl } from '../lib/api'
import type { Reference } from '../lib/types'
import { HoverGlow } from './HoverGlow'
import { IndexNum } from './IndexNum'

export function ReferenceCard({
  reference,
  index,
  onOpen,
  onCopy,
}: {
  reference: Reference
  index: number
  onOpen: () => void
  onCopy: () => void
}) {
  const media = fileUrl(reference.media_key)
  return (
    <div
      data-hot="1"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group relative aspect-video cursor-none overflow-hidden border border-cream/12 bg-[#101013] outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-paper"
    >
      {media ? (
        <img src={media} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-start justify-between p-3.5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-cream/28 uppercase">[vídeo 16:9]</span>
          <IndexNum n={index} className="text-cream/35" />
        </div>
      )}
      {media && <IndexNum n={index} className="absolute top-3.5 right-3.5 text-cream/60" />}
      <HoverGlow className="inset-x-0 bottom-0 h-4/5" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[110px] bg-gradient-to-t from-ink/90 to-transparent" />
      <div className="absolute right-3.5 bottom-[13px] left-3.5 flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-paper">{reference.name}</span>
        <span className="truncate font-mono text-[11px] tracking-[0.02em] text-cream">{reference.term}</span>
        {reference.description && <span className="truncate text-[11.5px] text-cream/60">{reference.description}</span>}
      </div>
      <div className="pointer-events-none absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-[opacity,transform] duration-180 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:scale-100 group-focus-visible:opacity-100">
        <button
          type="button"
          data-hot="1"
          onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
          className="flex items-center gap-2 border border-cream/40 bg-smoke/80 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-paper outline-none hover:border-paper hover:bg-paper hover:text-ink"
        >
          <i className="ri-file-copy-line text-[15px]" />
          <span>Copiar termo</span>
        </button>
      </div>
    </div>
  )
}
