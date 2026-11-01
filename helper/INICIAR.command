#!/bin/bash
# HENNRI · AJUDANTE (Mac) — dois cliques pra instalar/atualizar e ligar.
# Na primeira vez o macOS pode bloquear: botão direito no arquivo → Abrir → Abrir.

cd "$(dirname "$0")" || exit 1
clear
echo
echo "  HENNRI · AJUDANTE"
echo

pausa() {
  echo
  read -n 1 -s -r -p "  Aperte qualquer tecla pra fechar."
  echo
}

erro() {
  echo
  echo "  Deu erro na instalação. Tire um print desta janela e mande pro Claude."
  pausa
  exit 1
}

# Python 3.11 ou mais novo (o do python.org ou do Homebrew)
PY=""
for c in python3.13 python3.12 python3.11 python3 \
         /usr/local/bin/python3 /opt/homebrew/bin/python3 \
         /Library/Frameworks/Python.framework/Versions/Current/bin/python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null; then
    PY="$c"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "  Python não encontrado (precisa do 3.11 ou mais novo)."
  echo "  Instale pelo site que vai abrir agora (botão amarelo \"Download Python\") e rode este arquivo de novo."
  open "https://www.python.org/downloads/macos/"
  pausa
  exit 1
fi

if [ ! -x ".venv/bin/python" ]; then
  echo "  Preparando tudo — só demora na primeira vez..."
  "$PY" -m venv .venv || erro
fi

# fecha o ajudante se já estiver rodando (pra atualizar sem arquivo preso)
pkill -f "hennri_helper.py" >/dev/null 2>&1
sleep 1

echo "  Atualizando as ferramentas — o YouTube e o Insta mudam toda hora..."
.venv/bin/python -m pip install -q --disable-pip-version-check --upgrade pip || erro
if ! .venv/bin/python -c "import torch" >/dev/null 2>&1; then
  echo "  Instalando o motor da GPU do Mac (PyTorch, ~1 GB) — só na primeira vez..."
fi
.venv/bin/python -m pip install -q --disable-pip-version-check --upgrade -r requirements-mac.txt || erro

# primeira vez: mostra um código (HN-4821), abre o site e você só confirma.
# se já estiver conectado, isso não faz nada.
if ! .venv/bin/python hennri_helper.py --conectar; then
  echo
  echo "  Não deu pra conectar agora. Rode o INICIAR.command de novo com o site aberto."
  pausa
  exit 1
fi

# roda em segundo plano, com o ícone na barra de cima (pode fechar o Terminal)
nohup .venv/bin/python hennri_helper.py >/dev/null 2>&1 &
disown

echo
echo "  Pronto! O ícone do HENNRI está na barra de cima, perto do relógio. Pode fechar esta janela."
sleep 4
