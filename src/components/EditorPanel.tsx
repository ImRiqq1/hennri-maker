import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'

/** Painel lateral flutuante (cantos arredondados, solto da borda). */
export const PANEL_CLASS =
  'inset-y-3! right-3! h-auto! w-[520px] max-w-[calc(100vw-24px)] gap-0 rounded-[28px] border border-mist-200 bg-surface p-0 shadow-lift sm:max-w-[520px]'

export const PANEL_CLASS_COMPACT =
  'inset-y-3! right-3! h-auto! w-[480px] max-w-[calc(100vw-24px)] gap-0 rounded-[28px] border border-mist-200 bg-surface p-0 shadow-lift sm:max-w-[480px]'

export const FIELD_LABEL = 'text-[12px] font-medium text-sub'

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
        <div className={cn('flex flex-none items-center justify-between', compact ? 'px-6 pt-6 pb-4' : 'px-7 pt-7 pb-5')}>
          <span className="text-[20px] font-semibold tracking-[-0.02em] text-fg">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-mist-100 text-sub outline-none transition-colors hover:bg-mist-200 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
          >
            <i className="ri-close-line text-[18px]" />
          </button>
        </div>

        <div className={cn('flex flex-1 flex-col overflow-y-auto pb-8', compact ? 'gap-6 px-6' : 'gap-7 px-7 pt-1')}>
          {children}
        </div>

        <div
          className={cn(
            'flex flex-none items-center justify-end gap-2 border-t border-mist-200 py-4',
            compact ? 'px-6' : 'px-7',
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-full px-4 text-[14px] font-medium text-sub outline-none transition-colors hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="h-10 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300 disabled:opacity-35"
          >
            {saveLabel}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
