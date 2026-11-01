import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fileUrl } from '../../lib/api'
import { formatDate, formatRelative } from '../../lib/format'
import { KIND_INFO, useAcervo, type AcervoItem } from '../../lib/useAcervo'
import { cn } from '../../lib/utils'

const CARD = 'rounded-[28px] border border-mist-200/70 bg-surface p-6 shadow-soft'
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Anel de progresso. */
function Ring({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--mist-100)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-apple"
        />
      </svg>
      <span className="tnum absolute inset-0 flex items-center justify-center text-[14px] font-semibold text-fg">{pct}%</span>
    </div>
  )
}

/** Ilustração montada com peças (cards inclinados + ícone), no lugar de um desenho. */
function Illustration({ icon, tone }: { icon: string; tone: 'ice' | 'abyss' | 'mist' }) {
  const back = tone === 'abyss' ? 'bg-abyss-700' : tone === 'ice' ? 'bg-ice-300' : 'bg-mist-300'
  return (
    <div className="relative mx-auto h-[92px] w-[112px]">
      <span className={cn('absolute top-3 left-3 h-[64px] w-[78px] -rotate-[10deg] rounded-[16px] opacity-60', back)} />
      <span className="absolute top-2 left-7 h-[70px] w-[80px] rotate-[6deg] rounded-[16px] border border-mist-200 bg-mist-50" />
      <span className="absolute top-4 left-5 flex h-[66px] w-[82px] items-center justify-center rounded-[16px] border border-mist-200 bg-surface shadow-[0_10px_20px_-12px_rgb(4_26_33/0.4)]">
        <i className={cn(icon, 'text-[30px] text-abyss-600')} />
      </span>
      <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-success" />
    </div>
  )
}

export function WorkspaceHome() {
  const navigate = useNavigate()
  const a = useAcervo()
  const latest = a.items.slice(0, 6)
  const [first, ...rest] = latest

  // semana com os itens criados em cada dia
  const [weekOffset, setWeekOffset] = useState(0)
  const today = startOfDay(Date.now())
  const [selectedDay, setSelectedDay] = useState(today)
  const week = useMemo(() => {
    const base = new Date(today)
    base.setDate(base.getDate() - base.getDay() + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      const ts = d.getTime()
      return { ts, day: d.getDate(), items: a.items.filter((it) => startOfDay(it.created_at) === ts) }
    })
  }, [today, weekOffset, a.items])
  const dayItems = week.find((d) => d.ts === selectedDay)?.items ?? []
  const monthLabel = new Date(week[3].ts).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const byCategory = Object.entries(
    a.prompts.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.category]: (acc[p.category] ?? 0) + 1 }), {}),
  ).sort((x, y) => y[1] - x[1])

  const coursesDonePct = a.courses.length
    ? Math.round((a.courses.filter((c) => c.status === 'concluido').length / a.courses.length) * 100)
    : 0

  const shortcuts = [
    { title: 'Prompts', sub: `${a.prompts.length} prompts salvos`, icon: 'ri-sparkling-2-line', tone: 'ice' as const, to: '/prompts' },
    { title: 'Skills', sub: `${a.skills.length} skills catalogadas`, icon: 'ri-stack-line', tone: 'abyss' as const, to: '/skills' },
    {
      title: 'Referências',
      sub: `${a.references.length} termos salvos`,
      icon: 'ri-camera-lens-line',
      tone: 'mist' as const,
      to: '/referencias/camera',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Saudação + atalhos */}
      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(0,1.25fr)_150px_repeat(3,minmax(0,1fr))]">
        <div className="flex flex-col justify-center gap-4 py-2 pr-4">
          <span className="flex w-fit items-center gap-2 rounded-full bg-surface px-3 py-1 text-[12px] text-sub shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Acervo privado · {formatDate(Date.now())}
          </span>
          <h1 className="text-[clamp(34px,3.2vw,46px)] leading-[1.06] font-semibold tracking-[-0.035em] text-fg">
            Olá!
            <br />O que vamos
            <br />
            criar hoje?
          </h1>
          <p className="max-w-[40ch] text-[14px] leading-[1.55] text-sub">
            IA Maker: {a.totalItems} itens no acervo, entre prompts, skills, referências e cursos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/prompts?new=1')}
          className="group flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-mist-300 bg-mist-50/60 text-sub outline-none transition-colors hover:border-ice-400 hover:bg-ice-50 hover:text-abyss-600 focus-visible:ring-4 focus-visible:ring-ice-200"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-soft transition-transform group-hover:scale-105">
            <i className="ri-add-line text-[20px]" />
          </span>
          <span className="text-[12.5px] font-medium">Novo prompt</span>
        </button>

        {shortcuts.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => navigate(s.to)}
            className="group flex flex-col justify-between gap-3 rounded-[28px] border border-mist-200/70 bg-surface p-4 pt-5 text-left shadow-soft outline-none transition-[transform,box-shadow] duration-500 ease-apple hover:-translate-y-1 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-ice-200"
          >
            <Illustration icon={s.icon} tone={s.tone} />
            <div className="flex flex-col gap-0.5 px-1">
              <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">{s.title}</span>
              <span className="text-[12px] text-sub">{s.sub}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Últimos adicionados */}
        <section className={cn(CARD, 'relative overflow-visible')}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-fg">Últimos adicionados</h2>
            <span className="rounded-full bg-mist-100 px-2.5 py-1 text-[11.5px] font-medium text-sub">{latest.length} itens</span>
          </div>
          {first && <FloatingItem item={first} onOpen={() => navigate(first.href)} />}
          <div className="mt-3 flex flex-col">
            {rest.map((it) => (
              <button
                key={`${it.kind}-${it.id}`}
                type="button"
                onClick={() => navigate(it.href)}
                className="flex items-center gap-3 rounded-[16px] px-2 py-2.5 text-left outline-none transition-colors hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-mist-100 text-abyss-600">
                  <i className={cn(KIND_INFO[it.kind].icon, 'text-[16px]')} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] font-medium text-fg">{it.name}</span>
                  <span className="truncate text-[11.5px] text-sub">
                    {KIND_INFO[it.kind].label} · {it.meta}
                  </span>
                </span>
                <span className="flex-none text-[11.5px] text-mist-400">{formatRelative(it.created_at)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Cursos */}
        <section className={CARD}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-fg">Cursos</h2>
            <button
              type="button"
              onClick={() => navigate('/cursos')}
              className="flex items-center gap-1 text-[12.5px] font-medium text-sub outline-none hover:text-fg focus-visible:underline"
            >
              <i className="ri-arrow-right-up-line" /> Ver todos
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {a.courses.slice(0, 2).map((c) => {
              const pct = c.total ? Math.round((c.done / c.total) * 100) : 0
              const done = c.status === 'concluido'
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/cursos/${c.id}`)}
                  className="flex flex-col gap-3 rounded-[20px] border border-mist-200/70 bg-mist-50/60 p-4 text-left outline-none transition-colors hover:border-mist-300 hover:bg-surface focus-visible:ring-4 focus-visible:ring-ice-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-[11.5px] text-sub">{c.author ?? 'Curso'}</span>
                      <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-fg">{c.name}</span>
                    </div>
                    <span
                      className={cn(
                        'flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        done ? 'bg-success/15 text-success' : 'bg-warning/15 text-[#a87b22]',
                      )}
                    >
                      {done ? 'Concluído' : 'Em andamento'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist-200">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                    <span className="tnum text-[12px] font-semibold text-fg">
                      {c.done}/{c.total}
                    </span>
                  </div>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => navigate('/cursos?new=1')}
              className="flex h-12 items-center justify-center gap-2 rounded-[16px] border border-dashed border-mist-300 text-[13px] font-medium text-sub outline-none transition-colors hover:border-ice-400 hover:bg-ice-50 hover:text-abyss-600 focus-visible:ring-4 focus-visible:ring-ice-200"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
                <i className="ri-add-line text-[14px]" />
              </span>
              Adicionar curso
            </button>
          </div>
        </section>

        {/* Semana */}
        <section className={CARD}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-fg first-letter:uppercase">{monthLabel}</h2>
            <div className="flex gap-1">
              {[-1, 1].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWeekOffset((w) => w + d)}
                  aria-label={d < 0 ? 'Semana anterior' : 'Próxima semana'}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-100 text-sub outline-none transition-colors hover:bg-mist-200 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
                >
                  <i className={d < 0 ? 'ri-arrow-left-s-line' : 'ri-arrow-right-s-line'} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 border-b border-mist-200/70 pb-4">
            {week.map((d, i) => {
              const sel = d.ts === selectedDay
              return (
                <button
                  key={d.ts}
                  type="button"
                  onClick={() => setSelectedDay(d.ts)}
                  className="flex flex-col items-center gap-1.5 outline-none"
                >
                  <span className="text-[10.5px] text-mist-400">{WEEKDAYS[i]}</span>
                  <span
                    className={cn(
                      'tnum flex h-8 w-8 items-center justify-center rounded-[10px] text-[13px] font-medium transition-colors',
                      sel ? 'bg-primary text-primary-foreground' : d.ts === today ? 'bg-ice-100 text-abyss-700' : 'text-fg hover:bg-mist-100',
                    )}
                  >
                    {d.day}
                  </span>
                  <span className={cn('h-1 w-1 rounded-full', d.items.length ? 'bg-ice-500' : 'bg-transparent')} />
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {dayItems.length === 0 ? (
              <span className="py-6 text-center text-[13px] text-sub">Nada adicionado nesse dia.</span>
            ) : (
              dayItems.slice(0, 3).map((it) => (
                <button
                  key={`${it.kind}-${it.id}`}
                  type="button"
                  onClick={() => navigate(it.href)}
                  className="flex items-center gap-3 rounded-[16px] border border-mist-200/70 p-3 text-left outline-none transition-colors hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200"
                >
                  <span className="h-8 w-1 flex-none rounded-full bg-ice-500" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-medium text-fg">{it.name}</span>
                    <span className="text-[11.5px] text-sub">{KIND_INFO[it.kind].label}</span>
                  </span>
                  <i className="ri-more-2-fill text-sub" />
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.85fr)_minmax(0,1.2fr)]">
        {/* Prompts por categoria */}
        <section className={CARD}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-fg">Prompts por categoria</h2>
            <span className="text-[12px] text-sub">{a.prompts.length} no total</span>
          </div>
          <div className="flex flex-col">
            <div className="grid grid-cols-[minmax(0,1.4fr)_80px_minmax(0,1fr)] gap-4 border-b border-mist-200/70 px-2 pb-2 text-[11px] text-mist-400">
              <span>Categoria</span>
              <span>Prompts</span>
              <span>Parte do acervo</span>
            </div>
            {byCategory.map(([cat, n], i) => {
              const pct = Math.round((n / Math.max(1, a.prompts.length)) * 100)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => navigate('/prompts')}
                  className={cn(
                    'grid grid-cols-[minmax(0,1.4fr)_80px_minmax(0,1fr)] items-center gap-4 rounded-[16px] px-2 py-3 text-left outline-none transition-colors hover:bg-mist-50',
                    i === 0 && 'relative -mx-3 bg-surface px-5 shadow-lift',
                  )}
                >
                  <span className="flex flex-col">
                    <span className="truncate text-[13.5px] font-medium text-fg first-letter:uppercase">{cat}</span>
                  </span>
                  <span className="tnum text-[13px] font-medium text-fg">{n}</span>
                  <span className="flex items-center gap-2">
                    <span className="tnum w-9 text-[11.5px] text-sub">{pct}%</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist-100">
                      <span className="block h-full rounded-full bg-abyss-600" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Manifesto em bloco Abyss */}
        <section
          className="flex flex-col items-center justify-between gap-5 rounded-[28px] p-6 text-center text-white"
          style={{ background: 'var(--hero-gradient)' }}
        >
          <div className="relative mt-2 h-[84px] w-[96px]">
            <span className="absolute top-2 left-2 h-[60px] w-[70px] -rotate-[12deg] rounded-[16px] bg-white/10" />
            <span className="absolute top-3 left-5 flex h-[62px] w-[72px] rotate-[4deg] items-center justify-center rounded-[16px] bg-white text-abyss-700 shadow-float">
              <i className="ri-archive-drawer-line text-[28px]" />
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-ice-300">Isso aqui é</span>
            <p className="text-[18px] leading-[1.25] font-semibold tracking-[-0.02em]">
              Um acervo, não um app com pressa pra te vender nada.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="h-10 w-full rounded-[14px] bg-white text-[13px] font-semibold text-abyss-950 outline-none transition-colors hover:bg-[#eaf7fb] focus-visible:ring-2 focus-visible:ring-ice-400"
          >
            Buscar no acervo
          </button>
        </section>

        {/* Anéis + guia */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <div className={cn(CARD, 'flex flex-col gap-3 p-5')}>
              <div className="flex items-center gap-3">
                <Ring pct={a.lessonsPct} color="var(--abyss-600)" size={58} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10.5px] font-semibold tracking-[0.04em] text-abyss-600 uppercase">Aulas</span>
                  <span className="text-[13.5px] font-semibold text-fg">Assistidas</span>
                </div>
              </div>
              <span className="text-[11.5px] text-sub">
                {a.lessonsDone} de {a.lessonsTotal} aulas · {a.coursesInProgress.length} em andamento
              </span>
            </div>
            <div className={cn(CARD, 'flex flex-col gap-3 p-5')}>
              <div className="flex items-center gap-3">
                <Ring pct={coursesDonePct} color="var(--success)" size={58} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10.5px] font-semibold tracking-[0.04em] text-success uppercase">Cursos</span>
                  <span className="text-[13.5px] font-semibold text-fg">Concluídos</span>
                </div>
              </div>
              <span className="text-[11.5px] text-sub">{a.courses.length} cursos no acervo</span>
            </div>
          </div>

          <section className={cn(CARD, 'flex flex-1 flex-col gap-3')}>
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-fg">Guia rápido</h2>
              <span className="text-[11px] text-mist-400">HENNRI / MAKER · V2</span>
            </div>
            {[
              { title: 'Prompts', icon: 'ri-sparkling-2-line', desc: `${a.prompts.length} pares de imagem e prompt. Ctrl N cria, o card copia.` },
              { title: 'Referências', icon: 'ri-camera-lens-line', desc: 'Câmera, cena e luz. O valor é o termo — um clique copia.' },
              { title: 'Cursos', icon: 'ri-graduation-cap-line', desc: 'Arquivos do Drive virando módulo, aula e anotação.' },
            ].map((g) => (
              <div key={g.title} className="flex items-start gap-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-ice-100 text-abyss-600">
                  <i className={cn(g.icon, 'text-[15px]')} />
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-fg">{g.title}</span>
                  <span className="text-[12px] leading-[1.45] text-sub">{g.desc}</span>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

/** O item mais recente "salta" pra fora do card, como um aviso em destaque. */
function FloatingItem({ item, onOpen }: { item: AcervoItem; onOpen: () => void }) {
  const src = fileUrl(item.image)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative z-[2] -ml-10 flex w-[calc(100%+40px)] items-center gap-3 rounded-[20px] border border-mist-200/70 bg-surface p-3.5 text-left shadow-lift outline-none transition-transform duration-500 ease-apple hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-ice-200"
    >
      <span className="relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-mist-100 to-ice-100 text-abyss-500">
        {src && (
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
        )}
        <i className={cn(KIND_INFO[item.kind].icon, 'text-[18px]')} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-fg">{item.name}</span>
          <span className="flex flex-none items-center gap-1 text-[11px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Novo
          </span>
        </span>
        <span className="flex items-center gap-2 text-[11.5px] text-sub">
          <span className="flex items-center gap-1 rounded-full bg-mist-100 px-2 py-0.5">
            <i className={KIND_INFO[item.kind].icon} /> {KIND_INFO[item.kind].label}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-mist-100 px-2 py-0.5">
            <i className="ri-time-line" /> {formatRelative(item.created_at)}
          </span>
        </span>
      </span>
      <i className="ri-more-fill text-[18px] text-sub" />
    </button>
  )
}
