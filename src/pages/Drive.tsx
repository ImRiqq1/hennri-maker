import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { BaixadorTabs } from '../components/BaixadorTabs'
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog'
import { cancelJob, createJob, isActive, parseJSON, removeJob, useHelperStatus, useJobs } from '../lib/trilhas'
import type { Job } from '../lib/types'
import { cn } from '../lib/utils'

/** Resumo que o ajudante devolve depois de ler a pasta (drive_scan). */
type Scan = {
  name: string
  mode: 'publico' | 'conta'
  files: number
  folders: number
  bytes: number
  unknown_sizes: number
  types: [string, number][]
  top: { name: string; folder: boolean; files: number; bytes: number }[]
  top_total: number
  skipped: string[]
}

/** Andamento/resultado do download (drive), atualizado a cada 2s pelo ajudante. */
type Progress = {
  name: string
  path: string
  files_total: number
  files_done: number
  files_skipped: number
  files_failed: number
  bytes_total: number
  bytes_done: number
  unknown_sizes: number
  speed: number
  eta: number | null
  current: string[]
  failed: { path: string; error: string }[]
}

type Payload = { url: string; dest?: string; name?: string }

const DEST_KEY = 'hm-drive-dest'
const DRIVE_RE = /^https?:\/\/(drive|docs)\.google\.com\/\S+$/

function bytes(b: number) {
  if (b >= 1e12) return `${(b / 1e12).toFixed(2).replace('.', ',')} TB`
  if (b >= 1e9) return `${(b / 1e9).toFixed(1).replace('.', ',')} GB`
  if (b >= 1e6) return `${Math.round(b / 1e6)} MB`
  return `${Math.max(1, Math.round(b / 1e3))} KB`
}

const num = (n: number) => n.toLocaleString('pt-BR')

function duration(s: number) {
  if (s < 90) return 'menos de 2 min'
  if (s < 3600) return `${Math.round(s / 60)} min`
  return `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')} min`
}

export function Drive() {
  const { flash } = useToast()
  const status = useHelperStatus()
  const [url, setUrl] = useState('')
  const [dest, setDest] = useState(() => {
    try {
      return localStorage.getItem(DEST_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [scanId, setScanId] = useState<string | null>(null)
  const [googleOpen, setGoogleOpen] = useState(false)
  const { jobs, reload } = useJobs(['drive_scan', 'drive', 'drive_google'], (job) => {
    if (job.type === 'drive' && job.status === 'ok') flash('Pasta do Drive baixada')
    if (job.type === 'drive_google' && job.status === 'ok') flash(job.message ?? 'Pronto')
  })

  useEffect(() => {
    try {
      if (dest.trim()) localStorage.setItem(DEST_KEY, dest.trim())
      else localStorage.removeItem(DEST_KEY)
    } catch {}
  }, [dest])

  const valid = DRIVE_RE.test(url.trim())
  const scan = jobs.find((j) => j.id === scanId)
  const downloads = jobs.filter((j) => j.type === 'drive')
  const googleJob = jobs.find((j) => j.type === 'drive_google' && isActive(j))
  const account = status?.info?.google
  const root = status?.info?.root
  const sep = status?.info?.platform === 'mac' ? '/' : '\\'

  async function read() {
    if (!valid) return
    const r = await createJob('drive_scan', { url: url.trim() })
    setScanId(r.jobs[0]?.id ?? null)
    reload()
    if (!status?.online) flash('Na fila — lê quando o ajudante ligar')
  }

  async function download(payload: Payload) {
    await createJob('drive', payload)
    reload()
    flash(status?.online ? 'Baixando no PC' : 'Na fila — começa quando o ajudante ligar')
  }

  async function startFromScan(name: string) {
    await download({ url: parseJSON<Payload>(scan!.payload, { url: '' }).url, dest: dest.trim() || undefined, name })
    setScanId(null)
    setUrl('')
  }

  async function logoutGoogle() {
    if (!window.confirm('Desconectar a conta Google do ajudante? Pastas privadas param de baixar.')) return
    await createJob('drive_google', { action: 'logout' })
    reload()
  }

  return (
    <div className="flex flex-col">
      <PageHeader tags={['google drive', 'pastas inteiras', 'continua de onde parou']} title="BAIXADOR" count={downloads.length} />
      <BaixadorTabs />

      <div className="flex flex-col gap-6">
        <section
          className="relative flex flex-col gap-5 overflow-hidden rounded-[var(--r-panel)] p-7 text-white md:p-9"
          style={{ background: 'var(--hero-gradient)' }}
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-[clamp(26px,2.6vw,36px)] leading-[1.05] font-light tracking-[-0.035em]">Baixar pasta do Drive</h2>
            <p className="max-w-[72ch] text-[13.5px] leading-[1.55] text-white/60">
              Cole o link da pasta do cliente. O ajudante baixa tudo direto pro computador, com as mesmas pastas e nomes do
              Drive — sem zip quebrado em partes. Se a internet cair ou o PC desligar, ele continua de onde parou.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              read()
            }}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col gap-2 md:flex-row">
              <label className="flex h-13 flex-1 items-center gap-3 rounded-[var(--r-control)] border border-white/14 bg-white/[0.07] px-5 focus-within:border-ice-400 focus-within:ring-4 focus-within:ring-ice-400/20">
                <i className="ri-drive-line text-[20px] text-ice-300" />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/…"
                  aria-label="Link da pasta do Drive"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35"
                />
              </label>
              <button
                type="submit"
                disabled={!valid || (!!scan && isActive(scan))}
                className="press flex h-13 flex-none items-center justify-center gap-2 rounded-[var(--r-control)] bg-ice-400 px-6 text-[14.5px] font-semibold text-abyss-950 outline-none hover:bg-ice-300 focus-visible:ring-4 focus-visible:ring-ice-400/40 disabled:opacity-40"
              >
                <i className="ri-search-line text-[17px]" /> Ler pasta
              </button>
            </div>
            <label className="flex h-11 items-center gap-3 rounded-[var(--r-control)] border border-white/10 bg-white/[0.04] px-5 focus-within:border-ice-400/70">
              <span className="flex-none text-[12.5px] text-white/50">Salvar em</span>
              <input
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder={root ? `${root}${sep}Drive${sep}<nome da pasta>` : 'Downloads/HENNRI/Drive/<nome da pasta>'}
                aria-label="Pasta onde salvar no computador"
                className="min-w-0 flex-1 bg-transparent font-code text-[12.5px] text-white outline-none placeholder:text-white/30"
              />
            </label>
            <span className="px-1 text-[11.5px] text-white/40">
              {dest.trim()
                ? 'O conteúdo da pasta do Drive vai direto nessa pasta.'
                : 'Deixe vazio pra salvar na pasta do HENNRI, ou escreva o caminho (ex.: A:\\Clientes\\Fulano).'}
            </span>
          </form>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-[12.5px]">
            <i className="ri-lock-2-line text-[15px] text-ice-300" />
            {googleJob ? (
              <span className="text-white/70">{googleJob.message || 'Conectando a conta Google…'}</span>
            ) : account ? (
              <>
                <span className="text-white/70">
                  Pastas privadas: <span className="font-medium text-white">{account}</span>
                </span>
                <button type="button" onClick={logoutGoogle} className="text-white/45 underline-offset-2 outline-none hover:text-white hover:underline">
                  Desconectar
                </button>
              </>
            ) : (
              <>
                <span className="text-white/60">Pasta que só abre com o seu e-mail?</span>
                <button
                  type="button"
                  onClick={() => setGoogleOpen(true)}
                  className="press rounded-full border border-white/15 px-3 py-1 font-medium text-white outline-none hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-ice-400"
                >
                  Conectar conta Google
                </button>
              </>
            )}
          </div>
        </section>

        {scan && (
          <ScanCard
            job={scan}
            helperOnline={status?.online}
            destLabel={dest.trim() || null}
            onStart={startFromScan}
            onClose={() => setScanId(null)}
          />
        )}

        <div className="flex flex-col gap-3">
          <h3 className="px-1 text-[20px] font-light tracking-[-0.03em] text-fg">Downloads do Drive</h3>
          {downloads.length === 0 ? (
            <span className="rounded-[var(--r-inner)] border border-dashed border-mist-300 px-5 py-10 text-center text-[13.5px] text-sub">
              Nada baixado ainda. Cole o link de uma pasta aí em cima.
            </span>
          ) : (
            <div className="stagger flex flex-col gap-3">
              {downloads.map((job) => (
                <DriveJob key={job.id} job={job} helperOnline={status?.online} onResume={download} onChange={reload} />
              ))}
            </div>
          )}
        </div>
      </div>

      <GoogleDialog open={googleOpen} onOpenChange={setGoogleOpen} onSent={reload} />
    </div>
  )
}

/** Prévia da pasta: total, tipos e o primeiro nível — antes de começar a baixar. */
function ScanCard({
  job,
  helperOnline,
  destLabel,
  onStart,
  onClose,
}: {
  job: Job
  helperOnline?: boolean
  destLabel: string | null
  onStart: (name: string) => void
  onClose: () => void
}) {
  const scan = job.status === 'ok' ? parseJSON<Scan | null>(job.result, null) : null

  if (!scan) {
    const waiting = job.status === 'fila'
    return (
      <section className="pop-in flex items-center gap-4 rounded-[var(--r-card)] border border-mist-200 bg-surface p-5 shadow-soft">
        <span
          className={cn(
            'flex h-11 w-11 flex-none items-center justify-center rounded-[14px]',
            job.status === 'erro' ? 'bg-danger/12 text-danger' : 'bg-ice-100 text-abyss-600',
          )}
        >
          <i className={cn(job.status === 'erro' ? 'ri-error-warning-line' : 'ri-loader-4-line animate-spin', 'text-[20px]')} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-medium text-fg">
            {job.status === 'erro' ? 'Não deu pra ler a pasta' : waiting ? 'Esperando o ajudante…' : 'Lendo a pasta…'}
          </span>
          <span className={cn('text-[12.5px]', job.status === 'erro' ? 'text-danger' : 'text-sub')}>
            {job.status === 'erro'
              ? job.message
              : waiting
                ? helperOnline === false
                  ? 'O ajudante do PC está desligado. Abra ele pra continuar.'
                  : 'Na fila'
                : job.message || 'Contando os arquivos e as subpastas'}
          </span>
        </div>
        {job.status === 'rodando' && job.progress != null && (
          <span className="tnum flex-none text-[13px] text-sub">{Math.round(job.progress)}%</span>
        )}
        <button
          type="button"
          onClick={async () => {
            if (isActive(job)) await cancelJob(job.id).catch(() => {})
            onClose()
          }}
          aria-label="Fechar"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-sub outline-none hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
        >
          <i className="ri-close-line" />
        </button>
      </section>
    )
  }

  return (
    <section className="pop-in flex flex-col gap-5 rounded-[var(--r-card)] border border-mist-200 bg-surface p-6 shadow-soft">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[16px] bg-ice-100 text-abyss-600">
          <i className="ri-folder-cloud-line text-[22px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[17px] font-medium tracking-[-0.02em] text-fg">{scan.name}</span>
          <span className="tnum text-[13px] text-sub">
            {num(scan.files)} {scan.files === 1 ? 'arquivo' : 'arquivos'}
            {scan.folders > 0 && ` em ${num(scan.folders + 1)} pastas`}
            {scan.bytes > 0 && ` · ${scan.unknown_sizes ? '+ de ' : ''}${bytes(scan.bytes)}`}
            {scan.mode === 'conta' && ' · pela sua conta Google'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-sub outline-none hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
        >
          <i className="ri-close-line" />
        </button>
      </div>

      {scan.types.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scan.types.map(([ext, n]) => (
            <span key={ext} className="tnum rounded-full bg-mist-100 px-2.5 py-1 text-[11.5px] text-sub">
              <span className="font-medium text-fg">{num(n)}</span> .{ext}
            </span>
          ))}
        </div>
      )}

      <div className="flex max-h-[320px] flex-col overflow-y-auto rounded-[var(--r-inner)] border border-mist-200 bg-mist-50 p-1.5">
        {scan.top.map((t) => (
          <div key={t.name} className="flex items-center gap-3 rounded-[10px] px-3 py-2">
            <i className={cn(t.folder ? 'ri-folder-3-fill text-abyss-500' : 'ri-file-line text-mist-400', 'text-[16px]')} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{t.name}</span>
            <span className="tnum flex-none text-[12px] text-sub">
              {t.folder ? `${num(t.files)} ${t.files === 1 ? 'arquivo' : 'arquivos'}` : ''}
              {t.bytes > 0 && `${t.folder ? ' · ' : ''}${bytes(t.bytes)}`}
            </span>
          </div>
        ))}
        {scan.top_total > scan.top.length && (
          <span className="px-3 py-2 text-[12px] text-sub">e mais {num(scan.top_total - scan.top.length)} itens</span>
        )}
      </div>

      {scan.skipped.length > 0 && (
        <span className="text-[12px] text-sub">
          {scan.skipped.length} {scan.skipped.length === 1 ? 'item fica' : 'itens ficam'} de fora (Forms ou Sites do Google não
          dão pra baixar).
        </span>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 truncate font-code text-[12px] text-sub">
          <i className="ri-hard-drive-2-line mr-1.5" />
          {destLabel ?? `Drive/${scan.name}`}
        </span>
        <button
          type="button"
          onClick={() => onStart(scan.name)}
          className="press flex h-11 items-center gap-2 rounded-[var(--r-control)] bg-primary px-6 text-[14px] font-medium text-primary-foreground shadow-soft outline-none hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300"
        >
          <i className="ri-download-cloud-2-line text-[17px]" />
          Baixar tudo{scan.bytes > 0 && ` · ${bytes(scan.bytes)}`}
        </button>
      </div>
    </section>
  )
}

/** Um download de pasta: barra, arquivos, GB, velocidade, tempo que falta, pausar/continuar. */
function DriveJob({
  job,
  helperOnline,
  onResume,
  onChange,
}: {
  job: Job
  helperOnline?: boolean
  onResume: (p: Payload) => void
  onChange: () => void
}) {
  const payload = parseJSON<Payload>(job.payload, { url: '' })
  const p = parseJSON<Progress | null>(job.result, null)
  const active = isActive(job)
  const [showFailed, setShowFailed] = useState(false)
  const pct = job.status === 'ok' ? 100 : job.progress ?? 0
  const title = p?.name || payload.name || payload.url.replace(/^https?:\/\//, '')
  const canResume = job.status === 'cancelado' || job.status === 'erro' || (job.status === 'ok' && !!p?.files_failed)

  const tone =
    job.status === 'ok' ? 'bg-success/12 text-success' : job.status === 'erro' ? 'bg-danger/12 text-danger' : 'bg-ice-100 text-abyss-600'
  const label =
    job.status === 'fila'
      ? helperOnline === false
        ? 'Esperando o ajudante'
        : 'Na fila'
      : job.status === 'rodando'
        ? `${Math.floor(pct)}%`
        : job.status === 'ok'
          ? p?.files_failed
            ? `${p.files_failed} faltaram`
            : 'Pronto'
          : job.status === 'cancelado'
            ? 'Pausado'
            : 'Erro'

  return (
    <div className="flex flex-col gap-3 rounded-[var(--r-inner)] border border-mist-200 bg-surface p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-[14px]', tone)}>
          <i className={cn(job.status === 'rodando' ? 'ri-loader-4-line animate-spin' : 'ri-drive-line', 'text-[18px]')} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] font-medium text-fg">{title}</span>
          <span className="truncate font-code text-[11.5px] text-sub">{p?.path || payload.dest || 'Drive'}</span>
        </div>
        <span className={cn('tnum flex-none rounded-full px-2.5 py-1 text-[11.5px] font-medium', tone)}>{label}</span>
        <div className="flex flex-none items-center gap-1">
          {job.status === 'ok' && p?.path && (
            <IconBtn
              icon="ri-folder-open-line"
              label="Abrir a pasta no PC"
              onClick={() => createJob('open', { kind: 'path', path: p.path })}
            />
          )}
          {canResume && <IconBtn icon="ri-play-line" label="Continuar de onde parou" onClick={() => onResume(payload)} />}
          {active ? (
            <IconBtn
              icon="ri-pause-line"
              label="Pausar"
              onClick={async () => {
                await cancelJob(job.id).catch(() => {})
                onChange()
              }}
            />
          ) : (
            <IconBtn
              icon="ri-close-line"
              label="Tirar da lista (os arquivos ficam no PC)"
              onClick={async () => {
                await removeJob(job.id).catch(() => {})
                onChange()
              }}
            />
          )}
        </div>
      </div>

      {(job.status === 'rodando' || p) && (
        <div className="ml-13 flex flex-col gap-2">
          <div className="h-2 overflow-hidden rounded-full bg-mist-100">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)]',
                job.status === 'ok' ? 'bg-success' : job.status === 'cancelado' ? 'bg-mist-400' : 'bg-primary',
                job.status === 'rodando' && !p && 'w-1/4 animate-pulse',
              )}
              style={p || job.status !== 'rodando' ? { width: `${Math.max(2, pct)}%` } : undefined}
            />
          </div>
          {p ? (
            <div className="tnum flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-sub">
              <span>
                <span className="font-medium text-fg">{num(p.files_done)}</span> de {num(p.files_total)} arquivos
              </span>
              {p.bytes_total > 0 && (
                <span>
                  <span className="font-medium text-fg">{bytes(p.bytes_done)}</span> de {bytes(p.bytes_total)}
                </span>
              )}
              {job.status === 'rodando' && p.speed > 0 && <span>{bytes(p.speed)}/s</span>}
              {job.status === 'rodando' && p.eta != null && <span>faltam {duration(p.eta)}</span>}
              {p.files_skipped > 0 && <span>{num(p.files_skipped)} já tinha</span>}
            </div>
          ) : (
            <span className="text-[12.5px] text-sub">{job.message || 'Lendo a pasta…'}</span>
          )}
          {job.status === 'rodando' && !!p?.current.length && (
            <div className="flex flex-col gap-0.5">
              {p.current.map((c) => (
                <span key={c} className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-mist-500">
                  <i className="ri-arrow-down-line flex-none text-ice-500" />
                  <span className="truncate">{c}</span>
                </span>
              ))}
            </div>
          )}
          {!!p?.failed.length && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setShowFailed((v) => !v)}
                className="flex w-fit items-center gap-1 text-[12px] font-medium text-warning outline-none hover:underline"
              >
                <i className="ri-error-warning-line" />
                {p.files_failed} {p.files_failed === 1 ? 'arquivo não baixou' : 'arquivos não baixaram'} — clique em continuar
                pra tentar de novo
                <i className={cn('ri-arrow-down-s-line transition-transform', showFailed && 'rotate-180')} />
              </button>
              {showFailed && (
                <div className="flex flex-col gap-0.5 rounded-[10px] bg-mist-50 px-3 py-2">
                  {p.failed.map((f) => (
                    <span key={f.path} className="truncate text-[11.5px] text-sub">
                      {f.path} <span className="text-mist-400">· {f.error}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {job.status === 'erro' && job.message && <span className="ml-13 text-[12.5px] text-danger">{job.message}</span>}
    </div>
  )
}

function IconBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="press flex h-8 w-8 items-center justify-center rounded-full text-sub outline-none hover:bg-mist-100 hover:text-fg focus-visible:ring-4 focus-visible:ring-ice-200"
    >
      <i className={icon} />
    </button>
  )
}

const GOOGLE_STEPS: { text: string; link?: string }[] = [
  { text: 'Abra o Google Cloud e crie um projeto (ex.: "HENNRI Maker").', link: 'https://console.cloud.google.com/projectcreate' },
  { text: 'Ative a "Google Drive API" nesse projeto.', link: 'https://console.cloud.google.com/apis/library/drive.googleapis.com' },
  {
    text: 'Em "Google Auth Platform", configure: nome do app, seu e-mail, público "Externo". Depois, em Público-alvo, clique em "Publicar app" (sem isso o acesso vence em 7 dias).',
    link: 'https://console.cloud.google.com/auth/overview',
  },
  {
    text: 'Em Clientes → Criar cliente → tipo "App para computador". Copie o ID do cliente e a Chave secreta e cole aqui.',
    link: 'https://console.cloud.google.com/auth/clients',
  },
  {
    text: 'Clique em Conectar: o navegador do PC abre pra entrar no Google. Se aparecer "app não verificado", vá em Avançado → Acessar (o app é seu).',
  },
]

/** Passo a passo pra conectar a conta Google no ajudante (pastas privadas). */
function GoogleDialog({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (v: boolean) => void; onSent: () => void }) {
  const { flash } = useToast()
  const [clientId, setClientId] = useState('')
  const [secret, setSecret] = useState('')
  const valid = clientId.trim().endsWith('.apps.googleusercontent.com') && secret.trim().length > 8

  async function connect() {
    await createJob('drive_google', { action: 'login', client_id: clientId.trim(), client_secret: secret.trim() })
    setSecret('')
    onOpenChange(false)
    onSent()
    flash('Entre na sua conta Google no navegador do PC')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] gap-0 border-0 p-6 text-white sm:max-w-[520px]" style={{ background: 'var(--floating-gradient)' }}>
        <DialogTitle className="mb-1 text-[18px] font-medium tracking-[-0.02em] text-white">Conectar conta Google</DialogTitle>
        <p className="mb-5 text-[12.5px] leading-[1.5] text-white/55">
          Só precisa pra pastas que abrem apenas com o seu e-mail. É feito uma vez, uns 10 minutos. O acesso é só de leitura e
          fica guardado no seu PC.
        </p>
        <ol className="mb-5 flex flex-col gap-3">
          {GOOGLE_STEPS.map((s, i) => (
            <li key={i} className="flex gap-3 text-[13px] leading-[1.5] text-white/80">
              <span className="tnum flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/10 text-[12px] font-medium text-ice-300">
                {i + 1}
              </span>
              <span>
                {s.text}
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 text-ice-300 hover:underline">
                    abrir <i className="ri-external-link-line text-[12px]" />
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2">
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="ID do cliente (….apps.googleusercontent.com)"
            aria-label="ID do cliente"
            className="h-11 rounded-[var(--r-control)] border border-white/12 bg-white/[0.07] px-4 font-code text-[12.5px] text-white outline-none placeholder:font-sans placeholder:text-white/30 focus:border-ice-400"
          />
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Chave secreta do cliente"
            aria-label="Chave secreta do cliente"
            type="password"
            className="h-11 rounded-[var(--r-control)] border border-white/12 bg-white/[0.07] px-4 font-code text-[12.5px] text-white outline-none placeholder:font-sans placeholder:text-white/30 focus:border-ice-400"
          />
          <button
            type="button"
            onClick={connect}
            disabled={!valid}
            className="press mt-1 flex h-11 items-center justify-center gap-2 rounded-full bg-ice-400 text-[14px] font-semibold text-abyss-950 outline-none hover:bg-ice-300 focus-visible:ring-2 focus-visible:ring-ice-300 disabled:opacity-40"
          >
            <i className="ri-google-fill" /> Conectar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
