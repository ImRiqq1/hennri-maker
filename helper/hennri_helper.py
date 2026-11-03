"""
HENNRI · AJUDANTE — faz no computador o que você pede no maker.hennri.com:
baixar refs/vídeos, baixar músicas (Spotify/YouTube), separar voz e melhorar voz.

Primeira vez:  INICIAR.bat (Windows) ou INICIAR.command (Mac). Ele mostra um código (HN-4821),
abre o site e você só confirma — sem copiar chave.
Linha de comando:  python hennri_helper.py [--site URL] [--token hm_...] [--root PASTA]
                                          [--conectar] [--setup] [--console]
"""
import argparse
import os
import queue
import subprocess
import sys
import threading

# pythonw (sem console) deixa stdout/stderr = None: a barra de progresso do download do modelo
# (tqdm) quebrava com "'NoneType' object has no attribute 'write'" e a separação de voz nunca carregava.
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

from hennri.api import Api, ChaveInvalida, SemConexao
from hennri.config import SITE_PADRAO, Pastas, configurar_log, ler_config, log, raiz_padrao, salvar_config


def site_de(args, cfg: dict) -> str:
    """O site só muda com --site (nunca pergunta: a chave acabava colada no lugar do site)."""
    for s in (args.site, cfg.get("site_url")):
        if s and str(s).startswith(("http://", "https://")):
            return str(s).rstrip("/")
    return SITE_PADRAO


def tem_console() -> bool:
    return sys.stdin is not None and sys.stdin.isatty()


def _mostrar_codigo(codigo: str, url: str):
    print()
    print("  ==========================================")
    print(f"        CÓDIGO PRA CONECTAR:  {codigo}")
    print("  ==========================================")
    print()
    print("  Abri o site no navegador — confira se o código é o mesmo e clique em Confirmar.")
    print(f"  (se não abriu: {url})")
    print("  Plano B: cole uma chave hm_... aqui e aperte Enter.")
    print()


def _leitor_de_chave():
    """Lê o que for colado no console sem travar a espera pelo código (plano B: chave manual)."""
    fila: queue.Queue[str] = queue.Queue()

    def ler():
        try:
            for linha in sys.stdin:
                linha = linha.strip()
                if linha.startswith("hm_"):
                    fila.put(linha)
                elif linha:
                    print("  A chave começa com hm_ — cole de novo (ou só confirme o código no site).")
        except Exception:
            pass

    threading.Thread(target=ler, daemon=True).start()

    def pegar():
        try:
            return fila.get_nowait()
        except queue.Empty:
            return None

    return pegar


def configurar(cfg: dict, args) -> dict:
    """Console/Terminal: conecta este computador pelo código (ou por uma chave colada)."""
    from hennri.pareamento import PareamentoIndisponivel, parear

    site = site_de(args, cfg)
    print("\n  HENNRI · AJUDANTE — conectar este computador")
    token = args.token
    if not token:
        try:
            token = parear(site, ao_codigo=_mostrar_codigo, chave_manual=_leitor_de_chave())
        except PareamentoIndisponivel:
            # site antigo, sem conexão por código: chave manual
            print("\n  Abra o site → engrenagem → Ajudante do PC → Conectar um PC, copie a chave e cole aqui.\n")
            token = input("  Chave: ").strip()
            while not token.startswith("hm_"):
                token = input("  A chave começa com hm_ — cole de novo: ").strip()
    if not token:
        print("\n  O código expirou sem confirmação. Rode de novo quando estiver com o site aberto.\n")
        sys.exit(1)
    cfg.update(site_url=site, token=token, root=cfg.get("root") or str(raiz_padrao()))
    try:
        Api(site, token).heartbeat({"setup": True})
        print("\n  Conectado! O ajudante vai rodar escondido (perto do relógio no Windows, na barra de cima no Mac).\n")
    except ChaveInvalida:
        print("\n  Essa chave não funcionou. Gere outra no site e rode de novo.\n")
        sys.exit(1)
    except SemConexao:
        print("\n  Não consegui falar com o site agora; a chave foi salva e ele tenta de novo sozinho.\n")
    salvar_config(cfg)
    return cfg


def main():
    ap = argparse.ArgumentParser(description="Ajudante do HENNRI IA MAKER")
    ap.add_argument("--site")
    ap.add_argument("--token")
    ap.add_argument("--root", help="pasta onde os arquivos ficam (padrão: Downloads/HENNRI)")
    ap.add_argument("--conectar", action="store_true", help="se ainda não tem chave, conecta pelo código e sai")
    ap.add_argument("--setup", action="store_true", help="conecta de novo (código novo) e sai")
    ap.add_argument("--console", action="store_true", help="roda sem ícone, mostrando o log na tela")
    args = ap.parse_args()

    cfg = ler_config()
    if args.root:
        cfg["root"] = args.root
    if args.token:
        cfg.update(site_url=site_de(args, cfg), token=args.token, root=cfg.get("root") or str(raiz_padrao()))
        salvar_config(cfg)

    # usados pelos instaladores (INICIAR.bat / INICIAR.command), sempre com console
    if args.conectar or args.setup:
        if args.conectar and cfg.get("token"):
            return  # já conectado
        if not tem_console():
            # sem console (pythonw): abre um pra mostrar o código (Windows)
            subprocess.Popen([sys.executable.replace("pythonw.exe", "python.exe"), os.path.abspath(__file__), "--setup"],
                             creationflags=getattr(subprocess, "CREATE_NEW_CONSOLE", 0))
            return
        configurar(cfg, args)
        return

    if not cfg.get("token") and tem_console():
        cfg = configurar(cfg, args)
    # sem chave e sem console (escondido / início automático): o próprio ícone mostra o código e abre o site

    configurar_log(console=args.console)
    from hennri.worker import Worker

    site = site_de(args, cfg)
    if cfg.get("site_url") != site:
        cfg["site_url"] = site  # config antiga com a chave no lugar do site
        salvar_config(cfg)

    def salvar_chave(token: str):
        cfg.update(token=token, site_url=site, root=cfg.get("root") or str(raiz_padrao()))
        salvar_config(cfg)

    pastas = Pastas(cfg.get("root") or raiz_padrao())
    worker = Worker(Api(site, cfg.get("token") or ""), pastas, site, ao_nova_chave=salvar_chave)

    if args.console:
        try:
            worker.rodar()
        except KeyboardInterrupt:
            worker.parar.set()
    else:
        # o ícone precisa da thread principal (obrigatório no Mac); o trabalho roda em outra
        t = threading.Thread(target=worker.rodar, daemon=True)
        t.start()
        try:
            from hennri.tray import rodar_bandeja

            rodar_bandeja(worker, ao_sair=worker.parar.set)
        except Exception as e:  # sem ícone: segue rodando mesmo assim
            log.warning("ícone indisponível: %s", e)
            t.join()
        worker.parar.set()
        t.join(timeout=5)

    if worker.reiniciar:  # depois de atualizar o baixador, volta com as versões novas
        log.info("reiniciando pra usar as ferramentas atualizadas")
        subprocess.Popen([sys.executable, os.path.abspath(__file__), *sys.argv[1:]])


if __name__ == "__main__":
    main()
