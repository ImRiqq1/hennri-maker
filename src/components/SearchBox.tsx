import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { SearchResult } from '../lib/types'
import { cn } from '../lib/utils'

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  referencia: 'Referência',
  aula: 'Aula',
}

const TYPE_ICON: Record<SearchResult['type'], string> = {
  prompt: 'ri-sparkling-2-line',
  skill: 'ri-stack-line',
  referencia: 'ri-camera-lens-line',
  aula: 'ri-play-circle-line',
}

/**
 * Busca global (Ctrl K). Cada design system passa as classes do campo;
 * a lista de resultados é sempre a superfície Graphite flutuante.
 */
export function SearchBox({
  className,
  fieldClassName,
  inputClassName,
  mutedClassName,
  placeholder = 'Buscar em tudo',
}: {
  className?: string
  fieldClassName: string
  inputClassName: string
  mutedClassName: string
  placeholder?: string
}) {
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
    <div ref={wrapRef} className={cn('relative', className)}>
      <div onClick={() => inputRef.current?.focus()} className={cn('flex cursor-text items-center gap-2.5', fieldClassName)}>
        <i className={cn('ri-search-line flex-none text-[16px]', mutedClassName)} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder={placeholder}
          aria-label="Buscar em tudo"
          className={cn('w-full min-w-0 flex-1 bg-transparent text-[14px] outline-none', inputClassName)}
        />
        <kbd
          className={cn(
            'flex-none rounded-md border border-current/20 px-1.5 py-0.5 font-sans text-[10.5px] font-medium',
            mutedClassName,
          )}
        >
          Ctrl K
        </kbd>
      </div>

      {open && query.trim() && (
        <div
          className="absolute top-full right-0 left-0 z-[300] mt-2 max-h-96 min-w-[320px] overflow-y-auto rounded-[22px] border border-white/8 p-1.5 text-white shadow-float animate-in fade-in-0 slide-in-from-top-1"
          style={{ background: 'var(--floating-gradient)' }}
        >
          {results.length === 0 ? (
            <div className="px-4 py-4 text-[13px] text-white/55">Nada encontrado.</div>
          ) : (
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                onClick={() => go(r.href)}
                className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.08] focus-visible:bg-white/[0.08]"
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/[0.08]">
                  <i className={`${TYPE_ICON[r.type]} text-[15px] text-ice-300`} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">{r.title}</span>
                <span className="flex-none text-[11.5px] text-white/45">
                  {TYPE_LABEL[r.type]}
                  {r.meta ? ` · ${r.meta}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
