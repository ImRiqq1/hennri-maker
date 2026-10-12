import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { EmptyState, PageHeader } from '../components/PageHeader'
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
            <span className="font-mono text-[10px] tracking-[0.16em] text-cream/40">CTRL N</span>
            {newButton}
          </>
        }
      />

      <div className="mb-8 flex items-center justify-between gap-6 border-b border-cream/10 pb-4.5">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            data-hot="1"
            onClick={() => setSort((s) => (s === 'recentes' ? 'a → z' : 'recentes'))}
            className="flex items-center gap-2 px-2.5 py-2 font-mono text-[10px] tracking-[0.14em] text-cream/60 uppercase outline-none hover:text-paper"
          >
            <i className="ri-arrow-up-down-line text-[15px]" />
            <span>{sort}</span>
          </button>
          {view === 'grid' && (
            <div className="flex items-center gap-0.5 border-l border-cream/10 pl-1.5">
              <button
                type="button"
                data-hot="1"
                onClick={() => changeCols(-1)}
                disabled={cols <= MIN_COLS}
                className="flex h-7 w-7 items-center justify-center text-cream/60 outline-none hover:text-paper disabled:opacity-30"
              >
                <i className="ri-subtract-line text-sm" />
              </button>
              <span className="w-4 text-center font-mono text-[10px] text-cream/60">{cols}</span>
              <button
                type="button"
                data-hot="1"
                onClick={() => changeCols(1)}
                disabled={cols >= MAX_COLS}
                className="flex h-7 w-7 items-center justify-center text-cream/60 outline-none hover:text-paper disabled:opacity-30"
              >
                <i className="ri-add-line text-sm" />
              </button>
            </div>
          )}
          <button
            type="button"
            data-hot="1"
            onClick={() => setView('grid')}
            className={cn('px-2.5 py-2 outline-none hover:text-paper', view === 'grid' ? 'text-paper' : 'text-cream/40')}
          >
            <i className="ri-grid-line text-base" />
          </button>
          <button
            type="button"
            data-hot="1"
            onClick={() => setView('list')}
            className={cn('px-2.5 py-2 outline-none hover:text-paper', view === 'list' ? 'text-paper' : 'text-cream/40')}
          >
            <i className="ri-list-check-2 text-base" />
          </button>
        </div>
      </div>

      {!loading && visible.length === 0 ? (
        <EmptyState
          title="PROMPTS"
          message={prompts.length === 0 ? 'Nada salvo ainda.' : 'Nada nessa categoria ainda.'}
          action={newButton}
        />
      ) : (
        <div className={cn('grid gap-6', view === 'grid' ? COLS_CLASS[cols] : 'grid-cols-2')}>
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
