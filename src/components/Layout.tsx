import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ToastProvider } from './Toast'
import { TopBar } from './TopBar'

/** Páginas onde Ctrl N abre o modal de "novo item" (via ?new=1). */
function supportsNew(pathname: string) {
  return pathname === '/prompts' || pathname === '/skills' || pathname.startsWith('/referencias') || pathname === '/cursos'
}

/**
 * Moldura Abyss com o menu em cima e o painel claro do conteúdo embaixo.
 * A aba com o logo (canto superior esquerdo) é o próprio painel subindo pra dentro da moldura.
 */
export function Layout() {
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

  // volta pro topo ao trocar de página
  useEffect(() => {
    document.getElementById('page-scroll')?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <ToastProvider>
      <div
        className="relative flex h-screen flex-col overflow-hidden px-3 pb-3 text-fg"
        style={{ background: 'var(--hero-gradient)' }}
      >
        {/* luz Ice difusa atrás do menu */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/3 h-80 w-[640px] rounded-full opacity-35 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(79,170,194,0.55), transparent)' }}
        />

        <TopBar />

        <main className="relative z-[1] min-h-0 flex-1 overflow-hidden rounded-[32px] rounded-tl-none bg-canvas shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)]">
          <div id="page-scroll" className="h-full overflow-x-hidden overflow-y-auto">
            <div className="mx-auto w-full max-w-[1520px] px-10 pt-9 pb-20">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
