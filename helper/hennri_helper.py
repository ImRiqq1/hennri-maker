"""
HENNRI · AJUDANTE — faz no PC o que você pede no maker.hennri.com:
baixar refs/vídeos, baixar músicas (Spotify/YouTube), separar voz e melhorar voz.

Primeira vez:  INICIAR.bat (pede a chave que o site gera em Configurações → Ajudante)
Linha de comando:  python hennri_helper.py [--site URL] [--token hm_...] [--root PASTA] [--setup] [--console]
"""
import argparse
import os
import subprocess
import sys
import threading

from hennri.api import Api, ChaveInvalida, SemConexao
from hennri.config import SITE_PADRAO, Pastas, configurar_log, ler_config, log, raiz_padrao, salvar_config


def configurar(cfg: dict, args) -> dict:
    """Pergunta a chave (e o site) no console na primeira vez."""
    print("\n  HENNRI · AJUDANTE — configuração\n")
    print("  1. Abra o site → engrenagem → Ajudante do PC → Conectar um PC")
    print("  2. Copie a chave (começa com hm_) e cole aqui.\n")
    # o site só muda com --site; perguntar aqui confundia (a chave acabava colada no lugar do site)
    site = args.site or SITE_PADRAO
    if not site.startswith(("http://", "https://")):
        site = SITE_PADRAO
    token = args.token or input("  Chave: ").strip()
    while not token.startswith("hm_"):
        token = input("  A chave começa com hm_ — cole de novo: ").strip()
    cfg.update(site_url=site.rstrip("/"), token=token, root=cfg.get("root") or str(raiz_padrao()))
    try:
        Api(cfg["site_url"], cfg["token"]).heartbeat({"setup": True})
        print("\n  Conectado! O ajudante vai rodar escondido, perto do relógio.\n")
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
    ap.add_argument("--root", help="pasta onde os arquivos ficam (padrão: Downloads\\HENNRI)")
    ap.add_argument("--setup", action="store_true", help="só configura a chave e sai")
    ap.add_argument("--console", action="store_true", help="roda sem ícone, mostrando o log na tela")
    args = ap.parse_args()

    cfg = ler_config()
    if args.root:
        cfg["root"] = args.root
    if args.site and args.token:
        cfg.update(site_url=args.site.rstrip("/"), token=args.token, root=cfg.get("root") or str(raiz_padrao()))
        salvar_config(cfg)
    if args.setup or not cfg.get("token"):
        if sys.stdin is None or not sys.stdin.isatty():
            # sem console (pythonw) e sem chave: abre um console pra configurar
            subprocess.Popen([sys.executable.replace("pythonw.exe", "python.exe"), os.path.abspath(__file__), "--setup"],
                             creationflags=getattr(subprocess, "CREATE_NEW_CONSOLE", 0))
            return
        cfg = configurar(cfg, args)
        if args.setup:
            return

    configurar_log(console=args.console)
    from hennri.worker import Worker

    if not str(cfg.get("site_url", "")).startswith(("http://", "https://")):
        cfg["site_url"] = SITE_PADRAO  # config antiga com a chave no lugar do site
        salvar_config(cfg)

    pastas = Pastas(cfg.get("root") or raiz_padrao())
    worker = Worker(Api(cfg["site_url"], cfg["token"]), pastas, cfg["site_url"])

    if args.console:
        try:
            worker.rodar()
        except KeyboardInterrupt:
            worker.parar.set()
    else:
        t = threading.Thread(target=worker.rodar, daemon=True)
        t.start()
        try:
            from hennri.tray import rodar_bandeja

            rodar_bandeja(worker, ao_sair=worker.parar.set)
        except Exception as e:  # sem bandeja: segue rodando mesmo assim
            log.warning("ícone da bandeja indisponível: %s", e)
            t.join()
        worker.parar.set()
        t.join(timeout=5)

    if worker.reiniciar:  # depois de atualizar o baixador, volta com as versões novas
        log.info("reiniciando pra usar as ferramentas atualizadas")
        subprocess.Popen([sys.executable, os.path.abspath(__file__), *sys.argv[1:]])


if __name__ == "__main__":
    main()
