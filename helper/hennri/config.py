"""Configuração, pastas e log do ajudante."""
import json
import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

SITE_PADRAO = "https://maker.hennri.com"

if sys.platform.startswith("win"):
    PLATAFORMA = "windows"
elif sys.platform == "darwin":
    PLATAFORMA = "mac"
else:
    PLATAFORMA = "linux"


def _dados_padrao() -> Path:
    """Onde ficam config.json, helper.log e os índices locais em cada sistema."""
    if PLATAFORMA == "windows":
        return Path(os.environ.get("APPDATA", Path.home())) / "HennriMaker"
    if PLATAFORMA == "mac":
        return Path.home() / "Library" / "Application Support" / "HennriMaker"
    return Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config") / "HennriMaker"


# HENNRI_HELPER_DATA troca o lugar — útil pra testar sem mexer na configuração de verdade
DADOS = Path(os.environ.get("HENNRI_HELPER_DATA") or _dados_padrao())
DADOS.mkdir(parents=True, exist_ok=True)
CONFIG_JSON = DADOS / "config.json"
LOG = DADOS / "helper.log"
HELPER_DIR = Path(__file__).resolve().parent.parent

log = logging.getLogger("hennri")


def configurar_log(console: bool = False):
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%d %H:%M:%S")
    arquivo = RotatingFileHandler(LOG, maxBytes=2_000_000, backupCount=2, encoding="utf-8")
    arquivo.setFormatter(fmt)
    log.addHandler(arquivo)
    if console:
        tela = logging.StreamHandler()
        tela.setFormatter(fmt)
        log.addHandler(tela)


def raiz_padrao() -> Path:
    return Path.home() / "Downloads" / "HENNRI"


def ler_config() -> dict:
    try:
        return json.loads(CONFIG_JSON.read_text("utf-8"))
    except Exception:
        return {}


def salvar_config(cfg: dict):
    CONFIG_JSON.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), "utf-8")


class Pastas:
    """Onde cada coisa fica no computador (dentro da pasta raiz, padrão Downloads/HENNRI)."""

    def __init__(self, raiz: str | Path):
        self.raiz = Path(raiz)
        self.baixador = self.raiz / "Baixador"
        self.musicas = self.raiz / "Trilhas" / "Músicas"
        self.separadas = self.raiz / "Trilhas" / "Separadas"
        self.voz = self.raiz / "Trilhas" / "Voz melhorada"
        self.drive = self.raiz / "Drive"
        self.tmp = self.raiz / ".tmp"
        for p in (self.baixador, self.musicas, self.separadas, self.voz, self.drive, self.tmp):
            p.mkdir(parents=True, exist_ok=True)


class IndiceLocal:
    """Pequeno índice em JSON (ex.: link já baixado → trilha), pra não repetir trabalho."""

    def __init__(self, nome: str):
        self.caminho = DADOS / f"{nome}.json"
        try:
            self.dados = json.loads(self.caminho.read_text("utf-8"))
        except Exception:
            self.dados = {}

    def get(self, chave: str, padrao=None):
        return self.dados.get(chave, padrao)

    def set(self, chave: str, valor):
        self.dados[chave] = valor
        self.caminho.write_text(json.dumps(self.dados, ensure_ascii=False, indent=1), "utf-8")
