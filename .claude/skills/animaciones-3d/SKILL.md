---
name: animaciones-3d
description: Crear animaciones o vídeos con estilos 3D por código (pixel art 3D, vóxel, isométrico, low-poly, wireframe, toon, papercraft, partículas, retro de consola, ASCII, infografía 3D, SDF/ray marching, texturas procedurales y animales 3D). Úsala SIEMPRE que el usuario pida una animación, una escena animada, un clip, un fondo animado o «un vídeo con animaciones», aunque no diga «3D». Antes de decidir el estilo hay que PREGUNTAR al usuario qué tipo quiere.
---

# Animaciones 3D por código (kit-animaciones-3d)

Todo se genera por código, en CPU, sin GPU ni recursos externos. Las rutas son relativas a la carpeta del kit: `kit-animaciones-3d/` en la raíz del proyecto.

## Paso 1 · OBLIGATORIO: preguntar el tipo de animación ANTES de decidir

**No elijas el estilo por tu cuenta.** Aunque el tema parezca pedir uno concreto, antes de escribir código o renderizar pregunta al usuario qué tipo de animación quiere. Solo te lo saltas si el usuario ya ha nombrado un estilo de esta lista en el mismo encargo; en ese caso confírmalo en una línea y sigue.

1. Si puedes enviar ficheros al usuario, envíale el catálogo: `kit-animaciones-3d/catalogo.jpg` (13 estilos) y `kit-animaciones-3d/catalogo_animales.jpg` (animales SDF).
2. Pregunta en dos pasos con la herramienta de preguntas (`AskUserQuestion`, máximo 4 opciones por pregunta). Si no la tienes, pregunta en texto con la misma lista.
   - **Pregunta 1, familia:** «¿Qué tipo de animación quieres?»
     - *Retro y píxel*: pixel art 3D, vóxel, retro de consola, ASCII 3D
     - *Geométrico 3D*: low-poly, isométrico / diorama, wireframe retro, infografía 3D
     - *Ilustrado*: toon / cel shading, 2.5D papercraft, partículas 3D
     - *Realista (SDF + texturas procedurales)*: gotas SDF, planeta, animales en el bosque o la sabana, y el estilo `realista` de cualquier tema
   - **Pregunta 2, estilo:** las opciones de la familia elegida (tabla de abajo). Con una recomendación, ponla la primera con «(Recomendado)» y di por qué en la descripción.
3. Pregunta también, si no está claro: duración, si lleva letrero final «SIGUE A @…» y si lleva audio (el kit no compone música; usa un WAV del proyecto si lo hay).

## Paso 1 bis · Temas detallados listos para usar

Además de las demos de cada estilo, hay **5 temas modelados con máximo detalle** que se pueden generar en **cualquiera de los 12 estilos** (11 de malla + `realista`):

| Tema | Qué incluye | En vídeo se mueve |
|---|---|---|
| `leon` | León de ~280 piezas (melena en mechas, ojos con pupila, bigoteras, dedos, borla) en la sabana con acacias, hierba, rocas y termitero | Camina; la cámara orbita |
| `planeta` | Planeta tipo Tierra (continentes inventados, no el mapa real), nubes con sombra, ciudades nocturnas, atmósfera, Luna y cohete en órbita | El planeta rota y el cohete recorre la órbita |
| `ciudad` | Calle con ~220 personas distintas, edificios con ventanas, escaparates, farolas, árboles, semáforos y coches | La gente avanza; la cámara orbita |
| `oceano` | Ballena jorobada y tiburón blanco esculpidos (tubérculos, pliegues, aletas, branquias, dientes) sobre arena con ondas y cáusticas, rocas con algas, bosque de kelp, cardumen, estrellas de mar y erizos, rayos de luz | Nadan; algas y cáusticas se mueven; la cámara orbita |
| `persona` | Persona esculpida como volumen SDF (cara con párpados, iris, nariz, labios, orejas; manos con dedos; ropa con botones y cordones) | Pose fija en malla; en `realista` camina (≈50 s por fotograma) |

```bash
node kit-animaciones-3d/bin/tema.cjs <tema> <estilo> salida.png                 # fotograma (realista: suavizado 2×)
node kit-animaciones-3d/bin/tema.cjs <tema> <estilo> salida.mp4 --seg 8 [--fps 30] [--orbita 0.06] [--audio m.wav] [--letrero @handle --letrero-s 5]
```
Coste medido (4 CPU): estilos de malla 0,1–4 s por fotograma; `realista`: planeta ~10 s, océano ~3 min, persona ~50 s, ciudad ~90 s, león ~100 s por fotograma a 1080×1920 (en vídeo usar `--w 540 --h 960`).
Estilo `realista` = SDF + texturas procedurales (los antiguos 12 y 13 se unieron: la diferencia no se apreciaba).

## Paso 2 · Catálogo

| Familia | Estilo | Nombre en el kit | Coste por fotograma (4 CPU) | Qué hace la demo |
|---|---|---|---|---|
| Retro y píxel | Pixel art 3D | `pixel` | ~0,1 s | Isla al atardecer, palmeras que se mecen |
| Retro y píxel | Vóxel | `voxel` | ~0,1 s | Isla flotante de cubos, cámara orbitando |
| Retro y píxel | Retro de consola | `dither` | ~0,05 s | Pirámides con tramado de 4 tonos, travelling |
| Retro y píxel | ASCII 3D | `ascii` | ~0,1 s | Toro y esfera girando hechos de caracteres |
| Geométrico 3D | Low-poly | `lowpoly` | ~0,1 s | Valle de montaña, la cámara avanza |
| Geométrico 3D | Isométrico / diorama | `iso` | ~0,05 s | Habitación en corte con vaivén de cámara |
| Geométrico 3D | Wireframe retro | `wire` | ~0,1 s | Synthwave: rejilla que corre y montañas de neón |
| Geométrico 3D | Infografía 3D | `info` | ~0,05 s | Barras que crecen y tarta que se despliega (valores de ejemplo) |
| Ilustrado | Toon / cel shading | `toon` | ~0,2 s | Cohete girando con llama y contorno de cómic |
| Ilustrado | 2.5D papercraft | `paper` | ~0,25 s | Capas de papel con parallax |
| Ilustrado | Partículas 3D | `galaxy` | ~0,2 s | Galaxia de 120 000 estrellas girando |
| Realista (SDF) | Gotas SDF | `sdf` | ~1,2 s | Gotas iridiscentes que se funden |
| Realista (SDF) | Texturas procedurales | `planet` | ~0,25 s | Planeta inventado rotando, nubes y luces nocturnas |
| Realista (SDF) | Animales en el bosque | SDF `bosque` | ~3,5 s | Ciervos y zorro al galope entre pinos (10 s ≈ 18 min) |
| Realista (SDF) | Animales con texturas | SDF `sabana` | ~3,5 s | Jirafa, cebras y guepardo caminando (10 s ≈ 18 min) |

En la infografía, cualquier dato real tiene que venir de una fuente verificable. Nunca inventes cifras.

## Paso 3 · Generar

Primero, siempre, **fotogramas de control y mirarlos**:

```bash
node kit-animaciones-3d/bin/estilo.cjs <estilo> salida/stills --stills 0,2,4
node kit-animaciones-3d/bin/sdf.cjs <bosque|sabana> salida/stills --stills 0,3,6
```

Después, el vídeo (vertical 1080×1920, 30 fps):

```bash
node kit-animaciones-3d/bin/estilo.cjs <estilo> salida/video.mp4 --seg 8 [--audio musica.wav] [--letrero @handle --letrero-s 5]
node kit-animaciones-3d/bin/sdf.cjs <escena> salida/video.mp4 --seg 10 [--audio musica.wav] [--letrero @handle --letrero-s 7]
```

## Paso 4 · Adaptar al tema del usuario

Las demos son ejemplos. Para el tema del usuario se escribe una **escena propia con las técnicas del estilo elegido**:

- **Estilos 2D-3D:** crea `mi_escena.js` con `ESC.mi_escena = (ctx, t = 0) => { ... }` usando el motor de `estilos/motor3d.js`: `camera`, `render`, `box`, `sphere`, `lathe`, `quantize`, ruido `fbm3`... Toma como plantilla la función del estilo en `estilos/escenasA.js` o `estilos/escenasB.js`. Se carga con `--extra mi_escena.js` y se usa como `<estilo>` = `mi_escena`. Todo movimiento debe depender solo de `t`, nunca del reloj.
- **Animales SDF:** copia `sdf/escenas/sabana.js` y cambia los animales (`cuadrupedo(especie, x, z, t, fase, escala, { v, suelo })`, con especies en `sdf/motor.js` → `ESPECIES`), la cámara, el terreno y los materiales. La `x` del animal debe avanzar exactamente a `v` m/s para que no patine. Pasa la ruta del fichero como escena.

Reglas: no usar `ctx.filter` ni `shadowBlur` por fotograma (sin GPU es lentísimo); antes de renderizar, mirar los fotogramas de control.
