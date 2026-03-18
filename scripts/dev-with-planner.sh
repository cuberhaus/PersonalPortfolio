#!/usr/bin/env bash
# planner-api/ + Astro only (no Docker).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTFOLIO="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ ! -f "$PORTFOLIO/planner-api/app/main.py" ]]; then
  echo "error: planner-api not found at $PORTFOLIO/planner-api" >&2
  echo "  Expected PersonalPortfolio/planner-api (FastAPI + ENHSP)." >&2
  exit 1
fi
exec bash "$SCRIPT_DIR/dev-all-demos.sh" --skip-docker
