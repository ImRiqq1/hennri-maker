// Aparência do site. A escolha fica salva só neste navegador (localStorage).
// O index.html aplica o tema salvo antes do React carregar, pra não piscar.

export type ThemeId = 'abyss' | 'claro' | 'escuro'

export const THEMES: { id: ThemeId; label: string; description: string; frame: string; panel: string; accent: string }[] = [
  { id: 'abyss', label: 'Abyss', description: 'Moldura escura, conteúdo claro', frame: '#072630', panel: '#F2F4F5', accent: '#041A21' },
  { id: 'claro', label: 'Claro', description: 'Tudo claro e arejado', frame: '#E4E9EC', panel: '#FFFFFF', accent: '#041A21' },
  { id: 'escuro', label: 'Escuro', description: 'Grafite com destaques Ice', frame: '#111315', panel: '#1F2326', accent: '#86CBDD' },
]

const KEY = 'hm-theme'

export function getTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && THEMES.some((t) => t.id === saved)) return saved as ThemeId
  } catch {}
  return 'abyss'
}

export function applyTheme(id: ThemeId) {
  const root = document.documentElement
  if (id === 'abyss') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', id)
  try {
    localStorage.setItem(KEY, id)
  } catch {}
}
