"""Coisas usadas por vários pedidos: ffmpeg, nomes de arquivo, miniaturas, abrir pasta."""
import io
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

import requests

try:
    import imageio_ffmpeg

    _FFMPEG_EMBUTIDO = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    _FFMPEG_EMBUTIDO = None

# ffmpeg do sistema (completo) é preferível; o do imageio fica de reserva
FFMPEG = shutil.which("ffmpeg") or _FFMPEG_EMBUTIDO or "ffmpeg"

try:  # runtime JS que o YouTube passou a exigir no yt-dlp
    from deno import find_deno_bin

    DENO = find_deno_bin()
except Exception:
    DENO = shutil.which("deno")

# no Windows, sem janela preta piscando a cada ffmpeg
SEM_JANELA = subprocess.CREATE_NO_WINDOW if sys.platform.startswith("win") else 0

ANSI = re.compile(r"\x1b\[[0-9;]*m")
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"}
IMAGEM_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_UPLOAD = 95 * 1024 * 1024


class Cancelado(Exception):
    """O site cancelou o pedido no meio."""


def slug(nome: str) -> str:
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "pasta"


def nome_seguro(nome: str, limite: int = 80) -> str:
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", nome or "").strip(" .")[:limite] or "Sem nome"


def caminho_livre(destino: Path) -> Path:
    """Se já existe, acrescenta (1), (2)…"""
    alvo, n = destino, 1
    while alvo.exists():
        alvo = destino.with_name(f"{destino.stem} ({n}){destino.suffix}")
        n += 1
    return alvo


def ffmpeg(*args: str, timeout: int = 60 * 60):
    r = subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout, creationflags=SEM_JANELA,
    )
    if r.returncode != 0:
        raise RuntimeError((r.stderr or "ffmpeg falhou").strip().splitlines()[-1][:280])


def versao_ffmpeg() -> str | None:
    try:
        r = subprocess.run([FFMPEG, "-version"], capture_output=True, text=True, timeout=10, creationflags=SEM_JANELA)
        m = re.search(r"ffmpeg version (\S+)", r.stdout)
        return m.group(1).split("-")[0] if m else None
    except Exception:
        return None


def duracao(caminho: Path) -> float | None:
    """Duração em segundos (mutagen; cai pro ffmpeg em vídeo)."""
    try:
        from mutagen import File as MFile

        m = MFile(str(caminho))
        if m and m.info and m.info.length:
            return float(m.info.length)
    except Exception:
        pass
    try:
        r = subprocess.run([FFMPEG, "-i", str(caminho)], capture_output=True, text=True, timeout=30,
                           creationflags=SEM_JANELA, encoding="utf-8", errors="replace")
        m = re.search(r"Duration: (\d+):(\d+):(\d+\.?\d*)", r.stderr)
        if m:
            h, mi, s = m.groups()
            return int(h) * 3600 + int(mi) * 60 + float(s)
    except Exception:
        pass
    return None


def para_mp3(origem: Path, destino: Path, kbps: int = 192):
    ffmpeg("-i", str(origem), "-vn", "-codec:a", "libmp3lame", "-b:a", f"{kbps}k", str(destino))
    return destino


def miniatura(origem: str | Path, destino: Path, lado: int = 480, quadrada: bool = False) -> Path | None:
    """Gera um jpg pequeno a partir de uma URL, imagem ou vídeo (pega um quadro)."""
    from PIL import Image

    try:
        if isinstance(origem, str) and origem.startswith("http"):
            r = requests.get(origem, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            img = Image.open(io.BytesIO(r.content))
        else:
            origem = Path(origem)
            if origem.suffix.lower() in VIDEO_EXT:
                quadro = destino.with_suffix(".frame.jpg")
                ffmpeg("-ss", "1", "-i", str(origem), "-frames:v", "1", "-vf", f"scale={lado}:-2", str(quadro), timeout=60)
                img = Image.open(quadro)
                img.load()
                quadro.unlink(missing_ok=True)
            else:
                img = Image.open(origem)
        img = img.convert("RGB")
        if quadrada:
            w, h = img.size
            m = min(w, h)
            img = img.crop(((w - m) // 2, (h - m) // 2, (w + m) // 2, (h + m) // 2))
        img.thumbnail((lado, lado))
        img.save(destino, "JPEG", quality=85)
        return destino
    except Exception:
        return None


def abrir_no_explorer(caminho: Path):
    """Abre a pasta; se for um arquivo, abre a pasta com ele selecionado."""
    caminho = Path(caminho)
    if sys.platform.startswith("win"):
        if caminho.is_file():
            subprocess.Popen(["explorer", "/select,", str(caminho)])
        else:
            caminho.mkdir(parents=True, exist_ok=True)
            os.startfile(str(caminho))  # type: ignore[attr-defined]
    elif sys.platform == "darwin":
        if caminho.is_file():
            subprocess.Popen(["open", "-R", str(caminho)])  # Finder com o arquivo selecionado
        else:
            caminho.mkdir(parents=True, exist_ok=True)
            subprocess.Popen(["open", str(caminho)])
    else:
        subprocess.Popen(["xdg-open", str(caminho if caminho.is_dir() else caminho.parent)])


def _chip_mac() -> str | None:
    """'Apple M2', 'Apple M3 Pro'… (ou o nome do processador Intel)."""
    try:
        r = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True, timeout=5)
        return r.stdout.strip() or None
    except Exception:
        return None


def info_gpu() -> tuple[str | None, str]:
    """(nome da placa/chip, 'cuda' | 'mps' | 'cpu')."""
    if sys.platform == "darwin":
        chip = _chip_mac()
        try:
            import torch

            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return chip, "mps"  # GPU do chip Apple (M1, M2…)
        except Exception:
            pass
        return chip, "cpu"
    try:
        import torch

        if torch.cuda.is_available():
            return torch.cuda.get_device_name(0), "cuda"
    except Exception:
        pass
    try:
        r = subprocess.run(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], capture_output=True, text=True,
                           timeout=10, creationflags=SEM_JANELA)
        nome = r.stdout.strip().splitlines()[0] if r.returncode == 0 and r.stdout.strip() else None
        return nome, "cpu"
    except Exception:
        return None, "cpu"


def descricao_sistema(gpu: str | None) -> str:
    """'Windows 11 · RTX 5060', 'macOS 15.4 · Apple M2'…"""
    import platform

    if sys.platform.startswith("win"):
        try:
            build = sys.getwindowsversion().build  # type: ignore[attr-defined]
            nome = "Windows 11" if build >= 22000 else f"Windows {platform.release()}"
        except Exception:
            nome = "Windows"
    elif sys.platform == "darwin":
        versao = platform.mac_ver()[0]
        nome = f"macOS {versao}" if versao else "macOS"
    else:
        nome = platform.system() or "Linux"
    if gpu:
        curto = re.sub(r"^(NVIDIA\s+)?(GeForce\s+)?", "", gpu).strip()
        return f"{nome} · {curto}"
    return nome


def nome_do_computador() -> str:
    """Nome amigável pra aparecer no site ('MacBook do Hennri', 'PC-HENNRI')."""
    import platform

    if sys.platform == "darwin":
        try:
            r = subprocess.run(["scutil", "--get", "ComputerName"], capture_output=True, text=True, timeout=5)
            if r.stdout.strip():
                return r.stdout.strip()[:60]
        except Exception:
            pass
    nome = platform.node() or ("Mac" if sys.platform == "darwin" else "PC")
    return re.sub(r"\.local$", "", nome)[:60]
