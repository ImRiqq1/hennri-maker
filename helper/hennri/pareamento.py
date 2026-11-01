"""Conectar o computador pelo código (HN-4821), sem copiar a chave.

O ajudante pede um código ao site, mostra o código e abre o navegador em /conectar?codigo=…;
você confirma lá (já logado) e o ajudante recebe a chave sozinho.
"""
import time
import webbrowser
from typing import Callable

import requests

from .config import PLATAFORMA, log
from .util import nome_do_computador

INTERVALO = 3  # segundos entre perguntas ao site
RENOVACOES = 5  # códigos novos seguidos (10 min cada) antes de desistir


class PareamentoIndisponivel(Exception):
    """O site ainda não tem a conexão por código (versão antiga) — use a chave manual."""


def url_conectar(site: str, codigo: str) -> str:
    return f"{site.rstrip('/')}/conectar?codigo={codigo}"


def _post(site: str, rota: str, dados: dict, timeout: float = 15) -> requests.Response:
    return requests.post(
        f"{site.rstrip('/')}/api/pair/{rota}", json=dados, timeout=timeout, headers={"User-Agent": "HennriHelper/1.0"}
    )


def pedir_codigo(site: str) -> dict:
    """→ { request_id, poll_secret, code, expires_at }"""
    r = _post(site, "start", {"name": nome_do_computador(), "platform": PLATAFORMA})
    if r.status_code == 404:
        raise PareamentoIndisponivel()
    r.raise_for_status()
    return r.json()


def parear(
    site: str,
    ao_codigo: Callable[[str, str], None] | None = None,
    cancelado: Callable[[], bool] = lambda: False,
    chave_manual: Callable[[], str | None] | None = None,
    abrir_navegador: bool = True,
    renovacoes: int = RENOVACOES,
) -> str | None:
    """Fica pedindo/renovando o código até você confirmar no site. Devolve a chave (hm_…) ou None.

    ao_codigo(codigo, url) é chamado a cada código novo (pra mostrar no console/ícone).
    chave_manual() pode devolver uma chave colada à mão (plano B) — se vier, ela é usada.
    """
    abriu = False
    for _ in range(renovacoes):
        try:
            pedido = pedir_codigo(site)
        except PareamentoIndisponivel:
            raise
        except requests.RequestException as e:
            log.warning("não consegui pedir o código ao site: %s", e)
            if _esperar(10, cancelado, chave_manual):
                return _esperar.chave
            continue

        codigo, url = pedido["code"], url_conectar(site, pedido["code"])
        log.info("código pra conectar: %s", codigo)
        if ao_codigo:
            ao_codigo(codigo, url)
        if abrir_navegador and not abriu:
            abriu = True
            try:
                webbrowser.open(url)
            except Exception:
                pass

        while True:
            if _esperar(INTERVALO, cancelado, chave_manual):
                return _esperar.chave
            if cancelado():
                return None
            try:
                r = _post(site, "poll", {"request_id": pedido["request_id"], "poll_secret": pedido["poll_secret"]})
            except requests.RequestException:
                continue  # sem internet por um instante: tenta de novo
            if r.status_code == 200:
                chave = (r.json() or {}).get("token")
                if chave and chave.startswith("hm_"):
                    log.info("computador conectado pelo código %s", codigo)
                    return chave
            elif r.status_code == 410:
                log.info("código %s expirou; pedindo outro", codigo)
                break  # pede um código novo
            elif r.status_code == 404:
                break
            # 202 = ainda esperando você confirmar
    return None


def _esperar(segundos: float, cancelado: Callable[[], bool], chave_manual) -> bool:
    """Espera um pouco; devolve True se chegou uma chave colada à mão (fica em _esperar.chave)."""
    fim = time.time() + segundos
    while time.time() < fim:
        if cancelado():
            return False
        if chave_manual:
            chave = chave_manual()
            if chave:
                _esperar.chave = chave
                return True
        time.sleep(0.3)
    return False


_esperar.chave = None
