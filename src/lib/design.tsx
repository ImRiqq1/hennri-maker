// Design system do site (estrutura, navegação e componentes) + cores.
// As escolhas ficam salvas só neste navegador (localStorage); o index.html aplica antes do React carregar.

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { applyTheme, getTheme, type ThemeId } from './theme'

export type DesignId = 'abyss' | 'workspace' | 'command'

export const DESIGNS: { id: DesignId; label: string; description: string }[] = [
  { id: 'abyss', label: 'Abyss', description: 'Moldura escura, aba com o logo e menu em pílulas' },
  { id: 'workspace', label: 'Workspace', description: 'Barra lateral de ícones, widgets e saudação' },
  { id: 'command', label: 'Command', description: 'Painel de controle escuro com números e filtros' },
]

const KEY = 'hm-design'

export function getDesign(): DesignId {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && DESIGNS.some((d) => d.id === saved)) return saved as DesignId
  } catch {}
  return 'abyss'
}

/** As cores (Abyss/Claro/Escuro) só valem no design system Abyss; os outros têm cores próprias. */
function applyDesignAttrs(design: DesignId, theme: ThemeId) {
  const root = document.documentElement
  root.setAttribute('data-ds', design)
  applyTheme(design === 'abyss' ? theme : 'abyss', design === 'abyss')
}

const DesignContext = createContext<{
  design: DesignId
  theme: ThemeId
  setDesign: (d: DesignId) => void
  setTheme: (t: ThemeId) => void
} | null>(null)

export function DesignProvider({ children }: { children: ReactNode }) {
  const [design, setDesignState] = useState<DesignId>(getDesign)
  const [theme, setThemeState] = useState<ThemeId>(getTheme)

  const setDesign = useCallback(
    (d: DesignId) => {
      try {
        localStorage.setItem(KEY, d)
      } catch {}
      applyDesignAttrs(d, theme)
      setDesignState(d)
    },
    [theme],
  )

  const setTheme = useCallback(
    (t: ThemeId) => {
      applyTheme(t)
      setThemeState(t)
    },
    [],
  )

  return <DesignContext.Provider value={{ design, theme, setDesign, setTheme }}>{children}</DesignContext.Provider>
}

export function useDesign() {
  const ctx = useContext(DesignContext)
  if (!ctx) throw new Error('useDesign precisa estar dentro de <DesignProvider>')
  return ctx
}
