#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construye timeline.json para 'frutos_pacto'.

IMPORTANTE (lección aprendida tras revisar el preview v1): el componente
`caption` del motor pinta TODAS las palabras de `words` a la vez (solo
resalta la activa), sin scroll ni recorte — no es un subtítulo tipo
karaoke de una línea. Por tanto cada ESCENA debe llevar un trozo de
narración corto (≈8-13 palabras) para que el bloque de texto quepa en la
franja superior sin desbordarse ni tapar las figuras. Esto obliga a
trocear las 6 macro-partes del guion en muchas escenas cortas, todas con
la misma plantilla visual de su "acto" (fondo/figuras/cámara), y reservar
los elementos de datos (título/contador/tarjeta/ranking/badge) para una
sola sub-escena de cada acto en vez de repetirlos en todas.
"""
import json, re

words = json.load(open('words_raw.json', encoding='utf-8'))['words']
AUDIO_END = words[-1]['end']

# Fronteras de ACTO (tiempo global, s) - solo para decidir la plantilla
# visual y en qué sub-escena van los elementos de datos.
ACTS = [
    ("hook",            0.00,  15.60),
    ("sin_frutos",      15.60, 35.60),
    ("el_pacto",        35.60, 65.20),
    ("domesticacion",   65.20, 95.90),
    ("resumen",         95.90, 111.60),
    ("cierre_cta",     111.60, AUDIO_END + 0.3),
]

def act_for(t):
    for aid, t0, t1 in ACTS:
        if t0 <= t < t1:
            return aid
    return ACTS[-1][0]

# ---------------------------------------------------------------------------
# 1) Trocear las 256 palabras en sub-escenas cortas (8-13 palabras),
#    rompiendo preferentemente en puntuación fuerte.
# ---------------------------------------------------------------------------
STRONG_END = re.compile(r'[.:;…]$|\.\.\.$')
MIN_WORDS, MAX_WORDS = 7, 12

chunks = []
cur = []
for w in words:
    cur.append(w)
    txt = w['text']
    is_strong = bool(STRONG_END.search(txt))
    if (len(cur) >= MIN_WORDS and is_strong) or len(cur) >= MAX_WORDS:
        chunks.append(cur)
        cur = []
if cur:
    if chunks and len(cur) < 4:
        chunks[-1].extend(cur)  # fundir resto muy corto con el chunk anterior
    else:
        chunks.append(cur)

# construir escenas base (id, t0, t1, words-relativos, texto, acto)
raw_scenes = []
for i, ch in enumerate(chunks):
    t0 = ch[0]['start']
    t1 = chunks[i + 1][0]['start'] if i + 1 < len(chunks) else AUDIO_END + 0.35
    act = act_for((ch[0]['start'] + ch[-1]['end']) / 2)
    sid = f"{act}_{sum(1 for r in raw_scenes if r['act'] == act) + 1:02d}"
    rel_words = [{"word": w['text'], "start": round(w['start'] - t0, 3),
                  "end": round(w['end'] - t0, 3)} for w in ch]
    text = " ".join(w['text'] for w in ch)
    raw_scenes.append({"id": sid, "t0": t0, "t1": t1, "words": rel_words, "text": text, "act": act})

print(f"{len(raw_scenes)} escenas cortas generadas (de {len(ACTS)} actos)")
for r in raw_scenes:
    print(f"  {r['id']:20s} {r['t0']:6.2f}-{r['t1']:6.2f}s ({r['t1']-r['t0']:4.2f}s) [{len(r['words'])}w]  {r['text'][:50]}")

# ---------------------------------------------------------------------------
# Helpers de construcción visual (iguales que antes)
# ---------------------------------------------------------------------------
ACCENT_WORDS = {
    "frutas.", "frutos.", "ciegas.", "azúcar.", "pacto", "simple:",
    "comida", "transporte.", "dulces...", "historia.", "manzana",
    "dinosaurios.", "plantas", "animales", "humanos", "negociación.",
    "like,", "suscríbete,", "randonáutico.", "fruta,"
}

def mark_accents(rel_words):
    out = []
    for w in rel_words:
        w2 = dict(w)
        w2["accent"] = w['word'].lower() in ACCENT_WORDS
        out.append(w2)
    return out

def caption(scene):
    return {
        "type": "caption",
        "text": scene["text"],
        "words": mark_accents(scene["words"]),
        "style": "standard",
        "position": {"x": 0.5, "y": 0.045, "anchor": "top-center"},
    }

def narration(scene, stability=0.5, similarity=0.8):
    return {"text": scene["text"], "voice": "carmen", "stability": stability, "similarity": similarity}

def bg(colors, style="gradient", animated=True, intensity=0.6):
    return {"type": "background", "style": style, "colors": colors, "animated": animated, "intensity": intensity}

def camera(effect, intensity, duration, easing="ease-in-out"):
    return {"type": "camera", "effect": effect, "intensity": intensity, "duration": duration, "easing": easing}

def particles(density, color, speed=0.4, glow=True, layer="background", size=2.2):
    return {"type": "particles", "density": density, "color": color, "speed": speed, "glow": glow, "layer": layer, "size": size}

def fig(shape, x, y, anchor, w, h, **kw):
    el = {"type": "figure", "shape": shape, "position": {"x": x, "y": y, "anchor": anchor}, "width": w, "height": h}
    el.update(kw)
    return el

FRUIT_SVG = ("<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>"
             "<circle cx='50' cy='58' r='32' fill='currentColor'/>"
             "<path d='M50 26 C 54 14, 66 10, 74 14 C 68 22, 58 24, 50 26 Z' fill='#4CAF50'/>"
             "<rect x='47' y='14' width='6' height='16' rx='3' fill='#6B4226'/>"
             "</svg>")

def fruit(x, y, anchor, w, h, color="#FFC24B", **kw):
    return fig("custom", x, y, anchor, w, h, svg=FRUIT_SVG, color=color, primaryColor=color, **kw)

def badge(text, x=0.5, y=0.14, delay=0.1, style="default"):
    return {"type": "badge", "text": text, "style": style, "position": {"x": x, "y": y, "anchor": "top-center"}, "delay": delay}

def title(text, size="lg", accent=None, x=0.5, y=0.26, delay=0.1, anchor="center"):
    el = {"type": "title", "text": text, "size": size, "position": {"x": x, "y": y, "anchor": anchor}, "delay": delay}
    if accent:
        el["accentWords"] = accent
    return el

def card(t, value, desc, x=0.5, y=0.82, delay=0.3, accentColor="#FFC24B"):
    return {"type": "card", "title": t, "value": value, "description": desc,
            "position": {"x": x, "y": y, "anchor": "bottom-center"}, "delay": delay,
            "enter": "rise", "accentColor": accentColor}

def ranking(items_, t="", x=0.5, y=0.6, accentColor="#FFC24B", delay=0.3):
    return {"type": "ranking", "title": t, "items": items_,
            "position": {"x": x, "y": y, "anchor": "center"}, "accentColor": accentColor,
            "enter": "rise", "delay": delay, "stagger": 0.18}

def counter(value, suffix, label, sublabel, delay, prefix="+", accentColor="#FFC24B", y=0.9):
    return {"type": "counter", "value": value, "valueStart": 0, "prefix": prefix, "suffix": suffix,
            "decimals": 0, "label": label, "sublabel": sublabel,
            "position": {"x": 0.5, "y": y, "anchor": "bottom-center"}, "countDuration": 1.4,
            "delay": delay, "accentColor": accentColor}

# ---------------------------------------------------------------------------
# 2) Plantilla visual fija por acto (fondo/figuras/cámara/partículas) y
#    elementos de datos reservados a UNA sub-escena concreta de cada acto.
# ---------------------------------------------------------------------------

def visuals_hook(dur):
    return [
        bg(["#0A0D0A", "#141814", "#050605"], intensity=0.5),
        particles(0.22, "#6E7B6E", speed=0.25, glow=False, size=1.6),
        fig("mountains", 0.5, 1.0, "bottom-center", 1080, 420, delay=0, duration=0.6, style="silhouette", color="#1C231C", layer="background"),
        fig("tree-pine", 0.18, 0.86, "bottom-left", 220, 340, delay=0.1, duration=0.5, motion="sway", swayAmount=4, style="silhouette", color="#212B21"),
        fig("tree-pine", 0.84, 0.90, "bottom-right", 180, 280, flip=True, delay=0.15, duration=0.5, motion="sway", swayAmount=3, style="silhouette", color="#1A221A"),
        camera("ken-burns", 0.06, dur),
    ]

def visuals_sin_frutos(dur):
    return [
        bg(["#0B0F0B", "#161C16", "#060806"], intensity=0.55),
        particles(0.2, "#5C6B5C", speed=0.2, glow=False, size=1.4),
        fig("tree-pine", 0.3, 0.88, "bottom-center", 300, 460, delay=0, duration=0.5, motion="sway", swayAmount=5, style="silhouette", color="#263122"),
        fig("tree-pine", 0.72, 0.9, "bottom-center", 230, 360, flip=True, delay=0.05, duration=0.5, motion="sway", swayAmount=4, style="silhouette", color="#1E281B"),
        camera("pan-left", 0.05, dur),
    ]

def visuals_el_pacto(dur):
    return [
        bg(["#0E2410", "#143018", "#060D06"], intensity=0.7),
        particles(0.5, "#FFC24B", speed=0.45, glow=True, size=2.6),
        fig("tree-oak", 0.5, 0.9, "bottom-center", 560, 480, delay=0, duration=0.5, motion="breathe", style="duotone", primaryColor="#1F7A3D", secondaryColor="#164D27"),
        fruit(0.36, 0.64, "center", 46, 46, delay=0.3, duration=0.4, motion="pulse", pulseFreq=1.2, pulseAmount=0.1),
        fruit(0.6, 0.6, "center", 38, 38, delay=0.4, duration=0.4, motion="pulse", pulseFreq=1.0, pulseAmount=0.08),
        fruit(0.47, 0.7, "center", 34, 34, delay=0.5, duration=0.4, motion="pulse", pulseFreq=1.4, pulseAmount=0.09),
        fig("bird-flock", 0.5, 0.2, "center", 420, 160, delay=0.3, duration=0.5, motion="parallax", style="silhouette", color="#FFE2A0"),
        camera("zoom-in", 0.06, dur),
    ]

def visuals_domesticacion(dur):
    return [
        bg(["#2B1706", "#1A0F04", "#0A0502"], intensity=0.65),
        particles(0.3, "#FFB25C", speed=0.3, glow=True, size=2.0),
        fig("mountains", 0.5, 1.0, "bottom-center", 1080, 380, delay=0, duration=0.5, style="silhouette", color="#231206", layer="background"),
        fig("tree-oak", 0.72, 0.86, "bottom-center", 320, 300, delay=0.05, duration=0.5, motion="breathe", style="duotone", primaryColor="#C97A2B", secondaryColor="#7A4414"),
        fruit(0.66, 0.72, "center", 30, 30, delay=0.3, duration=0.4, motion="pulse", pulseFreq=1.1, pulseAmount=0.08),
        fig("person-standing", 0.28, 0.88, "bottom-center", 110, 230, delay=0.2, duration=0.5, motion="breathe", style="silhouette", color="#1A0D04"),
        camera("pan-right", 0.05, dur),
    ]

def visuals_resumen(dur):
    return [
        bg(["#0C0014", "#130020", "#060008"], intensity=0.6),
        particles(0.4, "#FFC24B", speed=0.35, glow=True, size=2.2),
        fig("dna-helix", 0.5, 0.14, "top-center", 160, 160, delay=0.1, duration=0.5, style="glow", opacity=0.5, motion="float", color="#BF5CFF"),
        camera("ken-burns", 0.05, dur),
    ]

def visuals_cierre(dur):
    return [
        bg(["#0C0014", "#1B0030", "#060008"], intensity=0.75),
        particles(0.55, "#FFC24B", speed=0.5, glow=True, size=2.8),
        camera("zoom-in", 0.08, dur),
    ]

VISUALS = {
    "hook": visuals_hook, "sin_frutos": visuals_sin_frutos, "el_pacto": visuals_el_pacto,
    "domesticacion": visuals_domesticacion, "resumen": visuals_resumen, "cierre_cta": visuals_cierre,
}

SFX_BY_ACT = {
    "hook": [{"type": "rise", "at": 0.0, "volume": 0.5}],
    "sin_frutos": [{"type": "whoosh", "at": 0.0, "volume": 0.4}],
    "el_pacto": [{"type": "chime", "at": 0.0, "volume": 0.55}],
    "domesticacion": [{"type": "deep-hit", "at": 0.0, "volume": 0.5}],
    "resumen": [{"type": "rise", "at": 0.0, "volume": 0.35}],
    "cierre_cta": [{"type": "sparkle", "at": 0.0, "volume": 0.55}],
}
MUSICVOL_BY_ACT = {"hook": 0.35, "sin_frutos": 0.4, "el_pacto": 0.45, "domesticacion": 0.42, "resumen": 0.4, "cierre_cta": 0.5}

# ---------------------------------------------------------------------------
# 3) Elegir, para cada acto, en qué sub-escena concreta van los elementos
#    de datos (título/contador/tarjeta/ranking/badge), por índice de orden
#    dentro del acto (0 = primera sub-escena de ese acto).
# ---------------------------------------------------------------------------
act_scene_indices = {}
for r in raw_scenes:
    act_scene_indices.setdefault(r['act'], []).append(r['id'])

def extra_for(scene_id, act, idx_in_act, dur):
    extras = []
    if act == "hook" and idx_in_act == 0:
        extras.append(badge("CREATOR IMAGINE", delay=0.1))
        extras.append(title("UN MUNDO... ¿SIN FRUTAS?", size="lg", accent=["SIN", "FRUTAS?"], y=0.3, delay=0.5))
    elif act == "sin_frutos" and idx_in_act == 0:
        extras.append(title("SEMILLAS AL AZAR DEL VIENTO", size="md", accent=["AZAR"], y=0.24, delay=0.2))
    elif act == "sin_frutos" and idx_in_act == len(act_scene_indices["sin_frutos"]) - 1:
        extras.append(card("APUESTA A CIEGAS", "300.000.000 de años", "Sin flores ni frutos: la semilla desnuda caía junto al árbol madre y competía por luz y agua", y=0.86, delay=0.3, accentColor="#9AA98B"))
    elif act == "el_pacto" and idx_in_act == 0:
        extras.append(title("UN FRUTO = UN PACTO", size="lg", accent=["PACTO"], y=0.1, delay=0.3))
    elif act == "el_pacto" and idx_in_act == 2:
        extras.append(counter(130, " M. DE AÑOS", "DESDE EL PRIMER FRUTO", "azúcar a cambio de transporte", delay=0.3, y=0.88))
    elif act == "el_pacto" and idx_in_act == len(act_scene_indices["el_pacto"]) - 1:
        extras.append(badge("FÓSILES · NUEVO MÉXICO · 74 M AÑOS", y=0.17, delay=0.3, style="outline"))
    elif act == "domesticacion" and idx_in_act == 0:
        extras.append(title("LA DOMESTICACIÓN DEL PACTO", size="md", accent=["DOMESTICACIÓN"], y=0.1, delay=0.2))
    elif act == "domesticacion" and idx_in_act == len(act_scene_indices["domesticacion"]) - 2:
        extras.append(ranking([
            {"rank": 1, "label": "Higos · Valle del Jordán", "value": "~11.400 años", "highlight": True},
            {"rank": 2, "label": "Manzana · Kazajistán", "value": "Malus sieversii"},
        ], t="PRIMEROS FRUTALES DOMÉSTICOS", y=0.74, delay=0.3))
    elif act == "resumen" and idx_in_act == 0:
        extras.append(ranking([
            {"rank": 1, "label": "Plantas", "value": "pagan con fruto"},
            {"rank": 2, "label": "Animales", "value": "reparten semillas"},
            {"rank": 3, "label": "Humanos", "value": "domestican el pacto", "highlight": True},
        ], t="TRES ACTOS, UN SOLO PACTO", y=0.5, delay=0.3))
    elif act == "cierre_cta" and idx_in_act == 0:
        extras.append(badge("RANDONÁUTICO", delay=0.1))
        extras.append(title("DALE LIKE Y SUSCRÍBETE", size="lg", accent=["LIKE", "SUSCRÍBETE"], y=0.38, delay=0.2))
    elif act == "cierre_cta" and idx_in_act == len(act_scene_indices["cierre_cta"]) - 1:
        extras.append(title("síguenos en @Randonáutico", size="sm", y=0.5, delay=0.2))
    return extras

# ---------------------------------------------------------------------------
# 4) Ensamblar escenas finales
# ---------------------------------------------------------------------------
SCENES = []
act_counter = {}
for r in raw_scenes:
    act = r['act']
    idx_in_act = act_counter.get(act, 0)
    act_counter[act] = idx_in_act + 1
    dur = round(r['t1'] - r['t0'], 3)
    elements = VISUALS[act](dur) + extra_for(r['id'], act, idx_in_act, dur) + [caption(r)]
    SCENES.append({
        "id": r['id'],
        "label": r['text'][:40],
        "duration": dur,
        "transition": {"in": "fade", "out": "fade", "duration": 0.3},
        "elements": elements,
        "narration": narration(r),
        "audio": {"sfx": SFX_BY_ACT[act] if idx_in_act == 0 else [], "musicVolume": MUSICVOL_BY_ACT[act]},
    })

timeline = {
    "meta": {
        "title": "El pacto de la fruta — por qué las plantas inventaron el fruto",
        "slug": "frutos_pacto",
        "description": "Historia de los árboles antes de los frutos, el pacto evolutivo con los animales que creó la fruta, y su domesticación por el ser humano.",
        "duration": round(AUDIO_END + 0.35, 2),
        "fps": 60,
        "width": 1080,
        "height": 1920,
        "category": "science",
        "tags": ["evolucion", "plantas", "frutos", "domesticacion", "creator_imagine"],
        "createdAt": "2026-10-18T19:45:00Z"
    },
    "theme": "dramatic",
    "music": {"bpm": 92, "genre": "orchestral", "intensity": 0.6, "baseVolume": 0.42, "fadeIn": 0.6, "fadeOut": 1.2},
    "globalEffects": {"grain": 0.04, "vignette": 0.55, "bloom": 0.25, "colorGrading": "cinematic"},
    "scenes": SCENES,
}

total = sum(s["duration"] for s in SCENES)
print(f"\n{len(SCENES)} escenas | duración total: {total:.2f}s (audio real: {AUDIO_END:.2f}s)")

json.dump(timeline, open('timeline.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print("OK -> timeline.json regenerado (v2, escenas cortas)")
