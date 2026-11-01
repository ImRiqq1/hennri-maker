import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useHelperStatus } from '../../lib/trilhas'
import type { HelperStatus } from '../../lib/types'
import { cn } from '../../lib/utils'
import { HelperConnect } from '../HelperConnect'
import { PageHeader } from '../PageHeader'
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog'

const TABS = [
  { to: '/trilhas', label: 'Biblioteca', icon: 'ri-album-line' },
  { to: '/trilhas/baixar', label: 'Baixar música', icon: 'ri-download-2-line' },
  { to: '/trilhas/separar', label: 'Remover voz', icon: 'ri-scissors-cut-line' },
  { to: '/trilhas/melhorar', label: 'Melhorar voz', icon: 'ri-mic-2-line' },
]

/** Link com a mesma cara do <Chip> (fica dentro de um grupo de pílulas). */
export function ChipLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'press inline-flex h-9 items-center gap-2 rounded-[var(--r-control)] px-4 text-[13px] font-medium outline-none transition-[background-color,color] duration-300 ease-apple',
        'focus-visible:ring-4 focus-visible:ring-ice-200',
        active
          ? 'bg-[var(--chip-active-bg)] text-[var(--chip-active-text)] shadow-[0_6px_14px_-8px_rgb(4_26_33/0.7)]'
          : 'text-[var(--chip-text)] hover:bg-[var(--chip-hover-bg)] hover:text-[var(--chip-text-hover)]',
      )}
    >
      {children}
    </Link>
  )
}

/** Pílula "Ajudante online · RTX 5060" / "Ajudante desligado" (abre o passo a passo pra conectar). */
export function HelperPill({ status }: { status: HelperStatus | null }) {
  const [open, setOpen] = useState(false)
  const online = !!status?.online
  const label = !status
    ? 'Procurando o ajudante…'
    : online
      ? `Ajudante online${status.info?.gpu ? ` · ${status.info.gpu.replace(/^NVIDIA (GeForce )?/, '')}` : ''}`
      : status.paired
        ? 'Ajudante desligado'
        : 'Conectar o ajudante do PC'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={online ? 'O PC está pronto pra baixar e separar' : 'Abra o ajudante no seu PC'}
        className={cn(
          'press flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ice-200',
          online ? 'border-success/30 bg-success/10 text-success' : 'border-mist-200 bg-surface text-sub hover:text-fg',
        )}
      >
        <span className={cn('relative flex h-2 w-2', online && 'animate-pulse')}>
          <span className={cn('h-2 w-2 rounded-full', online ? 'bg-success' : status?.paired ? 'bg-warning' : 'bg-mist-400')} />
        </span>
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[440px] gap-0 border-0 p-5 text-white sm:max-w-[440px]"
          style={{ background: 'var(--floating-gradient)' }}
        >
          <DialogTitle className="mb-1 text-[17px] font-medium tracking-[-0.02em] text-white">Ajudante do PC</DialogTitle>
          <p className="mb-4 text-[12.5px] leading-[1.5] text-white/55">
            Baixar música e vídeo, separar e melhorar a voz rodam no seu PC (na placa de vídeo). Você pede pelo site, até
            pelo celular — só precisa do PC ligado com o ajudante aberto.
          </p>
          <HelperConnect />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Topo das páginas de Trilhas: título, sub-menu e status do ajudante. */
export function TrilhasShell({
  count,
  actions,
  children,
}: {
  count: number
  actions?: ReactNode
  children: ReactNode
}) {
  const location = useLocation()
  const status = useHelperStatus()
  return (
    <div className="flex flex-col">
      <PageHeader
        tags={['biblioteca', 'voz separada', 'playlists', 'intenções']}
        title="TRILHAS"
        count={count}
        actions={actions}
      />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-[calc(var(--r-control)+4px)] border border-[var(--chipgroup-border)] bg-[var(--chipgroup-bg)] p-1 shadow-soft">
          {TABS.map((t) => (
            <ChipLink key={t.to} to={t.to} active={location.pathname === t.to}>
              <i className={cn(t.icon, 'text-[15px]')} />
              {t.label}
            </ChipLink>
          ))}
        </div>
        <HelperPill status={status} />
      </div>
      {children}
    </div>
  )
}
