#!/usr/bin/env python3
"""
extract_control_frames.py — CREATOR IMAGINE Engine
Extrae fotogramas de control (inicio, centro y final) de un vídeo generado para auditoría visual.

Uso:
    python scripts/extract_control_frames.py --video examples/cloud_smoke_test/video.mp4 --output-dir examples/cloud_smoke_test/
    O:
    python scripts/extract_control_frames.py --project examples/cloud_smoke_test
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def extract_control_frames(video_path, output_dir, duration=None, fps=60):
    """
    Extrae fotogramas de control al inicio (0.0s), centro (50%) y final (~98%).
    Genera nombres estándar: frame_000.png, frame_150.png, frame_299.png
    """
    video_path = Path(video_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not video_path.exists():
        print(f"[Frames] ERROR: Video no encontrado en {video_path}")
        return []

    # Determinar duración si no fue provista
    if duration is None:
        try:
            cmd = [
                'ffprobe', '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                str(video_path)
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            duration = float(res.stdout.strip())
        except Exception:
            duration = 5.0  # Fallback a 5 segundos

    total_frames = max(1, int(round(duration * fps)))
    
    # Puntos de control: inicio (0), centro (~mitad), final (~último frame)
    checkpoints = [
        (0.0, 0),
        (duration * 0.5, total_frames // 2),
        (max(0.0, duration - (1.0 / fps)), total_frames - 1)
    ]

    extracted = []
    for timestamp, frame_idx in checkpoints:
        frame_name = f"frame_{frame_idx:03d}.png"
        target_path = output_dir / frame_name

        cmd = [
            'ffmpeg', '-y',
            '-ss', f"{timestamp:.3f}",
            '-i', str(video_path),
            '-vframes', '1',
            str(target_path)
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True)
            if target_path.exists() and target_path.stat().st_size > 0:
                print(f"[Frames] Extraído frame de control: {frame_name} ({timestamp:.2f}s)")
                extracted.append(frame_name)
            else:
                print(f"[Frames] ADVERTENCIA: Frame vacío o no creado: {frame_name}")
        except FileNotFoundError:
            print("[Frames] ERROR: ffmpeg no encontrado en PATH.")
            break
        except subprocess.CalledProcessError as e:
            print(f"[Frames] ERROR al extraer {frame_name}: {e.stderr.decode('utf-8', errors='ignore') if isinstance(e.stderr, bytes) else e.stderr}")

    return extracted


def main():
    parser = argparse.ArgumentParser(description="Extraer fotogramas de control para CREATOR IMAGINE")
    parser.add_argument('--video', help="Ruta al video.mp4")
    parser.add_argument('--output-dir', help="Directorio de destino de las capturas")
    parser.add_argument('--project', help="Directorio del proyecto (contiene video.mp4)")
    parser.add_argument('--fps', type=int, default=60, help="FPS del video (default: 60)")
    parser.add_argument('--duration', type=float, default=None, help="Duración en segundos")
    args = parser.parse_args()

    if args.project:
        project_dir = Path(args.project)
        video_path = project_dir / 'video.mp4'
        output_dir = project_dir
    else:
        if not args.video:
            parser.error("--video o --project requerido")
        video_path = Path(args.video)
        output_dir = Path(args.output_dir) if args.output_dir else video_path.parent

    frames = extract_control_frames(video_path, output_dir, duration=args.duration, fps=args.fps)
    if frames:
        print(f"[Frames] ✓ {len(frames)} fotogramas de control extraídos correctamente.")
        sys.exit(0)
    else:
        print("[Frames] ✗ No se pudieron extraer fotogramas de control.")
        sys.exit(1)


if __name__ == '__main__':
    main()
