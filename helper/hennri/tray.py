"""Ícone perto do relógio: mostra o status e tem Abrir o site / Abrir a pasta / Sair."""
import webbrowser

from PIL import Image, ImageDraw

from .config import HELPER_DIR
from .util import abrir_no_explorer

CORES = {"online": (63, 169, 138), "trabalhando": (217, 164, 65), "offline": (122, 131, 136)}


def _icone(estado: str) -> Image.Image:
    base = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    try:
        iso = Image.open(HELPER_DIR / "assets" / "iso-white.png").convert("RGBA")
        iso = iso.crop(iso.getchannel("A").getbbox())
        iso.thumbnail((60, 40))
        base.paste(iso, ((64 - iso.width) // 2, (64 - iso.height) // 2 - 4), iso)
    except Exception:
        ImageDraw.Draw(base).rounded_rectangle((6, 6, 58, 58), 12, fill=(4, 26, 33, 255))
    # bolinha de status no canto
    d = ImageDraw.Draw(base)
    d.ellipse((42, 42, 62, 62), fill=CORES[estado] + (255,), outline=(4, 26, 33, 255), width=3)
    return base


def _estado(worker) -> str:
    if worker.ativos:
        return "trabalhando"
    return "online" if worker.online else "offline"


def rodar_bandeja(worker, ao_sair):
    import pystray

    def abrir_site(icon, item):
        webbrowser.open(worker.site)

    def abrir_pasta(icon, item):
        abrir_no_explorer(worker.pastas.raiz)

    def sair(icon, item):
        icon.stop()
        ao_sair()

    icon = pystray.Icon(
        "hennri-helper",
        _icone(_estado(worker)),
        "HENNRI · Ajudante",
        menu=pystray.Menu(
            pystray.MenuItem(lambda item: worker.status, None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Abrir o site", abrir_site, default=True),
            pystray.MenuItem("Abrir a pasta dos arquivos", abrir_pasta),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Sair", sair),
        ),
    )
    ultimo = {"estado": None}

    def ao_mudar(w):
        est = _estado(w)
        if est != ultimo["estado"]:
            ultimo["estado"] = est
            icon.icon = _icone(est)
        icon.title = f"HENNRI · {w.status}"[:120]
        try:
            icon.update_menu()
        except Exception:
            pass

    worker.ao_mudar = ao_mudar
    icon.run()
