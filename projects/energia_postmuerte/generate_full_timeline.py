#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construye timeline.json completo para 'energia_postmuerte' (40s)
combinando los subtítulos locales ya calculados (scene_words.json /
scene_text.json) con la puesta en escena visual (casas, salón, entes,
personas, mobiliario, jardín) pedida por el usuario."""
import json

scene_words = json.load(open('scene_words.json', encoding='utf-8'))
scene_text = json.load(open('scene_text.json', encoding='utf-8'))

def caption(scene_id, style="cinematic", position=None):
    el = {
        "type": "caption",
        "text": scene_text[scene_id],
        "words": scene_words[scene_id],
        "style": style,
        "fontSize": "md"
    }
    if position:
        el["position"] = position
    return el

def narration(scene_id, stability=0.5, similarity=0.8):
    return {"text": scene_text[scene_id], "voice": "carmen", "stability": stability, "similarity": similarity}

def bg(style="space", animated=True, intensity=0.5):
    return {"type": "background", "style": style, "animated": animated, "intensity": intensity}

def camera(effect, intensity, duration):
    return {"type": "camera", "effect": effect, "intensity": intensity, "duration": duration, "easing": "ease-in-out"}

def fig(shape, x, y, anchor, w, h, **kw):
    el = {"type": "figure", "shape": shape, "position": {"x": x, "y": y, "anchor": anchor}, "width": w, "height": h}
    el.update(kw)
    return el

# ---------------------------------------------------------------------------
# ESCENA A — hook (0.00 - 5.90s) — exterior de la casa, atardecer, persona
# ---------------------------------------------------------------------------
scene_a = {
    "id": "hook",
    "label": "La pregunta",
    "duration": 5.90,
    "transition": {"in": "fade", "out": "fade", "duration": 0.4},
    "elements": [
        bg("space", True, 0.45),
        fig("grass", 0.5, 1.0, "bottom-center", 1080, 200, delay=0, duration=0.6, layer="foreground"),
        fig("bush", 0.12, 0.86, "bottom-left", 260, 195, delay=0.1, duration=0.6),
        fig("bush", 0.9, 0.86, "bottom-right", 220, 165, flip=True, delay=0.15, duration=0.6),
        fig("entrance-gate", 0.5, 0.78, "bottom-center", 300, 214, delay=0.05, duration=0.6),
        fig("house", 0.5, 0.52, "center", 620, 465, delay=0.2, motion="none", duration=0.7),
        fig("person-standing", 0.74, 0.78, "bottom-center", 92, 199, delay=0.9, motion="breathe", duration=0.6, style="silhouette"),
        camera("ken-burns", 0.25, 5.90),
        caption("hook"),
    ],
    "narration": narration("hook"),
    "audio": {"sfx": [{"type": "rise", "at": 0.0, "volume": 0.5}, {"type": "sparkle", "at": 5.0, "volume": 0.4}], "musicVolume": 0.35},
}

# ---------------------------------------------------------------------------
# ESCENA B — disipación (5.90 - 13.95s) — el calor se dispersa al exterior
# ---------------------------------------------------------------------------
scene_b = {
    "id": "disipacion",
    "label": "El calor se disipa",
    "duration": 8.05,
    "transition": {"in": "fade", "out": "fade", "duration": 0.4},
    "elements": [
        bg("space", True, 0.5),
        fig("grass", 0.5, 1.0, "bottom-center", 1080, 200, delay=0, duration=0.3, layer="foreground"),
        fig("bush", 0.12, 0.86, "bottom-left", 260, 195, delay=0, duration=0.3),
        fig("bush", 0.9, 0.86, "bottom-right", 220, 165, flip=True, delay=0, duration=0.3),
        fig("entrance-gate", 0.5, 0.78, "bottom-center", 300, 214, delay=0, duration=0.3),
        fig("house", 0.5, 0.52, "center", 620, 465, delay=0, motion="none", duration=0.3),
        fig("entity-glow", 0.5, 0.33, "center", 110, 238, style="glow", opacity=0.55, motion="rise", delay=0.6, duration=1.2),
        fig("entity-glow", 0.68, 0.40, "center", 70, 152, style="glow", opacity=0.35, motion="float", delay=1.6, duration=1.2),
        camera("pan-right", 0.2, 8.05),
        caption("disipacion"),
    ],
    "narration": narration("disipacion"),
    "audio": {"sfx": [{"type": "whoosh", "at": 0.0, "volume": 0.5}, {"type": "sparkle", "at": 5.0, "volume": 0.4}], "musicVolume": 0.4},
}

# ---------------------------------------------------------------------------
# ESCENA C — ley de la termodinámica (13.95 - 21.55s) — interior, salón
# ---------------------------------------------------------------------------
scene_c = {
    "id": "ley_termodinamica",
    "label": "La primera ley",
    "duration": 7.60,
    "transition": {"in": "fade", "out": "fade", "duration": 0.4},
    "elements": [
        fig("room-interior", 0.5, 0.0, "top-center", 1080, 1200, delay=0, duration=0.4, layer="background"),
        fig("sofa", 0.5, 0.78, "bottom-center", 540, 270, delay=0.15, duration=0.5),
        fig("table", 0.80, 0.82, "bottom-center", 250, 143, delay=0.25, duration=0.5),
        fig("lamp-floor", 0.92, 0.80, "bottom-center", 112, 261, style="glow", delay=0.1, duration=0.5),
        camera("zoom-in", 0.12, 7.60),
        caption("ley_termodinamica"),
    ],
    "narration": narration("ley_termodinamica"),
    "audio": {"sfx": [{"type": "chime", "at": 0.0, "volume": 0.45}, {"type": "pulse", "at": 5.0, "volume": 0.4}], "musicVolume": 0.4},
}

# ---------------------------------------------------------------------------
# ESCENA D — transformación (21.55 - 29.15s) — ente de energía + persona
# ---------------------------------------------------------------------------
scene_d = {
    "id": "transformacion",
    "label": "Cambia de forma",
    "duration": 7.60,
    "transition": {"in": "fade", "out": "fade", "duration": 0.4},
    "elements": [
        fig("room-interior", 0.5, 0.0, "top-center", 1080, 1200, delay=0, duration=0.3, layer="background"),
        fig("sofa", 0.5, 0.78, "bottom-center", 540, 270, delay=0, duration=0.3),
        fig("table", 0.80, 0.82, "bottom-center", 250, 143, delay=0, duration=0.3),
        fig("lamp-floor", 0.92, 0.80, "bottom-center", 112, 261, style="glow", delay=0, duration=0.3),
        fig("person-sitting", 0.38, 0.73, "bottom-center", 224, 196, delay=0.2, duration=0.5),
        fig("entity-glow", 0.5, 0.36, "center", 150, 325, style="glow", opacity=0.85, motion="float", delay=0.4, duration=0.7),
        camera("zoom-in", 0.18, 7.60),
        caption("transformacion"),
    ],
    "narration": narration("transformacion"),
    "audio": {"sfx": [{"type": "impact", "at": 0.0, "volume": 0.5}, {"type": "sparkle", "at": 6.0, "volume": 0.45}], "musicVolume": 0.45},
}

# ---------------------------------------------------------------------------
# ESCENA E — nada se pierde (29.15 - 36.24s) — el ente se aleja hacia afuera
# ---------------------------------------------------------------------------
scene_e = {
    "id": "nada_se_pierde",
    "label": "Solo se transforma",
    "duration": 7.09,
    "transition": {"in": "fade", "out": "fade", "duration": 0.4},
    "elements": [
        fig("room-interior", 0.5, 0.0, "top-center", 1080, 1200, delay=0, duration=0.3, layer="background"),
        fig("sofa", 0.5, 0.78, "bottom-center", 540, 270, delay=0, duration=0.3),
        fig("person-sitting", 0.38, 0.73, "bottom-center", 224, 196, delay=0, duration=0.3),
        fig("entity-glow", 0.62, 0.30, "center", 110, 238, style="glow", opacity=0.6, motion="pan", delay=0.2, duration=1.0),
        camera("zoom-out", 0.2, 7.09),
        caption("nada_se_pierde"),
    ],
    "narration": narration("nada_se_pierde"),
    "audio": {"sfx": [{"type": "sweep", "at": 0.0, "volume": 0.4}, {"type": "deep-hit", "at": 6.3, "volume": 0.55}], "musicVolume": 0.35},
}

# ---------------------------------------------------------------------------
# ESCENA F — cierre (36.24 - 40.00s) — tarjeta de marca, jardín al fondo
# ---------------------------------------------------------------------------
scene_f = {
    "id": "cierre",
    "label": "Síguenos",
    "duration": 3.76,
    "transition": {"in": "fade", "out": "fade", "duration": 0.3},
    "elements": [
        bg("space", True, 0.45),
        fig("grass", 0.5, 1.0, "bottom-center", 1080, 200, delay=0, duration=0.3, layer="foreground"),
        fig("bush", 0.14, 0.88, "bottom-left", 220, 165, delay=0, duration=0.3),
        fig("house", 0.78, 0.70, "bottom-center", 300, 225, opacity=0.6, delay=0, duration=0.3),
        fig("entity-glow", 0.78, 0.46, "center", 60, 130, style="glow", opacity=0.5, motion="float", delay=0.1, duration=0.5),
        {
            "type": "card",
            "title": "CREATOR IMAGINE",
            "value": "Más preguntas, más respuestas",
            "description": "La ciencia detrás de lo que crees saber",
            "icon": "🔬",
            "badge": "SÍGUENOS",
            "position": {"x": 0.5, "y": 0.42, "anchor": "center"},
            "enter": "rise",
            "delay": 0.25,
        },
        caption("cierre"),
    ],
    "narration": narration("cierre"),
    "audio": {"sfx": [{"type": "chime", "at": 0.3, "volume": 0.5}], "musicVolume": 0.3},
}

timeline = {
    "meta": {
        "title": "¿A dónde va la energía después de la muerte?",
        "slug": "energia_postmuerte",
        "description": "Minidocumental de 40s sobre la relación teórica entre la energía física y la muerte, explicada con la primera ley de la termodinámica.",
        "duration": 40.0,
        "fps": 60,
        "width": 1080,
        "height": 1920,
        "category": "science",
        "tags": ["fisica", "termodinamica", "energia", "ciencia", "filosofia"],
        "brand": "CREATOR IMAGINE",
        "brandTag": "CIENCIA & CURIOSIDADES",
        "createdAt": "2026-10-18T00:00:00Z",
    },
    "theme": "dramatic",
    "music": {"bpm": 78, "genre": "orchestral", "intensity": 0.45, "baseVolume": 0.32, "fadeIn": 0.6, "fadeOut": 1.2},
    "globalEffects": {"grain": 0.035, "vignette": 0.5, "bloom": 0.2, "colorGrading": "cinematic"},
    "scenes": [scene_a, scene_b, scene_c, scene_d, scene_e, scene_f],
}

total = sum(s["duration"] for s in timeline["scenes"])
assert abs(total - 40.0) < 1e-6, f"La suma de duraciones no es 40.0s: {total}"

with open("timeline.json", "w", encoding="utf-8") as f:
    json.dump(timeline, f, ensure_ascii=False, indent=2)

print(f"OK -> timeline.json escrito. Duración total = {total:.2f}s, escenas = {len(timeline['scenes'])}")
