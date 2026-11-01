#!/bin/bash
# HENNRI · AJUDANTE (Mac) — liga o ajudante sozinho quando você entra no Mac.
# Pra desligar isso: REMOVER-INICIO-AUTOMATICO.command

cd "$(dirname "$0")" || exit 1
DIR="$(pwd)"
LABEL="com.hennri.ajudante"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DADOS="$HOME/Library/Application Support/HennriMaker"

pausa() {
  echo
  read -n 1 -s -r -p "  Aperte qualquer tecla pra fechar."
  echo
}

if [ ! -x "$DIR/.venv/bin/python" ]; then
  echo
  echo "  Rode o INICIAR.command primeiro (ele instala tudo)."
  pausa
  exit 1
fi

# caracteres especiais de XML no caminho da pasta
xml() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

mkdir -p "$HOME/Library/LaunchAgents" "$DADOS"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml "$DIR/.venv/bin/python")</string>
    <string>$(xml "$DIR/hennri_helper.py")</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$(xml "$DIR")</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>StandardOutPath</key>
  <string>$(xml "$DADOS/launchd.log")</string>
  <key>StandardErrorPath</key>
  <string>$(xml "$DADOS/launchd.log")</string>
</dict>
</plist>
EOF

# troca o que estiver rodando pela versão do início automático
pkill -f "hennri_helper.py" >/dev/null 2>&1
launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1
if ! launchctl bootstrap "gui/$(id -u)" "$PLIST" >/dev/null 2>&1; then
  launchctl load -w "$PLIST" >/dev/null 2>&1   # macOS mais antigo
fi

echo
echo "  Pronto! O ajudante agora liga sozinho quando você entra no Mac (e já está ligado)."
echo "  Pra desligar isso, dê dois cliques em REMOVER-INICIO-AUTOMATICO.command."
pausa
