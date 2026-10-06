#!/bin/sh
# Builds assets/bgm/bed.wav: the tour's 30.0s music bed, cut from the promo's library track.
#
#   sh scripts/make-bed.sh [SRC] [START_S] [GAIN_DB] [FADE_OUT_S]
#
# Defaults: assets/bgm/source.wav, start 6.2s into the source, -4 dB, 1.5s fade-out.
#
# Why start at 6.2s: the track has a quiet build and its drop (full energy) at ~8.0s of the
# source. Starting 6.2s in puts the drop at 1.8s, which is when the first scroll leg starts.
# The track's beat grid, measured on the promo's bed (kick onsets and full-band spectral flux
# agree), is 135.1 BPM with a beat at source ~8.02s, so after this cut the first beat falls at
# about 0.046s and the composition's cuts (BEAT0 in 01-one-scroll.html) sit on that grid.
#
# The bed is exactly TOTAL_S long so the assembler never loop-extends it. A limiter keeps the
# peaks under the same ceiling as the promo's bed.
set -eu
cd "$(dirname "$0")/.."

SRC="${1:-assets/bgm/source.wav}"
START_S="${2:-6.2}"
GAIN_DB="${3:--4}"
FADE_S="${4:-1.5}"
TOTAL_S="${TOTAL_S:-30}"
OUT="assets/bgm/bed.wav"

FADE_START=$(awk "BEGIN { print $TOTAL_S - $FADE_S }")
ffmpeg -hide_banner -loglevel error -y -ss "$START_S" -i "$SRC" \
  -af "volume=${GAIN_DB}dB,afade=t=in:st=0:d=0.05,afade=t=out:st=${FADE_START}:d=${FADE_S},alimiter=limit=0.84:level=disabled,apad=whole_dur=${TOTAL_S}" \
  -t "$TOTAL_S" -c:a pcm_s16le "$OUT"
echo "wrote $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
