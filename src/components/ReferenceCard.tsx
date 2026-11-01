import { fileUrl } from '../lib/api'
import type { Reference } from '../lib/types'
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
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[28px] border border-mist-200 bg-surface p-2 shadow-soft outline-none transition-[transform,box-shadow] duration-500 ease-apple hover:-translate-y-1 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-ice-200"
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-mist-100 to-ice-100">
        {media ? (
          <img
            src={media}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-[1.05]"
          />
        ) : (
          <i className="ri-film-line text-[30px] text-abyss-500/35" />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 shadow-soft backdrop-blur">
          <IndexNum n={index} className="text-abyss-600" />
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
          className="absolute right-3 bottom-3 flex h-10 translate-y-1 items-center gap-2 rounded-full bg-abyss-950 px-4 text-[13px] font-medium whitespace-nowrap text-white opacity-0 shadow-float outline-none transition-[opacity,transform,background-color] duration-300 ease-apple group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 hover:bg-abyss-800 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ice-400"
        >
          <i className="ri-file-copy-line text-[15px] text-ice-300" />
          <span>Copiar termo</span>
        </button>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 px-3 pt-4 pb-3">
        <span className="truncate text-[15.5px] font-medium tracking-[-0.02em] text-fg">{reference.name}</span>
        <span className="self-start truncate rounded-full bg-ice-100 px-2.5 py-1 font-code text-[11.5px] text-abyss-600 max-w-full">
          {reference.term}
        </span>
        {reference.description && <span className="truncate text-[12.5px] text-sub">{reference.description}</span>}
      </div>
    </div>
  )
}
