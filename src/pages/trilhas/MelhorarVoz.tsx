import { useEffect, useState } from 'react'
import { useToast } from '../../components/Toast'
import { FileDrop } from '../../components/trilhas/FileDrop'
import { JobRow } from '../../components/trilhas/JobRow'
import { TrilhasShell } from '../../components/trilhas/TrilhasShell'
import { api, fileUrl } from '../../lib/api'
import { createJob, parseJSON, useHelperStatus, useJobs } from '../../lib/trilhas'
import type { Track } from '../../lib/types'
import { Dropdown } from '../../components/Dropdown'

type EnhanceResult = { output_key?: string; name?: string; local_path?: string; engine?: 'ia' | 'ffmpeg' }

export function MelhorarVoz() {
  const { flash } = useToast()
  const status = useHelperStatus()
  const [tracks, setTracks] = useState<Track[]>([])
  const [pick, setPick] = useState('')
  const { jobs, reload } = useJobs(['enhance'], (job) => {
    if (job.status === 'ok') flash('Voz melhorada pronta')
  })

  useEffect(() => {
    api
      .get<Track[]>('/trilhas/tracks')
      .then(setTracks)
      .catch(() => {})
  }, [])

  async function uploaded(file: { key: string; name: string }) {
    await createJob('enhance', { file_key: file.key, name: file.name })
    reload()
    flash(status?.online ? 'Melhorando a voz no PC' : 'Na fila — roda quando o ajudante ligar')
  }

  async function fromTrack() {
    const t = tracks.find((x) => x.id === pick)
    if (!t) return
    await createJob('enhance', { track_id: t.id, name: t.title })
    setPick('')
    reload()
    flash('Pedido enviado')
  }

  return (
    <TrilhasShell count={jobs.filter((j) => j.status === 'ok').length}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col gap-4 rounded-[var(--r-panel)] border border-mist-200 bg-surface p-6 shadow-soft xl:sticky xl:top-2 xl:self-start">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-light tracking-[-0.03em] text-fg">Melhorar voz</h2>
            <p className="text-[13px] leading-[1.5] text-sub">
              A IA isola a sua voz (tira ruído, música e barulho de fundo) e tira o eco da sala, depois deixa no volume certo.
              Roda na placa de vídeo do seu PC. Funciona com áudio ou com o vídeo gravado (o ajudante tira o áudio sozinho).
              Uma cópia também fica salva no PC.
            </p>
          </div>
          <FileDrop accept="audio/*,video/*" hint="Áudio ou vídeo (MP3, WAV, M4A, MP4, MOV) · até 95 MB" onUploaded={uploaded} />
          <div className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-mist-200" />
            <span className="text-[11.5px] text-mist-400">ou uma trilha da biblioteca</span>
            <span className="h-px flex-1 bg-mist-200" />
          </div>
          <div className="flex gap-2">
            <Dropdown
              label="Trilha da biblioteca"
              icon="ri-music-2-line"
              placeholder="Escolher trilha…"
              value={pick}
              onChange={setPick}
              options={tracks.map((t) => ({ value: t.id, label: t.artist ? `${t.title} — ${t.artist}` : t.title }))}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={!pick}
              onClick={fromTrack}
              className="press h-11 flex-none rounded-[var(--r-control)] bg-primary px-5 text-[13.5px] font-medium text-primary-foreground outline-none focus-visible:ring-4 focus-visible:ring-ice-300 disabled:opacity-35"
            >
              Melhorar
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between px-1">
            <h3 className="text-[20px] font-light tracking-[-0.03em] text-fg">Resultados</h3>
            <span className="text-[12px] text-sub">{jobs.length} pedidos</span>
          </div>
          {jobs.length === 0 && (
            <span className="rounded-[var(--r-inner)] border border-dashed border-mist-300 px-5 py-12 text-center text-[13.5px] text-sub">
              Envie uma gravação pra começar.
            </span>
          )}
          <div className="stagger flex flex-col gap-3">
            {jobs.map((job) => {
              const payload = parseJSON<{ name?: string }>(job.payload, {})
              const result = parseJSON<EnhanceResult>(job.result, {})
              const src = fileUrl(result.output_key)
              return (
                <JobRow
                  key={job.id}
                  job={job}
                  icon="ri-mic-2-line"
                  title={result.name || payload.name || 'Gravação'}
                  subtitle={
                    [result.engine === 'ia' ? 'com IA' : result.engine === 'ffmpeg' ? 'sem IA (filtro simples)' : null, result.local_path ? 'salvo no PC' : null]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  helperOnline={status?.online}
                  onChange={reload}
                >
                  {src && (
                    <div className="flex flex-col gap-2 rounded-[14px] bg-mist-50 p-3 sm:flex-row sm:items-center">
                      <audio controls preload="none" src={src} className="h-9 w-full min-w-0 flex-1" />
                      <a
                        href={src}
                        download={`${result.name || 'voz-melhorada'}`}
                        className="press flex h-9 flex-none items-center justify-center gap-1.5 rounded-[var(--r-control)] bg-primary px-4 text-[12.5px] font-medium text-primary-foreground outline-none hover:text-primary-foreground focus-visible:ring-4 focus-visible:ring-ice-300"
                      >
                        <i className="ri-download-2-line" /> Baixar
                      </a>
                    </div>
                  )}
                </JobRow>
              )
            })}
          </div>
        </section>
      </div>
    </TrilhasShell>
  )
}
