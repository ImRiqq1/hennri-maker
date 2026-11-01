import { api } from './api'

/** Itens do menu principal (usados pelos três design systems). */
export const NAV = [
  { to: '/', label: 'Início', icon: 'ri-home-5-line', activeIcon: 'ri-home-5-fill', match: '/' },
  { to: '/prompts', label: 'Prompts', icon: 'ri-sparkling-2-line', activeIcon: 'ri-sparkling-2-fill', match: '/prompts' },
  { to: '/skills', label: 'Skills', icon: 'ri-stack-line', activeIcon: 'ri-stack-fill', match: '/skills' },
  {
    to: '/referencias/camera',
    label: 'Referências',
    icon: 'ri-camera-lens-line',
    activeIcon: 'ri-camera-lens-fill',
    match: '/referencias',
  },
  { to: '/cursos', label: 'Cursos', icon: 'ri-graduation-cap-line', activeIcon: 'ri-graduation-cap-fill', match: '/cursos' },
]

export function isNavActive(pathname: string, match: string) {
  return match === '/' ? pathname === '/' : pathname.startsWith(match)
}

export async function logout() {
  await api.post('/auth/logout').catch(() => {})
  window.location.href = '/login'
}
