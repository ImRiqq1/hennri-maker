import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, fileUrl } from '../../lib/api'
import { REFERENCE_TABS } from '../../lib/constants'
import { formatDate } from '../../lib/format'
import type { CourseSummary, Prompt, Reference, Skill } from '../../lib/types'
import { CountUp } from '../../components/CountUp'

const KIND = {
  PROMPT: { label: 'Prompt', icon: 'ri-sparkling-2-line' },
  SKILL: { label: 'Skill', icon: 'ri-stack-line' },
  REF: { label: 'Referência', icon: 'ri-camera-lens-line' },
} as const

/** listras diagonais (barras "vazias" dos gráficos) */
const HATCH_DARK = 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 7px)'
const HATCH_LIGHT = 'repeating-linear-gradient(-45deg, var(--mist-300) 0 2px, transparent 2px 7px)'

export function AbyssHome() {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [courses, setCourses] = useState<CourseSummary[]>([])

  useEffect(() => {
    api.get('/prompts').then(setPrompts)
    api.get('/skills').then(setSkills)
    api.get('/references').then(setReferences)
    api.get('/courses').then(setCourses)
  }, [])

  const latest = [
    ...prompts.map((p) => ({
      kind: 'PROMPT' as const,
      name: p.title,
      meta: p.category,
      image: p.image_key,
      href: `/prompts?open=${p.id}`,
      created_at: p.created_at,
    })),
    ...skills.map((s) => ({
      kind: 'SKILL' as const,
      name: s.name,
      meta: s.category,
      image: null,
      href: `/skills?open=${s.id}`,
      created_at: s.created_at,
    })),
    ...references.map((r) => ({
      kind: 'REF' as const,
      name: r.name,
      meta: r.family,
      image: r.media_key,
      href: `/referencias/${r.tab}?open=${r.id}`,
      created_at: r.created_at,
    })),
  ]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 6)

  const coursesInProgress = courses.filter((c) => c.status === 'andamento')
  const totalItems = prompts.length + skills.length + references.length + courses.length
  const lessonsTotal = courses.reduce((n, c) => n + c.total, 0)
  const lessonsDone = courses.reduce((n, c) => n + c.done, 0)
  const lessonsPct = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0
  const currentCourse = coursesInProgress[0] ?? courses[0]

  // prompts criados por categoria → barras do gráfico
  const byCategory = Object.entries(
    prompts.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.category]: (acc[p.category] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1])
  const maxCat = Math.max(1, ...byCategory.map(([, n]) => n))

  const strip = [
    { label: 'Prompts', value: prompts.length, unit: 'salvos' },
    { label: 'Skills', value: skills.length, unit: 'catalogadas' },
    { label: 'Referências', value: references.length, unit: 'termos' },
    { label: 'Cursos', value: coursesInProgress.length, unit: 'em andamento' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho: título fino + números */}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-8 pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[13px] text-sub">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span>Acervo privado</span>
            <span className="text-mist-300">·</span>
            <span>{formatDate(Date.now())}</span>
          </div>
          <h1 className="font-display text-[clamp(56px,6.6vw,104px)] leading-[0.9] font-light tracking-[-0.055em] text-fg">
            <span className="reveal-title">
              <span>IA Maker</span>
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          {strip.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5">
              <span className="text-[12px] text-sub">{s.label}</span>
              <div className="flex items-baseline gap-1.5">
                <CountUp value={s.value} className="tnum text-[40px] leading-none font-light tracking-[-0.045em] text-fg" />
                <span className="text-[12px] text-sub">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Prompts: bloco Abyss */}
        <section
          className="relative flex min-h-[420px] flex-col overflow-hidden rounded-[36px] p-8 text-white shadow-lift xl:col-span-7"
          style={{ background: 'var(--hero-gradient)' }}
        >

          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] py-1.5 pr-3.5 pl-2 text-[13px] font-medium backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ice-400 text-abyss-950">
                <i className="ri-sparkling-2-fill text-[13px]" />
              </span>
              Prompts
            </span>
            <button
              type="button"
              onClick={() => navigate('/prompts')}
              aria-label="Abrir prompts"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/14 text-white/80 outline-none transition-colors hover:bg-white hover:text-fg focus-visible:ring-2 focus-visible:ring-ice-400"
            >
              <i className="ri-arrow-right-up-line text-[18px]" />
            </button>
          </div>

          <div className="relative mt-8 flex items-baseline gap-3">
            <CountUp value={prompts.length} className="tnum text-[clamp(88px,8vw,128px)] leading-[0.8] font-light tracking-[-0.06em]" />
            <span className="text-[15px] text-white/55">prompts salvos</span>
          </div>

          {/* barras por categoria */}
          <div className="relative mt-auto flex h-[150px] items-end gap-3 pt-8">
            {byCategory.length === 0 && <div className="h-full w-full rounded-[20px]" style={{ backgroundImage: HATCH_DARK }} />}
            {byCategory.map(([cat, n], i) => (
              <div key={cat} className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
                <div className="relative flex h-[104px] w-full items-end">
                  <div
                    className="grow-y w-full rounded-[14px]"
                    style={{
                      ['--i' as string]: i,
                      height: `${Math.max(14, (n / maxCat) * 100)}%`,
                      ...(i === 0 ? { background: 'var(--ice-400)' } : { backgroundImage: HATCH_DARK }),
                    }}
                  />
                  {i === 0 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-abyss-950 shadow-float">
                      {n}
                    </span>
                  )}
                </div>
                <span className="w-full truncate text-center text-[11.5px] text-white/50">{cat}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-7 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/prompts')}
              className="flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-medium text-abyss-950 outline-none transition-transform hover:bg-[#eaf7fb] focus-visible:ring-2 focus-visible:ring-ice-400 active:scale-[0.98]"
            >
              Abrir acervo
            </button>
            <button
              type="button"
              onClick={() => navigate('/prompts?new=1')}
              className="flex h-11 items-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-5 text-[14px] font-medium text-white outline-none transition-colors hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-ice-400"
            >
              <i className="ri-add-line text-[16px] text-ice-300" />
              Novo prompt
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:col-span-5">
          {/* Referências */}
          <section className="flex flex-col rounded-[36px] border border-mist-200 bg-surface p-7 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium tracking-[-0.02em] text-fg">Referências</span>
              <button
                type="button"
                onClick={() => navigate('/referencias/camera')}
                aria-label="Abrir referências"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-mist-200 text-abyss-700 outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-4 focus-visible:ring-ice-200"
              >
                <i className="ri-arrow-right-up-line text-[17px]" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {REFERENCE_TABS.map((t) => {
                const n = references.filter((r) => r.tab === t.id).length
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/referencias/${t.id}`)}
                    className="group flex flex-col gap-3 rounded-[22px] bg-mist-100 p-4 text-left outline-none transition-colors hover:bg-ice-100 focus-visible:ring-4 focus-visible:ring-ice-200"
                  >
                    <span className="text-[12.5px] text-sub group-hover:text-abyss-600">{t.label}</span>
                    <CountUp value={n} className="tnum text-[34px] leading-none font-light tracking-[-0.045em] text-fg" />
                  </button>
                )
              })}
            </div>
          </section>

          {/* Cursos */}
          <section className="flex flex-col rounded-[36px] border border-mist-200 bg-surface p-7 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium tracking-[-0.02em] text-fg">Cursos</span>
              <span className="rounded-full bg-ice-100 px-3 py-1 text-[12px] font-medium text-abyss-600">
                {coursesInProgress.length} em andamento
              </span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[14px] text-sub">{currentCourse?.name ?? 'Nenhum curso ainda'}</span>
                <span className="tnum text-[34px] leading-none font-light tracking-[-0.045em] text-fg">
                  <CountUp value={lessonsDone} />
                  <span className="text-[16px] text-sub"> / {lessonsTotal} aulas</span>
                </span>
              </div>
              <span className="tnum text-[15px] font-medium text-abyss-600">{lessonsPct}%</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full" style={{ backgroundImage: HATCH_LIGHT }}>
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-apple"
                style={{ width: `${Math.max(lessonsPct, lessonsTotal ? 4 : 0)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => navigate('/cursos')}
              className="mt-5 flex h-10 items-center justify-center gap-2 self-start rounded-full border border-mist-200 px-4 text-[13.5px] font-medium text-abyss-700 outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-4 focus-visible:ring-ice-200"
            >
              Ver cursos
              <i className="ri-arrow-right-line text-[15px]" />
            </button>
          </section>
        </div>
      </div>

      {/* Últimos adicionados */}
      <section className="mt-8 flex flex-col gap-5">
        <div className="flex items-end justify-between">
          <h2 className="text-[30px] leading-none font-light tracking-[-0.04em] text-fg">Últimos adicionados</h2>
          <span className="rounded-full border border-mist-200 bg-surface px-3 py-1 text-[12px] text-sub">
            {latest.length} itens
          </span>
        </div>
        <div className="stagger -mx-3 flex snap-x gap-4 overflow-x-auto px-3 pt-1 pb-6">
          {latest.map((item, i) => {
            const kind = KIND[item.kind]
            const src = fileUrl(item.image)
            return (
              <button
                key={`${item.kind}-${i}`}
                type="button"
                onClick={() => navigate(item.href)}
                className="group w-[272px] flex-none snap-start overflow-hidden rounded-[28px] border border-mist-200 bg-surface p-2 text-left shadow-soft outline-none transition-[transform,box-shadow] duration-500 ease-apple hover:-translate-y-1 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-ice-200"
              >
                <div className="relative flex h-[168px] items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-mist-100 via-mist-100 to-ice-100">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-[1.05]"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : null}
                  <i className={`${kind.icon} text-[30px] text-abyss-500/35`} />
                  <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-surface/90 py-1 pr-2.5 pl-1.5 text-[11.5px] font-medium text-abyss-700 shadow-soft backdrop-blur">
                    <i className={`${kind.icon} text-[12px] text-abyss-500`} />
                    {kind.label}
                  </span>
                  <span className="absolute right-3 bottom-3 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <i className="ri-arrow-right-up-line text-[16px]" />
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-3 pt-4 pb-3">
                  <span className="truncate text-[15.5px] font-medium tracking-[-0.02em] text-fg">{item.name}</span>
                  <span className="truncate text-[12.5px] text-sub">{item.meta}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Manifesto */}
      <section className="mt-4 grid grid-cols-1 items-end gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-5">
          <span className="text-[13px] text-sub">Isso aqui é</span>
          <p className="max-w-[18ch] font-display text-[clamp(40px,5vw,80px)] leading-[0.98] font-light tracking-[-0.05em] text-fg">
            Um acervo, não um app com pressa pra te <span className="text-mist-400">vender nada.</span>
          </p>
        </div>
        <span className="text-[13px] text-sub">{totalItems} itens no acervo</span>
      </section>

      {/* Rodapé Abyss */}
      <footer
        className="relative grid grid-cols-1 gap-8 overflow-hidden rounded-[36px] px-10 pt-11 pb-10 text-white md:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
        style={{ background: 'var(--hero-gradient)' }}
      >
        {[
          {
            title: 'Prompts',
            icon: 'ri-sparkling-2-line',
            desc: `${prompts.length} pares de imagem e prompt. Ctrl N cria, o card copia.`,
          },
          { title: 'Referências', icon: 'ri-camera-lens-line', desc: 'Câmera, cena e luz. O valor é o termo — um clique copia.' },
          { title: 'Cursos', icon: 'ri-graduation-cap-line', desc: 'Arquivos do Drive virando módulo, aula e anotação.' },
        ].map((block) => (
          <div key={block.title} className="flex flex-col gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 text-ice-300">
              <i className={`${block.icon} text-[18px]`} />
            </span>
            <span className="mt-1 text-[20px] font-light tracking-[-0.03em]">{block.title}</span>
            <span className="max-w-[34ch] text-[13.5px] leading-[1.6] text-white/55">{block.desc}</span>
          </div>
        ))}
        <div className="flex flex-col justify-end gap-3 md:items-end">
          <img src="/brand/iso-white.png" alt="" className="h-4 w-auto self-start opacity-80 md:self-end" />
          <span className="text-[11px] tracking-[0.08em] text-white/40">HENNRI / MAKER · V2</span>
        </div>
      </footer>
    </div>
  )
}
