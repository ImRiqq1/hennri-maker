import { indexLabel } from '../lib/format'
import type { Skill } from '../lib/types'
import { FIELD_LABEL, PANEL_CLASS } from './EditorPanel'
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'

/** Painel lateral com os detalhes de uma skill. */
export function SkillViewer({
  skill,
  index,
  onClose,
  onCopyName,
  onOpenRelated,
}: {
  skill: Skill | null
  index: number
  onClose: () => void
  onCopyName: () => void
  onOpenRelated: (id: string) => void
}) {
  const triggers: string[] = skill?.triggers ? JSON.parse(skill.triggers) : []
  const related = skill?.related ?? []

  return (
    <Sheet open={!!skill} onOpenChange={(o) => !o && onClose()}>
      <SheetContent showCloseButton={false} className={PANEL_CLASS}>
        {skill && (
          <>
            <SheetTitle className="sr-only">{skill.name}</SheetTitle>
            <div className="flex flex-none items-start justify-between gap-4 border-b border-cream/10 px-[26px] pt-6 pb-5">
              <div className="flex min-w-0 flex-col gap-2.5">
                <span className="font-mono text-[10px] tracking-[0.14em] text-cream/40">{indexLabel(index)}</span>
                <span className="font-mono text-base font-medium break-words text-paper">{skill.name}</span>
                <span className="self-start border border-cream/16 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.12em] text-cream/60 uppercase">
                  {skill.category}
                </span>
              </div>
              <button type="button" data-hot="1" onClick={onClose} className="flex flex-none text-cream outline-none hover:text-paper">
                <i className="ri-close-line text-[19px]" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-[26px] py-6">
              <div className="flex flex-col gap-2.5">
                <span className={FIELD_LABEL}>o que faz</span>
                <span className="text-sm leading-[1.55] text-white/88">{skill.description}</span>
              </div>

              {triggers.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className={FIELD_LABEL}>quando dispara</span>
                  <div className="flex flex-col gap-1.5">
                    {triggers.map((t, i) => (
                      <div key={i} className="flex items-baseline gap-2.5 border border-cream/8 bg-[#101013] px-2.5 py-2">
                        <span className="flex-none font-mono text-[10px] text-cream/35">›</span>
                        <span className="font-mono text-[11.5px] leading-snug text-cream">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {related.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className={FIELD_LABEL}>combina com</span>
                  <div className="flex flex-wrap gap-1.5">
                    {related.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        data-hot="1"
                        onClick={() => onOpenRelated(r.id)}
                        className="border border-cream/18 px-2.5 py-1.5 font-mono text-[10.5px] text-cream/80 outline-none hover:border-paper hover:text-paper"
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-none items-center justify-end gap-2 border-t border-cream/10 px-[26px] py-4">
              <button
                type="button"
                data-hot="1"
                onClick={onCopyName}
                className="flex items-center gap-2 border border-cream/24 px-4 py-2.5 text-[13px] font-medium text-cream outline-none hover:border-paper hover:text-paper"
              >
                <i className="ri-file-copy-line text-[15px]" />
                <span>Copiar nome</span>
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
