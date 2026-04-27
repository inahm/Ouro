#!/usr/bin/env bash
# Scale video to WxH with a blurred, cropped version of the same clip filling the frame
# (avoids huge letterboxing when a wide clip goes into 9:16 or 1:1).
#
# Usage:
#   ./scripts/linkedin-blur-canvas.sh input.mp4 output.mp4 1080 1920   # vertical
#   ./scripts/linkedin-blur-canvas.sh input.mp4 output.mp4 1080 1080   # square

set -euo pipefail
IN="${1:?input}"
OUT="${2:?output}"
W="${3:?width}"
H="${4:?height}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

ffmpeg -y -i "$IN" -filter_complex "\
[0:v]split[orig][forbg];\
[forbg]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:1[bg];\
[orig]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];\
[bg][fg]overlay=(W-w)/2:(H-h)/2:format=auto,setsar=1[out]" \
  -map "[out]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart "$OUT"

echo "Wrote $OUT (${W}×${H}, blur-filled)."
