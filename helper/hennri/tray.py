"""Ícone perto do relógio (Windows) ou na barra de cima (Mac): status, Abrir o site / Abrir a pasta / Sair."""
import sys
import webbrowser

from PIL import Image, ImageDraw

from .config import HELPER_DIR
from .util import abrir_no_explorer

CORES = {"online": (63, 169, 138), "trabalhando": (217, 164, 65), "offline": (122, 131, 136)}
MAC = sys.platform == "darwin"


def _iso(tamanho: tuple[int, int]) -> Image.Image | None:
    try:
        iso = Image.open(HELPER_DIR / "assets" / "iso-white.png").convert("RGBA")
        iso = iso.crop(iso.getchannel("A").getbbox())
        iso.thumbnail(tamanho)
        return iso
    except Exception:
        return None


def _icone(estado: str) -> Image.Image:
    base = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    if MAC:
        # barra do Mac: ícone "template" (preto + transparência; o macOS pinta claro/escuro sozinho)
        iso = _iso((60, 44))
        if iso:
            preto = Image.new("RGBA", iso.size, (0, 0, 0, 255))
            alfa = iso.getchannel("A")
            if estado == "offline":
                alfa = alfa.point([v * 45 // 100 for v in range(256)])
            preto.putalpha(alfa)
            base.paste(preto, ((64 - iso.width) // 2, (64 - iso.height) // 2), preto)
        if estado == "trabalhando":
            ImageDraw.Draw(base).ellipse((46, 44, 62, 60), fill=(0, 0, 0, 255))
        return base
    iso = _iso((60, 40))
    if iso:
        base.paste(iso, ((64 - iso.width) // 2, (64 - iso.height) // 2 - 4), iso)
    else:
        ImageDraw.Draw(base).rounded_rectangle((6, 6, 58, 58), 12, fill=(4, 26, 33, 255))
    # bolinha de status no canto
    d = ImageDraw.Draw(base)
    d.ellipse((42, 42, 62, 62), fill=CORES[estado] + (255,), outline=(4, 26, 33, 255), width=3)
    return base


def _template_no_mac():
    """O pystray não tem opção de ícone template no Mac; marca a imagem como template depois de criada."""
    try:
        from pystray import _darwin

        original = _darwin.Icon._assert_image
        if getattr(original, "_hennri", False):
            return

        def _assert_image(self):
            original(self)
            try:
                self._icon_image.setTemplate_(True)
            except Exception:
                pass

        _assert_image._hennri = True
        _darwin.Icon._assert_image = _assert_image
    except Exception:
        pass


def _estado(worker) -> str:
    if worker.ativos:
        return "trabalhando"
    return "online" if worker.online else "offline"


def rodar_bandeja(worker, ao_sair):
    """Precisa rodar na thread principal (obrigatório no Mac); o worker roda em outra thread."""
    import pystray

    if MAC:
        _template_no_mac()
        try:  # só na barra de cima, sem o foguetinho do Python no Dock
            import AppKit

            AppKit.NSApplication.sharedApplication().setActivationPolicy_(
                AppKit.NSApplicationActivationPolicyAccessory
            )
        except Exception:
            pass

    def abrir_site(icon, item):
        webbrowser.open(worker.url_conectar or worker.site)

    def abrir_pasta(icon, item):
        abrir_no_explorer(worker.pastas.raiz)

    def conectar(icon, item):
        if worker.url_conectar:
            webbrowser.open(worker.url_conectar)
        else:
            worker.quer_conectar.set()

    def sair(icon, item):
        icon.stop()
        ao_sair()

    def precisa_conectar(item) -> bool:
        return bool(worker.codigo) or not worker.api.token

    icon = pystray.Icon(
        "hennri-helper",
        _icone(_estado(worker)),
        "HENNRI · Ajudante",
        menu=pystray.Menu(
            pystray.MenuItem(lambda item: worker.status, None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Conectar este computador", conectar, visible=precisa_conectar),
            pystray.MenuItem("Abrir o site", abrir_site, default=True),
            pystray.MenuItem("Abrir a pasta dos arquivos", abrir_pasta),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Sair", sair),
        ),
    )
    ultimo = {"estado": None}

    def aplicar(w):
        if w.parar.is_set():  # o worker parou (ex.: depois de atualizar): solta a thread principal pra reiniciar
            icon.stop()
            return
        est = _estado(w)
        if est != ultimo["estado"]:
            ultimo["estado"] = est
            icon.icon = _icone(est)
        icon.title = f"HENNRI · {w.status}"[:120]
        try:
            icon.update_menu()
        except Exception:
            pass

    def ao_mudar(w):
        # o worker chama de outra thread; no Mac a barra de cima só pode ser mexida na thread principal
        if MAC:
            try:
                from PyObjCTools import AppHelper

                AppHelper.callAfter(aplicar, w)
                return
            except Exception:
                pass
        aplicar(w)

    worker.ao_mudar = ao_mudar
    aplicar(worker)
    icon.run()
