"""Melhorar voz: IA na GPU isola a voz (tira ruído, música e barulho de fundo) e tira o eco da sala;
depois equaliza, comprime e deixa no volume de entrega (-16 LUFS). Sem a IA, cai no filtro do ffmpeg."""
import shutil
import uuid
from pathlib import Path

from .config import log
from .util import AUDIO_EXT, MAX_UPLOAD, VIDEO_EXT, Cancelado, caminho_livre, ffmpeg, nome_seguro

# reserva (sem IA): corta graves de vento/ar-condicionado e chiado agudo, tira ruído de fundo,
# segura picos e normaliza o volume (-16 LUFS, padrão de redes/YouTube)
CADEIA_FFMPEG = (
    "highpass=f=80,"
    "lowpass=f=15500,"
    "afftdn=nf=-28:tn=1,"
    "equalizer=f=3000:t=q:w=1.2:g=2,"
    "acompressor=threshold=-21dB:ratio=3:attack=5:release=90:makeup=2,"
    "loudnorm=I=-16:TP=-1.5:LRA=11"
)
# depois da IA a voz já vem limpa: só acabamento (presença, brilho, compressor e volume)
CADEIA_IA = (
    "highpass=f=70,"
    "equalizer=f=3000:t=q:w=1.2:g=2,"
    "treble=g=1.5:f=9000,"
    "acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,"
    "loudnorm=I=-16:TP=-1.5:LRA=11"
)


class ErroAmigavel(Exception):
    def __init__(self, amigavel: str):
        super().__init__(amigavel)
        self.amigavel = amigavel


def _so_a_faixa(faixas: list[Path], nome: str) -> Path | None:
    """Fica com a faixa `nome` e apaga as outras que o modelo gerou."""
    from .separate import faixa

    escolhida = next((a for a in faixas if faixa(a).replace(" ", "") == nome), None)
    for a in faixas:
        if a != escolhida:
            a.unlink(missing_ok=True)
    return escolhida


def _limpar_com_ia(ctx, wav: Path) -> Path | None:
    """Voz isolada (BS-Roformer) e sem eco (MelBand Roformer de-reverb). None se a IA não estiver disponível."""
    from . import separate

    if not separate.disponivel():
        return None
    try:
        faixas = separate.rodar_modelo(ctx, wav, (separate.MODELO, separate.MODELO_RESERVA),
                                       "Isolando a voz e tirando o ruído (IA)…")
        voz = _so_a_faixa(faixas, "vocals")
    except Cancelado:
        raise
    except Exception as e:  # noqa: BLE001 - modelo não carregou, GPU sem memória…: entrega pelo ffmpeg
        log.warning("melhorar voz: IA falhou, uso só o ffmpeg: %s", e)
        return None
    if not voz:
        return None
    try:
        faixas = separate.rodar_modelo(ctx, voz, (separate.MODELO_ECO, separate.MODELO_ECO_RESERVA),
                                       "Tirando o eco da sala (IA)…")
        seca = _so_a_faixa(faixas, "noreverb")
    except Cancelado:
        voz.unlink(missing_ok=True)
        raise
    except Exception as e:  # noqa: BLE001 - sem o de-reverb, a voz isolada já é bem melhor que nada
        log.warning("melhorar voz: tirar o eco falhou, sigo com a voz isolada: %s", e)
        seca = None
    if not seca:
        return voz
    voz.unlink(missing_ok=True)
    return seca


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
    audio_final = video_final = limpa = None
    try:
        ctx.checar()
        ctx.progresso(10, "Preparando o áudio…", forcar=True)
        wav = trabalho / "entrada.wav"
        # os modelos de IA trabalham em 44,1 kHz estéreo
        ffmpeg("-i", str(local), "-vn", "-ac", "2", "-ar", "44100", str(wav))
        limpa = _limpar_com_ia(ctx, wav)
        ctx.checar()
        ctx.progresso(80, "Equilibrando e ajustando o volume…", forcar=True)
        audio_final = caminho_livre(ctx.pastas.voz / f"{base} (voz melhorada).mp3")
        ffmpeg("-i", str(limpa or wav), "-af", CADEIA_IA if limpa else CADEIA_FFMPEG, "-ac", "1", "-ar", "48000",
               "-codec:a", "libmp3lame", "-b:a", "192k", str(audio_final))

        video_final = None
        if e_video:  # devolve também o vídeo com a voz nova (imagem intacta)
            ctx.progresso(88, "Montando o vídeo com a voz nova…", forcar=True)
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
            "engine": "ia" if limpa else "ffmpeg",
        }
        return resultado, "Voz melhorada" + (" com IA" if limpa else "") + (" (vídeo e áudio)" if video_final else "")
    except Cancelado:  # cancelado no meio: não deixa arquivo pela metade em Voz melhorada
        for f in (audio_final, video_final):
            if f:
                f.unlink(missing_ok=True)
        raise
    finally:
        if limpa:  # a IA escreve na pasta de trabalho do separador
            limpa.unlink(missing_ok=True)
        shutil.rmtree(trabalho, ignore_errors=True)
        if tmp_entrada:
            tmp_entrada.unlink(missing_ok=True)
