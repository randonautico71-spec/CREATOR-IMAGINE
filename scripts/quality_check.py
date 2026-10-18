#!/usr/bin/env python3
"""
quality_check.py — Verificación automática de calidad del vídeo generado.
Comprueba duración, resolución, audio y extrae fotogramas de control.
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

def check_ffprobe(video_path):
    """Usa ffprobe para inspeccionar el vídeo."""
    cmd = [
        'ffprobe', '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams', '-show_format',
        str(video_path)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f'[QC] ADVERTENCIA: ffprobe no disponible — {e}')
        return None

def extract_control_frames(video_path, output_dir, checkpoints):
    """Extrae fotogramas de control en los segundos indicados."""
    frames = []
    for t in checkpoints:
        out = output_dir / f'control_{t:.1f}s.jpg'
        cmd = [
            'ffmpeg', '-y', '-ss', str(t),
            '-i', str(video_path),
            '-vframes', '1', '-q:v', '2',
            str(out)
        ]
        try:
            subprocess.run(cmd, capture_output=True, check=True)
            frames.append(str(out))
            print(f'[QC] Frame extraído: {t:.1f}s → {out.name}')
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f'[QC] ADVERTENCIA: No se pudo extraer frame en {t:.1f}s')
    return frames

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True)
    parser.add_argument('--timeline', default=None)
    args = parser.parse_args()

    project = Path(args.project)
    video   = project / 'video.mp4'
    timeline_path = Path(args.timeline) if args.timeline else project / 'timeline.json'

    errors   = []
    warnings = []

    print(f'[QC] Comprobando proyecto: {project}')

    # --- Verificar que el vídeo existe ---
    if not video.exists():
        errors.append(f'video.mp4 no encontrado en {project}')
    else:
        size_mb = video.stat().st_size / 1024 / 1024
        print(f'[QC] video.mp4 encontrado ({size_mb:.1f} MB)')

    # --- Verificar timeline ---
    timeline = None
    if timeline_path.exists():
        with open(timeline_path, 'r', encoding='utf-8') as f:
            timeline = json.load(f)
        total_dur = sum(s.get('duration', 0) for s in timeline.get('scenes', []))
        print(f'[QC] Timeline: {len(timeline.get("scenes",[]))} escenas, {total_dur:.2f}s')
    else:
        warnings.append('timeline.json no encontrado para validación')

    # --- ffprobe ---
    if video.exists():
        info = check_ffprobe(video)
        if info:
            streams = info.get('streams', [])
            video_stream = next((s for s in streams if s.get('codec_type') == 'video'), None)
            audio_stream = next((s for s in streams if s.get('codec_type') == 'audio'), None)

            if video_stream:
                w = video_stream.get('width')
                h = video_stream.get('height')
                fps_str = video_stream.get('r_frame_rate', '0/1')
                num, den = map(int, fps_str.split('/'))
                fps = num / den if den else 0
                dur = float(video_stream.get('duration', 0))

                print(f'[QC] Resolución: {w}×{h} | FPS: {fps:.1f} | Duración: {dur:.2f}s')

                if w != 1080 or h != 1920:
                    warnings.append(f'Resolución {w}×{h} ≠ 1080×1920 esperada')

                if fps < 29:
                    warnings.append(f'FPS {fps:.1f} por debajo de 30')

                if timeline and abs(dur - total_dur) > 1.0:
                    warnings.append(f'Duración vídeo ({dur:.2f}s) difiere del timeline ({total_dur:.2f}s)')

            if not audio_stream:
                warnings.append('El vídeo no contiene pista de audio')
            else:
                print(f'[QC] Audio: {audio_stream.get("codec_name")} @ {audio_stream.get("sample_rate")}Hz')

            # Extraer fotogramas de control
            if timeline and dur > 0:
                checkpoints = [0.0, dur * 0.25, dur * 0.5, dur * 0.75, max(0, dur - 0.5)]
                extract_control_frames(video, project, checkpoints)

    # --- Informe final ---
    print('\n' + '='*50)
    if errors:
        print('[QC] ✗ ERRORES CRÍTICOS:')
        for e in errors: print(f'  • {e}')
    if warnings:
        print('[QC] ⚠ Advertencias:')
        for w in warnings: print(f'  • {w}')
    if not errors and not warnings:
        print('[QC] ✓ Todo correcto. El vídeo cumple los estándares.')
    elif not errors:
        print('[QC] ✓ Vídeo aprobado con advertencias menores.')

    sys.exit(1 if errors else 0)

if __name__ == '__main__':
    main()
