import { fileUrl } from '../lib/api'
import type { Prompt } from '../lib/types'
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
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-[28px] border border-mist-200 bg-surface p-2 shadow-soft outline-none transition-[transform,box-shadow] duration-500 ease-apple hover:-translate-y-1 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-ice-200"
    >
      <div className="relative aspect-3/4 overflow-hidden rounded-[22px] bg-gradient-to-br from-mist-100 to-ice-100">
        {image ? (
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-[1.05]"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <i className="ri-image-line text-[28px] text-abyss-500/35" />
            <span className="text-[12px] text-sub">Sem imagem ainda</span>
          </div>
        )}

        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-medium text-abyss-700 shadow-soft backdrop-blur">
          {prompt.category}
        </span>

        {/* ações reveladas no hover */}
        <div className="absolute right-3 bottom-3 flex translate-y-1 gap-2 opacity-0 transition-[opacity,transform] duration-300 ease-apple group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            title="Baixar imagem"
            aria-label="Baixar imagem"
            onClick={(e) => {
              e.stopPropagation()
              onDownload()
            }}
            disabled={!image}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-abyss-950 shadow-soft outline-none backdrop-blur transition-colors hover:bg-white focus-visible:ring-4 focus-visible:ring-ice-300 disabled:opacity-40"
          >
            <i className="ri-arrow-down-line text-[17px]" />
          </button>
          <button
            type="button"
            title="Copiar prompt"
            aria-label="Copiar prompt"
            onClick={(e) => {
              e.stopPropagation()
              onCopy()
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-abyss-950 text-white shadow-soft outline-none transition-colors hover:bg-abyss-800 focus-visible:ring-4 focus-visible:ring-ice-300"
          >
            <i className="ri-file-copy-line text-[16px]" />
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 px-3 pt-3.5 pb-2.5">
        <span className="line-clamp-2 text-[15.5px] leading-[1.25] font-medium tracking-[-0.02em] text-fg">
          {prompt.title}
        </span>
        <IndexNum n={index} className="mt-0.5 flex-none" />
      </div>
    </div>
  )
}
