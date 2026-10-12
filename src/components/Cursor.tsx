import { useEffect, useRef } from 'react'

/**
 * Cursor customizado: bolinha que vira anel sobre elementos com `data-hot`
 * e fica escura sobre áreas com `data-invert`.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.transitionDuration = '1ms'
    }
    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
    }
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const hot = target.closest?.('[data-hot]')
      const color = target.closest?.('[data-invert]') ? '#09090B' : '#FFFFFF'
      el.style.borderColor = color
      if (hot) {
        el.style.width = '30px'
        el.style.height = '30px'
        el.style.margin = '-15px 0 0 -15px'
        el.style.background = 'transparent'
      } else {
        el.style.width = '8px'
        el.style.height = '8px'
        el.style.margin = '-4px 0 0 -4px'
        el.style.background = color
      }
    }
    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[9999] -m-1 h-2 w-2 rounded-full border border-paper bg-paper transition-[width,height,margin,background-color,border-color] duration-150 ease-out"
    />
  )
}
