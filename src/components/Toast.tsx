import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const ToastContext = createContext<{ flash: (msg: string) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}

/** Aviso rápido: pílula Graphite flutuando no pé da tela. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const flash = useCallback((msg: string) => {
    setMessage(msg)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(''), 2200)
  }, [])

  return (
    <ToastContext.Provider value={{ flash }}>
      {children}
      {message && (
        <div
          key={message}
          role="status"
          className="fixed left-1/2 z-[600] flex -translate-x-1/2 items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3 text-[13px] font-medium text-white shadow-float animate-in fade-in-0 slide-in-from-bottom-3 duration-300"
          style={{ background: 'var(--floating-gradient)', bottom: 'calc(var(--player-space, 0px) + 28px)' }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
            <i className="ri-check-line text-[13px]" />
          </span>
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
