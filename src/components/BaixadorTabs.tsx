import { useLocation } from 'react-router-dom'
import { useHelperStatus } from '../lib/trilhas'
import { cn } from '../lib/utils'
import { ChipLink, HelperPill } from './trilhas/TrilhasShell'
import { TargetPicker } from './trilhas/TargetPicker'

const TABS = [
  { to: '/baixador', label: 'Links', icon: 'ri-links-line' },
  { to: '/baixador/drive', label: 'Drive', icon: 'ri-drive-line' },
]

/** Sub-menu do Baixador (links de redes sociais · pastas do Drive) + status do ajudante. */
export function BaixadorTabs({ extra = true }: { extra?: boolean }) {
  const location = useLocation()
  const status = useHelperStatus()
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1 rounded-[calc(var(--r-control)+4px)] border border-[var(--chipgroup-border)] bg-[var(--chipgroup-bg)] p-1 shadow-soft">
        {TABS.map((t) => (
          <ChipLink key={t.to} to={t.to} active={location.pathname === t.to}>
            <i className={cn(t.icon, 'text-[15px]')} />
            {t.label}
          </ChipLink>
        ))}
      </div>
      {extra && (
        <div className="flex flex-wrap items-center gap-2">
          <TargetPicker />
          <HelperPill status={status} />
        </div>
      )}
    </div>
  )
}
