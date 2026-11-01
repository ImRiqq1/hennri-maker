"""Remover voz: separa cada música em voz e instrumental na GPU (placa NVIDIA ou chip Apple), com audio-separator."""
import logging
import shutil
import threading
import uuid
from pathlib import Path

from .config import DADOS, log
from .util import Cancelado, nome_seguro, para_mp3

# BS-Roformer: o melhor separador voz/instrumental aberto hoje; cabe folgado em 8 GB.
MODELO = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"
MODELO_RESERVA = "UVR-MDX-NET-Inst_HQ_4.onnx"  # mais leve, se o principal não carregar
MODELOS_DIR = DADOS / "models"

_lock = threading.Lock()
_separador = None
_modelo_carregado = None
_so_cpu = False  # ligado se a GPU do chip Apple (MPS) falhar: dali em diante separa no processador


class ErroAmigavel(Exception):
    def __init__(self, amigavel: str):
        super().__init__(amigavel)
        self.amigavel = amigavel


def disponivel() -> bool:
    try:
        import audio_separator  # noqa: F401

        return True
    except Exception:
        return False


def versao() -> str | None:
    try:
        from importlib.metadata import version

        return version("audio-separator")
    except Exception:
        return None


def _usa_mps() -> bool:
    return bool(_separador is not None and getattr(_separador, "torch_device_mps", None) is not None
                and _separador.torch_device == _separador.torch_device_mps)


def _descarregar():
    global _separador, _modelo_carregado
    _separador = None
    _modelo_carregado = None


def _carregar(trabalho: Path):
    """Carrega o modelo uma vez e reaproveita nos próximos pedidos (a saída vai sempre pra `trabalho`)."""
    global _separador, _modelo_carregado
    from audio_separator.separator import Separator

    MODELOS_DIR.mkdir(parents=True, exist_ok=True)
    trabalho.mkdir(parents=True, exist_ok=True)
    if _separador is None:
        _separador = Separator(
            log_level=logging.WARNING,
            model_file_dir=str(MODELOS_DIR),
            output_dir=str(trabalho),
            output_format="WAV",
            # overlap 4 (padrão é 8): ~2x mais rápido com qualidade quase igual; usa ~1,7 GB da placa
            mdxc_params={"segment_size": 256, "override_model_segment_size": False, "batch_size": 1, "overlap": 4,
                         "pitch_shift": 0},
        )
        if _so_cpu:  # o chip Apple não deu conta antes: força o processador
            _separador.torch_device = _separador.torch_device_cpu
            _separador.torch_device_mps = None
            _separador.onnx_execution_provider = ["CPUExecutionProvider"]
    if _modelo_carregado is None:
        for nome in (MODELO, MODELO_RESERVA):
            try:
                _separador.load_model(model_filename=nome)
                _modelo_carregado = nome
                log.info("separador: modelo %s carregado", nome)
                break
            except Exception as e:  # noqa: BLE001
                log.warning("modelo %s não carregou: %s", nome, e)
        if _modelo_carregado is None:
            raise ErroAmigavel("Não consegui carregar o modelo de separação. Rode o INICIAR de novo.")
    return _separador


def separar_arquivo(ctx, entrada: Path, nome: str) -> tuple[Path, Path]:
    """Separa e devolve (voz.wav, instrumental.wav) numa pasta própria em Trilhas\\Separadas."""
    if not disponivel():
        raise ErroAmigavel("O separador de voz não está instalado. Rode o INICIAR de novo.")
    saida = ctx.pastas.separadas / nome_seguro(nome, 100)
    saida.mkdir(parents=True, exist_ok=True)
    trabalho = ctx.pastas.tmp / "separando"
    global _so_cpu
    with _lock:
        ctx.progresso(None, "Carregando o modelo na GPU…" if _modelo_carregado is None else "Separando a voz…",
                      forcar=True)
        sep = _carregar(trabalho)
        ctx.checar()
        ctx.progresso(None, "Separando a voz…", forcar=True)
        try:
            saidas = sep.separate(str(entrada))
        except Exception as e:  # noqa: BLE001
            if not _usa_mps():
                raise
            # alguns modelos ainda tropeçam no MPS: refaz no processador (mais lento, mas vai)
            log.warning("separação no chip Apple falhou (%s); refazendo no processador", e)
            _so_cpu = True
            _descarregar()
            ctx.progresso(None, "A GPU do Mac não deu conta; separando no processador (mais lento)…", forcar=True)
            sep = _carregar(trabalho)
            ctx.checar()
            saidas = sep.separate(str(entrada))
        arquivos = [Path(a) if Path(a).is_absolute() else trabalho / a for a in saidas]
    ctx.checar()
    voz = next((a for a in arquivos if "(vocals)" in a.name.lower()), None)
    inst = next((a for a in arquivos if "(instrumental)" in a.name.lower() or "(other)" in a.name.lower()), None)
    if not voz or not inst:
        raise ErroAmigavel("A separação terminou sem gerar voz e instrumental.")
    # nomes fáceis de achar no Premiere
    voz_final = saida / f"{nome_seguro(nome, 100)} (Voz).wav"
    inst_final = saida / f"{nome_seguro(nome, 100)} (Instrumental).wav"
    for de, para in ((voz, voz_final), (inst, inst_final)):
        if de != para:
            para.unlink(missing_ok=True)
            shutil.move(str(de), para)
    return voz_final, inst_final


def separar_trilha(ctx, track_id: str) -> dict:
    trilha = ctx.api.trilha(track_id)
    nome = f"{trilha['artist']} - {trilha['title']}" if trilha.get("artist") else trilha["title"]
    local = Path(trilha["local_path"]) if trilha.get("local_path") else None
    tmp_entrada = None
    if not local or not local.exists():
        if not trilha.get("audio_key"):
            raise ErroAmigavel("Essa trilha não tem áudio no site.")
        ctx.progresso(None, "Baixando o áudio do site…", forcar=True)
        ext = Path(trilha["audio_key"]).suffix or ".mp3"
        tmp_entrada = ctx.pastas.tmp / f"{uuid.uuid4().hex[:8]}{ext}"
        local = ctx.api.baixar_arquivo(trilha["audio_key"], tmp_entrada)

    try:
        voz, inst = separar_arquivo(ctx, local, nome)
        ctx.progresso(None, "Enviando voz e instrumental pro site…", forcar=True)
        chaves = {}
        for campo, wav in (("vocals_key", voz), ("instrumental_key", inst)):
            mp3 = para_mp3(wav, ctx.pastas.tmp / f"{uuid.uuid4().hex[:8]}.mp3", 192)
            chaves[campo] = ctx.api.upload(mp3, "audio/mpeg")
            mp3.unlink(missing_ok=True)
        dados = dict(chaves)
        if not trilha.get("local_path"):
            dados["local_path"] = str(inst)
        ctx.api.editar_trilha(track_id, dados)
        return {"track_id": track_id, "vocals": str(voz), "instrumental": str(inst)}
    finally:
        if tmp_entrada:
            tmp_entrada.unlink(missing_ok=True)


def executar(ctx):
    track_id = ctx.payload["track_id"]
    try:
        resultado = separar_trilha(ctx, track_id)
    except Cancelado:
        raise
    except ErroAmigavel:
        raise
    except Exception as e:  # noqa: BLE001
        low = str(e).lower()
        if "out of memory" in low or ("cuda" in low or "mps" in low) and "memory" in low:
            raise ErroAmigavel("A GPU ficou sem memória. Feche jogos/edição pesada e tente de novo.")
        raise
    return resultado, "Voz e instrumental separados"
