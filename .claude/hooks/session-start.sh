#!/bin/bash
# Instala las librerias de trabajo en las sesiones de Claude Code en la web.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Tkinter para python3.12 (programa de escritorio y pruebas de interfaz)
if ! python3.12 -c "import tkinter" 2>/dev/null; then
  apt-get install -y -q python3-tk >/dev/null 2>&1 || \
    { apt-get update -q >/dev/null 2>&1 && apt-get install -y -q python3-tk >/dev/null 2>&1; } || \
    echo "Aviso: no se pudo instalar python3-tk" >&2
fi

pip install -q --break-system-packages -r requirements.txt 2>&1 | grep -v "Running pip as the 'root'" || true
