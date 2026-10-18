#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera timeline.json para 'energia_postmuerte' a partir de los timestamps
reales de ElevenLabs (words_scaled.json, ya reescalados a 40.00s exactos)."""
import json

words = json.load(open('words_scaled.json', encoding='utf-8'))

# Límites de escena en tiempo GLOBAL (segundos), tomados de las fronteras de
# frase reales devueltas por la transcripción (ver 'física.', 'rodea.',
# 'forma.', 'vida.', 'transforma.', 'responde.')
SCENE_BOUNDS = [
    ("hook",                 0.00,  5.90),
    ("disipacion",           5.90, 13.95),
    ("ley_termodinamica",   13.95, 21.55),
    ("transformacion",      21.55, 29.15),
    ("nada_se_pierde",      29.15, 36.24),
    ("cierre",              36.24, 40.00),
]

ACCENT_WORDS = {
    "energía", "física.", "física", "desaparece:", "disipa", "termodinámica",
    "crea", "destruye,", "transforma", "transforma.", "magia,", "pierde:",
    "vida.", "ciencia", "síguenos", "nada"
}

def words_for_scene(t0, t1):
    out = []
    for w in words:
        # una palabra pertenece a la escena si su centro cae dentro del rango
        mid = (w['start'] + w['end']) / 2
        if t0 <= mid < t1:
            out.append({
                "word": w['text'],
                "start": round(w['start'] - t0, 3),
                "end": round(w['end'] - t0, 3),
                "accent": w['text'].lower() in ACCENT_WORDS
            })
    return out

def narration_text(t0, t1):
    toks = []
    for w in words:
        mid = (w['start'] + w['end']) / 2
        if t0 <= mid < t1:
            toks.append(w['text'])
    return " ".join(toks)

scenes_words = {}
scenes_text = {}
for sid, t0, t1 in SCENE_BOUNDS:
    scenes_words[sid] = words_for_scene(t0, t1)
    scenes_text[sid] = narration_text(t0, t1)
    dur = round(t1 - t0, 3)
    print(f"{sid:20s} dur={dur:6.2f}s  words={len(scenes_words[sid]):3d}  '{scenes_text[sid][:60]}'")

json.dump(scenes_words, open('scene_words.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(scenes_text, open('scene_text.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print("\nOK -> scene_words.json / scene_text.json generados")
