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
SKIP_LOG_RELAY=0
STOP_MODE=0
LIST_MODE=0
HEALTH_MODE=0
for arg in "${@:-}"; do
  case "$arg" in
    --stop) STOP_MODE=1 ;;
    --list) LIST_MODE=1 ;;
    --health) HEALTH_MODE=1 ;;
    --skip-docker) SKIP_DOCKER=1 ;;
    --skip-planner) SKIP_PLANNER=1 ;;
    --skip-log-relay) SKIP_LOG_RELAY=1 ;;
    --help|-h)
      echo "Usage: $0 [--stop] [--list] [--health] [--skip-docker] [--skip-planner] [--skip-log-relay]"
      exit 0
      ;;
  esac
done

PORTFOLIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY_FILE="${PORTFOLIO}/src/data/demo-services.json"

# ── Phase 14 (Option A): propagate the shared Sentry DSN to every backend ──
# `.env.shared` is gitignored. Copy `.env.shared.example` to `.env.shared`,
# fill in your DSN, and re-run. Without it, backends initialise their SDK
# with an empty DSN and silently no-op (so `make dev-bare` keeps working).
if [[ -f "${PORTFOLIO}/.env.shared" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${PORTFOLIO}/.env.shared"
  set +a
fi
export SENTRY_DSN="${SENTRY_DSN:-}"
export SENTRY_ENVIRONMENT="${SENTRY_ENVIRONMENT:-local-dev}"
export SENTRY_TRACES_SAMPLE_RATE="${SENTRY_TRACES_SAMPLE_RATE:-1.0}"
export SENTRY_RELEASE="${SENTRY_RELEASE:-local-dev}"

# ── Auto-derive SENTRY_RELEASE from this repo's git SHA ─────────────────
# Format (from scripts/_release_id.sh, single source of truth):
#   portfolio@<short-sha>          — clean checkout
#   portfolio@<short-sha>-dirty    — uncommitted changes
#   portfolio@local-dev            — git missing / not a checkout
#
# We only auto-derive when the user hasn't pinned a release explicitly;
# the placeholder "local-dev" counts as unset so the .env.shared.example
# default doesn't pin everyone to a literal "local-dev" release tag.
if [[ -z "$SENTRY_RELEASE" || "$SENTRY_RELEASE" == "local-dev" ]]; then
  if [[ -x "${PORTFOLIO}/scripts/_release_id.sh" ]]; then
    SENTRY_RELEASE="$("${PORTFOLIO}/scripts/_release_id.sh")"
  else
    SENTRY_RELEASE="portfolio@local-dev"
  fi
  export SENTRY_RELEASE
fi

# Astro reads PUBLIC_*-prefixed env vars at build/dev time; mirror the
# release into PUBLIC_SENTRY_RELEASE so the frontend SDK picks it up
# alongside the backends.
export PUBLIC_SENTRY_RELEASE="$SENTRY_RELEASE"

# When backends run inside Docker, `localhost` resolves to the container,
# not the host. Rewrite the DSN host portion so the Sentry SDKs inside
# containers can reach Spotlight (or any other host-bound DSN sidecar).
# Each backend's docker-compose.yml reads `SENTRY_DSN_DOCKER` first, then
# falls back to `SENTRY_DSN`. Host-only processes (PROP, planner-api)
# keep the original `SENTRY_DSN` so they still resolve `localhost` fine.
SENTRY_DSN_DOCKER="$SENTRY_DSN"
case "$SENTRY_DSN" in
  *@localhost:*|*@127.0.0.1:*)
    SENTRY_DSN_DOCKER="${SENTRY_DSN/@localhost:/@host.docker.internal:}"
    SENTRY_DSN_DOCKER="${SENTRY_DSN_DOCKER/@127.0.0.1:/@host.docker.internal:}"
    ;;
esac
export SENTRY_DSN_DOCKER

# ── Single source of truth: src/data/demo-services.json ──────────────────
# Build the SERVICE_REGISTRY array dynamically from the JSON via jq.
# Format kept identical to the previous static array (so existing logic below
# keeps working): "displayName|port|type|dir|composeFileOrImage|extra"
#   - type: compose | run | process
#   - dir : absolute path resolved from composeFile / makefile (or empty for
#           process services like PROP / planner-api)
#   - composeFileOrImage: relative compose path for compose; image name for run;
#                         empty for process
#   - extra: display annotation (e.g. "(GPU)") for compose / process,
#            or container name for run
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required to read ${REGISTRY_FILE}." >&2
  echo "       Install with: sudo apt install jq  (or brew install jq)" >&2
  exit 1
fi
if [[ ! -f "$REGISTRY_FILE" ]]; then
  echo "ERROR: registry file not found: ${REGISTRY_FILE}" >&2
  exit 1
fi

PLANNER_DIR="$(cd "$PORTFOLIO/planner-api" 2>/dev/null && pwd)" || PLANNER_DIR=""

# Splits a "../<repo>/<rest>" path into ($repo_abs, $file_relative_to_repo).
# Echoes "ABSDIR<TAB>FILE" or "<TAB>" when input is empty/null.
_split_repo_path() {
  local rel="$1"
  if [[ -z "$rel" || "$rel" == "null" ]]; then
    printf "\t"; return
  fi
  if [[ "$rel" =~ ^\.\./([^/]+)/(.+)$ ]]; then
    local repo="${BASH_REMATCH[1]}"
    local file="${BASH_REMATCH[2]}"
    local abs
    abs="$(cd "${PORTFOLIO}/../${repo}" 2>/dev/null && pwd)" || abs=""
    printf "%s\t%s" "$abs" "$file"
    return
  fi
  printf "\t%s" "$rel"
}

# Use ASCII unit separator (\x1f) instead of tab to avoid bash IFS collapsing
# multiple consecutive whitespace separators into one.
_US=$'\x1f'
SERVICE_REGISTRY=()
while IFS="$_US" read -r slug type display port compose_path makefile_path image extra container; do
  [[ -z "$type" || "$type" == "null" ]] && continue
  case "$type" in
    compose)
      pair=$(_split_repo_path "$compose_path")
      compose_dir="${pair%$'\t'*}"
      compose_file="${pair#*$'\t'}"
      SERVICE_REGISTRY+=("${display}|${port}|compose|${compose_dir}|${compose_file}|${extra}")
      ;;
    run)
      pair=$(_split_repo_path "$makefile_path")
      run_dir="${pair%$'\t'*}"
      SERVICE_REGISTRY+=("${display}|${port}|run|${run_dir}|${image}|${container}")
      ;;
    process)
      SERVICE_REGISTRY+=("${display}|${port}|process|||${extra}")
      ;;
  esac
done < <(
  jq -r --arg US "$_US" '
    .services[]
    | select(.hasBackend == true and .backend.orchestrator)
    | [
        .slug,
        .backend.orchestrator.type,
        .backend.orchestrator.displayName,
        (.backend.port | tostring),
        (.backend.composeFile // ""),
        (.backend.makefile // ""),
        (.backend.orchestrator.image // ""),
        (.backend.orchestrator.extra // ""),
        (.backend.container // "")
      ]
    | join($US)
  ' "$REGISTRY_FILE"
)

# Convenience: per-repo absolute paths used later (referenced by Makefile etc)
_pp() { local r="$1"; cd "$PORTFOLIO/../$r" 2>/dev/null && pwd || echo ""; }
TENDA_DIR="$(_pp tenda_online)"
DRAC_DIR="$(_pp Draculin-Backend)"
PROP_DIR="$(_pp subgrup-prop7.1)"
TFG_DIR="$(_pp TFG)"
BITSX_DIR="$(_pp bitsXlaMarato)"
PRO2_DIR="$(_pp pracpro2)"
PLANIF_DIR="$(_pp Practica_de_Planificacion)"
DESASTRES_DIR="$(_pp desastresIA)"
MPIDS_DIR="$(_pp projectA)"
PHASE_DIR="$(_pp projectA2)"
CAIM_DIR="$(_pp CAIM)"
JOCEDA_DIR="$(_pp joc_eda)"
SBCIA_DIR="$(_pp SBC_IA)"
PAR_DIR="$(_pp PAR)"
ROB_DIR="$(_pp ROB)"
FIB_DIR="$(_pp fib)"
GRAFICS_DIR="$(cd "$PORTFOLIO/../fib/G/web" 2>/dev/null && pwd)" || GRAFICS_DIR=""

# ── List mode: print "name:port" pairs (consumed by Makefile) ────────────
if [[ "$STOP_MODE" == 0 ]] && [[ "${LIST_MODE:-0}" == 1 ]]; then
  for entry in "${SERVICE_REGISTRY[@]}"; do
    IFS='|' read -r name port type dir file extra <<< "$entry"
    printf "%-18s :%s  (%s)%s\n" "$name" "$port" "$type" "${extra:+ $extra}"
  done
  exit 0
fi

# ── Health mode: curl each service ───────────────────────────────────────
if [[ "${HEALTH_MODE:-0}" == 1 ]]; then
  echo "Checking health of demo backends..."
  failed=0
  for entry in "${SERVICE_REGISTRY[@]}"; do
    IFS='|' read -r name port type dir file extra <<< "$entry"
    if curl -s --connect-timeout 2 "http://localhost:${port}/" >/dev/null 2>&1; then
      printf "\033[32m[OK]\033[0m   %-18s (port %s)\n" "$name" "$port"
    else
      printf "\033[31m[FAIL]\033[0m %-18s (port %s)\n" "$name" "$port"
      failed=1
    fi
  done
  if [ $failed -eq 1 ]; then echo -e "\nSome services appear to be down."; exit 1
  else echo -e "\nAll services are up and running!"; fi
  exit 0
fi

# ── Stop mode: tear down everything in parallel, then exit ───────────────
if [[ "$STOP_MODE" == 1 ]]; then
  echo "Stopping portfolio demo services..."
  fuser -k "${LOG_RELAY_PORT:-9999}/tcp" 2>/dev/null || true
  (
    for entry in "${SERVICE_REGISTRY[@]}"; do
      IFS='|' read -r name port type dir file extra <<< "$entry"
      case "$type" in
        compose)
          [[ -f "${dir}/${file}" ]] && \
            (cd "$dir" && docker compose -f "$file" down 2>/dev/null) &
          ;;
        run)
          docker rm -f "$extra" 2>/dev/null &  # extra = container name for run type
          ;;
        process)
          fuser -k "${port}/tcp" 2>/dev/null &
          ;;
      esac
    done
    wait
  )
  echo "Done."
  exit 0
fi

# ── Runtime state flags (only used by dev / cleanup) ─────────────────────
PLANNER_PID=""
PROP_PID=""
LOG_RELAY_PID=""

cleanup() {
  local ec=${1:-0}
  if [[ -n "${LOG_RELAY_PID}" ]] && kill -0 "$LOG_RELAY_PID" 2>/dev/null; then
    echo ""
    echo "Stopping log-relay (pid $LOG_RELAY_PID)..."
    kill "$LOG_RELAY_PID" 2>/dev/null || true
    wait "$LOG_RELAY_PID" 2>/dev/null || true
  fi
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
  # Stop all docker services in parallel
  (
    for entry in "${SERVICE_REGISTRY[@]}"; do
      IFS='|' read -r name port type dir file extra <<< "$entry"
      case "$type" in
        compose)
          [[ -f "${dir}/${file}" ]] && \
            (cd "$dir" && docker compose -f "$file" down) >/dev/null 2>&1 &
          ;;
        run)
          docker rm -f "$extra" >/dev/null 2>&1 &
          ;;
      esac
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

      # Method 4: Nuclear fallback — kill ANY process holding this port
      if ss -tlnH "sport = :${port}" 2>/dev/null | grep -q .; then
        fuser -k "${port}/tcp" 2>/dev/null \
          || sudo -n fuser -k "${port}/tcp" 2>/dev/null \
          || true
        sleep 0.3
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
    # Passes through SENTRY_* env vars so the per-backend SDKs (Phase 14) can
    # initialise themselves if PersonalPortfolio/.env.shared sets a DSN.
    # Uses SENTRY_DSN_DOCKER so `localhost`-based DSNs (e.g. Spotlight) are
    # auto-rewritten to `host.docker.internal` for the container.
    _docker_run() {
      local name="$1" url="$2" dir="$3" image="$4" port="$5" container="$6"
      local sentry_env=(
        -e "SENTRY_DSN=${SENTRY_DSN_DOCKER:-${SENTRY_DSN:-}}"
        -e "SENTRY_ENVIRONMENT=${SENTRY_ENVIRONMENT:-local-dev}"
        -e "SENTRY_TRACES_SAMPLE_RATE=${SENTRY_TRACES_SAMPLE_RATE:-1.0}"
        -e "SENTRY_RELEASE=${SENTRY_RELEASE:-local-dev}"
        --add-host=host.docker.internal:host-gateway
      )
      if [[ -d "${dir}" ]]; then
        echo "==> ${name}  ${url}  (docker run)"
        (
          docker rm -f "$container" 2>/dev/null || true
          _free_port "${port}"
          docker run -d --rm -p "${port}:${port}" "${sentry_env[@]}" --name "$container" "$image" 2>/dev/null || {
            echo "    [${name}] Building image first..." >&2
            (cd "$dir" && docker build -t "$image" .) >/dev/null 2>&1 && \
              docker run -d --rm -p "${port}:${port}" "${sentry_env[@]}" --name "$container" "$image" 2>/dev/null || \
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

# --- log-relay (SSE sidecar) ---
if [[ "$SKIP_LOG_RELAY" == 0 ]]; then
  if command -v node >/dev/null 2>&1; then
    LOG_RELAY_PORT="${LOG_RELAY_PORT:-9999}"
    echo "==> log-relay        http://127.0.0.1:${LOG_RELAY_PORT}  (debug overlay sink)"
    fuser -k "${LOG_RELAY_PORT}/tcp" 2>/dev/null || true
    (cd "$PORTFOLIO" && node scripts/log-relay/index.mjs --port "$LOG_RELAY_PORT") &
    LOG_RELAY_PID=$!
    echo ""
  else
    echo "==> log-relay skipped (node not installed)"
    echo ""
  fi
else
  echo "==> log-relay skipped (--skip-log-relay)"
  echo ""
fi

cd "$PORTFOLIO"
echo "==> Astro            http://localhost:4321"
echo ""
npm run dev
