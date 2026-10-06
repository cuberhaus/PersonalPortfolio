#!/bin/sh
# Build the final music bed (assets/bgm/bed.wav) from a HeyGen library track.
#
# Usage (from the project root):
#   sh scripts/make-bed.sh [SRC] [DELAY_MS] [GAIN_DB] [FADE_OUT_S]
#
# Defaults: assets/bgm/source.wav  400  -4  1.5
#
# Steps:
#   adelay      shifts the track so its structure meets the picture
#   volume      level trim (the library tracks are mastered hot, around -12 LUFS)
#   afade out   ends the bed cleanly at the video's last frame
#   alimiter    -1.5 dB peak ceiling, so the AAC encode has headroom
#   apad + -t   exactly TOTAL_S seconds, so assemble-index.mjs does not loop-extend
#               the track (its loop would replay the opening in the final second)
#
# Current track: "Astral Generated Music: d3d4fddb" (candidate 04 from
# scripts/audition-music.mjs; 46s, ~134 BPM). It opens with ~1s of silence and a quiet
# intro, a riser hit lands at 7.9s and full energy runs from 8.0s to ~41s. With a
# 400 ms delay: the music enters at ~1.4s as the first glitch snap ends, the riser
# hits at ~8.3s and full energy starts at 8.4s (the start of frame 3), and an onset
# near 4.75s meets the "255" counter start (4.8s). The gain of -4 dB puts the full
# section near -16 LUFS (measured -11.7 LUFS raw).
set -eu

SRC="${1:-assets/bgm/source.wav}"
DELAY_MS="${2:-400}"
GAIN_DB="${3:--4}"
FADE_S="${4:-1.5}"
OUT="assets/bgm/bed.wav"
TOTAL_S=35

[ -f "$SRC" ] || { echo "missing $SRC (fetch candidates with scripts/audition-music.mjs, then copy one to assets/bgm/source.wav)" >&2; exit 1; }

FADE_START=$(awk "BEGIN { print $TOTAL_S - $FADE_S }")

ffmpeg -hide_banner -loglevel error -y -i "$SRC" \
  -af "adelay=${DELAY_MS}|${DELAY_MS},volume=${GAIN_DB}dB,afade=t=out:st=${FADE_START}:d=${FADE_S},alimiter=limit=0.84:level=disabled,apad=whole_dur=${TOTAL_S}" \
  -t "$TOTAL_S" -c:a pcm_s16le "$OUT"

echo "wrote $OUT  (src=$SRC delay=${DELAY_MS}ms gain=${GAIN_DB}dB fade-out=${FADE_S}s)"
ffprobe -v error -show_entries format=duration -of default=nw=1 "$OUT"
