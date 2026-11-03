"""Google Drive: baixa uma pasta inteira (com as subpastas) exatamente como está no Drive.

Dois jeitos de entrar no Drive:
- pasta aberta ("qualquer pessoa com o link"): sem login, lendo a página pública da pasta;
- pasta privada: com a sua conta Google conectada no ajudante (OAuth, só leitura).

Baixa 4 arquivos ao mesmo tempo, continua de onde parou (arquivo .part) e pula o que já terminou.
Docs/Planilhas/Apresentações do Google viram .docx/.xlsx/.pptx.
"""
import base64
import hashlib
import html
import json
import os
import re
import secrets
import threading
import time
import webbrowser
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

import requests

from .config import DADOS, PLATAFORMA, log
from .util import Cancelado, nome_seguro

GOOGLE_JSON = DADOS / "google.json"
ARQUIVOS_JUNTOS = 4
ESPERAS_LIMITE = (60, 180, 420)  # segundos esperando o Google liberar um arquivo bloqueado
PEDACO = 1 << 20  # 1 MB
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"

PASTA = "application/vnd.google-apps.folder"
ATALHO = "application/vnd.google-apps.shortcut"
# arquivos do Google (sem arquivo de verdade): exporta pro formato do Office
EXPORTAR = {
    "application/vnd.google-apps.document": ("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "application/vnd.google-apps.spreadsheet": ("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    "application/vnd.google-apps.presentation": ("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    "application/vnd.google-apps.drawing": ("png", "image/png"),
}
# link público de exportação de cada tipo
EXPORTAR_PUBLICO = {
    "application/vnd.google-apps.document": "https://docs.google.com/document/d/{id}/export?format=docx",
    "application/vnd.google-apps.spreadsheet": "https://docs.google.com/spreadsheets/d/{id}/export?format=xlsx",
    "application/vnd.google-apps.presentation": "https://docs.google.com/presentation/d/{id}/export/pptx",
    "application/vnd.google-apps.drawing": "https://docs.google.com/drawings/d/{id}/export/png",
}
RESERVADOS = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}


class Privada(Exception):
    """A pasta não abre sem login (ou o link está errado)."""


def _e_login(r: requests.Response) -> bool:
    """Doc sem acesso: o Google responde 200 com a página de login (virava um .docx corrompido)."""
    return "accounts.google.com" in r.url or "text/html" in r.headers.get("content-type", "")


class LimiteDoGoogle(Exception):
    """O Google bloqueou o download por um tempo ("muita gente baixou esse arquivo")."""


def _erro(msg: str) -> RuntimeError:
    e = RuntimeError(msg)
    e.amigavel = msg
    return e


# ---------------------------------------------------------------- link

_DICA_MIME = {
    "document": "application/vnd.google-apps.document",
    "spreadsheets": "application/vnd.google-apps.spreadsheet",
    "presentation": "application/vnd.google-apps.presentation",
    "drawings": "application/vnd.google-apps.drawing",
}


def ler_link(url: str) -> tuple[str, str, str | None, str | None]:
    """→ (tipo, id, resourcekey, mime pelo link). tipo: 'pasta' | 'arquivo' | 'auto' (só o id, sem saber o que é)."""
    url = (url or "").strip()
    if re.fullmatch(r"[-\w]{20,}", url):
        return "auto", url, None, None
    u = urlparse(url)
    if "google.com" not in u.netloc:
        raise _erro("Esse link não é do Google Drive.")
    qs = parse_qs(u.query)
    rk = (qs.get("resourcekey") or [None])[0]
    m = re.search(r"/folders/([-\w]{10,})", u.path)
    if m:
        return "pasta", m.group(1), rk, PASTA
    m = re.search(r"/(file|document|spreadsheets|presentation|drawings)/(?:u/\d+/)?d/([-\w]{10,})", u.path)
    if m:
        return "arquivo", m.group(2), rk, _DICA_MIME.get(m.group(1))
    if qs.get("id"):
        return "auto", qs["id"][0], rk, None
    raise _erro("Não achei a pasta nesse link. Copie o link de compartilhar da pasta no Drive.")


# ---------------------------------------------------------------- o que vai ser baixado

@dataclass
class Item:
    caminho: tuple[str, ...]  # partes relativas à pasta raiz (nomes já limpos e sem repetição)
    id: str
    mime: str
    tamanho: int | None  # None = não sei (Docs exportados, ou pasta aberta antes de começar)
    rk: str | None = None
    export: str | None = None  # extensão quando é Docs/Planilhas/Apresentações


@dataclass
class Plano:
    nome: str
    modo: str  # 'publico' | 'conta'
    itens: list[Item] = field(default_factory=list)
    pastas: int = 0
    pulados: list[str] = field(default_factory=list)  # Forms, Sites… (não dá pra baixar)


def _limpar(nome: str) -> str:
    n = nome_seguro(nome, 150)
    if n.split(".")[0].upper() in RESERVADOS:
        n = "_" + n
    return n


class _Nomes:
    """Dois arquivos com o mesmo nome na mesma pasta (o Drive deixa): o segundo vira "nome (2).ext"."""

    def __init__(self):
        self.vistos: set[str] = set()

    def livre(self, nome: str) -> str:
        base, ext = os.path.splitext(nome)
        candidato, i = nome, 2
        while candidato.lower() in self.vistos:
            candidato = f"{base} ({i}){ext}"
            i += 1
        self.vistos.add(candidato.lower())
        return candidato


def _nome_final(nome: str, mime: str) -> tuple[str, str | None]:
    if mime in EXPORTAR:
        ext = EXPORTAR[mime][0]
        if not nome.lower().endswith("." + ext):
            nome = f"{nome}.{ext}"
        return nome, ext
    return nome, None


# ---------------------------------------------------------------- pasta aberta (sem login)

class Publico:
    modo = "publico"

    def __init__(self):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA

    def _pagina(self, fid: str, rk: str | None) -> str:
        params = {"id": fid}
        if rk:
            params["resourcekey"] = rk
        r = self.s.get("https://drive.google.com/embeddedfolderview", params=params, timeout=30)
        if r.status_code in (403, 404) or "accounts.google.com" in r.url:
            raise Privada()
        r.raise_for_status()
        return r.text

    def listar(self, fid: str, rk: str | None) -> tuple[str, list[dict]]:
        """→ (nome da pasta, filhos [{id, nome, mime, rk}])."""
        pagina = self._pagina(fid, rk)
        m = re.search(r"<title>(.*?)</title>", pagina, re.S)
        nome = html.unescape(m.group(1)).strip() if m else fid
        filhos = []
        for pedaco in pagina.split('<div class="flip-entry" id="entry-')[1:]:
            fid_filho = pedaco.split('"', 1)[0]
            href = re.search(r'<a href="([^"]+)"', pedaco)
            titulo = re.search(r'class="flip-entry-title">(.*?)</div>', pedaco, re.S)
            tipo = re.search(r"/type/([^\"?]+)", pedaco)
            link = html.unescape(href.group(1)) if href else ""
            mime = tipo.group(1) if tipo else ""
            if "/folders/" in link:
                mime = PASTA
            filho_rk = (parse_qs(urlparse(link).query).get("resourcekey") or [None])[0]
            filhos.append({
                "id": fid_filho,
                "nome": html.unescape(titulo.group(1)).strip() if titulo else fid_filho,
                "mime": mime or "application/octet-stream",
                "rk": filho_rk,
            })
        return nome, filhos

    def info_arquivo(self, fid: str, rk: str | None, dica: str | None = None) -> dict:
        """Arquivo solto: nome pela página de visualização (o tipo vem do link)."""
        r = self.s.get(f"https://drive.google.com/file/d/{fid}/view", params={"resourcekey": rk} if rk else None, timeout=30)
        if r.status_code in (403, 404) or "accounts.google.com" in r.url:
            raise Privada()
        m = re.search(r'<meta property="og:title" content="([^"]*)"', r.text)
        nome = html.unescape(m.group(1)) if m else fid
        return {"id": fid, "nome": nome, "mime": dica or "application/octet-stream", "rk": rk}

    def medir(self, item: Item) -> int | None:
        """Tamanho de um arquivo pedindo só o primeiro byte (a página da pasta não mostra)."""
        if item.mime in EXPORTAR_PUBLICO:
            return None
        try:
            r = self.abrir(item, 0, so_medir=True)
            r.close()
        except Exception:
            return None
        faixa = r.headers.get("content-range", "").rsplit("/", 1)
        if len(faixa) == 2 and faixa[1].isdigit():
            return int(faixa[1])
        return 0 if r.status_code == 416 else None

    def abrir(self, item: Item, inicio: int, so_medir: bool = False) -> requests.Response:
        """Resposta do download já na posição `inicio` (se o Google aceitar continuar)."""
        if item.mime in EXPORTAR_PUBLICO:
            r = self.s.get(EXPORTAR_PUBLICO[item.mime].format(id=item.id), stream=True, timeout=60)
            if r.status_code in (401, 403, 404) or _e_login(r):
                r.close()
                raise Privada()
            r.raise_for_status()
            return r
        params = {"id": item.id, "export": "download", "confirm": "t"}
        if item.rk:
            params["resourcekey"] = item.rk
        headers = {"Range": "bytes=0-0"} if so_medir else {"Range": f"bytes={inicio}-"} if inicio else {}
        for _ in range(2):
            r = self.s.get("https://drive.usercontent.google.com/download", params=params, headers=headers, stream=True,
                           timeout=60)
            if r.status_code == 416:
                return r
            if r.status_code in (401, 403, 404) and "text/html" not in r.headers.get("content-type", ""):
                raise Privada()
            if "text/html" not in r.headers.get("content-type", ""):
                r.raise_for_status()
                return r
            # página no lugar do arquivo: aviso de "arquivo grande demais pra checar vírus", limite ou login
            texto = r.text
            if "accounts.google.com" in r.url or "ServiceLogin" in texto:
                raise Privada()
            if re.search(r"Too many users|quota|cota|excedeu", texto, re.I):
                raise LimiteDoGoogle()
            campos = dict(re.findall(r'<input type="hidden" name="([^"]+)" value="([^"]*)"', texto))
            if not campos:
                raise _erro("O Google respondeu uma página em vez do arquivo.")
            params = {**params, **campos}
        raise _erro("O Google não liberou o download desse arquivo.")


# ---------------------------------------------------------------- conta Google (pasta privada)

class Conta:
    modo = "conta"
    API = "https://www.googleapis.com/drive/v3"

    def __init__(self, dados: dict):
        self.dados = dados
        self.s = requests.Session()
        self._token = None
        self._vence = 0.0
        self._lock = threading.Lock()

    @staticmethod
    def carregar() -> "Conta | None":
        try:
            dados = json.loads(GOOGLE_JSON.read_text("utf-8"))
        except Exception:
            return None
        return Conta(dados) if dados.get("refresh_token") else None

    def _cabecalho(self, rk_de: tuple[str, str | None] | None = None) -> dict:
        with self._lock:
            if not self._token or time.time() > self._vence - 120:
                r = requests.post("https://oauth2.googleapis.com/token", timeout=30, data={
                    "client_id": self.dados["client_id"],
                    "client_secret": self.dados["client_secret"],
                    "refresh_token": self.dados["refresh_token"],
                    "grant_type": "refresh_token",
                })
                if r.status_code >= 400:
                    raise _erro("A conta Google desconectou (o acesso venceu ou foi tirado). Conecte de novo na aba Drive.")
                j = r.json()
                self._token, self._vence = j["access_token"], time.time() + int(j.get("expires_in", 3600))
        h = {"Authorization": f"Bearer {self._token}"}
        if rk_de and rk_de[1]:
            h["X-Goog-Drive-Resource-Keys"] = f"{rk_de[0]}/{rk_de[1]}"
        return h

    def _get(self, rota: str, params: dict, rk_de=None) -> dict:
        r = self.s.get(self.API + rota, params={"supportsAllDrives": "true", **params}, headers=self._cabecalho(rk_de),
                       timeout=60)
        if r.status_code == 404:
            raise Privada()
        if r.status_code >= 400:
            raise _erro(f"O Google recusou: {r.json().get('error', {}).get('message', r.status_code)}")
        return r.json()

    def info_arquivo(self, fid: str, rk: str | None, dica: str | None = None) -> dict:
        j = self._get(f"/files/{fid}", {"fields": "id,name,mimeType,size,resourceKey,shortcutDetails"}, (fid, rk))
        return self._converter(j)

    def _converter(self, j: dict) -> dict:
        mime, fid = j["mimeType"], j["id"]
        if mime == ATALHO and j.get("shortcutDetails"):
            fid = j["shortcutDetails"].get("targetId", fid)
            mime = j["shortcutDetails"].get("targetMimeType", mime)
        return {"id": fid, "nome": j["name"], "mime": mime, "rk": j.get("resourceKey"),
                "tamanho": int(j["size"]) if j.get("size") else None}

    def listar(self, fid: str, rk: str | None) -> tuple[str | None, list[dict]]:
        """→ (None, filhos): o nome da pasta vem do info_arquivo (só precisa da raiz)."""
        nome = None
        filhos, pagina = [], None
        while True:
            params = {
                "q": f"'{fid}' in parents and trashed = false",
                "fields": "nextPageToken, files(id,name,mimeType,size,resourceKey,shortcutDetails)",
                "pageSize": 1000,
                "includeItemsFromAllDrives": "true",
            }
            if pagina:
                params["pageToken"] = pagina
            j = self._get("/files", params, (fid, rk))
            filhos += [self._converter(f) for f in j.get("files", [])]
            pagina = j.get("nextPageToken")
            if not pagina:
                return nome, filhos

    def abrir(self, item: Item, inicio: int) -> requests.Response:
        rk_de = (item.id, item.rk)
        if item.mime in EXPORTAR:
            r = self.s.get(f"{self.API}/files/{item.id}/export", params={"mimeType": EXPORTAR[item.mime][1]},
                           headers=self._cabecalho(rk_de), stream=True, timeout=60)
            if r.status_code == 403 and item.mime in EXPORTAR_PUBLICO:
                # Docs maiores que 10 MB não saem pela API: usa o link de exportação com a conta
                r = self.s.get(EXPORTAR_PUBLICO[item.mime].format(id=item.id), headers=self._cabecalho(rk_de), stream=True,
                               timeout=60)
                if _e_login(r):
                    r.close()
                    raise Privada()
        else:
            h = self._cabecalho(rk_de)
            if inicio:
                h["Range"] = f"bytes={inicio}-"
            params = {"alt": "media", "supportsAllDrives": "true"}
            r = self.s.get(f"{self.API}/files/{item.id}", params=params, headers=h, stream=True, timeout=60)
            if r.status_code == 403 and "acknowledgeAbuse" in r.text:
                # arquivo que o Google marcou como suspeito: baixa mesmo assim (é do seu cliente)
                r = self.s.get(f"{self.API}/files/{item.id}", params={**params, "acknowledgeAbuse": "true"}, headers=h,
                               stream=True, timeout=60)
        if r.status_code == 416:
            return r
        if r.status_code == 404:
            raise Privada()
        if r.status_code == 403 and re.search(r"downloadQuotaExceeded|quota|rateLimit", r.text, re.I):
            raise LimiteDoGoogle()
        r.raise_for_status()
        return r


# ---------------------------------------------------------------- ler a pasta inteira

def montar_plano(url: str, avisar=None) -> tuple[Plano, object]:
    """Lê a pasta (e todas as subpastas). Com a conta conectada usa a API (já vem o tamanho de cada
    arquivo); sem ela, ou se a conta não tiver acesso, tenta a página pública da pasta."""
    tipo, fid, rk, dica = ler_link(url)
    conta = Conta.carregar()
    ordem = [conta, Publico()] if conta else [Publico()]
    for fonte in ordem:
        try:
            return _ler(fonte, tipo, fid, rk, dica, avisar), fonte
        except Privada:
            continue
    if not conta:
        raise _erro("Essa pasta é privada (ou o link está errado). Se ela abre só com o seu e-mail, conecte sua conta "
                    "Google na aba Drive.")
    raise _erro("Sua conta Google não tem acesso a essa pasta. Confira se o cliente compartilhou com esse e-mail.")


def _ler(fonte, tipo: str, fid: str, rk: str | None, dica: str | None, avisar) -> Plano:
    if tipo == "arquivo":
        return _arquivo_solto(fonte, fid, rk, dica)
    if isinstance(fonte, Conta):
        raiz = fonte.info_arquivo(fid, rk)
        if raiz["mime"] != PASTA:
            return _arquivo_solto(fonte, fid, rk, dica)
        nome, filhos_raiz = raiz["nome"], fonte.listar(fid, rk)[1]
    else:
        try:
            nome, filhos_raiz = fonte.listar(fid, rk)
        except Privada:
            if tipo == "auto":
                return _arquivo_solto(fonte, fid, rk, dica)
            raise
    plano = Plano(nome=_limpar(nome or fid), modo=fonte.modo)
    lock = threading.Lock()

    def visitar(pasta_id: str, pasta_rk: str | None, caminho: tuple[str, ...]) -> list:
        filhos = filhos_raiz if not caminho else fonte.listar(pasta_id, pasta_rk)[1]
        nomes = _Nomes()
        subpastas = []
        # ordem fixa: o mesmo arquivo cai sempre no mesmo nome (importante pra continuar depois)
        for f in sorted(filhos, key=lambda x: (x["mime"] != PASTA, x["nome"].lower(), x["id"])):
            if f["mime"] == PASTA:
                subpastas.append((f["id"], f["rk"], caminho + (nomes.livre(_limpar(f["nome"])),)))
                continue
            if f["mime"].startswith("application/vnd.google-apps.") and f["mime"] not in EXPORTAR:
                with lock:
                    plano.pulados.append("/".join(caminho + (f["nome"],)))
                continue
            nome, ext = _nome_final(_limpar(f["nome"]), f["mime"])
            item = Item(caminho + (nomes.livre(nome),), f["id"], f["mime"], f.get("tamanho"), f["rk"], ext)
            with lock:
                plano.itens.append(item)
        with lock:
            plano.pastas += len(subpastas)
            if avisar:
                avisar(len(plano.itens), plano.pastas)
        return subpastas

    # lê várias subpastas ao mesmo tempo (pasta com centenas de subpastas fica rápida)
    with ThreadPoolExecutor(max_workers=8) as pool:
        pendentes = {pool.submit(visitar, fid, rk, ())}
        while pendentes:
            feito = next(as_completed(pendentes))
            pendentes.remove(feito)
            for sub in feito.result():
                pendentes.add(pool.submit(visitar, *sub))
    plano.itens.sort(key=lambda i: [p.lower() for p in i.caminho])
    if isinstance(fonte, Publico) and len(plano.itens) <= 20000:
        _medir_todos(fonte, plano, avisar)
    return plano


def _medir_todos(fonte: Publico, plano: Plano, avisar):
    """Pasta aberta: descobre o tamanho de cada arquivo (16 de cada vez) pra mostrar o total antes."""
    feitos = 0
    with ThreadPoolExecutor(max_workers=16) as pool:
        futuros = {pool.submit(fonte.medir, i): i for i in plano.itens}
        for f in as_completed(futuros):
            futuros[f].tamanho = f.result()
            feitos += 1
            if avisar and feitos % 25 == 0:
                avisar(len(plano.itens), plano.pastas, feitos)


def _arquivo_solto(fonte, fid: str, rk: str | None, dica: str | None = None) -> Plano:
    f = fonte.info_arquivo(fid, rk, dica)
    if f["mime"] == PASTA:
        raise Privada()
    nome, ext = _nome_final(_limpar(f["nome"]), f["mime"])
    plano = Plano(nome="Arquivos soltos", modo=fonte.modo)
    plano.itens.append(Item((nome,), f["id"], f["mime"], f.get("tamanho"), f["rk"], ext))
    return plano


def resumo(plano: Plano, limite: int = 80) -> dict:
    """O que o site mostra antes de baixar: total, tipos de arquivo e o primeiro nível da pasta."""
    conhecidos = [i.tamanho for i in plano.itens if i.tamanho is not None]
    tipos: dict[str, int] = {}
    topo: dict[str, dict] = {}
    for i in plano.itens:
        ext = (os.path.splitext(i.caminho[-1])[1].lstrip(".") or "outros").lower()
        tipos[ext] = tipos.get(ext, 0) + 1
        chave = i.caminho[0]
        t = topo.setdefault(chave, {"name": chave, "folder": len(i.caminho) > 1, "files": 0, "bytes": 0})
        t["files"] += 1
        t["bytes"] += i.tamanho or 0
    return {
        "name": plano.nome,
        "mode": plano.modo,
        "files": len(plano.itens),
        "folders": plano.pastas,
        "bytes": sum(conhecidos),
        "unknown_sizes": len(plano.itens) - len(conhecidos),
        "types": sorted(([k, v] for k, v in tipos.items()), key=lambda kv: -kv[1])[:8],
        "top": sorted(topo.values(), key=lambda t: (not t["folder"], t["name"].lower()))[:limite],
        "top_total": len(topo),
        "skipped": plano.pulados[:20],
    }


# ---------------------------------------------------------------- baixar

def _longo(p: Path) -> str:
    """Caminho que o Windows aceita mesmo com mais de 260 letras."""
    s = str(p.resolve()) if not str(p).startswith("\\\\?\\") else str(p)
    if PLATAFORMA == "windows" and len(s) > 240 and not s.startswith("\\\\?\\"):
        return "\\\\?\\" + s
    return s


class _Placar:
    """Contadores dos downloads (várias threads mexem ao mesmo tempo)."""

    def __init__(self, plano: Plano):
        self.lock = threading.Lock()
        self.total = len(plano.itens)
        self.bytes_total = sum(i.tamanho or 0 for i in plano.itens)
        self.sem_tamanho = sum(1 for i in plano.itens if i.tamanho is None)
        self.bytes = 0
        self.no_disco = 0  # bytes que já estavam no PC (não contam na velocidade)
        self.prontos = 0
        self.ja_tinha = 0
        self.falhas: list[dict] = []
        self.atuais: dict[str, str] = {}

    def somar(self, n: int, ja_tinha: bool = False):
        with self.lock:
            self.bytes += n
            if ja_tinha:
                self.no_disco += n

    def descobriu_tamanho(self, n: int):
        with self.lock:
            self.bytes_total += n
            self.sem_tamanho -= 1


def _gb(b: float) -> str:
    if b >= 1e9:
        return f"{b / 1e9:.1f} GB".replace(".", ",")
    if b >= 1e6:
        return f"{b / 1e6:.0f} MB"
    return f"{b / 1e3:.0f} KB"


def _tempo(seg: float) -> str:
    if seg < 90:
        return "menos de 2 min"
    if seg < 3600:
        return f"{round(seg / 60)} min"
    return f"{int(seg // 3600)} h {round(seg % 3600 / 60):02d} min"


def _baixar_um(fonte, item: Item, destino: Path, placar: _Placar, parar: threading.Event):
    final = destino.joinpath(*item.caminho)
    final_l = _longo(final)
    if os.path.exists(final_l) and (item.tamanho is None or os.path.getsize(final_l) == item.tamanho):
        with placar.lock:
            placar.ja_tinha += 1
            placar.prontos += 1
            placar.bytes += item.tamanho or 0
            placar.no_disco += item.tamanho or 0
        return
    os.makedirs(_longo(final.parent), exist_ok=True)
    parte_l = final_l + ".part"
    nome = item.caminho[-1]
    tamanho_conhecido = item.tamanho is not None
    contado = 0  # bytes deste arquivo já somados no placar
    limite = erros = 0  # vezes que o Google bloqueou ("muita gente baixou") / que a rede falhou
    while True:
        if parar.is_set():
            raise Cancelado()
        # continua o .part (Docs exportados sempre começam do zero)
        inicio = os.path.getsize(parte_l) if os.path.exists(parte_l) and not item.export else 0
        if item.tamanho is not None and inicio > item.tamanho:
            inicio = 0
        placar.somar(inicio - contado, ja_tinha=True)
        contado = inicio
        if item.tamanho is not None and inicio == item.tamanho:
            break  # já estava completo, só faltou renomear
        try:
            with placar.lock:
                placar.atuais[item.id] = nome
            r = fonte.abrir(item, inicio)
            if r.status_code == 416:  # o .part já tem o arquivo inteiro
                break
            if inicio and r.status_code != 206:
                placar.somar(-contado, ja_tinha=True)  # o Google não deixou continuar: começa de novo
                contado = inicio = 0
            if item.tamanho is None and not item.export:
                faixa = r.headers.get("content-range", "").rsplit("/", 1)
                if len(faixa) == 2 and faixa[1].isdigit():
                    item.tamanho = int(faixa[1])
                elif r.status_code == 200 and r.headers.get("content-length", "").isdigit():
                    item.tamanho = int(r.headers["content-length"])
            with open(parte_l, "ab" if inicio else "wb") as f:
                for pedaco in r.iter_content(PEDACO):
                    if parar.is_set():
                        r.close()
                        raise Cancelado()
                    if pedaco:
                        f.write(pedaco)
                        placar.somar(len(pedaco))
                        contado += len(pedaco)
            if item.tamanho is not None and os.path.getsize(parte_l) < item.tamanho:
                raise IOError("a conexão caiu no meio do arquivo")
            break
        except (Cancelado, Privada):
            raise
        except LimiteDoGoogle:
            # "muita gente baixou esse arquivo": o Google libera em minutos (às vezes horas)
            if limite >= len(ESPERAS_LIMITE):
                raise
            log.warning("drive: %s bloqueado pelo Google, esperando %ds", nome, ESPERAS_LIMITE[limite])
            with placar.lock:
                placar.atuais[item.id] = f"{nome} (esperando o Google liberar)"
            parar.wait(ESPERAS_LIMITE[limite])
            limite += 1
        except Exception as e:  # noqa: BLE001 - rede caiu, Google instável: tenta de novo continuando
            erros += 1
            log.warning("drive: %s (tentativa %d): %s", nome, erros, e)
            if erros >= 5:
                raise
            parar.wait(3 * erros)
        finally:
            with placar.lock:
                placar.atuais.pop(item.id, None)
    if not os.path.exists(parte_l):
        open(parte_l, "wb").close()  # arquivo vazio no Drive
    os.replace(parte_l, final_l)
    if not tamanho_conhecido:
        placar.descobriu_tamanho(os.path.getsize(final_l))
    with placar.lock:
        placar.prontos += 1


def baixar_plano(ctx, plano: Plano, fonte, destino: Path) -> dict:
    placar = _Placar(plano)
    parar = threading.Event()
    inicio = time.time()
    janela: list[tuple[float, int]] = [(inicio, 0)]  # pra calcular a velocidade dos últimos ~10s

    def detalhe(final: bool = False) -> dict:
        with placar.lock:
            agora = time.time()
            novos = placar.bytes - placar.no_disco  # só o que chegou agora
            janela.append((agora, novos))
            while len(janela) > 2 and agora - janela[0][0] > 10:
                janela.pop(0)
            t0, b0 = janela[0]
            vel = max(0.0, (novos - b0) / max(0.5, agora - t0))
            falta = max(0, placar.bytes_total - placar.bytes)
            return {
                "name": plano.nome,
                "path": str(destino),
                "mode": plano.modo,
                "files_total": placar.total,
                "files_done": placar.prontos,
                "files_skipped": placar.ja_tinha,
                "files_failed": len(placar.falhas),
                "bytes_total": placar.bytes_total,
                "bytes_done": placar.bytes,
                "unknown_sizes": placar.sem_tamanho,
                "speed": 0 if final else round(vel),
                "eta": None if final or vel < 1 or placar.sem_tamanho > placar.total / 2 else round(falta / vel),
                "current": list(placar.atuais.values())[:4],
                "failed": placar.falhas[:50],
                "elapsed": round(agora - inicio),
            }

    def avisar(d: dict):
        if d["bytes_total"]:
            pct = 100 * d["bytes_done"] / d["bytes_total"]
            if d["unknown_sizes"]:
                pct = min(pct, 100 * d["files_done"] / max(1, d["files_total"]))
        else:
            pct = 100 * d["files_done"] / max(1, d["files_total"])
        partes = [f"{d['files_done']:,}/{d['files_total']:,}".replace(",", ".")]
        if d["bytes_total"]:
            partes.append(f"{_gb(d['bytes_done'])} de {_gb(d['bytes_total'])}")
        if d["speed"]:
            partes.append(f"{_gb(d['speed'])}/s")
        if d["eta"]:
            partes.append(f"faltam {_tempo(d['eta'])}")
        ctx.progresso(min(99.9, pct), " · ".join(partes), forcar=True, detalhe=d)

    os.makedirs(_longo(destino), exist_ok=True)
    with ThreadPoolExecutor(max_workers=ARQUIVOS_JUNTOS, thread_name_prefix="drive") as pool:
        futuros = {pool.submit(_baixar_um, fonte, item, destino, placar, parar): item for item in plano.itens}
        try:
            pendentes = set(futuros)
            while pendentes:
                feitos = {f for f in pendentes if f.done()}
                for f in feitos:
                    erro = f.exception()
                    if erro and not isinstance(erro, Cancelado):
                        item = futuros[f]
                        motivo = ("limite do Google, tente mais tarde" if isinstance(erro, LimiteDoGoogle) else
                                  "sem acesso" if isinstance(erro, Privada) else str(erro)[:120])
                        with placar.lock:
                            placar.falhas.append({"path": "/".join(item.caminho), "error": motivo})
                pendentes -= feitos
                if pendentes:
                    avisar(detalhe())
                    time.sleep(2)
        except Cancelado:
            parar.set()
            for f in futuros:
                f.cancel()
            raise
    return detalhe(final=True)


# ---------------------------------------------------------------- pedidos do site

_planos: dict[str, tuple[float, Plano, object]] = {}  # link → plano lido há pouco (o "Baixar tudo" não lê de novo)


def _plano_do_link(ctx, url: str) -> tuple[Plano, object]:
    guardado = _planos.get(url)
    if guardado and time.time() - guardado[0] < 15 * 60:
        return guardado[1], guardado[2]

    def avisar(arquivos: int, pastas: int, medidos: int | None = None):
        if medidos is not None:
            ctx.progresso(100 * medidos / max(1, arquivos), f"Medindo os arquivos… {medidos:,}/{arquivos:,}".replace(",", "."))
        else:
            ctx.progresso(None, f"Lendo a pasta… {arquivos:,} arquivos em {pastas + 1:,} pastas".replace(",", "."))

    ctx.progresso(None, "Lendo a pasta do Drive…", forcar=True)
    plano, fonte = montar_plano(url, avisar)
    if not plano.itens:
        raise _erro("A pasta está vazia (ou só tem coisas que não dá pra baixar, tipo Forms).")
    _planos[url] = (time.time(), plano, fonte)
    return plano, fonte


def ler_pasta(ctx):
    """drive_scan: lê a pasta e devolve o resumo (o site mostra antes de baixar)."""
    plano, _ = _plano_do_link(ctx, ctx.payload["url"])
    r = resumo(plano)
    return r, f"{r['files']:,} arquivos".replace(",", ".") + (f" · {_gb(r['bytes'])}" if r["bytes"] else "")


def baixar(ctx):
    """drive: baixa a pasta inteira pra <raiz>/Drive/<nome da pasta>, igual ao Drive."""
    plano, fonte = _plano_do_link(ctx, ctx.payload["url"])
    # dest: pasta escolhida (o conteúdo do Drive vai direto nela); sem dest, <raiz>/Drive/<nome da pasta>
    destino = Path(ctx.payload["dest"]) if ctx.payload.get("dest") else ctx.pastas.drive / _limpar(
        ctx.payload.get("name") or plano.nome)
    if not destino.is_absolute():
        raise _erro("A pasta de destino precisa ser um caminho completo (ex.: D:\\Clientes\\Fulano).")
    d = baixar_plano(ctx, plano, fonte, destino)
    _planos.pop(ctx.payload["url"], None)
    msg = f"{d['files_done']:,} arquivos".replace(",", ".") + f" · {_gb(d['bytes_done'])}"
    if d["files_skipped"]:
        msg += f" ({d['files_skipped']} já tinha)"
    if d["files_failed"]:
        msg += f" · {d['files_failed']} não baixaram"
    return d, msg


# ---------------------------------------------------------------- conectar a conta Google

ESCOPO = "https://www.googleapis.com/auth/drive.readonly"

_PAGINA_OK = """<!doctype html><meta charset="utf-8"><title>HENNRI</title>
<body style="font-family:-apple-system,Segoe UI,sans-serif;background:#041a21;color:#e6f6fb;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><div style="font-size:42px">✓</div><h2 style="font-weight:600">Conta Google conectada</h2>
<p style="opacity:.6">Pode fechar esta aba e voltar pro HENNRI Maker.</p></div>"""


def conta_conectada() -> str | None:
    try:
        return json.loads(GOOGLE_JSON.read_text("utf-8")).get("email") or "conectada"
    except Exception:
        return None


def google(ctx):
    """drive_google: { action: 'login', client_id, client_secret } ou { action: 'logout' }."""
    p = ctx.payload
    if p.get("action") == "logout":
        try:
            dados = json.loads(GOOGLE_JSON.read_text("utf-8"))
            requests.post("https://oauth2.googleapis.com/revoke", params={"token": dados.get("refresh_token")}, timeout=15)
        except Exception:
            pass
        GOOGLE_JSON.unlink(missing_ok=True)
        return {"email": None}, "Conta Google desconectada"

    client_id, client_secret = (p.get("client_id") or "").strip(), (p.get("client_secret") or "").strip()
    if not client_id.endswith(".apps.googleusercontent.com") or not client_secret:
        raise _erro("ID do cliente ou chave secreta inválidos. Confira os dois no Google Cloud.")

    recebido: dict = {}
    estado = secrets.token_urlsafe(24)

    class Retorno(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            qs = parse_qs(urlparse(self.path).query)
            if (qs.get("state") or [""])[0] != estado:
                self.send_response(404)
                self.end_headers()
                return
            recebido.update({k: v[0] for k, v in qs.items()})
            self.send_response(200)
            self.send_header("content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write((_PAGINA_OK if "code" in recebido else "<h3>Login cancelado.</h3>").encode())

        def log_message(self, *a):
            pass

    servidor = HTTPServer(("127.0.0.1", 0), Retorno)
    redirect = f"http://127.0.0.1:{servidor.server_address[1]}"
    verificador = secrets.token_urlsafe(64)
    desafio = base64.urlsafe_b64encode(hashlib.sha256(verificador.encode()).digest()).rstrip(b"=").decode()
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
        "client_id": client_id, "redirect_uri": redirect, "response_type": "code", "scope": ESCOPO,
        "access_type": "offline", "prompt": "consent", "state": estado,
        "code_challenge": desafio, "code_challenge_method": "S256",
    })
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    try:
        webbrowser.open(url)
        limite = time.time() + 5 * 60
        while "code" not in recebido and "error" not in recebido:
            if time.time() > limite:
                raise _erro("O login do Google não foi concluído em 5 minutos. Tente de novo.")
            ctx.progresso(None, "Entre na sua conta Google no navegador do computador…")
            time.sleep(1)
    finally:
        servidor.shutdown()
    if "error" in recebido:
        raise _erro("O login do Google foi cancelado.")

    r = requests.post("https://oauth2.googleapis.com/token", timeout=30, data={
        "code": recebido["code"], "client_id": client_id, "client_secret": client_secret,
        "redirect_uri": redirect, "grant_type": "authorization_code", "code_verifier": verificador,
    })
    if r.status_code >= 400:
        raise _erro("O Google não aceitou o login: " + r.json().get("error_description", r.text[:120]))
    tokens = r.json()
    if not tokens.get("refresh_token"):
        raise _erro("O Google não mandou a autorização permanente. Tire o acesso do app na sua conta Google e tente de novo.")
    sobre = requests.get(f"{Conta.API}/about", params={"fields": "user(emailAddress,displayName)"},
                         headers={"Authorization": f"Bearer {tokens['access_token']}"}, timeout=30).json()
    email = sobre.get("user", {}).get("emailAddress")
    GOOGLE_JSON.write_text(json.dumps({
        "client_id": client_id, "client_secret": client_secret,
        "refresh_token": tokens["refresh_token"], "email": email,
    }, indent=1), "utf-8")
    if PLATAFORMA != "windows":
        os.chmod(GOOGLE_JSON, 0o600)
    _planos.clear()
    return {"email": email}, f"Conta Google conectada: {email}"
