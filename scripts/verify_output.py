#!/usr/bin/env python3
"""
verify_output.py — CREATOR IMAGINE Engine
Verifica rigurosamente mediante ffprobe que el vídeo generado cumple con todos los
criterios de aceptación técnicos: resolución 1080x1920, 60fps, códec H.264,
formato yuv420p, audio estéreo a 48 kHz y genera validation_report.json.

Uso:
    python scripts/verify_output.py --project examples/cloud_smoke_test
    O:
    python scripts/verify_output.py --video examples/cloud_smoke_test/video.mp4 --timeline examples/cloud_smoke_test/timeline.json
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def inspect_with_ffprobe(video_path):
    """Obtiene metadata de flujos y contenedor mediante ffprobe."""
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        str(video_path)
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(res.stdout)
    except FileNotFoundError:
        print("[Verify] ERROR: ffprobe no está instalado o no se encuentra en el PATH.")
        return None
    except subprocess.CalledProcessError as e:
        print(f"[Verify] ERROR: ffprobe falló al inspeccionar {video_path}: {e}")
        return None


def verify_video(video_path, timeline_path=None, control_frames=None, output_report_paths=None):
    video_path = Path(video_path)
    errors = []
    warnings = []

    print(f"[Verify] Inspeccionando vídeo: {video_path}")

    if not video_path.exists():
        errors.append(f"El archivo de vídeo no existe: {video_path}")
        report = {
            "status": "failed",
            "video": None,
            "audio": None,
            "controlFrames": [],
            "errors": errors,
            "warnings": warnings
        }
        write_reports(report, output_report_paths)
        return report

    size_bytes = video_path.stat().st_size
    if size_bytes < 1024:
        errors.append(f"El vídeo parece estar vacío o corrupto (tamaño: {size_bytes} bytes)")

    # Leer timeline si existe
    expected_duration = None
    expected_fps = 60
    expected_width = 1080
    expected_height = 1920

    if timeline_path and Path(timeline_path).exists():
        try:
            with open(timeline_path, 'r', encoding='utf-8') as f:
                tl = json.load(f)
            meta = tl.get('meta', {})
            expected_fps = meta.get('fps', 60)
            expected_width = meta.get('width', 1080)
            expected_height = meta.get('height', 1920)
            expected_duration = sum(s.get('duration', 0) for s in tl.get('scenes', []))
        except Exception as e:
            warnings.append(f"No se pudo parsear timeline para comprobación cruzada: {e}")

    # Ejecutar ffprobe
    probe = inspect_with_ffprobe(video_path)
    if probe is None:
        errors.append("ffprobe no pudo analizar el archivo de vídeo.")
        report = {
            "status": "failed",
            "video": None,
            "audio": None,
            "controlFrames": control_frames or [],
            "errors": errors,
            "warnings": warnings
        }
        write_reports(report, output_report_paths)
        return report

    streams = probe.get('streams', [])
    v_stream = next((s for s in streams if s.get('codec_type') == 'video'), None)
    a_stream = next((s for s in streams if s.get('codec_type') == 'audio'), None)

    # 1. Validación de Video
    video_info = {}
    if not v_stream:
        errors.append("El archivo no contiene pista de vídeo.")
    else:
        width = int(v_stream.get('width', 0))
        height = int(v_stream.get('height', 0))
        codec_name = v_stream.get('codec_name', '').lower()
        pix_fmt = v_stream.get('pix_fmt', '').lower()

        # Cálculo de FPS
        fps_str = v_stream.get('r_frame_rate', '0/1')
        try:
            num, den = map(int, fps_str.split('/'))
            fps = round(num / den) if den else 0
        except Exception:
            fps = 0

        # Duración
        duration_sec = 0.0
        dur_raw = v_stream.get('duration') or probe.get('format', {}).get('duration')
        if dur_raw:
            try:
                duration_sec = round(float(dur_raw), 2)
            except Exception:
                pass

        video_info = {
            "width": width,
            "height": height,
            "fps": fps,
            "durationSeconds": duration_sec,
            "codec": codec_name,
            "pixelFormat": pix_fmt
        }

        # Verificaciones estrictas
        if width != expected_width or height != expected_height:
            errors.append(f"Resolución incorrecta: {width}x{height} (esperada {expected_width}x{expected_height})")

        if fps != expected_fps:
            errors.append(f"Frecuencia de cuadros incorrecta: {fps} fps (esperada {expected_fps} fps)")

        if codec_name not in ['h264', 'libx264']:
            warnings.append(f"Códec de vídeo: {codec_name} (esperado h264)")

        if pix_fmt != 'yuv420p':
            warnings.append(f"Formato de píxel: {pix_fmt} (esperado yuv420p)")

        if expected_duration is not None and abs(duration_sec - expected_duration) > 0.5:
            warnings.append(f"Duración de vídeo {duration_sec}s difiere de la esperada {expected_duration}s")

    # 2. Validación de Audio
    audio_info = {}
    if not a_stream:
        errors.append("El archivo no contiene pista de audio.")
        audio_info = {
            "present": False,
            "sampleRate": None,
            "channels": 0
        }
    else:
        sample_rate = int(a_stream.get('sample_rate', 0))
        channels = int(a_stream.get('channels', 0))
        audio_codec = a_stream.get('codec_name', '').lower()

        audio_info = {
            "present": True,
            "sampleRate": sample_rate,
            "channels": channels,
            "codec": audio_codec
        }

        if sample_rate != 48000:
            errors.append(f"Frecuencia de muestreo de audio: {sample_rate} Hz (esperada 48000 Hz)")

        if channels != 2:
            warnings.append(f"Canales de audio: {channels} (esperado estéreo: 2)")

    # 3. Fotogramas de control
    c_frames = control_frames or []
    if not c_frames and video_path.parent:
        # Detectar frames existentes en la carpeta
        c_frames = [f.name for f in video_path.parent.glob("frame_*.png")]

    status = "passed" if len(errors) == 0 else "failed"

    report = {
        "status": status,
        "video": video_info,
        "audio": audio_info,
        "controlFrames": c_frames,
        "errors": errors,
        "warnings": warnings
    }

    write_reports(report, output_report_paths)

    # Imprimir resumen
    print("\n" + "=" * 50)
    print(f"[Verify] ESTADO FINAL: {status.upper()}")
    print("=" * 50)
    if video_info:
        print(f"  • Video: {video_info.get('width')}x{video_info.get('height')} @ {video_info.get('fps')}fps, {video_info.get('durationSeconds')}s ({video_info.get('codec')}, {video_info.get('pixelFormat')})")
    if audio_info:
        print(f"  • Audio: {audio_info.get('sampleRate')}Hz, {audio_info.get('channels')} canales ({audio_info.get('codec')})")
    if c_frames:
        print(f"  • Control Frames: {', '.join(c_frames)}")

    if errors:
        print("\n[Verify] ✗ ERRORES ENCONTRADOS:")
        for err in errors:
            print(f"    - {err}")

    if warnings:
        print("\n[Verify] ⚠ ADVERTENCIAS:")
        for w in warnings:
            print(f"    - {w}")

    print("=" * 50)
    return report


def write_reports(report, paths):
    if not paths:
        return
    for p in paths:
        target = Path(p)
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"[Verify] Reporte guardado en: {target}")


def main():
    parser = argparse.ArgumentParser(description="Verificar calidad técnica del video generado para CREATOR IMAGINE")
    parser.add_argument('--project', help="Directorio del proyecto")
    parser.add_argument('--video', help="Ruta al video.mp4")
    parser.add_argument('--timeline', help="Ruta al timeline.json")
    parser.add_argument('--output-report', help="Ruta donde escribir validation_report.json")
    args = parser.parse_args()

    reports_to_write = []
    # Siempre escribir a output/validation_report.json
    output_dir_report = Path('output/validation_report.json')
    reports_to_write.append(output_dir_report)

    if args.project:
        p_dir = Path(args.project)
        video_path = p_dir / 'video.mp4'
        timeline_path = p_dir / 'timeline.json'
        reports_to_write.append(p_dir / 'validation_report.json')
    else:
        if not args.video:
            parser.error("--project o --video es requerido")
        video_path = Path(args.video)
        timeline_path = Path(args.timeline) if args.timeline else None
        if args.output_report:
            reports_to_write.append(Path(args.output_report))

    report = verify_video(video_path, timeline_path, output_report_paths=reports_to_write)
    sys.exit(0 if report.get("status") == "passed" else 1)


if __name__ == '__main__':
    main()
