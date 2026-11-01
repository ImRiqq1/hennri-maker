import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePlayer, type Version } from '../../components/player/Player'
import { useToast } from '../../components/Toast'
import { TrackCover } from '../../components/trilhas/TrackCard'
import { FileDrop } from '../../components/trilhas/FileDrop'
import { JobRow } from '../../components/trilhas/JobRow'
import { TrilhasShell } from '../../components/trilhas/TrilhasShell'
import { api } from '../../lib/api'
import { SOURCE_LABEL, clock, createJob, isActive, isSeparated, parseJSON, useHelperStatus, useJobs } from '../../lib/trilhas'
import type { Track } from '../../lib/types'
import { cn } from '../../lib/utils'

export function RemoverVoz() {
  const { flash } = useToast()
  const player = usePlayer()
  const status = useHelperStatus()
  const [tracks, setTracks] = useState<Track[]>([])

  const load = useCallback(async () => {
    setTracks(await api.get<Track[]>('/trilhas/tracks').catch(() => []))
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const { jobs, reload } = useJobs(['separate'], (job) => {
    if (job.status === 'ok') {
      flash('Voz separada')
      load()
    }
  })
  const byTrack = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])
  const activeIds = new Set(jobs.filter(isActive).map((j) => parseJSON<{ track_id?: string }>(j.payload, {}).track_id))

  const pending = tracks.filter((t) => !isSeparated(t) && t.audio_key)
  const done = tracks.filter(isSeparated)

  async function separate(track: Track) {
    await createJob('separate', { track_id: track.id })
    reload()
    flash(status?.online ? 'Separando na placa de vídeo' : 'Na fila — separa quando o ajudante ligar')
  }

  async function uploaded(file: { key: string; name: string; duration: number | null }) {
    const track = await api.post<Track>('/trilhas/tracks', { title: file.name, audio_key: file.key, duration_seconds: file.duration })
    await createJob('separate', { track_id: track.id })
    await load()
    reload()
    flash('Enviado — a separação está na fila')
  }

  const playVersion = (t: Track, v: Version) => player.play(t, done, v)

  return (
    <TrilhasShell count={done.length}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-4 rounded-[var(--r-panel)] border border-mist-200 bg-surface p-6 shadow-soft">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-light tracking-[-0.03em] text-fg">Separar voz e instrumental</h2>
            <p className="text-[13px] leading-[1.5] text-sub">
              A IA divide a música em duas faixas: só o instrumental e só a voz. Roda na placa de vídeo do seu PC
              {status?.info?.gpu ? ` (${status.info.gpu.replace(/^NVIDIA (GeForce )?/, '')})` : ''}.
            </p>
          </div>
          <FileDrop accept="audio/*" hint="MP3, WAV, M4A ou FLAC · até 95 MB" onUploaded={uploaded} />

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-medium tracking-[0.06em] text-mist-400 uppercase">Da biblioteca</span>
            <span className="text-[12px] text-sub">{pending.length} sem voz separada</span>
          </div>
          {pending.length === 0 && <span className="py-4 text-center text-[13px] text-sub">Tudo separado por aqui.</span>}
          <div className="stagger flex max-h-[420px] flex-col gap-1 overflow-y-auto">
            {pending.map((t) => {
              const running = activeIds.has(t.id)
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-[16px] px-2 py-2 hover:bg-mist-50">
                  <TrackCover track={t} className="h-11 w-11 flex-none rounded-[12px]" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-medium text-fg">{t.title}</span>
                    <span className="truncate text-[11.5px] text-sub">
                      {t.artist ?? 'Artista desconhecido'} · {SOURCE_LABEL[t.source]} · {clock(t.duration_seconds)}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => separate(t)}
                    className={cn(
                      'press flex h-9 flex-none items-center gap-1.5 rounded-[var(--r-control)] px-3.5 text-[12.5px] font-medium outline-none focus-visible:ring-4 focus-visible:ring-ice-200',
                      running ? 'bg-mist-100 text-sub' : 'bg-primary text-primary-foreground',
                    )}
                  >
                    <i className={running ? 'ri-loader-4-line animate-spin' : 'ri-scissors-cut-line'} />
                    {running ? 'Na fila' : 'Separar'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {jobs.some(isActive) && (
            <section className="flex flex-col gap-3">
              <h3 className="px-1 text-[20px] font-light tracking-[-0.03em] text-fg">Separando agora</h3>
              {jobs.filter(isActive).map((job) => {
                const t = byTrack.get(parseJSON<{ track_id?: string }>(job.payload, {}).track_id ?? '')
                return (
                  <JobRow
                    key={job.id}
                    job={job}
                    icon="ri-scissors-cut-line"
                    title={t?.title ?? 'Trilha'}
                    subtitle={t?.artist ?? undefined}
                    helperOnline={status?.online}
                    onChange={reload}
                  />
                )
              })}
            </section>
          )}
          {jobs.some((j) => j.status === 'erro') && (
            <section className="flex flex-col gap-3">
              {jobs
                .filter((j) => j.status === 'erro')
                .slice(0, 3)
                .map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    icon="ri-scissors-cut-line"
                    title={byTrack.get(parseJSON<{ track_id?: string }>(job.payload, {}).track_id ?? '')?.title ?? 'Trilha'}
                    onChange={reload}
                  />
                ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex items-end justify-between px-1">
              <h3 className="text-[20px] font-light tracking-[-0.03em] text-fg">Separadas</h3>
              <span className="text-[12px] text-sub">{done.length} faixas</span>
            </div>
            {done.length === 0 && (
              <span className="rounded-[var(--r-inner)] border border-dashed border-mist-300 px-5 py-10 text-center text-[13.5px] text-sub">
                Quando separar, as faixas aparecem aqui com Instrumental e Voz.
              </span>
            )}
            <div className="stagger flex flex-col gap-2">
              {done.map((t) => {
                const current = player.isCurrent(t.id)
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-[var(--r-inner)] border border-mist-200 bg-surface p-3 shadow-soft">
                    <TrackCover track={t} className="h-12 w-12 flex-none rounded-[14px]" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13.5px] font-medium text-fg">{t.title}</span>
                      <span className="truncate text-[11.5px] text-sub">{t.artist ?? 'Artista desconhecido'}</span>
                    </span>
                    <div className="flex flex-none items-center gap-1 rounded-[calc(var(--r-control)+4px)] bg-mist-100 p-1">
                      {(['original', 'instrumental', 'voz'] as Version[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => (current && player.version === v ? player.toggle() : playVersion(t, v))}
                          className={cn(
                            'press flex h-8 items-center gap-1.5 rounded-[var(--r-control)] px-3 text-[12px] font-medium capitalize outline-none focus-visible:ring-4 focus-visible:ring-ice-200',
                            current && player.version === v ? 'bg-primary text-primary-foreground' : 'text-abyss-700 hover:bg-surface',
                          )}
                        >
                          <i className={current && player.version === v && player.playing ? 'ri-pause-fill' : 'ri-play-fill'} />
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </TrilhasShell>
  )
}
