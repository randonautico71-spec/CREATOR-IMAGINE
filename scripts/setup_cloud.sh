#!/usr/bin/env bash
# setup_cloud.sh — Prepara el entorno cloud para CREATOR IMAGINE Engine
# Ejecutar en la raíz del repositorio.
set -euo pipefail

echo "============================================"
echo "  CREATOR IMAGINE — Setup Cloud Environment"
echo "============================================"

echo ""
echo "[1/6] Instalando dependencias Node..."
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

echo ""
echo "[2/6] Instalando Chromium para Playwright..."
npx playwright install --with-deps chromium

echo ""
echo "[3/6] Instalando dependencias Python..."
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo ""
echo "[4/6] Comprobando FFmpeg..."
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "      FFmpeg no encontrado. Instalando..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y ffmpeg
  elif command -v brew >/dev/null 2>&1; then
    brew install ffmpeg
  else
    echo "      ADVERTENCIA: No se pudo instalar FFmpeg automáticamente."
    echo "      Instálalo manualmente: https://ffmpeg.org/download.html"
  fi
else
  echo "      FFmpeg encontrado: $(ffmpeg -version 2>&1 | head -n 1)"
fi

echo ""
echo "[5/6] Verificando entorno..."
echo "      Node:    $(node --version)"
echo "      Python:  $(python --version)"
echo "      npm:     $(npm --version)"
if command -v ffmpeg >/dev/null 2>&1; then
  echo "      FFmpeg:  $(ffmpeg -version 2>&1 | head -n 1 | awk '{print $3}')"
fi

echo ""
echo "[6/6] Validando motor..."
node --check engine/render_worker.js    && echo "      ✓ render_worker.js OK"
node --check engine/timeline_runtime.js && echo "      ✓ timeline_runtime.js OK"
python -m py_compile engine/dsp_audio_engine.py && echo "      ✓ dsp_audio_engine.py OK"
node scripts/validate_timeline.js examples/cloud_smoke_test/timeline.json 2>/dev/null \
  && echo "      ✓ Smoke test timeline OK" \
  || echo "      ⚠ Validación de timeline pendiente"

echo ""
echo "============================================"
echo "  Entorno preparado correctamente."
echo "  Ejecuta el smoke test de 5 segundos con:"
echo "  python scripts/build_video.py examples/cloud_smoke_test"
echo "============================================"
