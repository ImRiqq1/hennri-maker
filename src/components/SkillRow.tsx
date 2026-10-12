import type { Skill } from '../lib/types'
import { HoverGlow } from './HoverGlow'
import { IndexNum } from './IndexNum'

export function SkillRow({ skill, index, onOpen }: { skill: Skill; index: number; onOpen: () => void }) {
  return (
    <div
      data-hot="1"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group relative grid min-h-[72px] cursor-none grid-cols-[44px_minmax(160px,280px)_minmax(0,1fr)_auto_auto] items-center gap-4 overflow-hidden border-b border-cream/10 px-5 py-4 pl-[22px] outline-none hover:bg-smoke focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-paper"
    >
      <HoverGlow direction="right" className="inset-y-0 left-0 w-16" />
      <IndexNum n={index} className="relative" />
      <span className="relative min-w-0 truncate font-mono text-[12.5px] font-medium tracking-[0.01em] text-paper">
        {skill.name}
      </span>
      <span className="relative line-clamp-2 min-w-0 text-[13.5px] leading-snug text-cream">{skill.description}</span>
      <span className="relative border border-cream/16 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.12em] whitespace-nowrap text-cream/60 uppercase">
        {skill.category}
      </span>
      <div className="relative flex justify-end opacity-0 transition-opacity duration-180 group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="flex items-center gap-1.5 border border-cream/40 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-paper">
          Ver
        </div>
      </div>
    </div>
  )
}
