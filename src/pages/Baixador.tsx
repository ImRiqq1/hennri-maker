import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { ChipGroup, PageHeader } from '../components/PageHeader'
import { NewButton } from '../components/PrimaryButton'
import { useToast } from '../components/Toast'
import { HelperPill } from '../components/trilhas/TrilhasShell'
import { api, fileUrl } from '../lib/api'
import { formatRelative } from '../lib/format'
import { cancelJob, createJob, getTarget, isActive, parseJSON, removeJob, useHelperStatus, useJobs } from '../lib/trilhas'
import type { Download, Job, RefFolder } from '../lib/types'
import { cn } from '../lib/utils'
import { Dropdown } from '../components/Dropdown'
import { TargetPicker } from '../components/trilhas/TargetPicker'
import { BaixadorTabs } from '../components/BaixadorTabs'

type Mode = 'premiere' | 'max' | 'audio'

const MODES: { id: Mode; label: string; hint: string; icon: string }[] = [
  { id: 'premiere', label: 'Premiere', hint: 'H.264 que abre liso no Premiere e no After (YouTube até 1080p)', icon: 'ri-film-line' },
  { id: 'max', label: 'Máx', hint: 'Maior resolução (4K no YouTube) — pode vir AV1/VP9', icon: 'ri-hd-line' },
  { id: 'audio', label: 'Áudio', hint: 'Só o som, em MP3 320', icon: 'ri-music-2-line' },
]

const BROWSERS = [
  { id: '', label: 'Sem login' },
  { id: 'firefox', label: 'Firefox' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'edge', label: 'Edge' },
  { id: 'brave', label: 'Brave' },
  { id: 'opera', label: 'Opera' },
]

const PLATFORM: Record<string, { label: string; icon: string; tone: string }> = {
  IG: { label: 'Instagram', icon: 'ri-instagram-line', tone: 'bg-[#e1306c]/12 text-[#c1275b]' },
  YT: { label: 'YouTube', icon: 'ri-youtube-line', tone: 'bg-danger/12 text-danger' },
  PIN: { label: 'Pinterest', icon: 'ri-pinterest-line', tone: 'bg-[#e60023]/10 text-[#c4001e]' },
  TT: { label: 'TikTok', icon: 'ri-tiktok-line', tone: 'bg-graphite-900/10 text-graphite-900' },
  X: { label: 'X', icon: 'ri-twitter-x-line', tone: 'bg-graphite-900/10 text-graphite-900' },
  GIF: { label: 'Giphy', icon: 'ri-file-gif-line', tone: 'bg-[#9933ff]/10 text-[#7a1fe0]' },
  WEB: { label: 'Link', icon: 'ri-global-line', tone: 'bg-mist-100 text-sub' },
}

const URL_RE = /https?:\/\/[^\s"'<>]+/g

function platformOf(url: string) {
  const u = url.toLowerCase()
  if (u.includes('instagram.com')) return 'IG'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YT'
  if (u.includes('pinterest.') || u.includes('pin.it')) return 'PIN'
  if (u.includes('tiktok.com')) return 'TT'
  if (u.includes('twitter.com') || u.includes('x.com/')) return 'X'
  if (u.includes('giphy.com') || u.includes('gph.is')) return 'GIF'
  return 'WEB'
}

function extractLinks(text: string) {
  return Array.from(new Set((text.match(URL_RE) ?? []).map((u) => u.replace(/[).,;]+$/, ''))))
}

function formatBytes(b: number | null | undefined) {
  if (!b) return ''
  if (b > 1e9) return `${(b / 1e9).toFixed(1).replace('.', ',')} GB`
  if (b > 1e6) return `${Math.round(b / 1e6)} MB`
  return `${Math.max(1, Math.round(b / 1e3))} KB`
}

function saved<T extends string>(key: string, fallback: T, allowed: readonly string[]): T {
  try {
    const v = localStorage.getItem(key)
    return v !== null && allowed.includes(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

export function Baixador() {
  const { flash } = useToast()
  const status = useHelperStatus()
  const [params, setParams] = useSearchParams()
  const [folders, setFolders] = useState<RefFolder[]>([])
  const [downloads, setDownloads] = useState<Download[]>([])
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<Mode>(() => saved('hm-baixador-mode', 'premiere', ['premiere', 'max', 'audio']))
  const [browser, setBrowser] = useState<string>(() => saved<string>('hm-baixador-browser', '', BROWSERS.map((b) => b.id)))
  const [libFolder, setLibFolder] = useState<string>('todas')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    const [f, d] = await Promise.all([
      api.get<RefFolder[]>('/baixador/pastas'),
      api.get<Download[]>('/baixador/downloads?limit=300'),
    ]).catch(() => [[], []] as [RefFolder[], Download[]])
    setFolders(f)
    setDownloads(d)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const { jobs, reload } = useJobs(['download'], (job) => {
    if (job.status === 'ok') load()
  })

  useEffect(() => {
    try {
      localStorage.setItem('hm-baixador-mode', mode)
      localStorage.setItem('hm-baixador-browser', browser)
    } catch {}
  }, [mode, browser])

  // "+ Nova pasta" do topo do Workspace chega como ?new=1
  useEffect(() => {
    if (!params.get('new')) return
    const next = new URLSearchParams(params)
    next.delete('new')
    setParams(next, { replace: true })
    newFolder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const folderName = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders])
  const totalLinks = folders.reduce((n, f) => n + extractLinks(texts[f.id] ?? '').length, 0)

  async function newFolder() {
    const name = window.prompt('Nome da pasta de ref (ex.: Motion, Moodboard)')?.trim()
    if (!name) return
    try {
      await api.post('/baixador/pastas', { name })
      load()
      flash('Pasta criada')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Não deu pra criar')
    }
  }

  async function removeFolder(f: RefFolder) {
    if (!window.confirm(`Tirar "${f.name}" da lista? Os arquivos continuam no PC.`)) return
    await api.delete(`/baixador/pastas/${f.id}`)
    load()
  }

  async function downloadAll() {
    const payloads = folders.flatMap((f) =>
      extractLinks(texts[f.id] ?? '').map((url) => ({ url, folder_id: f.id, mode, browser })),
    )
    if (!payloads.length) return
    setSending(true)
    try {
      for (let i = 0; i < payloads.length; i += 100) {
        await api.post('/jobs', { type: 'download', payloads: payloads.slice(i, i + 100), target: getTarget() || undefined })
      }
      setTexts({})
      reload()
      flash(`${payloads.length} ${payloads.length === 1 ? 'link na fila' : 'links na fila'}`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Não deu pra enviar')
    } finally {
      setSending(false)
    }
  }

  async function openFolder(kind: 'root' | 'folder' | 'download', id?: string) {
    await createJob('open', { kind, id })
    flash(status?.online ? 'Abrindo a pasta no PC' : 'Abre quando o ajudante ligar')
  }

  async function removeDownload(d: Download) {
    await api.delete(`/baixador/downloads/${d.id}`)
    setDownloads((l) => l.filter((x) => x.id !== d.id))
  }

  const recent = libFolder === 'todas' ? downloads : downloads.filter((d) => d.folder_id === libFolder)
  const visibleJobs = jobs.slice(0, 40)
  const activeCount = jobs.filter(isActive).length

  return (
    <div className="flex flex-col">
      <PageHeader
        tags={['instagram', 'youtube', 'pinterest', 'tiktok', 'x', 'giphy']}
        title="BAIXADOR"
        count={downloads.length}
        actions={<NewButton label="Nova pasta de ref" onClick={newFolder} />}
      />
      <BaixadorTabs extra={false} />

      {/* formato + login + baixar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ChipGroup>
          {MODES.map((m) => (
            <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)} className="h-9 gap-1.5 px-4">
              <i className={cn(m.icon, 'text-[15px]')} />
              {m.label}
            </Chip>
          ))}
        </ChipGroup>
        <Dropdown
          label="Login do navegador"
          icon="ri-key-2-line"
          value={browser}
          onChange={setBrowser}
          options={BROWSERS.map((b) => ({ value: b.id, label: b.id ? `Login do ${b.label}` : b.label }))}
          className="w-[190px]"
        />
        <HelperPill status={status} />
        <TargetPicker />
        <button
          type="button"
          onClick={downloadAll}
          disabled={!totalLinks || sending}
          className="press ml-auto flex h-11 items-center gap-2 rounded-[var(--r-control)] bg-primary px-5 text-[14px] font-medium text-primary-foreground shadow-soft outline-none hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300 disabled:opacity-35"
        >
          <i className="ri-download-cloud-2-line text-[17px]" />
          {totalLinks ? `Baixar ${totalLinks} ${totalLinks === 1 ? 'link' : 'links'}` : 'Baixar tudo'}
        </button>
      </div>
      <p className="-mt-3 mb-6 px-1 text-[12.5px] text-sub">
        {MODES.find((m) => m.id === mode)?.hint}. Instagram ou Pinterest deram erro? Escolha o navegador onde você está logado.
      </p>

      {/* pastas de ref */}
      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {folders.map((f) => {
          const links = extractLinks(texts[f.id] ?? '')
          const thumbs = downloads.filter((d) => d.folder_id === f.id && d.thumb_key).slice(0, 4)
          return (
            <section key={f.id} className="flex flex-col gap-3 rounded-[var(--r-card)] border border-mist-200 bg-surface p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[14px] bg-ice-100 text-abyss-600">
                  <i className="ri-folder-3-line text-[18px]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium tracking-[-0.02em] text-fg first-letter:uppercase">{f.name}</span>
                  <span className="text-[11.5px] text-sub">
                    {f.downloads} {f.downloads === 1 ? 'arquivo baixado' : 'arquivos baixados'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => openFolder('folder', f.id)}
                  title="Abrir a pasta no PC"
                  aria-label="Abrir a pasta no PC"
                  className="press flex h-8 w-8 items-center justify-center rounded-full text-sub outline-none hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
                >
                  <i className="ri-folder-open-line" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFolder(f)}
                  title="Tirar da lista"
                  aria-label="Tirar da lista"
                  className="press flex h-8 w-8 items-center justify-center rounded-full text-sub outline-none hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
                >
                  <i className="ri-close-line" />
                </button>
              </div>
              <textarea
                value={texts[f.id] ?? ''}
                onChange={(e) => setTexts((t) => ({ ...t, [f.id]: e.target.value }))}
                placeholder="Cole os links aqui (um por linha ou tudo junto)"
                rows={4}
                className="w-full resize-y rounded-[var(--r-inner)] border border-mist-200 bg-mist-50 px-4 py-3 font-code text-[12px] leading-[1.6] text-fg outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:text-[13px] placeholder:text-mist-400 focus:border-ice-400 focus:ring-4 focus:ring-ice-200/60"
              />
              <div className="flex items-center gap-2">
                {links.length > 0 ? (
                  <span className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-[12px] font-medium text-fg">{links.length} {links.length === 1 ? 'link' : 'links'}</span>
                    {Object.entries(
                      links.reduce<Record<string, number>>((acc, u) => ({ ...acc, [platformOf(u)]: (acc[platformOf(u)] ?? 0) + 1 }), {}),
                    ).map(([p, n]) => (
                      <span key={p} className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', PLATFORM[p].tone)}>
                        <i className={PLATFORM[p].icon} /> {n}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-[12px] text-mist-400">Instagram, YouTube, Pinterest (pin ou pasta inteira), TikTok, X, Giphy</span>
                )}
                {thumbs.length > 0 && (
                  <span className="ml-auto flex -space-x-2">
                    {thumbs.map((d) => (
                      <img key={d.id} src={fileUrl(d.thumb_key)} alt="" className="h-7 w-7 rounded-full border-2 border-surface object-cover" />
                    ))}
                  </span>
                )}
              </div>
            </section>
          )
        })}
        <button
          type="button"
          onClick={newFolder}
          className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[var(--r-card)] border-2 border-dashed border-mist-300 text-sub outline-none transition-colors hover:border-ice-400 hover:bg-ice-50 hover:text-abyss-600 focus-visible:ring-4 focus-visible:ring-ice-200"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
            <i className="ri-add-line text-[18px]" />
          </span>
          <span className="text-[13px] font-medium">Nova pasta de ref</span>
        </button>
      </div>

      {/* andamento */}
      {visibleJobs.length > 0 && (
        <section className="mt-10 flex flex-col gap-3">
          <div className="flex items-end justify-between px-1">
            <h2 className="text-[22px] font-light tracking-[-0.03em] text-fg">
              {activeCount ? `Baixando ${activeCount} ${activeCount === 1 ? 'link' : 'links'}` : 'Últimos pedidos'}
            </h2>
            <button
              type="button"
              onClick={() => openFolder('root')}
              className="flex items-center gap-1 text-[12.5px] font-medium text-sub outline-none hover:text-fg focus-visible:underline"
            >
              <i className="ri-folder-open-line" /> Abrir a pasta dos arquivos
            </button>
          </div>
          <div className="flex flex-col rounded-[var(--r-card)] border border-mist-200 bg-surface p-2 shadow-soft">
            {visibleJobs.map((job) => (
              <DownloadJobRow key={job.id} job={job} folderName={folderName} helperOnline={status?.online} onChange={reload} />
            ))}
          </div>
        </section>
      )}

      {/* baixados */}
      <section className="mt-10 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="text-[22px] font-light tracking-[-0.03em] text-fg">Baixados recentemente</h2>
          <ChipGroup>
            <Chip active={libFolder === 'todas'} onClick={() => setLibFolder('todas')} className="h-8 px-3">
              Todas
            </Chip>
            {folders
              .filter((f) => f.downloads > 0)
              .map((f) => (
                <Chip key={f.id} active={libFolder === f.id} onClick={() => setLibFolder(f.id)} className="h-8 px-3">
                  {f.name}
                </Chip>
              ))}
          </ChipGroup>
        </div>
        {recent.length === 0 ? (
          <span className="rounded-[var(--r-inner)] border border-dashed border-mist-300 px-5 py-12 text-center text-[13.5px] text-sub">
            Os arquivos baixados aparecem aqui (eles ficam salvos no PC, na pasta de cada ref).
          </span>
        ) : (
          <div key={libFolder} className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {recent.map((d) => {
              const p = PLATFORM[d.platform] ?? PLATFORM.WEB
              const thumb = fileUrl(d.thumb_key)
              const files = parseJSON<string[]>(d.files, [])
              return (
                <div key={d.id} className="group flex flex-col gap-2 rounded-[var(--r-card)] border border-mist-200 bg-surface p-2 pb-3 shadow-soft">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--r-inner)] bg-gradient-to-br from-mist-100 to-ice-100">
                    {thumb ? (
                      <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-[1.04]" />
                    ) : (
                      <i className={cn(p.icon, 'absolute inset-0 m-auto h-fit w-fit text-[30px] text-abyss-500/35')} />
                    )}
                    <span className={cn('absolute top-2 left-2 flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[10.5px] font-medium backdrop-blur', p.tone)}>
                      <i className={p.icon} /> {p.label}
                    </span>
                    <span className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openFolder('download', d.id)}
                        title="Mostrar na pasta"
                        aria-label="Mostrar na pasta"
                        className="press flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift"
                      >
                        <i className="ri-folder-open-line text-[14px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDownload(d)}
                        title="Tirar da lista"
                        aria-label="Tirar da lista"
                        className="press flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-abyss-700 shadow-lift"
                      >
                        <i className="ri-close-line text-[14px]" />
                      </button>
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5 px-1">
                    <a href={d.url} target="_blank" rel="noreferrer" className="truncate text-[13px] font-medium text-fg hover:underline">
                      {d.title || d.url.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                    <span className="truncate text-[11px] text-sub">
                      {[d.folder_id ? folderName.get(d.folder_id) : null, files.length > 1 ? `${files.length} arquivos` : null, formatBytes(d.bytes), formatRelative(d.created_at)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

/** Linha compacta de um link sendo baixado. */
function DownloadJobRow({
  job,
  folderName,
  helperOnline,
  onChange,
}: {
  job: Job
  folderName: Map<string, string>
  helperOnline?: boolean
  onChange: () => void
}) {
  const payload = parseJSON<{ url: string; folder_id?: string; mode?: string }>(job.payload, { url: '' })
  const result = parseJSON<{ title?: string; skipped?: boolean; files?: string[] }>(job.result, {})
  const p = PLATFORM[platformOf(payload.url)]
  const active = isActive(job)
  const title = result.title || payload.url.replace(/^https?:\/\/(www\.)?/, '')
  const statusText =
    job.status === 'fila'
      ? helperOnline === false
        ? 'esperando o ajudante'
        : 'na fila'
      : job.status === 'rodando'
        ? job.progress != null
          ? `${Math.round(job.progress)}%`
          : job.message || 'baixando'
        : job.status === 'ok'
          ? result.skipped
            ? 'já tinha'
            : 'pronto'
          : job.status === 'cancelado'
            ? 'cancelado'
            : 'erro'

  return (
    <div className="group flex flex-col gap-1.5 rounded-[14px] px-3 py-2.5 hover:bg-mist-50">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px]', p.tone)}>
          <i className={p.icon} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{title}</span>
        {payload.folder_id && (
          <span className="hidden flex-none rounded-full bg-mist-100 px-2 py-0.5 text-[11px] text-sub sm:inline">
            {folderName.get(payload.folder_id) ?? payload.folder_id}
          </span>
        )}
        <span
          className={cn(
            'tnum w-[110px] flex-none text-right text-[12px]',
            job.status === 'ok' ? 'text-success' : job.status === 'erro' ? 'text-danger' : 'text-sub',
          )}
        >
          {statusText}
        </span>
        <button
          type="button"
          onClick={async () => {
            await (active ? cancelJob(job.id) : removeJob(job.id)).catch(() => {})
            onChange()
          }}
          aria-label={active ? 'Cancelar' : 'Tirar da lista'}
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-sub opacity-0 transition-opacity group-hover:opacity-100 hover:bg-mist-200 hover:text-fg focus-visible:opacity-100"
        >
          <i className={active ? 'ri-stop-circle-line' : 'ri-close-line'} />
        </button>
      </div>
      {job.status === 'rodando' && (
        <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-mist-100">
          <div
            className={cn('h-full rounded-full bg-primary transition-[width] duration-500', job.progress == null && 'w-1/3 animate-pulse')}
            style={job.progress != null ? { width: `${Math.max(3, job.progress)}%` } : undefined}
          />
        </div>
      )}
      {job.status === 'erro' && job.message && <span className="ml-10 text-[12px] text-danger">{job.message}</span>}
    </div>
  )
}
