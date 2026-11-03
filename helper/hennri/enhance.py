"""Melhorar voz: tira ruído, equilibra e deixa a voz no volume de entrega (-16 LUFS)."""
import shutil
import uuid
from pathlib import Path

from .config import log
from .util import AUDIO_EXT, MAX_UPLOAD, VIDEO_EXT, Cancelado, caminho_livre, ffmpeg, nome_seguro

# corta graves de vento/ar-condicionado e chiado agudo, tira ruído de fundo,
# segura picos e normaliza o volume (-16 LUFS, padrão de redes/YouTube)
CADEIA_FFMPEG = (
    "highpass=f=80,"
    "lowpass=f=15500,"
    "afftdn=nf=-28:tn=1,"
    "equalizer=f=3000:t=q:w=1.2:g=2,"
    "acompressor=threshold=-21dB:ratio=3:attack=5:release=90:makeup=2,"
    "loudnorm=I=-16:TP=-1.5:LRA=11"
)


class ErroAmigavel(Exception):
    def __init__(self, amigavel: str):
        super().__init__(amigavel)
        self.amigavel = amigavel


def _deepfilter(entrada_wav: Path, saida_wav: Path) -> bool:
    """Se o DeepFilterNet estiver instalado, usa ele pra tirar o ruído (melhor que o filtro do ffmpeg)."""
    try:
        from df.enhance import enhance, init_df, load_audio, save_audio
    except Exception:
        return False
    try:
        modelo, estado, _ = init_df()
        audio, _ = load_audio(str(entrada_wav), sr=estado.sr())
        save_audio(str(saida_wav), enhance(modelo, estado, audio), estado.sr())
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("DeepFilterNet falhou, uso só o ffmpeg: %s", e)
        return False


def executar(ctx):
    p = ctx.payload
    tmp_entrada = None
    if p.get("track_id"):
        trilha = ctx.api.trilha(p["track_id"])
        nome = trilha["title"]
        local = Path(trilha["local_path"]) if trilha.get("local_path") else None
        if not local or not local.exists():
            if not trilha.get("audio_key"):
                raise ErroAmigavel("Essa trilha não tem áudio no site.")
            tmp_entrada = ctx.pastas.tmp / f"{uuid.uuid4().hex[:8]}{Path(trilha['audio_key']).suffix or '.mp3'}"
            ctx.progresso(None, "Baixando o arquivo do site…", forcar=True)
            local = ctx.api.baixar_arquivo(trilha["audio_key"], tmp_entrada)
    else:
        nome = p.get("name") or "Voz"
        ext = Path(p["file_key"]).suffix or Path(nome).suffix or ".mp3"
        tmp_entrada = ctx.pastas.tmp / f"{uuid.uuid4().hex[:8]}{ext}"
        ctx.progresso(None, "Baixando o arquivo do site…", forcar=True)
        local = ctx.api.baixar_arquivo(p["file_key"], tmp_entrada)

    # só tira a extensão se for de mídia: "Aula 1.2 - Intro" não pode virar "Aula 1"
    sufixo = Path(nome).suffix.lower()
    base = nome_seguro(nome[: -len(sufixo)] if sufixo in VIDEO_EXT | AUDIO_EXT else nome, 100)
    e_video = local.suffix.lower() in VIDEO_EXT
    trabalho = ctx.pastas.tmp / uuid.uuid4().hex[:8]
    trabalho.mkdir(parents=True, exist_ok=True)
    audio_final = video_final = None
    try:
        ctx.checar()
        ctx.progresso(20, "Limpando o ruído…", forcar=True)
        wav = trabalho / "entrada.wav"
        ffmpeg("-i", str(local), "-vn", "-ac", "1", "-ar", "48000", str(wav))
        limpo = trabalho / "limpo.wav"
        origem = limpo if _deepfilter(wav, limpo) else wav
        ctx.checar()
        ctx.progresso(60, "Equilibrando e ajustando o volume…", forcar=True)
        audio_final = caminho_livre(ctx.pastas.voz / f"{base} (voz melhorada).mp3")
        ffmpeg("-i", str(origem), "-af", CADEIA_FFMPEG, "-ar", "48000", "-codec:a", "libmp3lame", "-b:a", "192k",
               str(audio_final))

        video_final = None
        if e_video:  # devolve também o vídeo com a voz nova (imagem intacta)
            ctx.progresso(80, "Montando o vídeo com a voz nova…", forcar=True)
            video_final = caminho_livre(ctx.pastas.voz / f"{base} (voz melhorada).mp4")
            ffmpeg("-i", str(local), "-i", str(audio_final), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                   "-c:a", "aac", "-b:a", "192k", "-shortest", str(video_final))

        ctx.checar()
        ctx.progresso(92, "Enviando pro site…", forcar=True)
        enviar = video_final if video_final and video_final.stat().st_size <= MAX_UPLOAD else audio_final
        tipo = "video/mp4" if enviar.suffix == ".mp4" else "audio/mpeg"
        output_key = ctx.api.upload(enviar, tipo)
        audio_key = output_key if enviar == audio_final else ctx.api.upload(audio_final, "audio/mpeg")
        resultado = {
            "output_key": output_key,
            "audio_key": audio_key,
            "kind": "video" if enviar.suffix == ".mp4" else "audio",
            "name": enviar.name,
            "local_path": str(video_final or audio_final),
        }
        return resultado, "Voz melhorada" + (" (vídeo e áudio)" if video_final else "")
    except Cancelado:  # cancelado no meio: não deixa arquivo pela metade em Voz melhorada
        for f in (audio_final, video_final):
            if f:
                f.unlink(missing_ok=True)
        raise
    finally:
        shutil.rmtree(trabalho, ignore_errors=True)
        if tmp_entrada:
            tmp_entrada.unlink(missing_ok=True)
