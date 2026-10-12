import type { ReactNode } from 'react'
import { Bars } from './Bars'

/** Cabeçalho das páginas de listagem: tags, "///", título gigante com contador e ações à direita. */
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
    <>
      <div className="mb-6.5 flex flex-wrap gap-4.5 font-mono text-[10px] tracking-[0.16em] text-cream/40 uppercase">
        {tags.map((t) => (
          <span key={t}>[{t}]</span>
        ))}
      </div>
      <Bars className="mb-4.5" />
      <div className="mb-9 flex items-end justify-between gap-8">
        <div className="flex min-w-0 flex-1 items-end gap-4.5">
          <span className="font-condensed text-[clamp(120px,15.5vw,300px)] leading-[0.76] tracking-[-0.065em] text-paper uppercase">
            {title}
          </span>
          <span className="pb-3.5 font-mono text-[11px] tracking-[0.14em] text-cream/45">
            /{String(count).padStart(3, '0')}
          </span>
        </div>
        <div className="flex flex-none items-center gap-3.5 pb-3.5">{actions}</div>
      </div>
    </>
  )
}

/** Estado vazio: título gigante apagado no fundo + mensagem e botão. */
export function EmptyState({
  title,
  message,
  action,
  tracking = '-0.065em',
}: {
  title: string
  message: string
  action: ReactNode
  tracking?: string
}) {
  return (
    <div className="relative px-0 py-10 pb-[120px]">
      <div
        className="font-condensed text-[17vw] leading-[0.8] text-paper uppercase opacity-15"
        style={{ letterSpacing: tracking }}
      >
        {title}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        <span className="text-[15px] text-cream">{message}</span>
        {action}
      </div>
    </div>
  )
}
