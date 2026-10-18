# CREATOR IMAGINE — Motion Video Engine

## Objetivo
Motor audiovisual determinista para crear vídeos verticales 1080×1920 a 60 fps,
orientado al canal de YouTube CREATOR IMAGINE. Usa ElevenLabs (voz Carmen, español
peninsular) para narración y Claude como motor de código y montaje.

## Flujo obligatorio por vídeo
1. Leer el brief del proyecto en `projects/<slug>/brief.md`.
2. Seleccionar tema visual de `visual/themes/`.
3. Seleccionar componentes de `visual/components/`.
4. Generar `projects/<slug>/timeline.json` validado contra `schema/timeline.schema.json`.
5. Validar: `npm run validate -- projects/<slug>/timeline.json`
6. Generar música/SFX: `python engine/dsp_audio_engine.py --timeline projects/<slug>/timeline.json --output projects/<slug>/music.wav`
7. Renderizar preview: `node scripts/render_preview.js --project projects/<slug>/`
8. Inspeccionar fotogramas de control (segundo 0, 25%, 50%, 75%, final).
9. Corregir desbordamientos y errores de contraste.
10. Renderizar final: `node scripts/render_final.js --project projects/<slug>/`
11. Ejecutar quality check: `python scripts/quality_check.py --project projects/<slug>/`
12. Entregar `video.mp4` + `timeline.json` + informe breve.

## Restricciones críticas
- NO modificar `engine/` durante creación normal de vídeo.
- NO inventar propiedades fuera del esquema JSON.
- NO usar animaciones dependientes del tiempo real del sistema.
- NO usar material musical externo sin licencia.
- NO descargar assets sin autorización explícita.
- NO usar fuentes sin licencia libre verificada.
- NO guardar MP4, WAV ni secuencias de frames en Git.
- NO declarar vídeo terminado sin pasar `quality_check.py`.
- NO declarar validado si FFmpeg no terminó con código 0.

## Archivos maestros
| Archivo | Propósito |
|---|---|
| `schema/timeline.schema.json` | Contrato de datos del timeline |
| `engine/base_template.html` | Plantilla de renderizado Chromium |
| `engine/render_worker.js` | Motor Playwright → frames |
| `engine/dsp_audio_engine.py` | Generador DSP de música y SFX |
| `engine/timeline_runtime.js` | Runtime de animación en browser |

## Comandos rápidos
```bash
# Smoke test completo de 5 segundos (verificación cloud)
python scripts/build_video.py examples/cloud_smoke_test

# O vía npm:
npm run test:smoke

# Pipeline completo unificado (validación + audio + render + frames + QC)
python scripts/build_video.py projects/<slug>

# Test de sistema 15s
python scripts/build_video.py examples/system_test

# Comandos individuales (si se requiere control manual)
npm run validate -- projects/<slug>/timeline.json
python engine/dsp_audio_engine.py --timeline projects/<slug>/timeline.json --output projects/<slug>/music.wav
node scripts/render_preview.js --project projects/<slug>/
node scripts/render_final.js --project projects/<slug>/
python scripts/verify_output.py --project projects/<slug>/
```

## Temas disponibles
- `documentary` — Oscuro, dramático, dorado
- `luxury` — Negro, dorado, platino
- `sports` — Dinámico, rojo-naranja, energía
- `technology` — Azul cian, neón, futurista
- `dramatic` — Púrpura profundo, glow, cinemático

## Componentes disponibles
- **Visuales & Siluetas**: `figure` — Catálogo temático de 48 formas SVG editables:
  - *Dinosaurios y Paisajes*: `dinosaur-trex`, `dinosaur-brachiosaurus`, `dinosaur-raptor`, `mountains`, `volcano`, `city-skyline`, `planet`, `meteor`
  - *Fauna Marina*: `whale`, `shark`, `dolphin`, `octopus`, `manta-ray`, `fish-school`
  - *Náutica e Islas*: `island-palm`, `lighthouse`, `sailboat`, `ship-cargo`, `ocean-waves`
  - *Naturaleza y Aves*: `tree-pine`, `tree-oak`, `tree-palm-tall`, `eagle`, `bird-flock`
  - *Escenas Domésticas y Personas*: `person-standing`, `person-sitting`, `entity-glow`, `house`, `room-interior`, `sofa`, `table`, `lamp-floor`, `bush`, `entrance-gate`, `grass`
  - *Espacio y Ciencia*: `rocket`, `satellite`, `astronaut`, `black-hole`, `dna-helix`
  - *Cartografía y Símbolos*: `compass`, `pyramid`, `ancient-temple`, `map-scroll`, `alert-triangle`, `data-chart`, `radar-circle`
  - *SVG propio*: `custom` o código SVG embebido mediante `svg`.
  - *Estilos de figura*: `silhouette`, `glow`, `outline`, `duotone`, `neon`, `flat`, `gradient`.
  - *Capas de color y trazos*: `primaryColor`, `secondaryColor`, `accentColor`, `stroke`, `strokeWidth`.
  - *Movimientos orgánicos*: `none`, `breathe`, `float`, `rise`, `pan`, `parallax`, `wiggle` (con `wiggleAmount`), `sway` (con `swayAmount`), `pulse` (con `pulseFreq`, `pulseAmount`), `motionPath`.
- **Fondos Procedurales & Espaciales**: `canvas-bg` (`radar`, `waves`), `background` (`space`, `gradient`, `solid`)
- **Animaciones Vectoriales Lottie**: `lottie` — Archivos JSON Lottie a 60 fps sincronizados con el timeline de Playwright y soporte opcional para trayectorias curvas `motionPath`
- **Ilustraciones & Assets**: `image` (PNG/WebP/SVG transparentes con alpha y parallax), `candle` (vela procedural), `emoji`
- **Tipografía & Datos**: `title` (con accentWords), `badge`, `card`, `counter` (numérico animado con física spring: `springTension`, `springFriction`), `caption` (subtítulos dinámicos palabra por palabra), `ranking`
- **Efectos & Cámara**: `particles` (estrellas/partículas con glow), `camera` (ken-burns, zoom-in, zoom-out, pan, parallax)

## Estilo de referencia (CREATOR IMAGINE)
- Fondo espacial/oscuro con gradientes
- Texto grande bold, colores accent en datos clave
- Animación de contadores numéricos
- Subtítulos animados al ritmo de la voz
- Partículas y efectos glow
- Movimiento de cámara sutil (ken-burns)
- Gráficos e infografías animadas
- Música de fondo dinámica acorde al tema
