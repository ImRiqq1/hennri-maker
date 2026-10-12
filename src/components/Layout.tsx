import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Cursor } from './Cursor'
import { Sidebar } from './Sidebar'
import { ToastProvider } from './Toast'
import { TopBar } from './TopBar'

/** Páginas onde Ctrl N abre o modal de "novo item" (via ?new=1). */
function supportsNew(pathname: string) {
  return pathname === '/prompts' || pathname === '/skills' || pathname.startsWith('/referencias') || pathname === '/cursos'
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

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

  return (
    <ToastProvider sidebarCollapsed={collapsed}>
      <div className="flex h-screen overflow-hidden bg-ink text-paper">
        <Cursor />
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        <main className="relative z-[1] flex-1 overflow-x-hidden overflow-y-auto px-12 pt-7 pb-18">
          <TopBar />
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
