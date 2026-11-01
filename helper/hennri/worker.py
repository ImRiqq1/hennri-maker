"""Loop principal: pega pedidos da fila do site e executa."""
import platform
import threading
import time
import traceback
from concurrent.futures import ThreadPoolExecutor

from . import VERSION
from .api import Api, ChaveInvalida, SemConexao
from .config import PLATAFORMA, Pastas, log
from .util import Cancelado, DENO, descricao_sistema, info_gpu, versao_ffmpeg

INTERVALO_FILA = 4  # segundos entre olhadas na fila quando não tem nada
INTERVALO_SINAL = 20  # segundos entre sinais de vida (heartbeat)
DOWNLOADS_JUNTOS = 3
TIPOS_GPU = {"music", "separate", "enhance", "update_tools"}


class Contexto:
    """Passado pra cada pedido: avisa o andamento e descobre se o site cancelou."""

    def __init__(self, api: Api, job: dict, pastas: Pastas):
        self.api = api
        self.job = job
        self.id = job["id"]
        self.payload = job.get("payload") or {}
        self.pastas = pastas
        self.cancelado = False
        self._ultimo = 0.0

    def progresso(self, pct: float | None = None, msg: str | None = None, forcar: bool = False):
        """No máximo uma chamada por segundo (a não ser forçada). Levanta Cancelado se o site cancelou."""
        if self.cancelado:
            raise Cancelado()
        agora = time.time()
        if not forcar and agora - self._ultimo < 1.0:
            return
        self._ultimo = agora
        try:
            r = self.api.progress(self.id, None if pct is None else round(pct, 1), msg)
            if r and r.get("cancel"):
                self.cancelado = True
                raise Cancelado()
        except (SemConexao, RuntimeError) as e:
            log.warning("não consegui avisar o andamento: %s", e)

    def checar(self):
        if self.cancelado:
            raise Cancelado()


class Worker:
    def __init__(self, api: Api, pastas: Pastas, site: str, ao_nova_chave=None):
        self.api = api
        self.pastas = pastas
        self.site = site
        self.parar = threading.Event()
        self.status = "Conectando…"
        self.online = False
        self.ativos: dict[str, str] = {}  # id → descrição curta
        self.gpu_esperando = 0
        self.dl_ativos = 0
        self.lock = threading.Lock()
        self.pool_dl = ThreadPoolExecutor(max_workers=DOWNLOADS_JUNTOS, thread_name_prefix="dl")
        self.pool_gpu = ThreadPoolExecutor(max_workers=1, thread_name_prefix="gpu")
        self.reiniciar = False
        self.ao_mudar = None  # callback pra bandeja atualizar o texto
        self.ao_nova_chave = ao_nova_chave  # salva a chave recebida pelo código
        self.codigo: str | None = None  # código de conexão sendo mostrado (HN-4821)
        self.url_conectar: str | None = None
        self.quer_conectar = threading.Event()  # "Conectar este computador" no ícone
        gpu, device = info_gpu()
        self.gpu = gpu
        self.device = device

    # ------------------------------------------------------------ info
    def info(self) -> dict:
        from . import separate

        try:
            import yt_dlp

            ytv = yt_dlp.version.__version__
        except Exception:
            ytv = None
        try:
            import gallery_dl

            gdl = gallery_dl.version.__version__
        except Exception:
            gdl = None
        return {
            "version": VERSION,
            "hostname": platform.node(),
            "platform": PLATAFORMA,
            "os": descricao_sistema(self.gpu),
            "gpu": self.gpu,
            "device": self.device,
            "root": str(self.pastas.raiz),
            "tools": {
                "yt_dlp": ytv,
                "gallery_dl": gdl,
                "separator": separate.versao(),
                "ffmpeg": versao_ffmpeg(),
                "deno": bool(DENO),
            },
            "separator_ready": separate.disponivel(),
            "busy": bool(self.ativos),
        }

    def _avisar(self, status: str | None = None):
        if status:
            self.status = status
        elif self.ativos:
            self.status = "Trabalhando: " + ", ".join(list(self.ativos.values())[:2])
        elif self.online:
            self.status = "Online"
        if self.ao_mudar:
            try:
                self.ao_mudar(self)
            except Exception:
                pass

    # ------------------------------------------------------------ conexão pelo código
    def conectar(self) -> bool:
        """Mostra um código, abre o site em /conectar e espera você confirmar. True = conectado."""
        from .pareamento import PareamentoIndisponivel, parear

        self.online = False
        self.quer_conectar.clear()
        self._avisar("Conectando este computador…")

        def ao_codigo(codigo: str, url: str):
            self.codigo, self.url_conectar = codigo, url
            self._avisar(f"Código {codigo} · confirme no site")

        try:
            chave = parear(self.site, ao_codigo=ao_codigo, cancelado=self.parar.is_set)
        except PareamentoIndisponivel:
            chave = None
            self._avisar("Gere uma chave no site e rode o INICIAR de novo")
        finally:
            self.codigo = self.url_conectar = None
        if not chave:
            if not self.parar.is_set() and not self.status.startswith("Gere"):
                self._avisar("Não conectado · clique em Conectar este computador")
            return False
        self.api.trocar_chave(chave)
        if self.ao_nova_chave:
            self.ao_nova_chave(chave)
        self._avisar("Conectado!")
        return True

    # ------------------------------------------------------------ loop
    def rodar(self):
        ultimo_sinal = 0.0
        log.info("ajudante %s rodando · site %s · pasta %s · %s", VERSION, self.site, self.pastas.raiz, self.gpu or "sem GPU")
        while not self.parar.is_set():
            if not self.api.token:
                if not self.conectar():
                    # espera você pedir de novo pelo ícone (ou sair)
                    while not self.parar.is_set() and not self.quer_conectar.wait(1):
                        pass
                    continue
                ultimo_sinal = 0.0
            try:
                if time.time() - ultimo_sinal > INTERVALO_SINAL:
                    self.api.heartbeat(self.info())
                    ultimo_sinal = time.time()
                    if not self.online:
                        self.online = True
                        self._avisar()
                if self._tem_vaga():
                    job = self.api.claim()
                    if job:
                        self._despachar(job)
                        continue  # pode ter mais na fila
            except ChaveInvalida as e:
                # a chave foi removida no site: conecta de novo pelo código
                log.error(str(e))
                self.api.trocar_chave("")
                continue
            except SemConexao as e:
                if self.online:
                    log.warning("sem conexão com o site: %s", e)
                self.online = False
                self._avisar("Sem conexão")
                self.parar.wait(10)
                continue
            except Exception:
                log.error("erro no loop: %s", traceback.format_exc())
            self.parar.wait(INTERVALO_FILA)
        self.pool_dl.shutdown(wait=False, cancel_futures=True)
        self.pool_gpu.shutdown(wait=False, cancel_futures=True)

    def _tem_vaga(self) -> bool:
        with self.lock:
            return self.dl_ativos < DOWNLOADS_JUNTOS and self.gpu_esperando == 0

    def _despachar(self, job: dict):
        tipo = job["type"]
        if tipo in TIPOS_GPU:
            with self.lock:
                self.gpu_esperando += 1
            self.pool_gpu.submit(self._executar, job, True)
            # enquanto espera a vez, mantém o pedido "vivo" no site
            threading.Thread(target=self._manter_vivo, args=(job,), daemon=True).start()
        else:
            with self.lock:
                self.dl_ativos += 1
            self.pool_dl.submit(self._executar, job, False)

    def _manter_vivo(self, job: dict):
        while True:
            with self.lock:
                if job["id"] in self.ativos or job.get("_iniciado"):
                    return
            try:
                self.api.progress(job["id"], None, "Esperando a vez no PC…")
            except Exception:
                pass
            if self.parar.wait(60):
                return

    def _executar(self, job: dict, gpu: bool):
        from . import actions, downloader, enhance, music, separate

        job["_iniciado"] = True
        if gpu:
            with self.lock:
                self.gpu_esperando -= 1
        tipo = job["type"]
        descricao = {
            "download": "baixando",
            "music": "baixando música",
            "separate": "separando voz",
            "enhance": "melhorando voz",
            "open": "abrindo pasta",
            "update_tools": "atualizando",
        }.get(tipo, tipo)
        with self.lock:
            self.ativos[job["id"]] = descricao
        self._avisar()
        ctx = Contexto(self.api, job, self.pastas)
        log.info("pedido %s (%s) %s", job["id"][:8], tipo, job.get("payload"))
        try:
            handler = {
                "download": downloader.executar,
                "music": music.executar,
                "separate": separate.executar,
                "enhance": enhance.executar,
                "open": actions.abrir,
                "update_tools": actions.atualizar,
            }.get(tipo)
            if not handler:
                raise RuntimeError(f"Tipo de pedido desconhecido: {tipo}")
            resultado, mensagem = handler(ctx)
            if ctx.cancelado:
                raise Cancelado()
            self.api.done(job["id"], resultado, mensagem)
            log.info("pedido %s ok: %s", job["id"][:8], mensagem)
            if tipo == "update_tools" and resultado and resultado.get("restart"):
                self.reiniciar = True
                self.parar.set()
        except Cancelado:
            log.info("pedido %s cancelado pelo site", job["id"][:8])
        except Exception as e:  # noqa: BLE001
            msg = getattr(e, "amigavel", None) or str(e) or "Erro desconhecido."
            log.error("pedido %s falhou: %s\n%s", job["id"][:8], msg, traceback.format_exc())
            try:
                self.api.fail(job["id"], msg[:300])
            except Exception:
                pass
        finally:
            with self.lock:
                self.ativos.pop(job["id"], None)
                if not gpu:
                    self.dl_ativos -= 1
            self._avisar()
