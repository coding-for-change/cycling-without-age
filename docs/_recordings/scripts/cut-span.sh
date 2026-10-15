#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
slug="$1"; from="$2"; to="$3"
v="${DOCS_VIDEO_DIR:-$here/.out/videos}/$slug.webm"
ffmpeg -loglevel error -y -i "$v" -filter_complex "[0:v]trim=0:$from,setpts=PTS-STARTPTS[a];[0:v]trim=start=$to,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[out]" -map "[out]" -c:v libvpx-vp9 -b:v 0 -crf 24 -deadline good -cpu-used 4 -an "$v.tmp.webm" </dev/null
mv "$v.tmp.webm" "$v"
printf '%s cut %s-%s -> %ss\n' "$slug" "$from" "$to" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")"
