#!/bin/sh
# Builds assets/bgm/bed.wav: the tour's 30.0s music bed, cut from a HeyGen library track.
#
#   sh scripts/make-bed.sh [SRC] [START_S] [DELAY_MS] [GAIN_DB] [FADE_OUT_S]
#
# Defaults: assets/bgm/source.wav, start 0s into the source, 512 ms of delay, -2 dB, 1.5s fade-out.
#
# Current track: "Astral Generated Music: 8568afda" (candidate 03 from promo-video's
# scripts/audition-music.mjs: "bright uplifting electronic track, medium tempo 110-120 BPM,
# modern tech feel"; 39s). It is deliberately not the promo's track (d3d4fddb, 135 BPM, big
# drop), so the two films sound different.
#
# Measured on the source (full-band spectral flux, refined over the whole track): exactly
# 120.00 BPM, so a beat is 0.5000s = 15 frames at 30 fps, with beats at source 0.488s + k*0.5s.
# The first second is a riser, the first full hit lands at source ~0.99s (beat 1), and the
# groove then runs steady to ~32s. Delaying the source by 512 ms puts every beat on a whole
# half second of the video (0.0, 0.5, 1.0, ...) and the first hit at 1.5s, which is when the
# first scroll leg starts (HERO_HOLD_BEATS = 3 in 01-one-scroll.html; BEAT0 = 0). The riser
# therefore plays under the hero hold and the scroll starts on the hit.
#
# The bed is exactly TOTAL_S long so the assembler never loop-extends it. A limiter keeps the
# peaks under the same ceiling as the promo's bed.
set -eu
cd "$(dirname "$0")/.."

SRC="${1:-assets/bgm/source.wav}"
START_S="${2:-0}"
DELAY_MS="${3:-512}"
GAIN_DB="${4:--2}"
FADE_S="${5:-1.5}"
TOTAL_S="${TOTAL_S:-30}"
OUT="assets/bgm/bed.wav"

FADE_START=$(awk "BEGIN { print $TOTAL_S - $FADE_S }")
ffmpeg -hide_banner -loglevel error -y -ss "$START_S" -i "$SRC" \
  -af "adelay=${DELAY_MS}|${DELAY_MS},volume=${GAIN_DB}dB,afade=t=out:st=${FADE_START}:d=${FADE_S},alimiter=limit=0.84:level=disabled,apad=whole_dur=${TOTAL_S}" \
  -t "$TOTAL_S" -c:a pcm_s16le "$OUT"
echo "wrote $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
