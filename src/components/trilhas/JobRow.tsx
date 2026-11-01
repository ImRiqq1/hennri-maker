import type { ReactNode } from 'react'
import { formatRelative } from '../../lib/format'
import { cancelJob, isActive, removeJob } from '../../lib/trilhas'
import type { Job } from '../../lib/types'
import { cn } from '../../lib/utils'

const STATUS: Record<Job['status'], { label: string; tone: string }> = {
  fila: { label: 'Na fila', tone: 'bg-mist-100 text-sub' },
  rodando: { label: 'Rodando', tone: 'bg-ice-100 text-abyss-600' },
  ok: { label: 'Pronto', tone: 'bg-success/12 text-success' },
  erro: { label: 'Erro', tone: 'bg-danger/12 text-danger' },
  cancelado: { label: 'Cancelado', tone: 'bg-mist-100 text-sub' },
}

const HATCH = 'repeating-linear-gradient(-45deg, var(--mist-300) 0 2px, transparent 2px 7px)'

/** Um pedido feito pro ajudante: status, barra de progresso, mensagem, cancelar/limpar. */
export function JobRow({
  job,
  icon,
  title,
  subtitle,
  helperOnline,
  onChange,
  children,
}: {
  job: Job
  icon: string
  title: string
  subtitle?: string
  helperOnline?: boolean
  onChange?: () => void
  children?: ReactNode
}) {
  const st = STATUS[job.status]
  const active = isActive(job)
  const waiting = job.status === 'fila' && helperOnline === false

  return (
    <div className="flex flex-col gap-3 rounded-[var(--r-inner)] border border-mist-200 bg-surface p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 flex-none items-center justify-center rounded-[14px]',
            job.status === 'ok' ? 'bg-success/12 text-success' : job.status === 'erro' ? 'bg-danger/12 text-danger' : 'bg-mist-100 text-abyss-600',
          )}
        >
          <i className={cn(job.status === 'rodando' ? 'ri-loader-4-line animate-spin' : icon, 'text-[18px]')} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] font-medium text-fg">{title}</span>
          <span className="truncate text-[12px] text-sub">
            {subtitle ? `${subtitle} · ` : ''}
            {formatRelative(job.created_at)}
          </span>
        </div>
        <span className={cn('flex-none rounded-full px-2.5 py-1 text-[11.5px] font-medium', st.tone)}>{st.label}</span>
        {active ? (
          <button
            type="button"
            onClick={async () => {
              await cancelJob(job.id).catch(() => {})
              onChange?.()
            }}
            aria-label="Cancelar"
            title="Cancelar"
            className="press flex h-8 w-8 flex-none items-center justify-center rounded-full text-sub outline-none hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
          >
            <i className="ri-stop-circle-line text-[16px]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              await removeJob(job.id).catch(() => {})
              onChange?.()
            }}
            aria-label="Tirar da lista"
            title="Tirar da lista"
            className="press flex h-8 w-8 flex-none items-center justify-center rounded-full text-sub outline-none hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
          >
            <i className="ri-close-line text-[16px]" />
          </button>
        )}
      </div>

      {active && (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 overflow-hidden rounded-full" style={{ backgroundImage: HATCH }}>
            {job.progress != null ? (
              <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-apple" style={{ width: `${Math.max(3, job.progress)}%` }} />
            ) : (
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
            )}
          </div>
          <span className="truncate text-[12px] text-sub">
            {waiting ? 'Esperando o ajudante do PC ligar…' : job.message || (job.status === 'fila' ? 'Na fila…' : 'Trabalhando…')}
            {job.progress != null && job.status === 'rodando' ? ` · ${Math.round(job.progress)}%` : ''}
          </span>
        </div>
      )}
      {job.status === 'erro' && job.message && (
        <span className="flex items-start gap-1.5 rounded-[12px] bg-danger/8 px-3 py-2 text-[12.5px] text-danger">
          <i className="ri-error-warning-line mt-px" />
          {job.message}
        </span>
      )}
      {children}
    </div>
  )
}
