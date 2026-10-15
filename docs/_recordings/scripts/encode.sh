#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
src="$here/.out/videos"
dst="$here/../videos"
mkdir -p "$dst"
for f in "$src"/*.webm; do
  slug="$(basename "$f" .webm)"
  [[ "$slug" == _* ]] && continue
  if [[ -n "${1:-}" && "$slug" != "$1" ]]; then continue; fi
  width="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f")"
  if (( width > 1000 )); then scale="scale=1280:-2"; else scale="scale=trunc(iw/2)*2:-2"; fi
  ffmpeg -loglevel error -y -ss 0.3 -i "$f" -vf "$scale,fps=30" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart -an "$dst/$slug.mp4"
  printf '%-32s %s\n' "$slug" "$(du -h "$dst/$slug.mp4" | cut -f1)"
done
