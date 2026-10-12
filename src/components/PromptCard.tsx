import { fileUrl } from '../lib/api'
import type { Prompt } from '../lib/types'
import { HoverGlow } from './HoverGlow'
import { IndexNum } from './IndexNum'

export function PromptCard({
  prompt,
  index,
  onOpen,
  onCopy,
  onDownload,
}: {
  prompt: Prompt
  index: number
  onOpen: () => void
  onCopy: () => void
  onDownload: () => void
}) {
  const image = fileUrl(prompt.image_key)
  return (
    <div
      data-hot="1"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group relative aspect-3/4 cursor-none overflow-hidden border border-cream/12 bg-[#101013] outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-paper"
    >
      {image ? (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-end justify-between p-3.5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-cream/42 uppercase">sem imagem ainda</span>
          <div className="flex -skew-x-[20deg] gap-[3px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[11px] w-1 bg-cream/35" />
            ))}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-ink opacity-0 transition-opacity duration-180 group-hover:opacity-65 group-focus-visible:opacity-65" />
      <HoverGlow className="inset-x-0 bottom-0 h-[78%]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/85 to-transparent" />
      <span className="absolute top-3.5 right-3.5 left-3.5 line-clamp-3 max-h-13 text-[13.5px] leading-tight font-semibold tracking-[-0.01em] text-paper">
        {prompt.title}
      </span>
      <IndexNum
        n={index}
        className="absolute right-3.5 bottom-3.5 text-white/75 opacity-100 transition-opacity duration-180 group-hover:opacity-0"
      />
      <div className="pointer-events-none absolute inset-0 flex scale-90 items-center justify-center gap-3 opacity-0 transition-[opacity,transform] duration-180 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:scale-100 group-focus-visible:opacity-100">
        <button
          type="button"
          data-hot="1"
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
          disabled={!image}
          className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-cream/30 bg-smoke/80 text-paper outline-none hover:border-paper hover:bg-paper hover:text-ink disabled:opacity-40"
        >
          <i className="ri-arrow-down-line text-lg" />
        </button>
        <button
          type="button"
          data-hot="1"
          onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
          className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-cream/30 bg-smoke/80 text-paper outline-none hover:border-paper hover:bg-paper hover:text-ink"
        >
          <i className="ri-file-copy-line text-[17px]" />
        </button>
      </div>
    </div>
  )
}
