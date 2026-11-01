import { PLATFORM_ICON, PLATFORM_LABEL, isOnline, parseJSON, useHelpers, useTarget } from '../../lib/trilhas'
import type { HelperInfo } from '../../lib/types'
import { Dropdown } from '../Dropdown'

/**
 * "Rodar em": escolhe em qual computador (PC ou Mac) os pedidos vão rodar.
 * Só aparece quando tem mais de um computador conectado.
 */
export function TargetPicker({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const pcs = useHelpers()
  const [target, setTarget] = useTarget(pcs)
  if (pcs.length < 2) return null

  const options = [
    { value: '', label: 'Qualquer computador', icon: 'ri-computer-line' },
    ...pcs.map((pc) => {
      const info = parseJSON<HelperInfo | null>(pc.info, null)
      const platform = pc.platform ?? info?.platform ?? 'windows'
      const name = info?.hostname || pc.name
      return {
        value: pc.id,
        label: `${name} · ${PLATFORM_LABEL[platform] ?? platform}${isOnline(pc) ? '' : ' (desligado)'}`,
        icon: PLATFORM_ICON[platform] ?? 'ri-computer-line',
      }
    }),
  ]

  return (
    <Dropdown
      value={target}
      options={options}
      onChange={setTarget}
      label="Rodar em qual computador"
      icon="ri-cpu-line"
      tone={tone}
      alignRight
    />
  )
}
