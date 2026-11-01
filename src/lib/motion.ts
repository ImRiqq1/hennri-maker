import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Do 4º bloco da página em diante, cada um aparece quando entra na tela (ver .page-enter no index.css).
 * Observa também os blocos que surgem depois (dados carregando).
 */
export function useScrollReveal(key: string) {
  useEffect(() => {
    const root = document.getElementById('page-scroll')
    const page = root?.querySelector('.page-enter > *')
    if (!root || !page) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { root, rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    )
    const watch = () => {
      Array.from(page.children)
        .slice(3)
        .forEach((el) => !el.classList.contains('in') && io.observe(el))
    }
    watch()
    const mo = new MutationObserver(watch)
    mo.observe(page, { childList: true })
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [key])
}

/**
 * Pílula que desliza até o item ativo de um menu.
 * Os itens do menu precisam de `data-nav-key`; devolve o estilo do indicador.
 */
export function useSlidingIndicator(
  containerRef: RefObject<HTMLElement | null>,
  activeKey: string,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 })
  const ready = useRef(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const measure = () => {
      const el = container.querySelector<HTMLElement>(`[data-nav-key="${CSS.escape(activeKey)}"]`)
      if (!el) return setStyle({ opacity: 0 })
      const next: CSSProperties = {
        width: el.offsetWidth,
        height: el.offsetHeight,
        transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`,
      }
      // até a fonte carregar a pílula só se posiciona; depois disso ela desliza
      setStyle({ ...next, opacity: 1, transition: ready.current ? undefined : 'none' })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(container)
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    fontsReady
      .then(() => {
        measure()
        requestAnimationFrame(() => (ready.current = true))
      })
      .catch(() => (ready.current = true))
    return () => ro.disconnect()
  }, [containerRef, activeKey])

  return style
}

/** Número que conta do valor anterior até o novo (expo-out). */
export function useCountUp(value: number, ms = 1100) {
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0)
  const from = useRef(shown)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value)
      return
    }
    const start = from.current
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      const v = Math.round(start + (value - start) * eased)
      from.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])

  return shown
}
