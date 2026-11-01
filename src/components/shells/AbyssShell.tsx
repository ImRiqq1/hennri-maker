import type { ReactNode } from 'react'
import { TopBar } from '../TopBar'

/**
 * Design system Abyss: moldura com o menu em cima e o painel claro do conteúdo embaixo.
 * A aba com o logo (canto superior esquerdo) é o próprio painel subindo pra dentro da moldura.
 */
export function AbyssShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden px-3 pb-3 text-fg" style={{ background: 'var(--frame-bg)' }}>
      <TopBar />

      <main className="relative z-[1] min-h-0 flex-1 overflow-hidden rounded-[32px] rounded-tl-none bg-canvas shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)]">
        <div id="page-scroll" className="h-full overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full max-w-[1520px] px-10 pt-9 pb-20">{children}</div>
        </div>
      </main>
    </div>
  )
}
