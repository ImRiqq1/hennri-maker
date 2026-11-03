"""Baixador: refs em massa (Instagram, YouTube, Pinterest, TikTok, X, Giphy) — lógica do HENNRI-Baixador antigo."""
import json
import re
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path

import requests
import yt_dlp

from .config import DADOS, HELPER_DIR, IndiceLocal, ler_config, log
from .util import ANSI, DENO, FFMPEG, IMAGEM_EXT, SEM_JANELA, VIDEO_EXT, Cancelado, miniatura, nome_seguro

LIMITE_PASTA_PINTEREST = 300  # máx. de pins por pasta/board do Pinterest
ARQ_YTDLP = ".arquivo-ytdlp.txt"
ARQ_GDL = ".arquivo-gdl.sqlite3"
NAVEGADORES = ("", "firefox", "chrome", "edge", "brave", "opera")

MODOS = {
    "premiere": {  # H.264 + AAC — abre liso no Premiere/After (YouTube até 1080p)
        "format": "bv*[vcodec^=avc1]+ba[ext=m4a]/b[vcodec^=avc1]/bv*[vcodec^=avc1]+ba/bv*+ba/b",
        "merge_output_format": "mp4",
    },
    "max": {"format": "bv*+ba/b", "merge_output_format": "mp4/mkv"},
    "audio": {
        "format": "ba/b",
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "320"}],
    },
}

downloads_locais = IndiceLocal("downloads")  # id do download no site → arquivos no PC


def cookies_txt() -> Path | None:
    for p in (DADOS / "cookies.txt", HELPER_DIR / "cookies.txt"):
        if p.exists():
            return p
    return None


def plataforma(url: str) -> str:
    u = url.lower()
    if "instagram.com" in u:
        return "IG"
    if "youtube.com" in u or "youtu.be" in u:
        return "YT"
    if "pinterest." in u or "pin.it" in u:
        return "PIN"
    if "tiktok.com" in u:
        return "TT"
    if "twitter.com" in u or "x.com/" in u:
        return "X"
    if "giphy.com" in u or "gph.is" in u:
        return "GIF"
    return "WEB"


def e_board_pinterest(url: str) -> bool:
    u = url.lower()
    return "pinterest." in u and "/pin/" not in u


def erro_amigavel(msg: str, plat: str) -> str:
    msg = ANSI.sub("", str(msg)).replace("ERROR: ", "").strip()
    msg = re.sub(r";?\s*please report this issue.*$", "", msg, flags=re.I | re.S)
    low = msg.lower()
    if any(k in low for k in ("unable to connect", "timed out", "getaddrinfo", "connection reset", "proxy")):
        return "Sem conexão com o site. Tente de novo."
    if plat == "IG" and any(k in low for k in ("login", "rate", "cookies", "empty media", "not available", "401", "403")):
        return "Instagram pediu login → escolha o navegador logado em \"Login do navegador\" e tente de novo."
    if "cookie" in low and ("could not copy" in low or "decrypt" in low or "database" in low):
        return "Não consegui ler os cookies desse navegador. Feche o navegador ou escolha Firefox / Nenhum."
    if plat == "TT" and ("unexpected response" in low or "challenge" in low or "impersonat" in low):
        return "TikTok bloqueou o acesso. Atualize o baixador no site; se continuar, use o login do navegador."
    if plat == "PIN" and ("api request failed" in low or "404" in low):
        return "Pinterest não respondeu → pasta privada, link errado ou sem conexão."
    if "private" in low:
        return "Conteúdo privado — precisa do login de uma conta com acesso."
    if "sign in to confirm" in low or "not a bot" in low:
        return "YouTube pediu verificação → use o login do navegador."
    if "unsupported url" in low:
        return "Link não suportado."
    if "video unavailable" in low or "video is unavailable" in low or "has been removed" in low:
        return "Vídeo indisponível (apagado, privado ou bloqueado no Brasil)."
    return msg.splitlines()[-1][:280] if msg else "Erro desconhecido."


def sem_video(msg) -> bool:
    low = str(msg).lower()
    return any(k in low for k in ("no video", "no media", "there is no video", "requested format is not available"))


class ErroAmigavel(Exception):
    def __init__(self, amigavel: str):
        super().__init__(amigavel)
        self.amigavel = amigavel


def baixar_ytdlp(ctx, url: str, destino: Path, modo: str, navegador: str, estado: dict):
    def progresso(d):
        if ctx.cancelado:
            raise Cancelado()
        info = d.get("info_dict") or {}
        if info.get("title") and not estado.get("titulo"):
            estado["titulo"] = info["title"]
            estado["thumb_url"] = info.get("thumbnail")
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            pct = d.get("downloaded_bytes", 0) * 100 / total if total else None
            ctx.progresso(pct, "Baixando · " + (estado.get("titulo") or url)[:80])
        elif d["status"] == "finished":
            ctx.progresso(100, "Processando…")

    def finalizado(caminho):
        estado["arquivos"].append(str(Path(caminho)))

    opts = {
        "outtmpl": str(destino / "%(uploader,channel,uploader_id|anon).40B - %(title).70B [%(id)s].%(ext)s"),
        "ffmpeg_location": FFMPEG,
        "download_archive": str(destino / ARQ_YTDLP),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "progress_hooks": [progresso],
        "post_hooks": [finalizado],
        "retries": 5,
        "fragment_retries": 5,
        "concurrent_fragment_downloads": 4,
        "windowsfilenames": True,
        **MODOS[modo],
    }
    if DENO:
        opts["js_runtimes"] = {"deno": {"path": DENO}}
    ck = cookies_txt()
    if ck:
        opts["cookiefile"] = str(ck)
    elif navegador:
        opts["cookiesfrombrowser"] = (navegador,)

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except Exception as e:
        # Chrome/Edge aberto trava o banco de cookies: tenta de novo sem cookies em vez de falhar
        if "cookiesfrombrowser" in opts and "cookie" in str(e).lower() and not ctx.cancelado:
            opts.pop("cookiesfrombrowser")
            estado["aviso"] = "cookies do navegador indisponíveis — baixado sem login"
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
        else:
            raise
    if info:
        estado["titulo"] = estado.get("titulo") or info.get("title")
        estado["thumb_url"] = estado.get("thumb_url") or info.get("thumbnail")


def baixar_gallery(ctx, url: str, destino: Path, navegador: str, estado: dict, tmp_raiz: Path):
    """Imagens/carrosséis/boards (Pinterest, posts de foto do Insta)."""
    ctx.progresso(None, "Baixando imagens…", forcar=True)
    tmp = tmp_raiz / uuid.uuid4().hex[:10]
    tmp.mkdir(parents=True)
    cmd = [
        sys.executable, "-m", "gallery_dl",
        "-D", str(tmp),
        "--download-archive", str(destino / ARQ_GDL),
        "--range", f"1-{LIMITE_PASTA_PINTEREST}",
        "-o", "downloader.ytdl.raw-options=" + json.dumps({"ffmpeg_location": FFMPEG}),
    ]
    ck = cookies_txt()
    if ck:
        cmd += ["--cookies", str(ck)]
    elif navegador:
        cmd += ["--cookies-from-browser", navegador]
    cmd.append(url)
    try:
        def rodar(c):
            return subprocess.run(c, capture_output=True, text=True, encoding="utf-8", errors="replace",
                                  timeout=60 * 30, creationflags=SEM_JANELA)

        r = rodar(cmd)
        if r.returncode != 0 and "--cookies-from-browser" in cmd and "cookie" in (r.stderr or "").lower():
            i = cmd.index("--cookies-from-browser")
            del cmd[i:i + 2]
            estado["aviso"] = "cookies do navegador indisponíveis — baixado sem login"
            r = rodar(cmd)
        novos = sorted(f for f in tmp.rglob("*") if f.is_file())
        for f in novos:
            alvo = destino / f.name
            n = 1
            while alvo.exists():
                alvo = destino / f"{f.stem} ({n}){f.suffix}"
                n += 1
            shutil.move(str(f), alvo)
            estado["arquivos"].append(str(alvo))
        if r.returncode != 0 and not novos:
            linhas = [l for l in (r.stderr or r.stdout or "").splitlines() if l.strip()]
            raise RuntimeError(linhas[-1] if linhas else f"gallery-dl falhou (código {r.returncode})")
        if not estado.get("titulo"):
            estado["titulo"] = f"{len(novos)} arquivo(s)" if novos else None
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _giphy_id(url: str) -> str | None:
    """giphy.com/gifs|stickers|clips/<slug>-<ID>, media*.giphy.com/media/[v1.../]<ID>/giphy.gif, i.giphy.com/<ID>.gif"""
    caminho = url.split("?")[0].split("#")[0].rstrip("/")
    m = re.search(r"giphy\.com/(?:gifs|stickers|clips|embed)/(?:[^/]*-)?([A-Za-z0-9]+)$", caminho)
    if m:
        return m.group(1)
    m = re.search(r"giphy\.com/media/(?:v1\.[^/]+/)?([A-Za-z0-9]+)/", caminho)
    if m:
        return m.group(1)
    m = re.search(r"i\.giphy\.com/(?:media/)?([A-Za-z0-9]+)(?:\.\w+)?$", caminho)
    return m.group(1) if m else None


def baixar_giphy(ctx, url: str, destino: Path, modo: str, estado: dict):
    """Giphy: o MP4 (H.264, abre no Premiere) e o GIF original de cada link."""
    if modo == "audio":
        raise ErroAmigavel("GIF do Giphy não tem áudio → escolha Premiere ou Máx.")
    ua = {"User-Agent": "Mozilla/5.0"}
    if "gph.is" in url.lower():  # link curto: segue o redirecionamento até o giphy.com
        url = requests.get(url, headers=ua, timeout=20, allow_redirects=True).url
    gid = _giphy_id(url)
    if not gid:
        raise ErroAmigavel("Link do Giphy não reconhecido → abra o GIF no site e copie o link da página.")

    # título: API do Giphy se tiver chave ("giphy_api_key" no config.json); senão vem do próprio link
    # (giphy.com/gifs/ai-cat-boxing-<ID> → "ai cat boxing") — a página do Giphy bloqueia robô
    titulo = None
    chave = ler_config().get("giphy_api_key")
    if chave:
        try:
            r = requests.get(f"https://api.giphy.com/v1/gifs/{gid}", params={"api_key": chave}, timeout=20)
            if r.ok:
                titulo = ((r.json().get("data") or {}).get("title") or "").strip() or None
        except (requests.RequestException, ValueError) as e:
            log.warning("giphy: API não respondeu pra %s: %s", gid, e)
    if not titulo:
        m = re.search(r"/(?:gifs|stickers|clips)/(.+)-" + re.escape(gid), url)
        titulo = m.group(1).replace("-", " ").strip() if m else "Giphy"
    estado["titulo"] = titulo
    base = f"{nome_seguro(titulo, 70)} [{gid}]"

    for ext in ("mp4", "gif"):
        alvo = destino / f"{base}.{ext}"
        if alvo.exists():
            continue
        ctx.progresso(0, f"Baixando · {titulo[:70]} ({ext.upper()})", forcar=True)
        parcial = alvo.with_name(alvo.name + ".part")
        with requests.get(f"https://i.giphy.com/media/{gid}/giphy.{ext}", headers=ua, timeout=60, stream=True) as r:
            if r.status_code == 404:
                raise ErroAmigavel("GIF não encontrado no Giphy (apagado ou link errado).")
            r.raise_for_status()
            total = int(r.headers.get("content-length") or 0)
            feito = 0
            with open(parcial, "wb") as f:
                for pedaco in r.iter_content(256 * 1024):
                    if ctx.cancelado:
                        raise Cancelado()
                    f.write(pedaco)
                    feito += len(pedaco)
                    ctx.progresso(feito * 100 / total if total else None, f"Baixando · {titulo[:70]} ({ext.upper()})")
        parcial.replace(alvo)
        estado["arquivos"].append(str(alvo))


def _limpar_pedacos(destino: Path, desde: float):
    """Download cancelado: apaga os pedaços (.part, .ytdl, fragmentos) que ficaram pela metade."""
    for f in destino.iterdir():
        try:
            if f.is_file() and f.stat().st_mtime >= desde - 5 and (
                f.suffix in (".part", ".ytdl") or ".part-Frag" in f.name or f.name.endswith(".temp")
            ):
                f.unlink()
        except OSError:
            pass


def _nome_pasta(ctx, folder_id: str | None) -> str:
    if not folder_id:
        return "Sem pasta"
    try:
        for p in ctx.api.pastas():
            if p["id"] == folder_id:
                return nome_seguro(p["name"], 60)
    except Exception as e:
        log.warning("não consegui ler as pastas: %s", e)
    return nome_seguro(folder_id, 60)


def executar(ctx):
    p = ctx.payload
    url = p["url"].strip()
    modo = p.get("mode") or "premiere"
    navegador = p.get("browser") or ""
    if modo not in MODOS:
        raise ErroAmigavel("Formato inválido.")
    if navegador not in NAVEGADORES:
        navegador = ""
    plat = plataforma(url)
    destino = ctx.pastas.baixador / _nome_pasta(ctx, p.get("folder_id"))
    destino.mkdir(parents=True, exist_ok=True)
    estado: dict = {"arquivos": [], "titulo": None, "thumb_url": None}
    inicio = time.time()

    ctx.progresso(0, "Começando…", forcar=True)
    try:
        if plat == "PIN" and e_board_pinterest(url):
            baixar_gallery(ctx, url, destino, navegador, estado, ctx.pastas.tmp)
        elif plat == "GIF":
            baixar_giphy(ctx, url, destino, modo, estado)
        else:
            try:
                baixar_ytdlp(ctx, url, destino, modo, navegador, estado)
            except Cancelado:
                raise
            except Exception as e:  # post de foto/carrossel → gallery-dl
                if plat in ("IG", "PIN", "X") and sem_video(e):
                    baixar_gallery(ctx, url, destino, navegador, estado, ctx.pastas.tmp)
                else:
                    raise
    except Exception as e:  # noqa: BLE001
        if isinstance(e, Cancelado) or ctx.cancelado:
            _limpar_pedacos(destino, inicio)
            raise Cancelado()
        raise ErroAmigavel(erro_amigavel(e, plat))

    arquivos = [a for a in estado["arquivos"] if Path(a).exists()]
    if not arquivos:
        return {"skipped": True, "title": estado.get("titulo")}, "Já tinha esse link nessa pasta."

    # miniatura pro site: thumbnail do yt-dlp, ou a primeira imagem/vídeo baixado
    thumb_key = None
    try:
        jpg = ctx.pastas.tmp / f"thumb-{uuid.uuid4().hex[:8]}.jpg"
        origem = estado.get("thumb_url") or next(
            (a for a in arquivos if Path(a).suffix.lower() in IMAGEM_EXT | VIDEO_EXT), None
        )
        if origem and miniatura(origem, jpg):
            thumb_key = ctx.api.upload(jpg, "image/jpeg")
            jpg.unlink(missing_ok=True)
    except Exception as e:
        log.warning("miniatura falhou: %s", e)

    total = sum(Path(a).stat().st_size for a in arquivos)
    registro = ctx.api.registrar_download({
        "folder_id": p.get("folder_id"),
        "job_id": ctx.id,
        "url": url,
        "platform": plat,
        "mode": modo,
        "title": estado.get("titulo"),
        "files": arquivos,
        "bytes": total,
        "thumb_key": thumb_key,
    })
    downloads_locais.set(registro["id"], arquivos)
    msg = f"{len(arquivos)} arquivo(s) · {total / 1e6:.1f} MB"
    if estado.get("aviso"):
        msg += f" · {estado['aviso']}"
    return {"download_id": registro["id"], "title": estado.get("titulo"), "files": arquivos}, msg
