import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { JobRow } from '../../components/trilhas/JobRow'
import { TrilhasShell } from '../../components/trilhas/TrilhasShell'
import { createJob, parseJSON, useHelperStatus, useJobs } from '../../lib/trilhas'
import { cn } from '../../lib/utils'

type MusicResult = { track_ids?: string[]; items?: { title: string; artist?: string; status?: string; match?: string }[] }

const TOOL_LABEL: Record<string, string> = {
  yt_dlp: 'baixador yt-dlp',
  gallery_dl: 'gallery-dl',
  separator: 'separador',
  ffmpeg: 'ffmpeg',
}

function linkKind(url: string) {
  const u = url.toLowerCase()
  if (u.includes('spotify.com/playlist')) return 'playlist do Spotify'
  if (u.includes('spotify.com/album')) return 'álbum do Spotify'
  if (u.includes('spotify.com/track')) return 'música do Spotify'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube'
  return 'link'
}

export function BaixarMusica() {
  const navigate = useNavigate()
  const { flash } = useToast()
  const status = useHelperStatus()
  const [url, setUrl] = useState('')
  const [separate, setSeparate] = useState(false)
  const [sending, setSending] = useState(false)
  const { jobs, reload } = useJobs(['music'], (job) => {
    if (job.status === 'ok') flash('Música na biblioteca')
  })

  const valid = /^https?:\/\/\S+$/.test(url.trim())

  async function submit() {
    if (!valid) return
    setSending(true)
    try {
      await createJob('music', { url: url.trim(), separate })
      setUrl('')
      reload()
      flash(status?.online ? 'Pedido enviado pro ajudante' : 'Na fila — abre quando o ajudante ligar')
    } finally {
      setSending(false)
    }
  }

  async function tools(type: 'update_tools' | 'open') {
    await createJob(type, type === 'open' ? { kind: 'root' } : {})
    flash(type === 'open' ? 'Abrindo a pasta no PC' : 'Atualizando o baixador no PC')
  }

  const toolsInfo = status?.info?.tools ?? {}

  return (
    <TrilhasShell count={jobs.length}>
      <div className="flex flex-col gap-6">
        <section
          className="relative flex flex-col gap-5 overflow-hidden rounded-[var(--r-panel)] p-7 text-white md:p-9"
          style={{ background: 'var(--hero-gradient)' }}
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-[clamp(26px,2.6vw,36px)] leading-[1.05] font-light tracking-[-0.035em]">Baixar música do Spotify</h2>
            <p className="max-w-[70ch] text-[13.5px] leading-[1.55] text-white/60">
              Cole o link de uma música, álbum ou playlist do Spotify (ou um link do YouTube). O ajudante lê as faixas e baixa
              cada uma do YouTube, na versão oficial quando existe, com nome, artista e capa no arquivo. Cada faixa diz se o que
              ele achou é a mesma gravação.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-2 md:flex-row">
              <label className="flex h-13 flex-1 items-center gap-3 rounded-[var(--r-control)] border border-white/14 bg-white/[0.07] px-5 focus-within:border-ice-400 focus-within:ring-4 focus-within:ring-ice-400/20">
                <i className="ri-spotify-fill text-[20px] text-ice-300" />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/…"
                  aria-label="Link da música, álbum ou playlist"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35"
                />
                {valid && <span className="hidden flex-none text-[11.5px] text-white/45 sm:block">{linkKind(url)}</span>}
              </label>
              <button
                type="submit"
                disabled={!valid || sending}
                className="press flex h-13 flex-none items-center justify-center gap-2 rounded-[var(--r-control)] bg-ice-400 px-6 text-[14.5px] font-semibold text-abyss-950 outline-none hover:bg-ice-300 focus-visible:ring-4 focus-visible:ring-ice-400/40 disabled:opacity-40"
              >
                <i className="ri-download-2-line text-[17px]" /> Baixar
              </button>
            </div>
            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[13px] text-white/75">
              <input type="checkbox" checked={separate} onChange={(e) => setSeparate(e.target.checked)} className="peer sr-only" />
              <span className="flex h-5 w-5 items-center justify-center rounded-[6px] border border-white/25 transition-colors peer-checked:border-ice-400 peer-checked:bg-ice-400 peer-checked:text-abyss-950 peer-focus-visible:ring-2 peer-focus-visible:ring-ice-400">
                {separate && <i className="ri-check-line text-[13px]" />}
              </span>
              Separar a voz depois de baixar (instrumental + voz)
            </label>
          </form>
        </section>

        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between px-1">
            <h3 className="text-[20px] font-light tracking-[-0.03em] text-fg">Pedidos</h3>
            <button
              type="button"
              onClick={() => navigate('/trilhas')}
              className="flex items-center gap-1 text-[12.5px] font-medium text-sub outline-none hover:text-fg focus-visible:underline"
            >
              Ver biblioteca <i className="ri-arrow-right-line" />
            </button>
          </div>
          {jobs.length === 0 && (
            <span className="rounded-[var(--r-inner)] border border-dashed border-mist-300 px-5 py-10 text-center text-[13.5px] text-sub">
              Nada baixado ainda. Cole um link aí em cima.
            </span>
          )}
          <div className="stagger flex flex-col gap-3">
            {jobs.map((job) => {
              const payload = parseJSON<{ url: string; separate?: boolean }>(job.payload, { url: '' })
              const result = parseJSON<MusicResult>(job.result, {})
              return (
                <JobRow
                  key={job.id}
                  job={job}
                  icon="ri-music-2-line"
                  title={payload.url.replace(/^https?:\/\/(www\.|open\.)?/, '')}
                  subtitle={`${linkKind(payload.url)}${payload.separate ? ' · separar voz' : ''}`}
                  helperOnline={status?.online}
                  onChange={reload}
                >
                  {!!result.items?.length && (
                    <div className="flex flex-col divide-y divide-mist-200/70 rounded-[14px] bg-mist-50 px-3">
                      {result.items.map((it, i) => {
                        const same = (it.match ?? '').toLowerCase().includes('mesma')
                        return (
                          <div key={i} className="flex items-center gap-3 py-2">
                            <span className="tnum w-5 text-[11px] text-mist-400">{i + 1}</span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[13px] text-fg">{it.title}</span>
                              {it.artist && <span className="truncate text-[11.5px] text-sub">{it.artist}</span>}
                            </span>
                            {it.match && (
                              <span
                                className={cn(
                                  'flex-none rounded-full px-2 py-0.5 text-[11px] font-medium',
                                  same ? 'bg-success/12 text-success' : 'bg-warning/15 text-[#a87b22]',
                                )}
                              >
                                {it.match}
                              </span>
                            )}
                            {it.status && it.status !== 'ok' && <span className="flex-none text-[11px] text-danger">{it.status}</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </JobRow>
              )
            })}
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[var(--r-inner)] border border-mist-200 bg-surface px-5 py-4 text-[12px] text-sub shadow-soft">
          {status?.info?.version && <span>Ajudante {status.info.version}</span>}
          {Object.entries(toolsInfo).map(([k, v]) => (
            <span key={k}>
              {TOOL_LABEL[k] ?? k} <span className="font-code text-fg">{v ?? '—'}</span>
            </span>
          ))}
          {!status?.online && <span>Ajudante desligado — os pedidos esperam na fila.</span>}
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => tools('update_tools')}
              className="press h-9 rounded-[var(--r-control)] border border-mist-200 px-3.5 text-[12.5px] font-medium text-abyss-700 outline-none hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200"
            >
              Atualizar o baixador
            </button>
            <button
              type="button"
              onClick={() => tools('open')}
              className="press h-9 rounded-[var(--r-control)] border border-mist-200 px-3.5 text-[12.5px] font-medium text-abyss-700 outline-none hover:bg-mist-50 focus-visible:ring-4 focus-visible:ring-ice-200"
            >
              Abrir a pasta dos arquivos
            </button>
          </span>
        </footer>
      </div>
    </TrilhasShell>
  )
}
