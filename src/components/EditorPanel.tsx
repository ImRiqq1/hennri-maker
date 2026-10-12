import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'

export const PANEL_CLASS =
  'w-[520px] max-w-[520px] gap-0 rounded-none border-l border-cream/14 bg-smoke p-0 sm:max-w-[520px]'

export const PANEL_CLASS_COMPACT =
  'w-[480px] max-w-[480px] gap-0 rounded-none border-l border-cream/14 bg-smoke p-0 sm:max-w-[480px]'

export const FIELD_LABEL = 'font-mono text-[10px] tracking-[0.16em] text-cream/45 uppercase'

/** Painel lateral padrão dos formulários: título + X em cima, Cancelar/Salvar embaixo. */
export function EditorPanel({
  open,
  title,
  onClose,
  onSave,
  saveDisabled,
  saveLabel = 'Salvar',
  compact = false,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  onSave: () => void
  saveDisabled: boolean
  saveLabel?: string
  /** versão mais estreita (480px), usada no "Novo item" dos cursos */
  compact?: boolean
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent showCloseButton={false} className={compact ? PANEL_CLASS_COMPACT : PANEL_CLASS}>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className={cn('flex flex-none items-center justify-between', compact ? 'px-6 py-5' : 'px-[26px] py-[22px]')}>
          <span className="text-[17px] font-semibold tracking-[-0.015em] text-paper">{title}</span>
          <button type="button" data-hot="1" onClick={onClose} className="flex text-cream outline-none hover:text-paper">
            <i className="ri-close-line text-[19px]" />
          </button>
        </div>

        <div
          className={cn(
            'flex flex-1 flex-col overflow-y-auto pb-8',
            compact ? 'gap-6 px-6' : 'gap-7 px-[26px] pt-1',
          )}
        >
          {children}
        </div>

        <div
          className={cn(
            'flex flex-none items-center justify-end gap-4.5 border-t border-cream/10 py-4',
            compact ? 'px-6' : 'px-[26px]',
          )}
        >
          <button type="button" data-hot="1" onClick={onClose} className="text-[13px] text-cream/60 outline-none hover:text-paper">
            Cancelar
          </button>
          <button
            type="button"
            data-hot="1"
            onClick={onSave}
            disabled={saveDisabled}
            className="bg-paper px-5 py-2.5 text-[13px] font-semibold text-ink outline-none hover:bg-cream disabled:opacity-40"
          >
            {saveLabel}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
