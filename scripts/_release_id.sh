#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# _release_id.sh — derive a Sentry release identifier from this repo's
# git state. Single source of truth so the format is identical
# whether `dev-all-demos.sh` (live dev) or `make build` (deploy) calls
# it.
#
# Output (one line, no surrounding whitespace):
#   portfolio@<short-sha>          — clean checkout
#   portfolio@<short-sha>-dirty    — uncommitted changes in working tree
#   portfolio@local-dev            — fallback (git missing or not a repo,
#                                    e.g. tarball install)
#
# `portfolio@` prefix follows Sentry's `<project>@<version>` idiom so the
# Releases tab can group every event from this codebase together.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

PORTFOLIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v git >/dev/null 2>&1 \
   && git -C "$PORTFOLIO" rev-parse --short HEAD >/dev/null 2>&1; then
  sha="$(git -C "$PORTFOLIO" rev-parse --short HEAD)"
  if [[ -n "$(git -C "$PORTFOLIO" status --porcelain 2>/dev/null)" ]]; then
    sha="${sha}-dirty"
  fi
  printf 'portfolio@%s\n' "$sha"
else
  printf 'portfolio@local-dev\n'
fi
