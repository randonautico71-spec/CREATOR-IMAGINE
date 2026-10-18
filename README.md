# CREATOR IMAGINE — Motor Audiovisual

**Motor de vídeo vertical para YouTube** · 1080×1920 · 60fps · DSP Audio + Playwright Render

---

## Estructura del repositorio

```
creator-imagine-engine/
├── CLAUDE.md              ← Instrucciones para Claude Code Cloud
├── README.md              ← Documentación del proyecto
├── package.json
├── requirements.txt
├── .gitignore
│
├── schema/
│   └── timeline.schema.json    ← Contrato de datos oficial
│
├── engine/                     ← Motor (no modificar en uso normal)
│   ├── base_template.html      ← Plantilla Chromium (CSS determinista)
│   ├── timeline_runtime.js     ← Runtime de animación
│   ├── render_worker.js        ← Playwright → frames → FFmpeg
│   └── dsp_audio_engine.py     ← Síntesis DSP de música y SFX (48 kHz)
│
├── visual/
│   ├── themes/                 ← Identidades visuales (dramatic, documentary, etc.)
│   ├── components/             ← Componentes visuales
│   ├── transitions/            ← Transiciones
│   └── effects/                ← Efectos especiales
│
├── scripts/
│   ├── build_video.py          ← Orquestador único de pipeline
│   ├── setup_cloud.sh          ← Configuración automática del entorno cloud
│   ├── validate_timeline.js    ← Validador JSON Schema (AJV)
│   ├── extract_control_frames.py ← Extracción de capturas de control
│   ├── verify_output.py        ← Control de calidad técnico y reporte
│   ├── render_preview.js       ← Preview rápido (360p)
│   ├── render_final.js         ← Render final (1080x1920)
│   └── quality_check.py        ← Control de calidad
│
├── examples/
│   ├── cloud_smoke_test/       ← Smoke test de 5 segundos (300 frames)
│   │   ├── brief.md
│   │   └── timeline.json
│   └── system_test/            ← Prueba completa del sistema (15s)
│       └── timeline.json
│
├── output/                     ← validation_report.json y entregables
│   └── .gitkeep
│
└── projects/                   ← Proyectos de producción
    └── <slug>/
        ├── brief.md
        └── timeline.json
```

## Smoke Test (Verificación Cloud en 1 comando)

```bash
# Ejecutar pipeline completo de 5 segundos (validar -> audio -> render -> QC):
python scripts/build_video.py examples/cloud_smoke_test

# O mediante script npm:
npm run test:smoke
```

## Inicio rápido local

```bash
# 1. Instalar dependencias
npm install
npx playwright install chromium
pip install -r requirements.txt

# 2. Validar el ejemplo de test
npm run validate -- examples/system_test/timeline.json

# 3. Generar audio
python engine/dsp_audio_engine.py \
  --timeline examples/system_test/timeline.json \
  --output examples/system_test/music.wav

# 4. Renderizar preview (360p / 15fps)
node scripts/render_final.js \
  --html engine/base_template.html \
  --timeline examples/system_test/timeline.json \
  --audio examples/system_test/music.wav \
  --output examples/system_test/preview.mp4 \
  --preview
```

## Crear un vídeo nuevo

```bash
mkdir -p projects/mi_video
# Crear projects/mi_video/brief.md con el guión
# Crear projects/mi_video/timeline.json siguiendo el schema
npm run validate -- projects/mi_video/timeline.json
python engine/dsp_audio_engine.py --timeline projects/mi_video/timeline.json --output projects/mi_video/music.wav
node scripts/render_final.js --project projects/mi_video/
python scripts/quality_check.py --project projects/mi_video/
```

## Componentes del Motor

| Tipo | Componente | Descripción |
|---|---|---|
| **Figuras & Siluetas** | `figure` | Siluetas vectoriales SVG de alta definición: `dinosaur-trex`, `dinosaur-brachiosaurus`, `dinosaur-raptor`, `mountains`, `volcano`, `city-skyline`, `planet`, `meteor` o SVG personalizado |
| **Imágenes Transparentes** | `image` | Capas PNG / WebP con canal alpha con sombras, glow y movimiento parallax |
| **Tipografía** | `title` | Rótulos de impacto con palabras destacadas (`accentWords`) |
| **Métricas** | `counter` | Contadores numéricos animados con easing exponencial |
| **Subtítulos** | `caption` | Subtítulos sincronizados palabra a palabra con la narración |
| **Tarjetas & Datos** | `card`, `ranking`, `badge` | Cajas de datos, ránkings y etiquetas de aviso |
| **Efectos** | `particles`, `camera` | Polvo estelar/estrellas con glow y movimientos de cámara (ken-burns, zoom, pan) |
| **Velas & Símbolos** | `candle`, `emoji` | Vela procedural con llama oscilante y emojis flotantes |

## Herramientas utilizadas

| Herramienta | Uso |
|---|---|
| **ElevenLabs** (Carmen, español peninsular) | Narración en voz humana |
| **Claude Code Cloud** | Motor de código y montaje |
| **Playwright + Chromium** | Renderizado de frames determinista |
| **FFmpeg** | Muxeo de vídeo y audio |
| **NumPy/SciPy** | Síntesis DSP de audio a 48 kHz |

## Repositorio Oficial en GitHub

Repositorio: **[https://github.com/randonautico71-spec/CREATOR-IMAGINE](https://github.com/randonautico71-spec/CREATOR-IMAGINE)**

### Pasos en Claude Code Cloud:
1. Conectar el repositorio `randonautico71-spec/CREATOR-IMAGINE` en [claude.ai/code](https://claude.ai/code).
2. Crear Cloud Environment con el script:
   ```bash
   bash scripts/setup_cloud.sh
   ```
3. Ejecutar el smoke test inicial de 5 segundos:
   ```bash
   python scripts/build_video.py examples/cloud_smoke_test
   ```
