import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMMAND_BG, COMMAND_CIRCLE } from '../../components/shells/CommandShell'
import { useToast } from '../../components/Toast'
import { fileUrl } from '../../lib/api'
import { formatDate, formatRelative } from '../../lib/format'
import { KIND_INFO, useAcervo, type AcervoKind } from '../../lib/useAcervo'
import { cn } from '../../lib/utils'

const GLASS = 'rounded-[28px] border border-white/[0.08] bg-white/[0.035] shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]'
const STRIPES = 'repeating-linear-gradient(-45deg, var(--ice-400) 0 4px, var(--ice-300) 4px 8px)'
const NOTCH = 22

type Tab = 'todos' | AcervoKind
type Period = 'tudo' | '7' | '30' | '90'

export function CommandHome() {
  const navigate = useNavigate()
  const { flash } = useToast()
  const a = useAcervo()
  const [tab, setTab] = useState<Tab>('todos')
  const [period, setPeriod] = useState<Period>('tudo')
  const [query, setQuery] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // itens criados por mês (últimos 4 meses)
  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 3 + i, 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const items = a.items.filter((it) => it.created_at >= d.getTime() && it.created_at < end.getTime())
      return { label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), items }
    })
  }, [a.items])
  const maxMonth = Math.max(1, ...months.map((m) => m.items.length))

  const filtered = useMemo(() => {
    const since = period === 'tudo' ? 0 : Date.now() - Number(period) * 86_400_000
    const q = query.trim().toLowerCase()
    return a.items.filter(
      (it) =>
        (tab === 'todos' || it.kind === tab) &&
        it.created_at >= since &&
        (!q || it.name.toLowerCase().includes(q) || it.meta.toLowerCase().includes(q)),
    )
  }, [a.items, tab, period, query])

  const selected = filtered.find((it) => `${it.kind}-${it.id}` === selectedKey) ?? filtered[0]
  const activeFilters = (tab !== 'todos' ? 1 : 0) + (period !== 'tudo' ? 1 : 0) + (query.trim() ? 1 : 0)
  const counts = {
    todos: a.items.length,
    prompt: a.prompts.length,
    skill: a.skills.length,
    referencia: a.references.length,
  }
  const featuredCourse = a.coursesInProgress[0] ?? a.courses[0]

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    flash('Copiado')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Título */}
      <div className="flex flex-wrap items-center justify-between gap-6 pt-2">
        <div className="flex items-center gap-5">
          <span className={cn(COMMAND_CIRCLE, 'h-12 w-12 text-white')}>
            <i className="ri-archive-drawer-line text-[18px]" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-[clamp(44px,4.6vw,68px)] leading-[0.95] font-light tracking-[-0.045em]">Acervo</h1>
            <span className="text-[13px] text-white/45">
              IA Maker · acervo privado · {formatDate(Date.now())} · {a.totalItems} itens
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate('/cursos')} title="Cursos" aria-label="Cursos" className={COMMAND_CIRCLE}>
            <i className="ri-graduation-cap-line text-[17px]" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/prompts?new=1')}
            className="flex h-11 items-center gap-2 rounded-full border border-white/12 px-4.5 text-[13px] font-medium text-white outline-none transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-ice-400"
          >
            <i className="ri-file-add-line text-[16px]" /> Criar um prompt
          </button>
        </div>
      </div>

      {/* Números */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <section className={cn(GLASS, 'flex flex-col gap-7 p-7')}>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Prompts salvos', value: a.prompts.length, unit: 'prompts' },
              { label: 'Skills catalogadas', value: a.skills.length, unit: 'skills' },
              { label: 'Referências', value: a.references.length, unit: 'termos' },
            ].map((k) => (
              <div key={k.label} className="flex flex-col gap-2">
                <span className="text-[12.5px] text-white/50">{k.label}</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="tnum text-[40px] leading-none font-light tracking-[-0.04em]">{k.value}</span>
                  <span className="text-[14px] text-white/35">{k.unit}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {months.map((m) => (
              <div key={m.label} className="flex flex-col gap-2.5">
                <span className="text-[12px] text-white/50 first-letter:uppercase">{m.label}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-apple"
                    style={{ width: `${(m.items.length / maxMonth) * 100}%`, backgroundImage: STRIPES }}
                  />
                </div>
                <div className="flex h-8 items-center">
                  {m.items.slice(0, 4).map((it, i) => (
                    <span
                      key={`${it.kind}-${it.id}`}
                      title={it.name}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-graphite-800 text-ice-300"
                      style={{ marginLeft: i ? -8 : 0, borderColor: COMMAND_BG }}
                    >
                      <i className={cn(KIND_INFO[it.kind].icon, 'text-[13px]')} />
                    </span>
                  ))}
                  {m.items.length > 4 && <span className="ml-1.5 text-[11.5px] text-white/45">+{m.items.length - 4}</span>}
                  {m.items.length === 0 && <span className="text-[11.5px] text-white/30">nada</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(GLASS, 'relative flex flex-col gap-4 overflow-hidden p-6 pb-0')}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-[12.5px] text-white/50">Aulas assistidas</span>
              <span className="flex items-center gap-3">
                <span className="tnum text-[36px] leading-none font-light tracking-[-0.04em]">
                  {a.lessonsDone}
                  <span className="text-white/35"> / {a.lessonsTotal}</span>
                </span>
                <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11.5px] text-white/70">{a.lessonsPct}%</span>
              </span>
            </div>
            <button type="button" onClick={() => navigate('/cursos')} aria-label="Abrir cursos" className={COMMAND_CIRCLE}>
              <i className="ri-arrow-right-up-line text-[17px]" />
            </button>
          </div>
          <div className="mt-auto flex items-end gap-2">
            {a.courses.slice(0, 3).map((c, i) => {
              const raised = c.id === featuredCourse?.id
              const pct = c.total ? Math.round((c.done / c.total) * 100) : 0
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/cursos/${c.id}`)}
                  className={cn(
                    'flex w-[30%] min-w-0 flex-col justify-between rounded-t-[18px] p-3 text-left outline-none transition-[height] focus-visible:ring-2 focus-visible:ring-ice-400',
                    raised ? 'h-[104px] bg-ice-400 text-abyss-950' : 'h-[84px] bg-white/[0.06] text-white',
                  )}
                  style={{ zIndex: 3 - i }}
                >
                  <span className="tnum text-[12px] font-semibold">{pct}%</span>
                  <span className={cn('truncate text-[11.5px]', raised ? 'text-abyss-950/70' : 'text-white/50')}>{c.name}</span>
                </button>
              )
            })}
            {featuredCourse && (
              <button
                type="button"
                onClick={() => navigate(`/cursos/${featuredCourse.id}`)}
                className="mb-4 ml-auto h-10 flex-none rounded-full bg-white px-4 text-[12.5px] font-semibold text-abyss-950 outline-none transition-colors hover:bg-[#eaf7fb] focus-visible:ring-2 focus-visible:ring-ice-400"
              >
                Continuar
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 flex items-center gap-2 text-[14px] text-white/80">
          Filtros ativos
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-semibold text-abyss-950">
            {activeFilters}
          </span>
        </span>
        <FilterSelect
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          icon="ri-filter-3-line"
          options={[
            ['todos', 'Todos os tipos'],
            ['prompt', 'Prompts'],
            ['skill', 'Skills'],
            ['referencia', 'Referências'],
          ]}
        />
        <FilterSelect
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          icon="ri-calendar-line"
          options={[
            ['tudo', 'Qualquer data'],
            ['7', 'Últimos 7 dias'],
            ['30', 'Últimos 30 dias'],
            ['90', 'Últimos 90 dias'],
          ]}
        />
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 focus-within:border-ice-400/70">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por nome ou categoria"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
          />
          <i className="ri-search-line text-[15px] text-white/45" />
        </label>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => {
              setTab('todos')
              setPeriod('tudo')
              setQuery('')
            }}
            className="h-11 rounded-full px-4 text-[13px] text-white/60 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-ice-400"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Painel branco com as abas recortadas no topo */}
      <section className="relative mt-5 rounded-[32px] bg-canvas p-5 pt-12 text-fg">
        <div
          className="absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-b-[24px] px-2 pt-0 pb-2"
          style={{ background: COMMAND_BG }}
        >
          <span
            aria-hidden
            className="absolute top-0 right-full"
            style={{ width: NOTCH, height: NOTCH, background: `radial-gradient(circle at 0 100%, transparent ${NOTCH - 0.5}px, ${COMMAND_BG} ${NOTCH}px)` }}
          />
          <span
            aria-hidden
            className="absolute top-0 left-full"
            style={{ width: NOTCH, height: NOTCH, background: `radial-gradient(circle at 100% 100%, transparent ${NOTCH - 0.5}px, ${COMMAND_BG} ${NOTCH}px)` }}
          />
          {(['todos', 'prompt', 'skill', 'referencia'] as Tab[]).map((t) => {
            const active = tab === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ice-400',
                  active ? 'border-ice-400 bg-ice-400 text-abyss-950' : 'border-white/10 bg-white/[0.04] text-white/75 hover:text-white',
                )}
              >
                {t === 'todos' ? 'Todos' : KIND_INFO[t].plural}
                <span
                  className={cn(
                    'tnum flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px]',
                    active ? 'bg-abyss-950 text-white' : 'bg-white/10 text-white/70',
                  )}
                >
                  {counts[t]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
          {/* Lista */}
          <div className="flex flex-col gap-1">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-[16px] font-medium tracking-[-0.02em]">Itens do acervo</span>
              <span className="text-[12px] text-sub">{filtered.length} itens</span>
            </div>
            {filtered.length === 0 && <span className="px-3 py-10 text-center text-[13px] text-sub">Nada com esses filtros.</span>}
            <div className="flex max-h-[440px] flex-col gap-1 overflow-y-auto pr-1">
              {filtered.map((it) => {
                const key = `${it.kind}-${it.id}`
                const sel = selected && `${selected.kind}-${selected.id}` === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      'flex items-center gap-3 rounded-full py-2 pr-4 pl-2 text-left outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ice-200',
                      sel ? 'bg-graphite-900 text-white' : 'hover:bg-mist-100',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 flex-none items-center justify-center rounded-full',
                        sel ? 'bg-white/10 text-ice-300' : 'bg-surface text-abyss-600 shadow-soft',
                      )}
                    >
                      <i className={cn(KIND_INFO[it.kind].icon, 'text-[16px]')} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13.5px] font-medium">{it.name}</span>
                      <span className={cn('text-[11.5px]', sel ? 'text-white/50' : 'text-sub')}>{formatRelative(it.created_at)}</span>
                    </span>
                    <span
                      className={cn(
                        'flex-none rounded-full border px-2.5 py-1 text-[11px] font-medium',
                        sel ? 'border-white bg-white text-abyss-950' : 'border-mist-200 text-sub',
                      )}
                    >
                      {KIND_INFO[it.kind].label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detalhes */}
          {selected ? (
            <div className="flex flex-col gap-4 rounded-[28px] bg-graphite-900 p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-[12px] text-white/45">Detalhes</span>
                  <span className="flex items-center gap-3">
                    <span className="truncate text-[28px] leading-none font-light tracking-[-0.03em]">{selected.name}</span>
                    <span className="flex-none rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70">
                      {KIND_INFO[selected.kind].label}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/10 text-ice-300">
                    {fileUrl(selected.image) && (
                      <img
                        src={fileUrl(selected.image)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    <i className={cn(KIND_INFO[selected.kind].icon, 'text-[18px]')} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-medium first-letter:uppercase">{selected.meta}</span>
                    <span className="text-[11.5px] text-white/45">{formatDate(selected.created_at)}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {selected.fields.slice(0, 3).map((f) => (
                  <div key={f.label} className="flex min-h-[92px] flex-col justify-between rounded-[18px] border border-white/[0.06] bg-white/[0.04] p-4">
                    <span className="flex items-start justify-between gap-2">
                      <span className="truncate text-[15px] font-light tracking-[-0.02em] first-letter:uppercase">{f.value}</span>
                      <i className="ri-arrow-right-up-line text-[14px] text-white/40" />
                    </span>
                    <span className="text-[11.5px] text-white/45">{f.label}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => navigate(selected.href)}
                  aria-label="Abrir item"
                  className="flex min-h-[92px] items-center justify-center rounded-[18px] border border-white/[0.06] outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ice-400"
                  style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.05) 0 2px, transparent 2px 8px)' }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70">
                    <i className="ri-arrow-right-up-line text-[16px]" />
                  </span>
                </button>
              </div>

              <p className="line-clamp-3 rounded-[18px] bg-white/[0.03] px-4 py-3 font-code text-[12.5px] leading-[1.6] text-white/65">
                {selected.detail}
              </p>

              <div className="flex flex-wrap items-center gap-3 rounded-[22px] bg-white/[0.05] p-3 pl-5">
                {[
                  { label: 'Tipo', value: KIND_INFO[selected.kind].label },
                  { label: 'Criado', value: formatRelative(selected.created_at) },
                  { label: 'Categoria', value: selected.meta },
                ].map((s) => (
                  <span key={s.label} className="flex min-w-[90px] flex-col">
                    <span className="text-[11px] text-white/40">{s.label}</span>
                    <span className="truncate text-[15px] font-light first-letter:uppercase">{s.value}</span>
                  </span>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <button type="button" onClick={() => navigate(selected.href)} title="Abrir" aria-label="Abrir" className={cn(COMMAND_CIRCLE, 'h-10 w-10')}>
                    <i className="ri-external-link-line text-[15px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(selected.copy)}
                    className="h-10 rounded-full bg-ice-400 px-5 text-[13px] font-semibold text-abyss-950 outline-none transition-colors hover:bg-ice-300 focus-visible:ring-2 focus-visible:ring-ice-300"
                  >
                    {selected.kind === 'prompt' ? 'Copiar prompt' : selected.kind === 'referencia' ? 'Copiar termo' : 'Copiar nome'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-[28px] bg-graphite-900 p-10 text-[13px] text-white/50">
              Escolha um item na lista.
            </div>
          )}
        </div>
      </section>

      {/* Manifesto + guia */}
      <section className="mt-6 grid grid-cols-1 gap-8 px-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
        <div className="flex flex-col gap-3">
          <span className="text-[12px] text-white/40">Isso aqui é</span>
          <p className="text-[clamp(26px,2.6vw,38px)] leading-[1.05] font-light tracking-[-0.035em]">
            Um acervo, não um app com pressa pra te <span className="text-white/40">vender nada.</span>
          </p>
          <span className="mt-2 text-[11px] tracking-[0.08em] text-white/30">HENNRI / MAKER · V2</span>
        </div>
        {[
          { title: 'Prompts', icon: 'ri-sparkling-2-line', desc: `${a.prompts.length} pares de imagem e prompt. Ctrl N cria, o card copia.` },
          { title: 'Referências', icon: 'ri-camera-lens-line', desc: 'Câmera, cena e luz. O valor é o termo — um clique copia.' },
          { title: 'Cursos', icon: 'ri-graduation-cap-line', desc: 'Arquivos do Drive virando módulo, aula e anotação.' },
        ].map((b) => (
          <div key={b.title} className="flex flex-col gap-2.5">
            <span className={cn(COMMAND_CIRCLE, 'h-10 w-10 text-ice-300')}>
              <i className={cn(b.icon, 'text-[16px]')} />
            </span>
            <span className="text-[17px] font-light tracking-[-0.02em]">{b.title}</span>
            <span className="text-[13px] leading-[1.55] text-white/50">{b.desc}</span>
          </div>
        ))}
      </section>
    </div>
  )
}

/** Filtro em pílula escura (select nativo por baixo, pra funcionar com teclado e leitor de tela). */
function FilterSelect({
  value,
  onChange,
  options,
  icon,
}: {
  value: string
  onChange: (v: string) => void
  options: [string, string][]
  icon: string
}) {
  return (
    <label className="relative flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] pr-10 pl-4 text-[13px] text-white/80 focus-within:border-ice-400/70">
      <i className={cn(icon, 'text-[15px] text-white/45')} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent pr-2 text-white outline-none [&>option]:bg-graphite-900"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60">
        <i className="ri-arrow-down-s-line" />
      </span>
    </label>
  )
}
