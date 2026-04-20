#!/usr/bin/env bash
# Start (or stop) demo backends (Docker + planner-api) then Astro.
# From PersonalPortfolio: npm run dev:all   /   bash scripts/dev-all-demos.sh --stop
#
# Options:
#   --stop          Stop all services and exit
#   --skip-docker   Do not start Tenda / Draculin (docker compose)
#   --skip-planner  Do not start planner-api (PDDL / ENHSP)
#   --help
set -euo pipefail

SKIP_DOCKER=0
SKIP_PLANNER=0
STOP_MODE=0
for arg in "${@:-}"; do
  case "$arg" in
    --stop) STOP_MODE=1 ;;
    --skip-docker) SKIP_DOCKER=1 ;;
    --skip-planner) SKIP_PLANNER=1 ;;
    --help|-h)
      echo "Usage: $0 [--stop] [--skip-docker] [--skip-planner]"
      exit 0
      ;;
  esac
done

PORTFOLIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TENDA_DIR="$(cd "$PORTFOLIO/../tenda_online" 2>/dev/null && pwd)" || TENDA_DIR=""
DRAC_DIR="$(cd "$PORTFOLIO/../Draculin-Backend" 2>/dev/null && pwd)" || DRAC_DIR=""
PLANNER_DIR="$(cd "$PORTFOLIO/planner-api" 2>/dev/null && pwd)" || PLANNER_DIR=""
PROP_DIR="$(cd "$PORTFOLIO/../subgrup-prop7.1" 2>/dev/null && pwd)" || PROP_DIR=""
TFG_DIR="$(cd "$PORTFOLIO/../TFG" 2>/dev/null && pwd)" || TFG_DIR=""
BITSX_DIR="$(cd "$PORTFOLIO/../bitsXlaMarato" 2>/dev/null && pwd)" || BITSX_DIR=""
PRO2_DIR="$(cd "$PORTFOLIO/../pracpro2" 2>/dev/null && pwd)" || PRO2_DIR=""
PLANIF_DIR="$(cd "$PORTFOLIO/../Practica_de_Planificacion" 2>/dev/null && pwd)" || PLANIF_DIR=""
DESASTRES_DIR="$(cd "$PORTFOLIO/../desastresIA" 2>/dev/null && pwd)" || DESASTRES_DIR=""
MPIDS_DIR="$(cd "$PORTFOLIO/../projectA" 2>/dev/null && pwd)" || MPIDS_DIR=""
PHASE_DIR="$(cd "$PORTFOLIO/../projectA2" 2>/dev/null && pwd)" || PHASE_DIR=""
CAIM_DIR="$(cd "$PORTFOLIO/../CAIM" 2>/dev/null && pwd)" || CAIM_DIR=""
JOCEDA_DIR="$(cd "$PORTFOLIO/../joc_eda" 2>/dev/null && pwd)" || JOCEDA_DIR=""
SBCIA_DIR="$(cd "$PORTFOLIO/../SBC_IA" 2>/dev/null && pwd)" || SBCIA_DIR=""
PAR_DIR="$(cd "$PORTFOLIO/../PAR" 2>/dev/null && pwd)" || PAR_DIR=""
ROB_DIR="$(cd "$PORTFOLIO/../ROB" 2>/dev/null && pwd)" || ROB_DIR=""
FIB_DIR="$(cd "$PORTFOLIO/../fib" 2>/dev/null && pwd)" || FIB_DIR=""
GRAFICS_DIR="$(cd "$PORTFOLIO/../fib/G/web" 2>/dev/null && pwd)" || GRAFICS_DIR=""

# ── Single source of truth: all Docker services ──────────────────────────
# Format: "DIR COMPOSE_FILE" for compose, or "run:CONTAINER:IMAGE:PORT:DIR" for docker-run
COMPOSE_SERVICES=(
  "${TENDA_DIR}    docker/docker-compose.yml"
  "${DRAC_DIR}     docker-compose.yml"
  "${TFG_DIR}      docker-compose.yml"
  "${BITSX_DIR}    docker-compose.yml"
  "${DESASTRES_DIR} docker-compose.yml"
  "${MPIDS_DIR}    docker-compose.yml"
  "${PHASE_DIR}    docker-compose.yml"
  "${CAIM_DIR}     docker-compose.yml"
  "${JOCEDA_DIR}   docker-compose.yml"
  "${SBCIA_DIR}    docker-compose.yml"
  "${PAR_DIR}      docker-compose.yml"
  "${ROB_DIR}      docker-compose.yml"
  "${FIB_DIR}      docker-compose.yml"
  "${GRAFICS_DIR}  docker-compose.yml"
)
RUN_CONTAINERS=( "portfolio-pro2" "portfolio-planif" )

# ── Stop mode: tear down everything in parallel, then exit ───────────────
if [[ "$STOP_MODE" == 1 ]]; then
  echo "Stopping portfolio demo services..."
  (
    for entry in "${COMPOSE_SERVICES[@]}"; do
      dir=$(echo "$entry" | awk '{print $1}')
      file=$(echo "$entry" | awk '{print $2}')
      [[ -f "${dir}/${file}" ]] && \
        (cd "$dir" && docker compose -f "$file" down 2>/dev/null) &
    done
    for c in "${RUN_CONTAINERS[@]}"; do
      docker rm -f "$c" 2>/dev/null &
    done
    wait
  )
  fuser -k 8081/tcp 2>/dev/null || true
  fuser -k 8765/tcp 2>/dev/null || true
  echo "Done."
  exit 0
fi

# ── Runtime state flags (only used by dev / cleanup) ─────────────────────
PLANNER_PID=""
PROP_PID=""

cleanup() {
  local ec=${1:-0}
  if [[ -n "${PLANNER_PID}" ]] && kill -0 "$PLANNER_PID" 2>/dev/null; then
    echo ""
    echo "Stopping planner-api (pid $PLANNER_PID)..."
    kill "$PLANNER_PID" 2>/dev/null || true
    wait "$PLANNER_PID" 2>/dev/null || true
  fi
  if [[ -n "${PROP_PID}" ]] && kill -0 "$PROP_PID" 2>/dev/null; then
    echo ""
    echo "Stopping PROP (pid $PROP_PID)..."
    kill "$PROP_PID" 2>/dev/null || true
    wait "$PROP_PID" 2>/dev/null || true
    fuser -k 8081/tcp 2>/dev/null || true
  fi
  # Stop all compose stacks and run containers in parallel
  (
    for entry in "${COMPOSE_SERVICES[@]}"; do
      dir=$(echo "$entry" | awk '{print $1}')
      file=$(echo "$entry" | awk '{print $2}')
      [[ -f "${dir}/${file}" ]] && \
        (cd "$dir" && docker compose -f "$file" down) >/dev/null 2>&1 &
    done
    for c in "${RUN_CONTAINERS[@]}"; do
      docker rm -f "$c" >/dev/null 2>&1 &
    done
    wait
  )
  exit "$ec"
}
trap 'cleanup $?' EXIT INT TERM

# --- Docker: launch ALL services in parallel ---
if [[ "$SKIP_DOCKER" == 0 ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "==> Docker not installed — skipping all Docker services"
  else
    DOCKER_PIDS=()

    # Kill any container (running OR stopped) holding a given port
    _free_port() {
      local port="$1"
      local cids

      # Method 1: Docker filter (works for exact single-port mappings)
      cids=$(docker ps -aq --filter "publish=${port}" 2>/dev/null) || true
      if [[ -n "$cids" ]]; then
        echo "$cids" | xargs -r docker rm -f 2>/dev/null || true
      fi

      # Method 2: Grep all containers for port ranges the filter misses
      cids=$(docker ps -a --format '{{.ID}} {{.Ports}}' 2>/dev/null \
        | grep -E "(^|[ ,])0\.0\.0\.0:([0-9]+-)?${port}(-[0-9]+)?->" \
        | awk '{print $1}') || true
      if [[ -n "$cids" ]]; then
        echo "$cids" | xargs -r docker rm -f 2>/dev/null || true
      fi

      # Method 3: Kill orphaned docker-proxy processes (from removed containers)
      local pids
      pids=$(ps aux 2>/dev/null | grep "[d]ocker-proxy.*-host-port ${port} " | awk '{print $2}') || true
      if [[ -n "$pids" ]]; then
        # docker-proxy runs as root; try kill, then sudo -n (passwordless), then
        # fall back to restarting docker to reclaim the port
        echo "$pids" | xargs -r kill -9 2>/dev/null \
          || echo "$pids" | xargs -r sudo -n kill -9 2>/dev/null \
          || { echo "    Restarting Docker daemon to free orphaned port ${port}..." >&2; \
               sudo -n systemctl restart docker 2>/dev/null || true; \
               sleep 1; } \
          || true
        sleep 0.3  # let kernel release the socket
      fi
      return 0
    }

    # Helper: launch a docker compose service in the background
    _compose_up() {
      local name="$1" url="$2" dir="$3" file="${4:-docker-compose.yml}" extra="${5:-}"
      if [[ -f "${dir}/${file}" ]]; then
        echo "==> ${name}  ${url}  (docker compose)${extra}"
        (
          # Free ports held by stale containers (any project name)
          for p in $(echo "${url} ${extra}" | grep -oP '[0-9]{4,5}'); do
            _free_port "$p"
          done
          cd "$dir" && docker compose -f "$file" down --remove-orphans 2>/dev/null
          cd "$dir" && docker compose -f "$file" up -d 2>&1 | sed "s/^/    [${name}] /"
        ) &
        DOCKER_PIDS+=($!)
      else
        echo "==> ${name} skipped (no ${dir}/${file})"
      fi
    }

    # Helper: launch a docker run service in the background (build-if-missing)
    _docker_run() {
      local name="$1" url="$2" dir="$3" image="$4" port="$5" container="$6"
      if [[ -d "${dir}" ]]; then
        echo "==> ${name}  ${url}  (docker run)"
        (
          docker rm -f "$container" 2>/dev/null || true
          _free_port "${port}"
          docker run -d --rm -p "${port}:${port}" --name "$container" "$image" 2>/dev/null || {
            echo "    [${name}] Building image first..." >&2
            (cd "$dir" && docker build -t "$image" .) >/dev/null 2>&1 && \
              docker run -d --rm -p "${port}:${port}" --name "$container" "$image" 2>/dev/null || \
              echo "    warning: ${name} docker run failed" >&2
          }
        ) &
        DOCKER_PIDS+=($!)
      else
        echo "==> ${name} skipped (no ${dir}/)"
      fi
    }

    # Launch all docker compose services in parallel
    _compose_up "Tenda Online    " "http://localhost:8888" "$TENDA_DIR"      "docker/docker-compose.yml"
    _compose_up "Draculin        " "http://localhost:8890" "$DRAC_DIR"       "docker-compose.yml" " (Flutter) API :8889"
    _compose_up "TFG             " "http://localhost:8082" "$TFG_DIR"
    _compose_up "bitsXlaMarato   " "http://localhost:8001" "$BITSX_DIR"      "docker-compose.yml" " (GPU)"
    _compose_up "DesastresIA     " "http://localhost:8083" "$DESASTRES_DIR"
    _compose_up "MPIDS           " "http://localhost:8084" "$MPIDS_DIR"
    _compose_up "PhaseTransitions" "http://localhost:8085" "$PHASE_DIR"
    _compose_up "CAIM            " "http://localhost:8086" "$CAIM_DIR"
    _compose_up "JocEDA          " "http://localhost:8087" "$JOCEDA_DIR"
    _compose_up "SBC_IA          " "http://localhost:8088" "$SBCIA_DIR"
    _compose_up "PAR             " "http://localhost:8089" "$PAR_DIR"
    _compose_up "ROB             " "http://localhost:8092" "$ROB_DIR"
    _compose_up "FIB             " "http://localhost:8090" "$FIB_DIR"
    _compose_up "Grafics         " "http://localhost:8093" "$GRAFICS_DIR"    "docker-compose.yml"

    # Launch docker run services in parallel
    _docker_run "pracpro2        " "http://localhost:8000" "$PRO2_DIR"   "pracpro2"                  "8000" "portfolio-pro2"
    _docker_run "Planificacion   " "http://localhost:3000" "$PLANIF_DIR" "practica-planificacion"     "3000" "portfolio-planif"

    # Wait for ALL docker services to be up
    echo ""
    echo "==> Waiting for all Docker services to start..."
    DOCKER_FAILED=0
    for pid in "${DOCKER_PIDS[@]}"; do
      wait "$pid" 2>/dev/null || DOCKER_FAILED=$((DOCKER_FAILED + 1))
    done
    if [[ "$DOCKER_FAILED" -gt 0 ]]; then
      echo "    warning: $DOCKER_FAILED Docker service(s) failed to start" >&2
    else
      echo "    All Docker services started."
    fi
  fi
  echo ""
else
  echo "==> Docker stacks skipped (--skip-docker)"
  echo ""
fi

# --- PROP Spring Boot ---
if [[ -f "${PROP_DIR}/Makefile" ]]; then
  echo "==> PROP Web           http://localhost:8081  (Spring Boot)"
  (cd "${PROP_DIR}/web" && ./mvnw spring-boot:run > web_run.log 2>&1) &
  PROP_PID=$!
  sleep 2
  echo ""
else
  echo "==> PROP Web skipped (no ../subgrup-prop7.1/Makefile)"
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
