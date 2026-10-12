import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { SearchResult } from '../lib/types'
import { Bars } from './Bars'

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  prompt: 'prompt',
  skill: 'skill',
  referencia: 'referência',
  aula: 'aula',
}

/** Topo de todas as páginas: tag "#HENNRI_/MAKER" + busca global (Ctrl K). */
export function TopBar() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const t = window.setTimeout(() => {
      api
        .get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`)
        .then((r) => {
          setResults(r)
          setOpen(true)
        })
        .catch(() => setResults([]))
    }, 180)
    return () => window.clearTimeout(t)
  }, [query])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    navigate(href)
  }

  return (
    <div className="mb-14 flex items-center justify-between gap-6">
      <div className="flex items-center gap-4 font-mono text-[11px] tracking-[0.14em] text-cream/45 uppercase">
        <span className="text-cream">#HENNRI_/MAKER</span>
        <Bars barWidth={5} barHeight={12} gap={4} />
      </div>

      <div ref={wrapRef} className="relative w-[380px] flex-none">
        <div
          data-hot="1"
          onClick={() => inputRef.current?.focus()}
          className="flex items-center gap-3 border-b border-cream/22 px-0.5 py-2 hover:border-paper"
        >
          <span className="flex-none font-mono text-[11px] tracking-[0.14em] text-cream/40">#</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            placeholder="BUSCAR_EM_TUDO"
            className="w-full flex-1 bg-transparent text-[13.5px] text-paper outline-none placeholder:font-mono placeholder:text-[11px] placeholder:tracking-[0.14em] placeholder:text-cream/38 placeholder:uppercase"
          />
          <span className="flex-none font-mono text-[10px] tracking-[0.16em] text-cream/45">CTRL K</span>
        </div>

        {open && query.trim() && (
          <div className="absolute top-full right-0 left-0 z-[300] mt-2 max-h-96 overflow-y-auto border border-cream/14 bg-smoke">
            {results.length === 0 ? (
              <div className="px-4 py-4 text-[13px] text-cream/50">nada encontrado.</div>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  data-hot="1"
                  onClick={() => go(r.href)}
                  className="flex w-full items-center justify-between gap-4 border-b border-cream/8 px-4 py-3 text-left last:border-b-0 hover:bg-cream/5"
                >
                  <span className="min-w-0 truncate text-[13px] text-paper">{r.title}</span>
                  <span className="flex-none font-mono text-[10px] tracking-[0.12em] text-cream/45 uppercase">
                    [{TYPE_LABEL[r.type]}] {r.meta}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
