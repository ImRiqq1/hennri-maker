import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const ToastContext = createContext<{ flash: (msg: string) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}

export function ToastProvider({ children, sidebarCollapsed }: { children: ReactNode; sidebarCollapsed: boolean }) {
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
          className="fixed bottom-6 z-[600] border border-cream/16 bg-smoke px-4 py-2.5 font-mono text-[10.5px] tracking-[0.14em] text-cream uppercase"
          style={{ left: sidebarCollapsed ? 88 : 264 }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
