#!/bin/bash
# HENNRI · AJUDANTE (Mac) — para de ligar sozinho com o Mac (o ajudante continua instalado).

LABEL="com.hennri.ajudante"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || launchctl unload -w "$PLIST" >/dev/null 2>&1
rm -f "$PLIST"

echo
echo "  Pronto: o ajudante não liga mais sozinho. Pra ligar quando quiser, use o INICIAR.command."
echo
read -n 1 -s -r -p "  Aperte qualquer tecla pra fechar."
echo
