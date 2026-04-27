#!/usr/bin/env bash
# Pad / scale a video to LinkedIn-friendly 16:9 (1920×1080) with letterboxing.
# Requires: ffmpeg (brew install ffmpeg)
#
# Usage:
#   ./scripts/pad-video-linkedin.sh path/to/in.mp4 path/to/out.mp4
#
# Background: default near-black. For brand red use:
#   PAD_COLOR="0xFF1B00" ./scripts/pad-video-linkedin.sh in.mp4 out.mp4

set -euo pipefail
IN="${1:?input mp4}"
OUT="${2:?output mp4}"
PAD_COLOR="${PAD_COLOR:-0x0d0d0d}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

ffmpeg -y -i "$IN" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR},setsar=1" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -movflags +faststart \
  "$OUT"

echo "Wrote $OUT (1920×1080, SAR 1:1, H.264 — use for horizontal LinkedIn / 16:9 timelines)."
