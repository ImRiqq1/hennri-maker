import type { Skill } from '../lib/types'
import { IndexNum } from './IndexNum'

/** Linha de uma skill dentro do card da lista (divisória entre linhas). */
export function SkillRow({ skill, index, onOpen }: { skill: Skill; index: number; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group relative grid min-h-[76px] cursor-pointer grid-cols-[36px_minmax(160px,280px)_minmax(0,1fr)_auto_auto] items-center gap-5 rounded-[22px] px-5 py-4 outline-none transition-colors duration-300 ease-apple hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200 [&+&]:before:absolute [&+&]:before:inset-x-5 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-mist-200 hover:before:opacity-0 [&:hover+&]:before:opacity-0"
    >
      <IndexNum n={index} />
      <span className="min-w-0 truncate text-[15.5px] font-medium tracking-[-0.02em] text-fg">{skill.name}</span>
      <span className="line-clamp-2 min-w-0 text-[13.5px] leading-snug text-sub">{skill.description}</span>
      <span className="rounded-full bg-ice-100 px-3 py-1 text-[12px] font-medium whitespace-nowrap text-abyss-600">
        {skill.category}
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-mist-200 text-abyss-700 transition-[background-color,color,border-color] duration-300 group-hover:border-abyss-950 group-hover:bg-abyss-950 group-hover:text-white">
        <i className="ri-arrow-right-up-line text-[16px]" />
      </span>
    </div>
  )
}
