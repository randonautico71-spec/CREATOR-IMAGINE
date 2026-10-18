#!/usr/bin/env python3
"""
build_video.py — Orquestador único de producción para CREATOR IMAGINE Engine

Flujo completo automatizado:
1. Validar timeline.json contra schema oficial.
2. Generar audio/música y SFX procedurales (music.wav a 48 kHz).
3. Renderizar frames deterministas con Chromium (Playwright) y compilar con FFmpeg (video.mp4).
4. Extraer fotogramas de control (inicio, centro, final).
5. Ejecutar control de calidad exhaustivo y generar output/validation_report.json.

Uso:
    python scripts/build_video.py examples/cloud_smoke_test
    python scripts/build_video.py examples/system_test
    python scripts/build_video.py projects/<slug>
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


def step_banner(num, title):
    print("\n" + "=" * 60)
    print(f"  [{num}/5] {title}")
    print("=" * 60)


def run_command(cmd, desc, cwd=None):
    print(f"-> Ejecutando: {' '.join(str(c) for c in cmd)}")
    res = subprocess.run(cmd, cwd=cwd, text=True)
    if res.returncode != 0:
        print(f"\n[Build] ERROR: Falló la etapa '{desc}' (código de salida: {res.returncode})")
        return False
    return True


def validate_timeline(project_dir, root_dir):
    timeline_file = project_dir / 'timeline.json'
    schema_file = root_dir / 'schema' / 'timeline.schema.json'

    if not timeline_file.exists():
        print(f"[Build] ERROR: No existe timeline.json en {project_dir}")
        return False

    # Intentar primero con validate_timeline.js (AJV) si node_modules está presente
    validate_js = root_dir / 'scripts' / 'validate_timeline.js'
    node_modules = root_dir / 'node_modules'
    if node_modules.exists() and validate_js.exists():
        res = subprocess.run(['node', str(validate_js), str(timeline_file)], cwd=root_dir)
        if res.returncode == 0:
            return True
        print("[Build] Falló validación por node/AJV, verificando con motor python...")

    # Fallback o validación directa con Python jsonschema
    try:
        import jsonschema
        with open(schema_file, 'r', encoding='utf-8') as f:
            schema = json.load(f)
        with open(timeline_file, 'r', encoding='utf-8') as f:
            timeline = json.load(f)

        jsonschema.validate(instance=timeline, schema=schema)
        total_dur = sum(s.get('duration', 0) for s in timeline.get('scenes', []))
        n_scenes = len(timeline.get('scenes', []))
        print(f"[Build] ✓ Timeline válido (Python jsonschema)")
        print(f"        Escenas: {n_scenes} | Duración: {total_dur:.2f}s | Tema: {timeline.get('theme')}")
        return True
    except Exception as e:
        print(f"[Build] ERROR de validación en timeline: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Orquestador único de producción para CREATOR IMAGINE")
    parser.add_argument('project', help="Directorio del proyecto o ejemplo (ej. examples/cloud_smoke_test)")
    parser.add_argument('--preview', action='store_true', help="Renderizar en modo preview (rápido). Equivalente a --quality preview")
    parser.add_argument('--quality', choices=['preview', 'final', 'master'], default=None,
                         help="Modo de calidad del render (preview=540x960@30fps JPEG, final=1080x1920@60fps JPEG, master=1080x1920@60fps PNG)")
    parser.add_argument('--keep-frames', action='store_true', help="Conservar también una copia en disco de los fotogramas (depuración)")
    args = parser.parse_args()
    if not args.quality:
        args.quality = 'preview' if args.preview else 'final'

    root_dir = Path(__file__).resolve().parent.parent
    project_dir = (root_dir / args.project).resolve() if not Path(args.project).is_absolute() else Path(args.project)

    if not project_dir.exists():
        print(f"[Build] ERROR: Directorio de proyecto no encontrado: {project_dir}")
        sys.exit(1)

    timeline_path = project_dir / 'timeline.json'
    audio_path = project_dir / 'music.wav'
    video_path = project_dir / ('preview.mp4' if args.quality == 'preview' else 'video.mp4')
    output_dir = root_dir / 'output'
    output_dir.mkdir(parents=True, exist_ok=True)

    print("============================================================")
    print("  CREATOR IMAGINE — PIPELINE DE PRODUCCIÓN AUDIOVISUAL")
    print(f"  Proyecto: {project_dir.name}")
    print("============================================================")

    # 1. VALIDACIÓN
    step_banner(1, "Validación del Timeline")
    if not validate_timeline(project_dir, root_dir):
        sys.exit(1)

    # 2. GENERACIÓN DE AUDIO DSP
    step_banner(2, "Generación de Audio DSP (Música y SFX a 48 kHz)")
    audio_script = root_dir / 'engine' / 'dsp_audio_engine.py'
    cmd_audio = [
        sys.executable, str(audio_script),
        '--timeline', str(timeline_path),
        '--output', str(audio_path)
    ]
    if not run_command(cmd_audio, "Generación de audio DSP", cwd=root_dir):
        sys.exit(1)

    if not audio_path.exists() or audio_path.stat().st_size < 1000:
        print(f"[Build] ERROR: Archivo de audio no generado o vacío: {audio_path}")
        sys.exit(1)

    # 3. RENDER CHROMIUM & FFMPEG
    step_banner(3, "Renderizado de Cuadros (Chromium) y Muxeo (FFmpeg)")
    render_script = root_dir / 'engine' / 'render_worker.js'
    cmd_render = [
        'node', str(render_script),
        '--project', str(project_dir),
        '--quality', args.quality
    ]
    if args.keep_frames:
        cmd_render.append('--keep-frames')

    if not run_command(cmd_render, "Renderizado Chromium y FFmpeg", cwd=root_dir):
        sys.exit(1)

    if not video_path.exists() or video_path.stat().st_size < 1000:
        print(f"[Build] ERROR: Archivo de vídeo no generado o vacío: {video_path}")
        sys.exit(1)

    # 4. EXTRACCIÓN DE FOTOGRAMAS DE CONTROL
    step_banner(4, "Extracción de Fotogramas de Control (Auditoría)")
    frames_script = root_dir / 'scripts' / 'extract_control_frames.py'
    cmd_frames = [
        sys.executable, str(frames_script),
        '--project', str(project_dir)
    ]
    # Si la extracción falla o ffmpeg no está, no bloquea fatalmente pero avisa
    run_command(cmd_frames, "Extracción de fotogramas de control", cwd=root_dir)

    # 5. VERIFICACIÓN Y CONTROL DE CALIDAD
    step_banner(5, "Control de Calidad y Reporte Técnico")
    verify_script = root_dir / 'scripts' / 'verify_output.py'
    cmd_verify = [
        sys.executable, str(verify_script),
        '--project', str(project_dir)
    ]
    if not run_command(cmd_verify, "Verificación de salida", cwd=root_dir):
        sys.exit(1)

    # Copiar o asegurar que el vídeo también esté referenciado en output/
    print("\n" + "=" * 60)
    print("  ✓ PIPELINE COMPLETADO CON ÉXITO")
    print(f"  Vídeo generado: {video_path}")
    print(f"  Timeline:       {timeline_path}")
    print(f"  Reporte:        {output_dir / 'validation_report.json'}")
    print("============================================================")
    sys.exit(0)


if __name__ == '__main__':
    main()
