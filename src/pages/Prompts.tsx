import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { ChipGroup, EmptyState, IconButton, Kbd, PageHeader } from '../components/PageHeader'
import { NewButton } from '../components/PrimaryButton'
import { PromptCard } from '../components/PromptCard'
import { PromptEditor, type PromptForm } from '../components/PromptEditor'
import { PromptViewer } from '../components/PromptViewer'
import { useToast } from '../components/Toast'
import { api, fileUrl } from '../lib/api'
import { PROMPT_CATEGORIES } from '../lib/constants'
import type { Prompt } from '../lib/types'
import { cn } from '../lib/utils'

const FILTERS = ['Todos', ...PROMPT_CATEGORIES]
const MIN_COLS = 3
const MAX_COLS = 10
const COLS_CLASS: Record<number, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
}

function savedCols() {
  try {
    const n = Number(localStorage.getItem('hm-prompts-cols'))
    if (n >= MIN_COLS && n <= MAX_COLS) return n
  } catch {}
  return 5
}

type SortMode = 'recentes' | 'a → z'

export function Prompts() {
  const { flash } = useToast()
  const [params, setParams] = useSearchParams()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [cols, setCols] = useState(savedCols)
  const [sort, setSort] = useState<SortMode>('recentes')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Prompt | null>(null)

  async function load() {
    setLoading(true)
    try {
      setPrompts(await api.get<Prompt[]>('/prompts'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // ?open=<id> abre um prompt; ?new=1 abre o editor (Ctrl N)
  useEffect(() => {
    const open = params.get('open')
    const isNew = params.get('new')
    if (open) {
      setFilter('Todos')
      setOpenId(open)
    }
    if (isNew) {
      setEditing(null)
      setEditorOpen(true)
    }
    if (open || isNew) {
      const next = new URLSearchParams(params)
      next.delete('open')
      next.delete('new')
      setParams(next, { replace: true })
    }
  }, [params])

  const visible = useMemo(() => {
    const list = filter === 'Todos' ? prompts : prompts.filter((p) => p.category === filter)
    return sort === 'a → z' ? [...list].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')) : list
  }, [prompts, filter, sort])

  const openIndex = openId ? visible.findIndex((p) => p.id === openId) : -1
  const openPrompt = openIndex >= 0 ? visible[openIndex] : null

  function startNew() {
    setEditing(null)
    setEditorOpen(true)
  }

  function startEdit() {
    if (!openPrompt) return
    setEditing(openPrompt)
    setOpenId(null)
    setEditorOpen(true)
  }

  async function save(form: PromptForm) {
    if (editing) {
      const updated = await api.put<Prompt>(`/prompts/${editing.id}`, form)
      setPrompts((list) => list.map((p) => (p.id === updated.id ? updated : p)))
      flash('Prompt atualizado')
    } else {
      const created = await api.post<Prompt>('/prompts', form)
      setPrompts((list) => [created, ...list])
      flash('Prompt salvo')
    }
    setEditorOpen(false)
  }

  async function remove() {
    if (!openPrompt) return
    await api.delete(`/prompts/${openPrompt.id}`)
    setPrompts((list) => list.filter((p) => p.id !== openPrompt.id))
    setOpenId(null)
    flash('Prompt apagado')
  }

  function changeCols(delta: number) {
    setCols((c) => {
      const n = Math.min(MAX_COLS, Math.max(MIN_COLS, c + delta))
      try {
        localStorage.setItem('hm-prompts-cols', String(n))
      } catch {}
      return n
    })
  }

  function copy(p: Prompt) {
    navigator.clipboard?.writeText(p.prompt_text).catch(() => {})
    flash('Prompt copiado')
  }

  function download(p: Prompt) {
    const url = fileUrl(p.image_key)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${p.title}.png`
    a.click()
    flash('Imagem baixada')
  }

  function step(delta: number) {
    if (visible.length === 0) return
    const i = (openIndex + delta + visible.length) % visible.length
    setOpenId(visible[i].id)
  }

  const newButton = <NewButton label="Novo prompt" onClick={startNew} />

  return (
    <div>
      <PageHeader
        tags={['imagem', 'vídeo', 'personagem', 'cenário', 'upscale']}
        title="PROMPTS"
        count={prompts.length}
        actions={
          <>
            <Kbd>Ctrl N</Kbd>
            {newButton}
          </>
        }
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <ChipGroup>
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </ChipGroup>
        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={() => setSort((s) => (s === 'recentes' ? 'a → z' : 'recentes'))}
            className="flex h-10 items-center gap-2 rounded-full border border-mist-200 bg-surface px-4 text-[13px] font-medium text-abyss-700 outline-none transition-colors first-letter:uppercase hover:border-mist-300 hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200"
          >
            <i className="ri-arrow-up-down-line text-[15px] text-abyss-500" />
            <span className="first-letter:uppercase">{sort}</span>
          </button>
          {view === 'grid' && (
            <div className="flex h-10 items-center gap-1 rounded-full border border-mist-200 bg-surface px-1">
              <button
                type="button"
                onClick={() => changeCols(-1)}
                disabled={cols <= MIN_COLS}
                aria-label="Menos colunas"
                className="flex h-8 w-8 items-center justify-center rounded-full text-abyss-700 outline-none transition-colors hover:bg-mist-100 focus-visible:ring-4 focus-visible:ring-ice-200 disabled:opacity-30"
              >
                <i className="ri-subtract-line text-[15px]" />
              </button>
              <span className="tnum w-5 text-center text-[13px] font-medium text-fg">{cols}</span>
              <button
                type="button"
                onClick={() => changeCols(1)}
                disabled={cols >= MAX_COLS}
                aria-label="Mais colunas"
                className="flex h-8 w-8 items-center justify-center rounded-full text-abyss-700 outline-none transition-colors hover:bg-mist-100 focus-visible:ring-4 focus-visible:ring-ice-200 disabled:opacity-30"
              >
                <i className="ri-add-line text-[15px]" />
              </button>
            </div>
          )}
          <IconButton icon="ri-grid-line" label="Grade" active={view === 'grid'} onClick={() => setView('grid')} />
          <IconButton icon="ri-list-check-2" label="Lista" active={view === 'list'} onClick={() => setView('list')} />
        </div>
      </div>

      {!loading && visible.length === 0 ? (
        <EmptyState
          title="PROMPTS"
          message={prompts.length === 0 ? 'Nada salvo ainda.' : 'Nada nessa categoria ainda.'}
          action={newButton}
        />
      ) : (
        <div className={cn('stagger grid gap-5', view === 'grid' ? COLS_CLASS[cols] : 'grid-cols-2')}>
          {visible.map((p, i) => (
            <PromptCard
              key={p.id}
              prompt={p}
              index={i + 1}
              onOpen={() => setOpenId(p.id)}
              onCopy={() => copy(p)}
              onDownload={() => download(p)}
            />
          ))}
        </div>
      )}

      <PromptViewer
        prompt={openPrompt}
        index={openIndex + 1}
        onClose={() => setOpenId(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onEdit={startEdit}
        onDelete={remove}
        onCopy={() => openPrompt && copy(openPrompt)}
        onDownload={() => openPrompt && download(openPrompt)}
      />
      <PromptEditor open={editorOpen} editing={editing} onClose={() => setEditorOpen(false)} onSave={save} />
    </div>
  )
}
