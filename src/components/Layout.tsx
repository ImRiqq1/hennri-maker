import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDesign } from '../lib/design'
import { AbyssShell } from './shells/AbyssShell'
import { CommandShell } from './shells/CommandShell'
import { WorkspaceShell } from './shells/WorkspaceShell'
import { ToastProvider } from './Toast'

/** Páginas onde Ctrl N abre o modal de "novo item" (via ?new=1). */
function supportsNew(pathname: string) {
  return pathname === '/prompts' || pathname === '/skills' || pathname.startsWith('/referencias') || pathname === '/cursos'
}

/** Estrutura das páginas: escolhe a "casca" (navegação + moldura) do design system ativo. */
export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { design } = useDesign()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || (e.key !== 'n' && e.key !== 'N') || !supportsNew(location.pathname)) return
      e.preventDefault()
      const params = new URLSearchParams(location.search)
      params.set('new', '1')
      navigate({ pathname: location.pathname, search: `?${params.toString()}` })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [location.pathname, location.search, navigate])

  // volta pro topo ao trocar de página
  useEffect(() => {
    document.getElementById('page-scroll')?.scrollTo({ top: 0 })
  }, [location.pathname])

  const Shell = design === 'workspace' ? WorkspaceShell : design === 'command' ? CommandShell : AbyssShell

  return (
    <ToastProvider>
      <Shell>
        <Outlet />
      </Shell>
    </ToastProvider>
  )
}
