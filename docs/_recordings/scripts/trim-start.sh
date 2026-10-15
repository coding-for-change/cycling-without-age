#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
for slug in "$@"; do
  v="${DOCS_VIDEO_DIR:-$here/.out/videos}/$slug.webm"
  m="${DOCS_VIDEO_DIR:-$here/.out/videos}/$slug.start"
  [[ -f "$m" ]] || continue
  t="$(cat "$m")"
  ffmpeg -loglevel error -y -ss "$t" -i "$v" -c:v libvpx-vp9 -b:v 0 -crf 24 -deadline good -cpu-used 4 -an "$v.tmp.webm" </dev/null
  mv "$v.tmp.webm" "$v"
  rm "$m"
  printf '%s trimmed %ss -> %ss\n' "$slug" "$t" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")"
done
