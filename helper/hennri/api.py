"""Conversa com o site (/api/agent/*) usando a chave do ajudante."""
import time
from pathlib import Path

import requests

from .config import log


class SemConexao(Exception):
    pass


class ChaveInvalida(Exception):
    pass


class Api:
    def __init__(self, site: str, token: str):
        self.base = site.rstrip("/") + "/api/agent"
        self.s = requests.Session()
        self.s.headers["User-Agent"] = "HennriHelper/1.0"
        self.trocar_chave(token)

    def trocar_chave(self, token: str):
        """Depois de conectar pelo código, passa a usar a chave nova."""
        self.token = token or ""
        self.s.headers["Authorization"] = f"Bearer {self.token}"

    def _req(self, metodo: str, rota: str, tentativas: int = 3, timeout: float = 30, **kw):
        ultimo = None
        for i in range(tentativas):
            if hasattr(kw.get("data"), "seek"):
                kw["data"].seek(0)  # upload repetido: sem isso a 2ª tentativa mandava o arquivo vazio/cortado
            try:
                r = self.s.request(metodo, self.base + rota, timeout=timeout, **kw)
            except requests.RequestException as e:
                ultimo = e
                time.sleep(1.5 * (i + 1))
                continue
            if r.status_code == 401:
                raise ChaveInvalida("A chave do ajudante não vale mais. Gere outra no site.")
            if r.status_code >= 500:
                ultimo = RuntimeError(f"site respondeu {r.status_code}")
                time.sleep(1.5 * (i + 1))
                continue
            return r
        raise SemConexao(str(ultimo))

    def _json(self, r):
        if r.status_code >= 400:
            try:
                msg = r.json().get("error")
            except Exception:
                msg = r.text[:200]
            raise RuntimeError(msg or f"erro {r.status_code}")
        return r.json() if r.content else None

    # ------------------------------------------------------------ fila
    def heartbeat(self, info: dict):
        self._json(self._req("POST", "/heartbeat", json={"info": info}, tentativas=1, timeout=15))

    def claim(self, tipos: list[str] | None = None):
        """tipos: só pega pedidos desses tipos (os que têm vaga agora)."""
        r = self._req("POST", "/jobs/claim", tentativas=1, timeout=20, json={"types": tipos} if tipos else None)
        return None if r.status_code == 204 else self._json(r)

    def progress(self, job_id: str, progress=None, message=None, detail=None) -> dict:
        corpo = {"progress": progress, "message": message}
        if detail is not None:
            corpo["detail"] = detail  # andamento detalhado (Drive: arquivos, GB, velocidade)
        return self._json(self._req("POST", f"/jobs/{job_id}/progress", json=corpo))

    def done(self, job_id: str, result=None, message=None):
        r = self._req("POST", f"/jobs/{job_id}/done", json={"result": result, "message": message})
        if r.status_code == 409:
            log.info("pedido %s não estava mais rodando (cancelado)", job_id)
            return
        self._json(r)

    def fail(self, job_id: str, error: str, result=None):
        r = self._req("POST", f"/jobs/{job_id}/fail", json={"error": error, "result": result})
        if r.status_code != 409:
            self._json(r)

    # ------------------------------------------------------------ arquivos
    def upload(self, caminho: Path, tipo: str) -> str:
        ext = caminho.suffix.lstrip(".").lower() or "bin"
        with open(caminho, "rb") as f:
            r = self._req(
                "PUT", f"/files?ext={ext}&type={requests.utils.quote(tipo)}", data=f, timeout=600, tentativas=2,
                headers={"content-type": tipo},
            )
        return self._json(r)["key"]

    def baixar_arquivo(self, key: str, destino: Path) -> Path:
        r = self._req("GET", f"/files/{key}", stream=True, timeout=600)
        if r.status_code >= 400:
            raise RuntimeError("Arquivo não encontrado no site.")
        with open(destino, "wb") as f:
            for parte in r.iter_content(1 << 20):
                f.write(parte)
        return destino

    # ------------------------------------------------------------ dados
    def pastas(self) -> list:
        return self._json(self._req("GET", "/folders"))

    def trilha(self, track_id: str) -> dict:
        return self._json(self._req("GET", f"/tracks/{track_id}"))

    def criar_trilha(self, dados: dict) -> dict:
        return self._json(self._req("POST", "/tracks", json=dados))

    def editar_trilha(self, track_id: str, dados: dict) -> dict:
        return self._json(self._req("PATCH", f"/tracks/{track_id}", json=dados))

    def registrar_download(self, dados: dict) -> dict:
        return self._json(self._req("POST", "/downloads", json=dados))
