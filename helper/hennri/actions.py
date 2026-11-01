"""Pedidos rápidos: abrir pasta no Explorer e atualizar o baixador."""
import subprocess
import sys
from pathlib import Path

from .util import SEM_JANELA, abrir_no_explorer, nome_seguro


def _python_console() -> str:
    """python.exe ao lado do pythonw.exe (pip não gosta de rodar sem console)."""
    exe = Path(sys.executable)
    alt = exe.with_name("python.exe")
    return str(alt if alt.exists() else exe)


def abrir(ctx):
    from .downloader import downloads_locais

    p = ctx.payload
    kind = p.get("kind")
    alvo: Path = ctx.pastas.raiz
    if kind == "folder" and p.get("id"):
        nome = next((x["name"] for x in ctx.api.pastas() if x["id"] == p["id"]), p["id"])
        alvo = ctx.pastas.baixador / nome_seguro(nome, 60)
    elif kind == "download" and p.get("id"):
        arquivos = downloads_locais.get(p["id"]) or []
        existe = next((Path(a) for a in arquivos if Path(a).exists()), None)
        alvo = existe or ctx.pastas.baixador
    elif kind == "track" and p.get("id"):
        trilha = ctx.api.trilha(p["id"])
        local = Path(trilha["local_path"]) if trilha.get("local_path") else None
        alvo = local if local and local.exists() else ctx.pastas.musicas
    elif kind == "music":
        alvo = ctx.pastas.musicas
    abrir_no_explorer(alvo)
    return {"path": str(alvo)}, "Pasta aberta no PC"


def atualizar(ctx):
    ctx.progresso(None, "Atualizando yt-dlp e gallery-dl…", forcar=True)
    r = subprocess.run(
        # só os dois (Python puro): com o ajudante rodando, o Windows trava as bibliotecas compiladas.
        # O INICIAR.bat atualiza todo o resto com o ajudante fechado.
        [_python_console(), "-m", "pip", "install", "-q", "--disable-pip-version-check", "--upgrade", "--no-deps",
         "yt-dlp", "gallery-dl"],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600, creationflags=SEM_JANELA,
    )
    if r.returncode != 0:
        linhas = [l for l in (r.stderr or r.stdout or "").splitlines() if l.strip()]
        raise RuntimeError("Não consegui atualizar: " + (linhas[-1] if linhas else "pip falhou"))
    versoes = {}
    for mod, chave in (("yt_dlp", "yt_dlp"), ("gallery_dl", "gallery_dl")):
        v = subprocess.run([_python_console(), "-m", mod, "--version"], capture_output=True, text=True, timeout=60,
                           creationflags=SEM_JANELA)
        versoes[chave] = (v.stdout or "").strip().splitlines()[0] if v.stdout.strip() else None
    # reinicia o ajudante pra carregar as versões novas
    return {"tools": versoes, "restart": True}, f"Atualizado · yt-dlp {versoes.get('yt_dlp') or '?'}"
