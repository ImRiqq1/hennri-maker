import type { ReactNode } from 'react'

/** Cabeçalho das páginas de listagem: título grande e fino com contador, etiquetas e ações à direita. */
export function PageHeader({
  tags,
  title,
  count,
  actions,
}: {
  tags: string[]
  title: string
  count: number
  actions?: ReactNode
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-start gap-3">
          <h1 className="font-display text-[clamp(52px,5.6vw,84px)] leading-[0.92] font-light tracking-[-0.05em] text-fg capitalize">
            {title.toLowerCase()}
          </h1>
          <span className="tnum mt-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2.5 text-[13px] font-medium text-primary-foreground">
            {count}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-mist-200 bg-surface px-3 py-1 text-[12px] text-sub first-letter:uppercase"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-none items-center gap-3">{actions}</div>
    </div>
  )
}

/** Estado vazio: ícone suave + mensagem e botão, dentro de um card. */
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action: ReactNode
  tracking?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-[32px] border border-dashed border-mist-300 bg-surface/60 px-6 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-abyss-600 shadow-soft">
        <i className="ri-inbox-2-line text-[26px]" />
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="text-[22px] font-light tracking-[-0.03em] text-fg capitalize">{title.toLowerCase()}</span>
        <span className="text-[14px] text-sub">{message}</span>
      </div>
      {action}
    </div>
  )
}

/** Atalho de teclado em forma de tecla. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-mist-200 bg-surface px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-sub">
      {children}
    </kbd>
  )
}

/** Grupo segmentado de pílulas (filtros), no estilo de uma barra única. */
export function ChipGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        'flex flex-wrap items-center gap-1 rounded-[24px] border border-mist-200 bg-surface p-1 shadow-soft ' + (className ?? '')
      }
    >
      {children}
    </div>
  )
}

/** Botão redondo só com ícone (ferramentas das páginas). */
export function IconButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: string
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={
        'flex h-10 w-10 flex-none items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ice-200 disabled:opacity-30 ' +
        (active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-mist-200 bg-surface text-abyss-700 hover:border-mist-300 hover:bg-mist-50')
      }
    >
      <i className={`${icon} text-[16px]`} />
    </button>
  )
}
