#!/usr/bin/env bash
# Start demo backends (Docker + planner-api) then Astro. From PersonalPortfolio: npm run dev:all
#
# Options:
#   --skip-docker   Do not start Tenda / Draculin (docker compose)
#   --skip-planner  Do not start planner-api (PDDL / ENHSP)
#   --help
set -euo pipefail

SKIP_DOCKER=0
SKIP_PLANNER=0
for arg in "${@:-}"; do
  case "$arg" in
    --skip-docker) SKIP_DOCKER=1 ;;
    --skip-planner) SKIP_PLANNER=1 ;;
    --help|-h)
      echo "Usage: $0 [--skip-docker] [--skip-planner]"
      exit 0
      ;;
  esac
done

PORTFOLIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TENDA_DIR="$(cd "$PORTFOLIO/../tenda_online" 2>/dev/null && pwd)" || TENDA_DIR=""
DRAC_DIR="$(cd "$PORTFOLIO/../Draculin-Backend" 2>/dev/null && pwd)" || DRAC_DIR=""
PLANNER_DIR="$(cd "$PORTFOLIO/planner-api" 2>/dev/null && pwd)" || PLANNER_DIR=""

TENDA_UP=0
DRAC_UP=0
PLANNER_PID=""

cleanup() {
  local ec=${1:-0}
  if [[ -n "${PLANNER_PID}" ]] && kill -0 "$PLANNER_PID" 2>/dev/null; then
    echo ""
    echo "Stopping planner-api (pid $PLANNER_PID)..."
    kill "$PLANNER_PID" 2>/dev/null || true
    wait "$PLANNER_PID" 2>/dev/null || true
  fi
  if [[ "$TENDA_UP" == 1 ]] && [[ -f "${TENDA_DIR}/docker-compose.yml" ]]; then
    echo "Stopping Tenda stack (docker compose down)..."
    (cd "$TENDA_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$DRAC_UP" == 1 ]] && [[ -f "${DRAC_DIR}/docker-compose.yml" ]]; then
    echo "Stopping Draculin stack (docker compose down)..."
    (cd "$DRAC_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  exit "$ec"
}
trap 'cleanup $?' EXIT INT TERM

# --- Docker: Tenda (PHP) + Draculin (Django + Flutter) ---
if [[ "$SKIP_DOCKER" == 0 ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "==> Docker not installed — skipping Tenda (:8888) & Draculin (:8890)"
  else
    if [[ -f "${TENDA_DIR}/docker-compose.yml" ]]; then
      echo "==> Tenda Online     http://localhost:8888  (docker compose)"
      if (cd "$TENDA_DIR" && docker compose up -d); then
        TENDA_UP=1
      else
        echo "    warning: Tenda docker compose failed (is Docker running?)" >&2
      fi
    else
      echo "==> Tenda skipped    (no ../tenda_online/docker-compose.yml)"
    fi
    if [[ -f "${DRAC_DIR}/docker-compose.yml" ]]; then
      echo "==> Draculin         http://localhost:8890  (Flutter)  API :8889"
      if (cd "$DRAC_DIR" && docker compose up -d); then
        DRAC_UP=1
      else
        echo "    warning: Draculin docker compose failed" >&2
      fi
    else
      echo "==> Draculin skipped (no ../Draculin-Backend/docker-compose.yml)"
    fi
  fi
  echo ""
else
  echo "==> Docker stacks skipped (--skip-docker)"
  echo ""
fi

# --- planner-api (ENHSP) ---
if [[ "$SKIP_PLANNER" == 0 ]]; then
  if [[ -f "${PLANNER_DIR}/app/main.py" ]]; then
    echo "==> planner-api      http://127.0.0.1:8765  (Java 17+ for ENHSP)"
    cd "$PLANNER_DIR"
    if ! python3 -c "import fastapi, up_enhsp" 2>/dev/null; then
      echo "    Installing Python deps..." >&2
      pip install -q -r requirements.txt 2>/dev/null || pip3 install -q -r requirements.txt || true
    fi
    python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8765 &
    PLANNER_PID=$!
    if command -v curl >/dev/null 2>&1; then
      for _ in $(seq 1 40); do
        if curl -sf "http://127.0.0.1:8765/health" >/dev/null 2>&1; then
          echo "    Planner API ready."
          break
        fi
        sleep 0.15
      done
    else
      sleep 2
    fi
    echo ""
  else
    echo "==> planner-api skipped (no planner-api/) — planificación tab needs it or PUBLIC_PLANNER_URL"
    echo ""
  fi
else
  echo "==> planner-api skipped (--skip-planner)"
  echo ""
fi

cd "$PORTFOLIO"
echo "==> Astro            http://localhost:4321"
echo ""
npm run dev
