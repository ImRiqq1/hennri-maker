import { indexLabel } from '../lib/format'
import type { Skill } from '../lib/types'
import { FIELD_LABEL, PANEL_CLASS } from './EditorPanel'
import { Kbd } from './PageHeader'
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

            {/* cabeçalho Abyss */}
            <div
              className="relative m-2 mb-0 flex flex-none flex-col gap-6 overflow-hidden rounded-[var(--r-inner)] p-6 text-white"
              style={{ background: 'var(--hero-gradient)' }}
            >
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="tnum rounded-full border border-white/12 bg-white/[0.07] px-2.5 py-1 text-[11.5px] font-medium text-white/70">
                    {indexLabel(index, 2)}
                  </span>
                  <span className="rounded-full bg-ice-400 px-3 py-1 text-[12px] font-medium text-abyss-950">
                    {skill.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/14 text-white/75 outline-none transition-colors hover:bg-white hover:text-fg focus-visible:ring-2 focus-visible:ring-ice-400"
                >
                  <i className="ri-close-line text-[18px]" />
                </button>
              </div>
              <span className="relative text-[30px] leading-[1.05] font-light tracking-[-0.04em] break-words">{skill.name}</span>
            </div>

            <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-7 py-7">
              <div className="flex flex-col gap-2.5">
                <span className={FIELD_LABEL}>O que faz</span>
                <span className="text-[15px] leading-[1.6] text-fg">{skill.description}</span>
              </div>

              {triggers.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className={FIELD_LABEL}>Quando dispara</span>
                  <div className="flex flex-col gap-1.5">
                    {triggers.map((t, i) => (
                      <div key={i} className="flex items-baseline gap-3 rounded-2xl bg-mist-100 px-4 py-3">
                        <i className="ri-flashlight-line flex-none text-[13px] text-abyss-500" />
                        <span className="text-[13.5px] leading-snug text-abyss-700">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {related.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className={FIELD_LABEL}>Combina com</span>
                  <div className="flex flex-wrap gap-1.5">
                    {related.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onOpenRelated(r.id)}
                        className="flex items-center gap-1.5 rounded-full border border-mist-200 bg-surface py-1.5 pr-3.5 pl-3 text-[13px] font-medium text-abyss-700 outline-none transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-4 focus-visible:ring-ice-200"
                      >
                        <i className="ri-stack-line text-[13px]" />
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-none items-center justify-between gap-2 border-t border-mist-200 px-7 py-4">
              <span className="flex items-center gap-2 text-[12px] text-sub">
                <Kbd>Esc</Kbd> fecha
              </span>
              <button
                type="button"
                onClick={onCopyName}
                className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300"
              >
                <i className="ri-file-copy-line text-[15px] text-ice-300" />
                <span>Copiar nome</span>
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
