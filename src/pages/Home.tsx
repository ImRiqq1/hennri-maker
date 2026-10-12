import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bars } from '../components/Bars'
import { HoverGlow } from '../components/HoverGlow'
import { IndexNum } from '../components/IndexNum'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import type { CourseSummary, Prompt, Reference, Skill } from '../lib/types'

export function Home() {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [logoHover, setLogoHover] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/prompts').then(setPrompts)
    api.get('/skills').then(setSkills)
    api.get('/references').then(setReferences)
    api.get('/courses').then(setCourses)
  }, [])

  // barra de rolagem customizada embaixo dos "últimos adicionados"
  function syncThumb() {
    const el = scrollRef.current
    const thumb = thumbRef.current
    if (!el || !thumb) return
    const max = el.scrollWidth - el.clientWidth
    const ratio = Math.max(0.12, el.clientWidth / el.scrollWidth)
    thumb.style.width = `${ratio * 100}%`
    thumb.style.marginLeft = `${max > 0 ? (el.scrollLeft / max) * (1 - ratio) * 100 : 0}%`
  }

  const latest = [
    ...prompts.map((p) => ({ kind: 'PROMPT', name: p.title, href: `/prompts?open=${p.id}`, created_at: p.created_at })),
    ...skills.map((s) => ({ kind: 'SKILL', name: s.name, href: `/skills?open=${s.id}`, created_at: s.created_at })),
    ...references.map((r) => ({
      kind: 'REF',
      name: r.name,
      href: `/referencias/${r.tab}?open=${r.id}`,
      created_at: r.created_at,
    })),
  ]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 6)

  const coursesInProgress = courses.filter((c) => c.status === 'andamento').length
  const totalItems = prompts.length + skills.length + references.length + courses.length

  return (
    <div>
      {/* Título */}
      <div style={{ containerType: 'inline-size', width: '100%' }}>
        <div className="mb-4.5 flex -skew-x-[20deg] gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4.5 w-1.5 bg-paper" />
          ))}
        </div>
        <div
          tabIndex={0}
          onMouseEnter={() => setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
          onFocus={() => setLogoHover(true)}
          onBlur={() => setLogoHover(false)}
          className="font-condensed flex w-full items-baseline gap-[0.06em] text-[min(14.5cqw,132px)] leading-[0.84] tracking-[-0.06em] text-paper uppercase outline-none"
        >
          <span
            className="relative inline-block h-[0.625em] flex-none transition-[width] duration-[420ms]"
            style={{ width: logoHover ? '1.36em' : '2.77em' }}
          >
            <img
              src="/brand/wordmark-white.png"
              alt="HENNRI"
              className="absolute bottom-0 left-0 block h-full w-auto transition-opacity duration-[260ms]"
              style={{ opacity: logoHover ? 0 : 1 }}
            />
            <img
              src="/brand/iso-white.png"
              alt=""
              className="absolute bottom-0 left-0 block h-full w-auto transition-opacity duration-[260ms]"
              style={{ opacity: logoHover ? 1 : 0 }}
            />
          </span>
          <span className="flex-none whitespace-nowrap">IA MAKER</span>
        </div>
      </div>
      <div className="font-condensed mb-6 text-[5.6vw] leading-[0.9] tracking-[-0.04em] text-paper uppercase">
        ACERVO PRIVADO
      </div>
      <div className="mb-16 flex items-center gap-3.5 border-b border-cream/10 pb-4 font-mono text-[11px] tracking-[0.12em] text-cream/50 uppercase">
        <span>{formatDate(Date.now())}</span>
        <span className="text-cream/25">/</span>
        <span>{totalItems} itens no acervo</span>
      </div>

      {/* Números */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-14 py-14">
        <div className="flex min-w-0 items-start gap-3.5">
          <Bars barWidth={7} barHeight={20} gap={4} />
          <div className="flex min-w-0 flex-col gap-3">
            <span className="font-condensed text-[clamp(96px,13vw,196px)] leading-[0.8] tracking-[-0.055em] text-paper">
              {prompts.length}
            </span>
            <span className="font-mono text-[11px] tracking-[0.14em] text-cream uppercase">prompts salvos</span>
          </div>
        </div>
        <div className="grid grid-cols-3 items-end gap-x-7 gap-y-3">
          {[
            { value: skills.length, label: 'skills catalogadas' },
            { value: references.length, label: 'referências' },
            { value: coursesInProgress, label: 'cursos em andamento' },
          ].map((stat) => (
            <div key={stat.label} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-end gap-x-2.5">
              <Bars barWidth={4} barHeight={12} gap={3} colorClassName="bg-cream/45" className="self-start pt-1" />
              <span className="font-condensed text-[clamp(40px,4.6vw,68px)] leading-[0.84] tracking-[-0.045em] text-paper">
                {stat.value}
              </span>
              <span className="col-start-2 font-mono text-[10.5px] tracking-[0.14em] text-cream/45 uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Últimos adicionados */}
      <div className="mb-5 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.14em] text-cream uppercase">#ULTIMOS_ADICIONADOS</span>
        <span className="font-mono text-[11px] tracking-[0.14em] text-cream/35">
          /{String(latest.length).padStart(3, '0')}
        </span>
      </div>
      <div ref={scrollRef} onScroll={syncThumb} className="flex gap-5 overflow-x-auto pb-5">
        {latest.map((item, i) => (
          <button
            key={`${item.kind}-${i}`}
            type="button"
            data-hot="1"
            onClick={() => navigate(item.href)}
            className="group relative w-[268px] flex-none overflow-hidden border border-cream/12 bg-smoke text-left outline-none"
          >
            <HoverGlow className="inset-x-0 bottom-0 h-[72%]" />
            <div className="relative flex h-[158px] items-end justify-between border-b border-cream/12 bg-[#101013] p-3.5">
              <span className="font-mono text-[10px] tracking-[0.14em] text-cream/32 uppercase">
                [{item.kind.toLowerCase()}]
              </span>
              <div className="flex -skew-x-[20deg] gap-[3px]">
                {[0, 1, 2].map((b) => (
                  <div key={b} className="h-[11px] w-1 bg-cream/50" />
                ))}
              </div>
            </div>
            <div className="relative flex flex-col gap-3 px-4.5 py-4">
              <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
                <span className="text-cream">[{item.kind}]</span>
                <IndexNum n={i + 1} className="text-cream/40" />
              </div>
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-paper">{item.name}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="h-0.5 max-w-full overflow-hidden bg-cream/10">
        <div ref={thumbRef} className="h-0.5 w-[30%] bg-cream/55" />
      </div>

      {/* Manifesto */}
      <div className="flex flex-col gap-2.5 pt-26 pb-2">
        <span className="font-mono text-[11px] tracking-[0.16em] text-cream/45 uppercase">#ISSO_AQUI_É</span>
        <div className="font-condensed flex flex-col text-[clamp(38px,5.6vw,96px)] leading-[0.9] tracking-[-0.05em] text-paper uppercase">
          <span>UM ACERVO,</span>
          <span className="ml-[12%]">NÃO UM APP</span>
          <span className="ml-[26%]">COM PRESSA PRA TE</span>
          <span className="ml-[38%] text-cream">VENDER NADA</span>
        </div>
      </div>

      {/* Rodapé claro */}
      <div
        data-invert="1"
        className="-mx-12 mt-18 -mb-18 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-10 bg-paper px-12 pt-14 pb-13 text-ink"
      >
        {[
          { title: 'PROMPTS', desc: `${prompts.length} pares de imagem e prompt. Ctrl N cria, o card copia.` },
          { title: 'REFERÊNCIAS', desc: 'Câmera, cena e luz. O valor é o termo — um clique copia.' },
          { title: 'CURSOS', desc: 'Arquivos do Drive virando módulo, aula e anotação.' },
        ].map((block) => (
          <div key={block.title} className="flex flex-col gap-4">
            <div className="flex -skew-x-[20deg] gap-1">
              {[0, 1, 2].map((b) => (
                <div key={b} className="h-3.5 w-1.5 bg-ink" />
              ))}
            </div>
            <span className="text-[19px] leading-[1.1] font-bold tracking-[0.02em] uppercase">{block.title}</span>
            <span className="max-w-[34ch] text-[13px] leading-[1.6] text-ink/70">{block.desc}</span>
          </div>
        ))}
        <div className="flex flex-col justify-end gap-3.5">
          <img src="/brand/iso-white.png" alt="" className="h-4 w-auto self-start invert" />
          <span className="font-mono text-[10px] tracking-[0.16em] text-ink/50 uppercase">HENNRI /MAKER · V1</span>
        </div>
      </div>
    </div>
  )
}
