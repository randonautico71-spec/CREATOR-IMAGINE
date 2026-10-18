#!/usr/bin/env python3
"""
dsp_audio_engine.py — CREATOR IMAGINE Engine
Genera música de fondo y SFX proceduralmente usando DSP puro.
No requiere samples externos: todo se sintetiza con NumPy/SciPy.

Uso:
    python engine/dsp_audio_engine.py \
        --timeline projects/<slug>/timeline.json \
        --output projects/<slug>/music.wav
"""

import argparse
import json
import math
import struct
import wave
import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
import numpy as np
from pathlib import Path

# =========================================================
# CONSTANTES DE AUDIO
# =========================================================
SAMPLE_RATE = 48000
CHANNELS    = 2
BIT_DEPTH   = 16
MAX_AMP     = 32767

# Escalas musicales (semitonos desde la raíz)
SCALES = {
    'minor':      [0, 2, 3, 5, 7, 8, 10],
    'major':      [0, 2, 4, 5, 7, 9, 11],
    'pentatonic': [0, 2, 4, 7, 9],
    'dorian':     [0, 2, 3, 5, 7, 9, 10],
    'cinematic':  [0, 1, 4, 5, 7, 8, 11],
}

# Géneros → parámetros musicales
GENRE_PRESETS = {
    'dramatic': {
        'bpm': 80, 'scale': 'minor', 'root': 'D',
        'pad': True, 'bass': True, 'drums': True,
        'arp': False, 'reverb': 0.7, 'attack': 0.3
    },
    'epic': {
        'bpm': 95, 'scale': 'minor', 'root': 'E',
        'pad': True, 'bass': True, 'drums': True,
        'arp': True, 'reverb': 0.5, 'attack': 0.1
    },
    'minimal': {
        'bpm': 70, 'scale': 'dorian', 'root': 'A',
        'pad': True, 'bass': False, 'drums': False,
        'arp': False, 'reverb': 0.8, 'attack': 0.8
    },
    'electronic': {
        'bpm': 128, 'scale': 'minor', 'root': 'G',
        'pad': True, 'bass': True, 'drums': True,
        'arp': True, 'reverb': 0.3, 'attack': 0.05
    },
    'orchestral': {
        'bpm': 72, 'scale': 'cinematic', 'root': 'C',
        'pad': True, 'bass': True, 'drums': False,
        'arp': False, 'reverb': 0.9, 'attack': 0.4
    },
    'tension': {
        'bpm': 90, 'scale': 'cinematic', 'root': 'B',
        'pad': True, 'bass': True, 'drums': True,
        'arp': False, 'reverb': 0.6, 'attack': 0.2
    },
    'upbeat': {
        'bpm': 115, 'scale': 'major', 'root': 'C',
        'pad': False, 'bass': True, 'drums': True,
        'arp': True, 'reverb': 0.2, 'attack': 0.05
    }
}

# Notas musicales → frecuencias base (octava 3)
NOTE_FREQS = {
    'C': 130.81, 'C#': 138.59, 'D': 146.83, 'D#': 155.56,
    'E': 164.81, 'F': 174.61, 'F#': 185.00, 'G': 196.00,
    'G#': 207.65, 'A': 220.00, 'A#': 233.08, 'B': 246.94
}

# =========================================================
# GENERADORES DE ONDAS BASE
# =========================================================

def sine_wave(freq, duration, sr=SAMPLE_RATE, amp=1.0, phase=0.0):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    return amp * np.sin(2 * np.pi * freq * t + phase)

def sawtooth_wave(freq, duration, sr=SAMPLE_RATE, amp=1.0):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    return amp * (2 * (t * freq - np.floor(t * freq + 0.5)))

def square_wave(freq, duration, sr=SAMPLE_RATE, amp=1.0, duty=0.5):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    return amp * np.sign(np.sin(2 * np.pi * freq * t) - (1 - 2 * duty))

def noise(duration, sr=SAMPLE_RATE, amp=1.0):
    n = int(sr * duration)
    return amp * (np.random.random(n) * 2 - 1)

# =========================================================
# ENVOLVENTE ADSR
# =========================================================

def adsr_envelope(duration, attack=0.1, decay=0.1, sustain=0.7, release=0.2, sr=SAMPLE_RATE):
    n = int(sr * duration)
    env = np.zeros(n)
    a = int(sr * attack)
    d = int(sr * decay)
    r = int(sr * release)
    s_len = max(0, n - a - d - r)

    # Attack
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    # Decay
    if d > 0:
        env[a:a+d] = np.linspace(1, sustain, d)
    # Sustain
    if s_len > 0:
        env[a+d:a+d+s_len] = sustain
    # Release
    if r > 0 and a+d+s_len < n:
        env[a+d+s_len:] = np.linspace(sustain, 0, n - (a+d+s_len))

    return env

# =========================================================
# EFECTOS DSP
# =========================================================

def reverb(signal, room_size=0.5, sr=SAMPLE_RATE):
    """Reverb simple con comb filters optimizado."""
    delays_ms = [29.7, 37.1, 41.1, 43.7]
    gains     = [0.805, 0.827, 0.783, 0.764]
    try:
        from scipy.signal import lfilter
        output = np.copy(signal)
        for delay_ms, gain in zip(delays_ms, gains):
            D = int(sr * delay_ms / 1000 * room_size)
            if D <= 0 or D >= len(signal):
                continue
            b = np.zeros(D + 1)
            b[D] = 1.0
            a = np.zeros(D + 1)
            a[0] = 1.0
            a[D] = -gain
            temp = lfilter(b, a, signal)
            output += temp * 0.5
        return output
    except Exception:
        output = np.copy(signal)
        for delay_ms, gain in zip(delays_ms, gains):
            D = int(sr * delay_ms / 1000 * room_size)
            if D <= 0 or D >= len(signal):
                continue
            delayed = np.zeros_like(signal)
            delayed[D:] = signal[:-D] * gain
            output += delayed * 0.5
        return output

def lowpass_filter(signal, cutoff=2000, sr=SAMPLE_RATE, order=4):
    """Filtro paso bajo simple (media móvil ponderada)."""
    try:
        from scipy.signal import butter, filtfilt
        b, a = butter(order, cutoff / (sr / 2), btype='low')
        return filtfilt(b, a, signal)
    except ImportError:
        # Fallback: media móvil
        kernel_size = max(1, int(sr / cutoff))
        kernel = np.ones(kernel_size) / kernel_size
        return np.convolve(signal, kernel, mode='same')

def fade(signal, fade_in=0.0, fade_out=0.0, sr=SAMPLE_RATE):
    n = len(signal)
    fi = int(sr * fade_in)
    fo = int(sr * fade_out)
    if fi > 0:
        signal[:fi] *= np.linspace(0, 1, fi)
    if fo > 0 and fo <= n:
        signal[n-fo:] *= np.linspace(1, 0, fo)
    return signal

# =========================================================
# INSTRUMENTOS SÍNTÉTICOS
# =========================================================

def synth_pad(freq, duration, preset, sr=SAMPLE_RATE):
    """Pad suave tipo sintetizador."""
    attack = preset.get('attack', 0.5)
    rev    = preset.get('reverb', 0.6)

    # Dos osciladores detuneados para ensanchar el sonido
    osc1 = sine_wave(freq, duration, sr, amp=0.5)
    osc2 = sine_wave(freq * 1.005, duration, sr, amp=0.3)
    osc3 = sine_wave(freq * 0.5, duration, sr, amp=0.2)  # sub

    sig = osc1 + osc2 + osc3
    sig *= adsr_envelope(duration, attack=attack, decay=0.2, sustain=0.6, release=0.5, sr=sr)

    if rev > 0:
        sig = sig + reverb(sig, room_size=rev, sr=sr) * 0.4

    return sig

def synth_bass(freq, duration, preset, sr=SAMPLE_RATE):
    """Bajo sólido con armónicos."""
    osc1 = sawtooth_wave(freq, duration, sr, amp=0.6)
    osc2 = sine_wave(freq, duration, sr, amp=0.4)
    sig  = osc1 + osc2
    sig  = lowpass_filter(sig, cutoff=400, sr=sr)
    sig *= adsr_envelope(duration, attack=0.02, decay=0.1, sustain=0.5, release=0.2, sr=sr)
    return sig

def synth_kick(duration=0.5, sr=SAMPLE_RATE):
    """Bombo sintético."""
    t    = np.linspace(0, duration, int(sr * duration), endpoint=False)
    freq = 120 * np.exp(-15 * t)  # Pitch envelope
    sig  = np.sin(2 * np.pi * freq * t)
    env  = adsr_envelope(duration, attack=0.005, decay=0.15, sustain=0, release=0.3, sr=sr)
    return sig * env * 0.9

def synth_snare(duration=0.3, sr=SAMPLE_RATE):
    """Caja sintética = tono + ruido."""
    t   = np.linspace(0, duration, int(sr * duration), endpoint=False)
    tone = 0.5 * np.sin(2 * np.pi * 200 * t)
    nz   = 0.5 * noise(duration, sr)
    env  = adsr_envelope(duration, attack=0.005, decay=0.1, sustain=0.1, release=0.15, sr=sr)
    return (tone + nz) * env

def synth_hihat(duration=0.1, sr=SAMPLE_RATE, open=False):
    """Charles y bombo open."""
    dur = 0.3 if open else duration
    nz  = noise(dur, sr)
    nz  = lowpass_filter(nz, cutoff=8000, sr=sr)
    env = adsr_envelope(dur, attack=0.002, decay=0.05 if not open else 0.2, sustain=0, release=0.05, sr=sr)
    return nz * env * 0.4

def synth_sfx(sfx_type, sr=SAMPLE_RATE):
    """SFX: whoosh, impact, rise, chime, pulse, deep-hit, sweep."""
    dur = 1.0
    if sfx_type == 'whoosh':
        sig = noise(0.5, sr) * adsr_envelope(0.5, 0.01, 0.1, 0.1, 0.3, sr)
        return lowpass_filter(sig, cutoff=4000, sr=sr)
    elif sfx_type == 'impact':
        kick  = synth_kick(0.8, sr)
        sub   = sine_wave(40, 0.5, sr) * adsr_envelope(0.5, 0.005, 0.3, 0, 0.2, sr)
        total = np.zeros(int(sr * 0.8))
        total[:len(kick)] += kick
        total[:len(sub)]  += sub * 0.8
        return total
    elif sfx_type == 'rise':
        t    = np.linspace(0, 2.0, int(sr * 2.0), endpoint=False)
        freq = 200 + 1800 * (t / 2.0) ** 2
        sig  = np.sin(2 * np.pi * np.cumsum(freq) / sr)
        sig += noise(2.0, sr, 0.1)
        return sig * np.linspace(0, 1, int(sr * 2.0))
    elif sfx_type == 'chime':
        sig = sine_wave(880, 1.5, sr) + sine_wave(1320, 1.5, sr) * 0.5
        return sig * adsr_envelope(1.5, 0.005, 0.3, 0.2, 0.8, sr)
    elif sfx_type == 'sparkle':
        # Arpegio brillante de frecuencias altas tipo campanillas mágicas
        t_sp = np.linspace(0, 1.2, int(sr * 1.2), endpoint=False)
        tones = [1760, 2637, 3520, 4186]
        sig = np.zeros(len(t_sp))
        for i, f in enumerate(tones):
            d_samp = int(i * 0.07 * sr)
            if d_samp < len(t_sp):
                rem = len(t_sp) - d_samp
                sub_t = t_sp[:rem]
                sub_sig = (np.sin(2 * np.pi * f * sub_t) + 0.35 * np.sin(2 * np.pi * f * 2 * sub_t)) * np.exp(-6 * sub_t)
                sig[d_samp:] += sub_sig * 0.4
        return sig
    elif sfx_type == 'pulse':
        sig = sine_wave(60, 0.5, sr) * adsr_envelope(0.5, 0.01, 0.1, 0.3, 0.3, sr)
        return sig
    elif sfx_type == 'deep-hit':
        sig  = synth_kick(1.0, sr)
        sub  = sine_wave(30, 1.0, sr) * adsr_envelope(1.0, 0.01, 0.5, 0, 0.5, sr)
        total= np.zeros(int(sr * 1.0))
        total[:len(sig)] += sig * 0.8
        total += sub * 0.6
        return total
    elif sfx_type == 'sweep':
        t    = np.linspace(0, 1.5, int(sr * 1.5), endpoint=False)
        freq = 8000 - 7000 * (t / 1.5)
        sig  = np.sin(2 * np.pi * np.cumsum(freq) / sr)
        return sig * np.linspace(1, 0, int(sr * 1.5))
    else:
        return np.zeros(int(sr * 0.5))

# =========================================================
# COMPOSITOR DE MÚSICA
# =========================================================

def get_scale_freqs(root_note, scale_name, octave_start=3, octave_end=5):
    """Genera frecuencias de la escala indicada."""
    intervals = SCALES.get(scale_name, SCALES['minor'])
    root_freq  = NOTE_FREQS.get(root_note, NOTE_FREQS['A'])
    freqs = []
    for oct in range(octave_start, octave_end + 1):
        mult = 2 ** (oct - 3)
        for interval in intervals:
            f = root_freq * mult * (2 ** (interval / 12))
            freqs.append(f)
    return sorted(freqs)

def compose_music(timeline, total_duration, sr=SAMPLE_RATE):
    """
    Compone la pista de música completa proceduralmente.
    """
    music_meta = timeline.get('music', {})
    genre = music_meta.get('genre', 'dramatic')
    bpm   = music_meta.get('bpm',   80)
    intensity = music_meta.get('intensity', 0.6)
    base_vol  = music_meta.get('baseVolume', 0.5)
    fade_in   = music_meta.get('fadeIn',  1.0)
    fade_out  = music_meta.get('fadeOut', 2.0)

    preset = GENRE_PRESETS.get(genre, GENRE_PRESETS['dramatic']).copy()
    preset['bpm'] = bpm

    scale_freqs = get_scale_freqs(
        preset.get('root', 'A'),
        preset.get('scale', 'minor')
    )

    n_samples = int(sr * total_duration)
    mix = np.zeros(n_samples)

    beat_dur   = 60 / bpm          # segundos por beat
    bar_dur    = beat_dur * 4       # compás 4/4
    n_bars     = int(total_duration / bar_dur) + 2

    # -------------------------------------------------------
    # PAD (acordes largos)
    # -------------------------------------------------------
    if preset.get('pad', True):
        # Progresión i - VI - III - VII (menor)
        chord_roots = [0, 5, 3, 6]  # índices en la escala
        chord_dur   = bar_dur * 2

        for i in range(n_bars // 2 + 1):
            root_idx = chord_roots[i % len(chord_roots)]
            if root_idx >= len(scale_freqs): continue

            root_f  = scale_freqs[root_idx]
            third_f = scale_freqs[min(root_idx + 2, len(scale_freqs)-1)]
            fifth_f = scale_freqs[min(root_idx + 4, len(scale_freqs)-1)]

            for freq in [root_f, third_f, fifth_f]:
                pad = synth_pad(freq, min(chord_dur, total_duration), preset, sr)
                start = int(i * chord_dur * sr)
                end   = min(start + len(pad), n_samples)
                if start < n_samples:
                    mix[start:end] += pad[:end-start] * 0.25

    # -------------------------------------------------------
    # BAJO
    # -------------------------------------------------------
    if preset.get('bass', True):
        bass_pattern = [0, 0, 4, 0, 3, 0, 2, 0]  # 8 corcheas por compás

        for bar in range(n_bars):
            for beat_idx, scale_idx in enumerate(bass_pattern):
                note_time = bar * bar_dur + (beat_idx / len(bass_pattern)) * bar_dur
                if note_time >= total_duration: break

                if scale_idx >= len(scale_freqs): continue
                f    = scale_freqs[scale_idx] / 2  # octava baja
                dur  = beat_dur * 0.4

                bass = synth_bass(f, min(dur, 0.5), preset, sr)
                start = int(note_time * sr)
                end   = min(start + len(bass), n_samples)
                if start < n_samples:
                    mix[start:end] += bass[:end-start] * 0.3

    # -------------------------------------------------------
    # BATERÍA
    # -------------------------------------------------------
    if preset.get('drums', True):
        kick_pattern  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]  # 16 divisiones
        snare_pattern = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]
        hihat_pattern = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1]

        subdiv = beat_dur / 4  # semicorchea

        for bar in range(n_bars):
            for i, (k, s, h) in enumerate(zip(kick_pattern, snare_pattern, hihat_pattern)):
                note_time = bar * bar_dur + i * subdiv
                if note_time >= total_duration: break
                start = int(note_time * sr)

                if k:
                    kick = synth_kick(0.4, sr)
                    end  = min(start + len(kick), n_samples)
                    if start < n_samples:
                        mix[start:end] += kick[:end-start] * 0.5 * intensity

                if s:
                    snare = synth_snare(0.3, sr)
                    end   = min(start + len(snare), n_samples)
                    if start < n_samples:
                        mix[start:end] += snare[:end-start] * 0.4 * intensity

                if h:
                    hihat = synth_hihat(0.1, sr)
                    end   = min(start + len(hihat), n_samples)
                    if start < n_samples:
                        mix[start:end] += hihat[:end-start] * 0.2 * intensity

    # -------------------------------------------------------
    # ARPEGIO
    # -------------------------------------------------------
    if preset.get('arp', False):
        arp_freqs = scale_freqs[7:14]  # octava alta
        arp_dur   = beat_dur / 2

        for bar in range(n_bars):
            for i, freq in enumerate(arp_freqs):
                note_time = bar * bar_dur + i * arp_dur
                if note_time >= total_duration: break

                osc  = sine_wave(freq, arp_dur * 0.8, sr)
                osc *= adsr_envelope(arp_dur * 0.8, 0.01, 0.1, 0.3, 0.3, sr)
                start = int(note_time * sr)
                end   = min(start + len(osc), n_samples)
                if start < n_samples:
                    mix[start:end] += osc[:end-start] * 0.15 * intensity

    # -------------------------------------------------------
    # MEZCLA FINAL
    # -------------------------------------------------------
    # Normalizar y aplicar fade
    peak = np.max(np.abs(mix))
    if peak > 0:
        mix = mix / peak * base_vol

    mix = fade(mix, fade_in=fade_in, fade_out=fade_out, sr=sr)

    # Estéreo: pequeña diferencia de fase L/R
    mix_l = mix.copy()
    mix_r = np.roll(mix, int(sr * 0.003))  # 3ms delay para amplitud
    stereo = np.stack([mix_l, mix_r], axis=1)

    return stereo

# =========================================================
# MEZCLAR SFX CON MÚSICA
# =========================================================

def mix_sfx(music_stereo, timeline, sr=SAMPLE_RATE):
    """Añade SFX en los momentos indicados por el timeline."""
    result = music_stereo.copy()
    elapsed = 0.0

    for scene in timeline.get('scenes', []):
        audio = scene.get('audio', {})
        sfx_list = audio.get('sfx', [])

        for sfx_item in sfx_list:
            sfx_type = sfx_item.get('type', 'impact')
            at       = elapsed + sfx_item.get('at', 0)
            vol      = sfx_item.get('volume', 0.7)

            sfx_data = synth_sfx(sfx_type, sr)
            sfx_stereo = np.stack([sfx_data, sfx_data], axis=1)

            start = int(at * sr)
            end   = min(start + len(sfx_stereo), len(result))
            if start < len(result):
                result[start:end] += sfx_stereo[:end-start] * vol

        elapsed += scene.get('duration', 0)

    # Re-normalizar
    peak = np.max(np.abs(result))
    if peak > 1.0:
        result = result / peak * 0.95

    return result

# =========================================================
# GUARDAR WAV
# =========================================================

def save_wav(stereo, output_path, sr=SAMPLE_RATE):
    """Guarda array stereo como WAV 16-bit."""
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

    samples = (stereo * MAX_AMP).astype(np.int16)

    with wave.open(output_path, 'w') as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sr)
        wf.writeframes(samples.tobytes())

    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f'[Audio] Guardado: {output_path} ({size_mb:.1f} MB)')

# =========================================================
# MAIN
# =========================================================

def main():
    parser = argparse.ArgumentParser(description='DSP Audio Engine — CREATOR IMAGINE')
    parser.add_argument('--timeline', required=True, help='Ruta al timeline.json')
    parser.add_argument('--output',   required=True, help='Ruta de salida .wav')
    args = parser.parse_args()

    # Cargar timeline
    with open(args.timeline, 'r', encoding='utf-8') as f:
        timeline = json.load(f)

    # Calcular duración total
    total_duration = sum(s.get('duration', 0) for s in timeline.get('scenes', []))
    print(f'[Audio] Duración total: {total_duration:.2f}s')
    print(f'[Audio] Género: {timeline.get("music", {}).get("genre", "dramatic")} | BPM: {timeline.get("music", {}).get("bpm", 80)}')

    # Componer música
    print('[Audio] Componiendo música...')
    music = compose_music(timeline, total_duration)

    # Mezclar SFX
    print('[Audio] Mezclando SFX...')
    final = mix_sfx(music, timeline)

    # Guardar
    save_wav(final, args.output)
    print('[Audio] ✓ Audio generado correctamente')

if __name__ == '__main__':
    main()
