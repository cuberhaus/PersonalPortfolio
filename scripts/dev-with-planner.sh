#!/usr/bin/env bash
# Planner-api + Astro only (no Docker). Fails if ../planner-api is missing.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTFOLIO="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ ! -f "$PORTFOLIO/../planner-api/app/main.py" ]]; then
  echo "error: planner-api not found at $PORTFOLIO/../planner-api" >&2
  echo "  Use npm run dev:all to start other demos without the planner, or clone planner-api." >&2
  exit 1
fi
exec bash "$SCRIPT_DIR/dev-all-demos.sh" --skip-docker
