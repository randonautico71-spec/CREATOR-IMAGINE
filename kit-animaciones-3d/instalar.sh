#!/usr/bin/env bash
# Instala el kit en un proyecto. Uso (desde la raíz del proyecto, con el kit ya copiado dentro):
#   bash kit-animaciones-3d/instalar.sh
# 1) Copia la skill a .claude/skills/animaciones-3d  2) Añade el bloque de reglas a CLAUDE.md (una sola vez)
# 3) Comprueba node, ffmpeg y Playwright.
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$(pwd)"
[ "$KIT" = "$RAIZ" ] && { echo "Ejecútalo desde la raíz del proyecto: bash kit-animaciones-3d/instalar.sh"; exit 1; }
mkdir -p "$RAIZ/.claude/skills"
rm -rf "$RAIZ/.claude/skills/animaciones-3d" && cp -r "$KIT/claude/skills/animaciones-3d" "$RAIZ/.claude/skills/"
echo "[ok] skill en .claude/skills/animaciones-3d"
if ! grep -q "kit-animaciones-3d" "$RAIZ/CLAUDE.md" 2>/dev/null; then
  { [ -s "$RAIZ/CLAUDE.md" ] && echo; cat "$KIT/CLAUDE_BLOQUE.md"; } >> "$RAIZ/CLAUDE.md"; echo "[ok] bloque añadido a CLAUDE.md"
else echo "[ok] CLAUDE.md ya menciona el kit (no se toca)"; fi
command -v node >/dev/null && echo "[ok] node $(node -v)" || echo "[FALTA] node (>= 18)"
command -v ffmpeg >/dev/null && echo "[ok] ffmpeg" || echo "[FALTA] ffmpeg"
node -e "for(const m of ['playwright','@playwright/test']){try{require(m);process.exit(0)}catch(e){}}process.exit(1)" 2>/dev/null \
  && echo "[ok] Playwright" || echo "[FALTA] Playwright (para los estilos y el letrero): npm i -D playwright && npx playwright install chromium"
