"""Baixar música: link do Spotify (música, álbum, playlist) ou do YouTube → MP3 com nome, artista e capa."""
import json
import re
import uuid
from pathlib import Path

import requests
import yt_dlp

from .config import IndiceLocal, log
from .downloader import erro_amigavel
from .util import DENO, FFMPEG, MAX_UPLOAD, Cancelado, caminho_livre, duracao, miniatura, nome_seguro, para_mp3

UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}
SPOTIFY_RE = re.compile(r"open\.spotify\.com/(?:intl-[a-z-]+/)?(track|album|playlist)/([A-Za-z0-9]+)")
MESMA_GRAVACAO_S = 3  # diferença de duração aceita pra dizer que é a mesma gravação

ja_baixadas = IndiceLocal("musicas")  # link de origem → id da trilha no site


class ErroAmigavel(Exception):
    def __init__(self, amigavel: str):
        super().__init__(amigavel)
        self.amigavel = amigavel


# ---------------------------------------------------------------- Spotify (sem chave de API)

def _embed(tipo: str, sid: str) -> dict:
    r = requests.get(f"https://open.spotify.com/embed/{tipo}/{sid}", headers=UA, timeout=20)
    if r.status_code == 404:
        raise ErroAmigavel("Spotify não achou esse link (privado ou apagado?).")
    r.raise_for_status()
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', r.text, re.S)
    if not m:
        raise ErroAmigavel("Não consegui ler esse link do Spotify. Tente de novo mais tarde.")
    return json.loads(m.group(1))["props"]["pageProps"]["state"]["data"]["entity"]


def _maior_imagem(entidade: dict) -> str | None:
    imgs = (entidade.get("visualIdentity") or {}).get("image") or (entidade.get("coverArt") or {}).get("sources") or []
    if not imgs:
        return None
    return max(imgs, key=lambda i: i.get("maxWidth") or i.get("width") or 0).get("url")


def faixas_spotify(url: str) -> list[dict]:
    """[{title, artist, duration, cover, source_url}]"""
    m = SPOTIFY_RE.search(url)
    if not m:
        raise ErroAmigavel("Link do Spotify não reconhecido. Use o link de uma música, álbum ou playlist.")
    tipo, sid = m.groups()
    e = _embed(tipo, sid)
    if tipo == "track":
        return [{
            "title": e.get("name") or e.get("title"),
            "artist": ", ".join(a.get("name", "") for a in e.get("artists") or []) or None,
            "duration": (e.get("duration") or 0) / 1000 or None,
            "cover": _maior_imagem(e),
            "source_url": f"https://open.spotify.com/track/{sid}",
        }]
    capa_album = _maior_imagem(e) if tipo == "album" else None
    faixas = []
    for t in e.get("trackList") or []:
        tid = (t.get("uri") or "").split(":")[-1]
        faixas.append({
            "title": t.get("title"),
            "artist": t.get("subtitle"),
            "duration": (t.get("duration") or 0) / 1000 or None,
            "cover": capa_album,
            "source_url": f"https://open.spotify.com/track/{tid}" if tid else url,
            "_tid": tid,
        })
    return faixas


def _capa_da_faixa(faixa: dict) -> str | None:
    """Playlist não traz a capa de cada faixa: busca no embed da música."""
    if faixa.get("cover") or not faixa.get("_tid"):
        return faixa.get("cover")
    try:
        return _maior_imagem(_embed("track", faixa["_tid"]))
    except Exception:
        return None


# ---------------------------------------------------------------- YouTube

def _ydl_opts(extra: dict) -> dict:
    opts = {"quiet": True, "no_warnings": True, "noprogress": True, "ffmpeg_location": FFMPEG, "retries": 5, **extra}
    if DENO:
        opts["js_runtimes"] = {"deno": {"path": DENO}}
    return opts


def achar_no_youtube(titulo: str, artista: str | None, dur: float | None) -> tuple[dict, float | None]:
    """Procura a versão oficial; escolhe a de duração mais parecida. Devolve (entrada, diferença em s)."""
    busca = f"ytsearch6:{artista + ' - ' if artista else ''}{titulo} official audio"
    with yt_dlp.YoutubeDL(_ydl_opts({"extract_flat": "in_playlist"})) as ydl:
        res = ydl.extract_info(busca, download=False)
    entradas = [e for e in (res or {}).get("entries") or [] if e and e.get("id")]
    if not entradas:
        raise ErroAmigavel("Não achei essa música no YouTube.")

    def nota(e):
        canal = (e.get("channel") or e.get("uploader") or "").lower()
        nome = (e.get("title") or "").lower()
        bonus = 0
        if canal.endswith("- topic") or "official audio" in nome or "áudio oficial" in nome:
            bonus -= 4
        if any(k in nome for k in ("live", "ao vivo", "cover", "remix", "sped up", "slowed", "8d", "karaoke")) and not any(
            k in titulo.lower() for k in ("live", "remix", "sped", "slowed")
        ):
            bonus += 25
        diff = abs((e.get("duration") or 0) - dur) if dur and e.get("duration") else 30
        return diff + bonus

    melhor = min(entradas, key=nota)
    diff = abs((melhor.get("duration") or 0) - dur) if dur and melhor.get("duration") else None
    return melhor, diff


def baixar_mp3(ctx, url_video: str, destino_base: Path, rotulo: str) -> tuple[Path, dict]:
    """Baixa o áudio em MP3 320. Devolve (arquivo, info do yt-dlp)."""
    final = {"arquivo": None}

    def progresso(d):
        if ctx.cancelado:
            raise Cancelado()
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            pct = d.get("downloaded_bytes", 0) * 100 / total if total else None
            ctx.progresso(None if pct is None else pct, rotulo)

    opts = _ydl_opts({
        "format": "ba/b",
        "outtmpl": str(destino_base) + ".%(ext)s",
        "noplaylist": True,
        "progress_hooks": [progresso],
        "post_hooks": [lambda p: final.update(arquivo=p)],
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "320"}],
        "windowsfilenames": True,
    })
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url_video, download=True)
    arquivo = Path(final["arquivo"]) if final["arquivo"] else destino_base.with_suffix(".mp3")
    if not arquivo.exists():
        raise ErroAmigavel("O download terminou, mas o arquivo não apareceu.")
    return arquivo, info or {}


def gravar_tags(mp3: Path, titulo: str, artista: str | None, capa_jpg: Path | None):
    from mutagen.id3 import APIC, ID3, TIT2, TPE1, ID3NoHeaderError

    try:
        tags = ID3(str(mp3))
    except ID3NoHeaderError:
        tags = ID3()
    tags.delall("TIT2")
    tags.delall("TPE1")
    tags.delall("APIC")
    tags.add(TIT2(encoding=3, text=titulo))
    if artista:
        tags.add(TPE1(encoding=3, text=artista))
    if capa_jpg and capa_jpg.exists():
        tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Capa", data=capa_jpg.read_bytes()))
    tags.save(str(mp3))


# ---------------------------------------------------------------- pedido

def _uma_faixa(ctx, faixa: dict, rotulo: str) -> dict:
    """Baixa, marca e envia uma faixa. Devolve o item do resultado."""
    origem = faixa["source_url"]
    ja = ja_baixadas.get(origem)
    if ja:
        return {"title": faixa["title"], "artist": faixa.get("artist"), "status": "repetido", "track_id": ja,
                "match": None}

    match_note = None
    if faixa.get("youtube_url"):
        url_video, diff = faixa["youtube_url"], None
    else:
        ctx.progresso(None, f"{rotulo} · procurando no YouTube", forcar=True)
        entrada, diff = achar_no_youtube(faixa["title"], faixa.get("artist"), faixa.get("duration"))
        url_video = entrada.get("url") or f"https://www.youtube.com/watch?v={entrada['id']}"
        if diff is None:
            match_note = "não deu pra comparar a duração"
        elif diff <= MESMA_GRAVACAO_S:
            match_note = "mesma gravação"
        else:
            match_note = f"versão diferente ({diff:+.0f}s)" if diff else "versão diferente"

    nome = nome_seguro(f"{faixa['artist']} - {faixa['title']}" if faixa.get("artist") else faixa["title"], 120)
    base = caminho_livre(ctx.pastas.musicas / f"{nome}.mp3").with_suffix("")
    mp3, info = baixar_mp3(ctx, url_video, base, rotulo)

    # YouTube direto: título/artista vêm do vídeo
    titulo = faixa["title"] or info.get("track") or info.get("title") or "Sem nome"
    artista = faixa.get("artist") or info.get("artist") or (info.get("channel") or info.get("uploader") or "").removesuffix(
        " - Topic") or None
    capa_url = _capa_da_faixa(faixa) or info.get("thumbnail")
    if not faixa.get("title"):  # link direto do YouTube: só agora sabemos o nome
        novo = caminho_livre(ctx.pastas.musicas / (nome_seguro(f"{artista} - {titulo}" if artista else titulo, 120) + ".mp3"))
        mp3 = mp3.rename(novo)

    capa_jpg = None
    if capa_url:
        capa_jpg = miniatura(capa_url, ctx.pastas.tmp / f"capa-{uuid.uuid4().hex[:8]}.jpg", lado=640, quadrada=True)
    gravar_tags(mp3, titulo, artista, capa_jpg)

    ctx.progresso(None, f"{rotulo} · enviando pro site", forcar=True)
    envio = mp3
    if mp3.stat().st_size > MAX_UPLOAD:  # música muito longa: manda uma cópia mais leve
        envio = para_mp3(mp3, ctx.pastas.tmp / f"{uuid.uuid4().hex[:8]}.mp3", 128)
    audio_key = ctx.api.upload(envio, "audio/mpeg")
    if envio != mp3:
        envio.unlink(missing_ok=True)
    cover_key = ctx.api.upload(capa_jpg, "image/jpeg") if capa_jpg else None
    if capa_jpg:
        capa_jpg.unlink(missing_ok=True)

    dur = duracao(mp3) or faixa.get("duration") or info.get("duration")
    trilha = ctx.api.criar_trilha({
        "title": titulo,
        "artist": artista,
        "source": "spotify" if "spotify.com" in origem else "youtube",
        "source_url": origem,
        "duration_seconds": round(dur) if dur else None,
        "cover_key": cover_key,
        "audio_key": audio_key,
        "local_path": str(mp3),
        "match_note": match_note,
    })
    ja_baixadas.set(origem, trilha["id"])
    return {"title": titulo, "artist": artista, "status": "ok", "track_id": trilha["id"], "match": match_note}


def executar(ctx):
    from . import separate

    url = ctx.payload["url"].strip()
    ctx.progresso(None, "Lendo o link…", forcar=True)
    if "spotify.com" in url:
        faixas = faixas_spotify(url)
        if not faixas:
            raise ErroAmigavel("Esse link do Spotify não tem faixas.")
    elif "youtube.com" in url or "youtu.be" in url:
        if "list=" in url and "v=" not in url and "youtu.be/" not in url:
            # playlist pura: o yt-dlp baixava tudo por cima do mesmo arquivo e virava uma trilha só
            raise ErroAmigavel("Playlist do YouTube ainda não → cole o link de cada música (ou a playlist do Spotify).")
        faixas =[{"title": None, "artist": None, "duration": None, "cover": None, "source_url": url, "youtube_url": url}]
    else:
        raise ErroAmigavel("Cole um link do Spotify ou do YouTube.")

    itens = []
    total = len(faixas)
    for i, faixa in enumerate(faixas, 1):
        ctx.checar()
        rotulo = f"{i}/{total} · {faixa.get('title') or 'YouTube'}"
        ctx.progresso((i - 1) * 100 / total, rotulo, forcar=True)
        try:
            itens.append(_uma_faixa(ctx, faixa, rotulo))
        except Cancelado:
            raise
        except Exception as e:  # noqa: BLE001
            if ctx.cancelado:
                raise Cancelado()
            msg = getattr(e, "amigavel", None) or erro_amigavel(e, "YT")
            log.warning("faixa %s falhou: %s", faixa.get("title"), msg)
            itens.append({"title": faixa.get("title"), "artist": faixa.get("artist"), "status": "erro", "error": msg[:200]})

    ok = [it for it in itens if it["status"] == "ok"]
    if ctx.payload.get("separate"):
        for j, it in enumerate(ok, 1):
            ctx.checar()
            ctx.progresso(None, f"Separando a voz {j}/{len(ok)} · {it['title']}", forcar=True)
            try:
                separate.separar_trilha(ctx, it["track_id"])
                it["separated"] = True
            except Cancelado:
                raise
            except Exception as e:  # noqa: BLE001
                it["separate_error"] = (getattr(e, "amigavel", None) or str(e))[:200]

    track_ids = [it["track_id"] for it in itens if it.get("track_id")]
    if not track_ids:
        erro = next((it.get("error") for it in itens if it.get("error")), "Nenhuma faixa deu certo.")
        raise ErroAmigavel(erro)
    repetidas = sum(1 for it in itens if it["status"] == "repetido")
    falhas = sum(1 for it in itens if it["status"] == "erro")
    partes = [f"{len(ok)} baixada(s)"]
    if repetidas:
        partes.append(f"{repetidas} já tinha")
    if falhas:
        partes.append(f"{falhas} com erro")
    return {"track_ids": track_ids, "items": itens}, " · ".join(partes)
