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

TENDA_UP=0
DRAC_UP=0
TFG_UP=0
BITSX_UP=0
PRO2_CID=""
PLANIF_CID=""
DESASTRES_UP=0
MPIDS_UP=0
PHASE_UP=0
CAIM_UP=0
JOCEDA_UP=0
SBCIA_UP=0
PAR_UP=0
ROB_UP=0
FIB_UP=0
GRAFICS_UP=0
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
  if [[ "$TENDA_UP" == 1 ]] && [[ -f "${TENDA_DIR}/docker/docker-compose.yml" ]]; then
    echo "Stopping Tenda stack (docker compose down)..."
    (cd "$TENDA_DIR" && docker compose -f docker/docker-compose.yml down) >/dev/null 2>&1 || true
  fi
  if [[ "$DRAC_UP" == 1 ]] && [[ -f "${DRAC_DIR}/docker-compose.yml" ]]; then
    echo "Stopping Draculin stack (docker compose down)..."
    (cd "$DRAC_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$TFG_UP" == 1 ]] && [[ -f "${TFG_DIR}/docker-compose.yml" ]]; then
    echo "Stopping TFG stack (docker compose down)..."
    (cd "$TFG_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$BITSX_UP" == 1 ]] && [[ -f "${BITSX_DIR}/docker-compose.yml" ]]; then
    echo "Stopping bitsXlaMarato stack (docker compose down)..."
    (cd "$BITSX_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ -n "${PRO2_CID}" ]]; then
    echo "Stopping pracpro2 container..."
    docker rm -f "$PRO2_CID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${PLANIF_CID}" ]]; then
    echo "Stopping Practica_de_Planificacion container..."
    docker rm -f "$PLANIF_CID" >/dev/null 2>&1 || true
  fi
  if [[ "$DESASTRES_UP" == 1 ]] && [[ -f "${DESASTRES_DIR}/docker-compose.yml" ]]; then
    echo "Stopping DesastresIA stack (docker compose down)..."
    (cd "$DESASTRES_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$MPIDS_UP" == 1 ]] && [[ -f "${MPIDS_DIR}/docker-compose.yml" ]]; then
    echo "Stopping MPIDS stack (docker compose down)..."
    (cd "$MPIDS_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$PHASE_UP" == 1 ]] && [[ -f "${PHASE_DIR}/docker-compose.yml" ]]; then
    echo "Stopping PhaseTransitions stack (docker compose down)..."
    (cd "$PHASE_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$CAIM_UP" == 1 ]] && [[ -f "${CAIM_DIR}/docker-compose.yml" ]]; then
    echo "Stopping CAIM stack (docker compose down)..."
    (cd "$CAIM_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$JOCEDA_UP" == 1 ]] && [[ -f "${JOCEDA_DIR}/docker-compose.yml" ]]; then
    echo "Stopping JocEDA stack (docker compose down)..."
    (cd "$JOCEDA_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$SBCIA_UP" == 1 ]] && [[ -f "${SBCIA_DIR}/docker-compose.yml" ]]; then
    echo "Stopping SBC_IA stack (docker compose down)..."
    (cd "$SBCIA_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$PAR_UP" == 1 ]] && [[ -f "${PAR_DIR}/docker-compose.yml" ]]; then
    echo "Stopping PAR stack (docker compose down)..."
    (cd "$PAR_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$ROB_UP" == 1 ]] && [[ -f "${ROB_DIR}/docker-compose.yml" ]]; then
    echo "Stopping ROB stack (docker compose down)..."
    (cd "$ROB_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$FIB_UP" == 1 ]] && [[ -f "${FIB_DIR}/docker-compose.yml" ]]; then
    echo "Stopping FIB stack (docker compose down)..."
    (cd "$FIB_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  if [[ "$GRAFICS_UP" == 1 ]] && [[ -f "${GRAFICS_DIR}/docker-compose.yml" ]]; then
    echo "Stopping Grafics stack (docker compose down)..."
    (cd "$GRAFICS_DIR" && docker compose down) >/dev/null 2>&1 || true
  fi
  exit "$ec"
}
trap 'cleanup $?' EXIT INT TERM

# --- Docker: Tenda (PHP) + Draculin (Django + Flutter) ---
if [[ "$SKIP_DOCKER" == 0 ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "==> Docker not installed — skipping Tenda (:8888) & Draculin (:8890)"
  else
    if [[ -f "${TENDA_DIR}/docker/docker-compose.yml" ]]; then
      echo "==> Tenda Online     http://localhost:8888  (docker compose)"
      if (cd "$TENDA_DIR" && docker compose -f docker/docker-compose.yml up -d); then
        TENDA_UP=1
      else
        echo "    warning: Tenda docker compose failed (is Docker running?)" >&2
      fi
    else
      echo "==> Tenda skipped    (no ../tenda_online/docker/docker-compose.yml)"
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

    # TFG — React + FastAPI polyp detection dashboard
    if [[ -f "${TFG_DIR}/docker-compose.yml" ]]; then
      echo "==> TFG              http://localhost:8082  (docker compose)"
      if (cd "$TFG_DIR" && docker compose up -d); then
        TFG_UP=1
      else
        echo "    warning: TFG docker compose failed" >&2
      fi
    else
      echo "==> TFG skipped      (no ../TFG/docker-compose.yml)"
    fi

    # bitsXlaMarato — Angular + FastAPI aorta viewer (GPU)
    if [[ -f "${BITSX_DIR}/docker-compose.yml" ]]; then
      echo "==> bitsXlaMarato    http://localhost:8001  (docker compose, GPU)"
      if (cd "$BITSX_DIR" && docker compose up -d); then
        BITSX_UP=1
      else
        echo "    warning: bitsXlaMarato docker compose failed (GPU required)" >&2
      fi
    else
      echo "==> bitsXlaMarato skipped (no ../bitsXlaMarato/docker-compose.yml)"
    fi

    # pracpro2 — Vue + D3 + Rust/Axum phylogenetic tree
    if [[ -d "${PRO2_DIR}" ]]; then
      echo "==> pracpro2         http://localhost:8000  (docker run)"
      PRO2_CID=$(docker run -d --rm -p 8000:8000 --name portfolio-pro2 pracpro2 2>/dev/null) || {
        echo "    Building pracpro2 image first..."
        (cd "$PRO2_DIR" && docker build -t pracpro2 .) >/dev/null 2>&1 && \
          PRO2_CID=$(docker run -d --rm -p 8000:8000 --name portfolio-pro2 pracpro2 2>/dev/null) || \
          echo "    warning: pracpro2 docker run failed" >&2
      }
    else
      echo "==> pracpro2 skipped (no ../pracpro2/)"
    fi

    # Practica_de_Planificacion — SvelteKit + Metric-FF
    if [[ -d "${PLANIF_DIR}" ]]; then
      echo "==> Planificacion    http://localhost:3000  (docker run)"
      PLANIF_CID=$(docker run -d --rm -p 3000:3000 --name portfolio-planif practica-planificacion 2>/dev/null) || {
        echo "    Building practica-planificacion image first..."
        (cd "$PLANIF_DIR" && docker build -t practica-planificacion .) >/dev/null 2>&1 && \
          PLANIF_CID=$(docker run -d --rm -p 3000:3000 --name portfolio-planif practica-planificacion 2>/dev/null) || \
          echo "    warning: practica-planificacion docker run failed" >&2
      }
    else
      echo "==> Planificacion skipped (no ../Practica_de_Planificacion/)"
    fi

    # desastresIA — Solid.js + FastAPI local search solver
    if [[ -f "${DESASTRES_DIR}/docker-compose.yml" ]]; then
      echo "==> DesastresIA       http://localhost:8083  (docker compose)"
      if (cd "$DESASTRES_DIR" && docker compose up -d); then
        DESASTRES_UP=1
      else
        echo "    warning: DesastresIA docker compose failed" >&2
      fi
    else
      echo "==> DesastresIA skipped (no ../desastresIA/docker-compose.yml)"
    fi

    # projectA — Preact + D3 + FastAPI MPIDS solver
    if [[ -f "${MPIDS_DIR}/docker-compose.yml" ]]; then
      echo "==> MPIDS            http://localhost:8084  (docker compose)"
      if (cd "$MPIDS_DIR" && docker compose up -d); then
        MPIDS_UP=1
      else
        echo "    warning: MPIDS docker compose failed" >&2
      fi
    else
      echo "==> MPIDS skipped (no ../projectA/docker-compose.yml)"
    fi

    # projectA2 — Lit + Canvas + D3 + FastAPI phase transitions
    if [[ -f "${PHASE_DIR}/docker-compose.yml" ]]; then
      echo "==> PhaseTransitions http://localhost:8085  (docker compose)"
      if (cd "$PHASE_DIR" && docker compose up -d); then
        PHASE_UP=1
      else
        echo "    warning: PhaseTransitions docker compose failed" >&2
      fi
    else
      echo "==> PhaseTransitions skipped (no ../projectA2/docker-compose.yml)"
    fi

    # CAIM — Vanilla TS + D3 + FastAPI IR explorer
    if [[ -f "${CAIM_DIR}/docker-compose.yml" ]]; then
      echo "==> CAIM             http://localhost:8086  (docker compose)"
      if (cd "$CAIM_DIR" && docker compose up -d); then
        CAIM_UP=1
      else
        echo "    warning: CAIM docker compose failed" >&2
      fi
    else
      echo "==> CAIM skipped (no ../CAIM/docker-compose.yml)"
    fi

    # JocEDA — Mithril.js + Canvas game viewer
    if [[ -f "${JOCEDA_DIR}/docker-compose.yml" ]]; then
      echo "==> JocEDA           http://localhost:8087  (docker compose)"
      if (cd "$JOCEDA_DIR" && docker compose up -d); then
        JOCEDA_UP=1
      else
        echo "    warning: JocEDA docker compose failed" >&2
      fi
    else
      echo "==> JocEDA skipped (no ../joc_eda/docker-compose.yml)"
    fi

    # SBC_IA — HTMX + Alpine.js trip planner expert system
    if [[ -f "${SBCIA_DIR}/docker-compose.yml" ]]; then
      echo "==> SBC_IA           http://localhost:8088  (docker compose)"
      if (cd "$SBCIA_DIR" && docker compose up -d); then
        SBCIA_UP=1
      else
        echo "    warning: SBC_IA docker compose failed" >&2
      fi
    else
      echo "==> SBC_IA skipped (no ../SBC_IA/docker-compose.yml)"
    fi

    # PAR — Preact + Canvas + WASM parallel computing visualiser
    if [[ -f "${PAR_DIR}/docker-compose.yml" ]]; then
      echo "==> PAR              http://localhost:8089  (docker compose)"
      if (cd "$PAR_DIR" && docker compose up -d); then
        PAR_UP=1
      else
        echo "    warning: PAR docker compose failed" >&2
      fi
    else
      echo "==> PAR skipped (no ../PAR/docker-compose.yml)"
    fi

    # ROB — Ember.js + Babylon.js robotics dashboard
    if [[ -f "${ROB_DIR}/docker-compose.yml" ]]; then
      echo "==> ROB              http://localhost:8092  (docker compose)"
      if (cd "$ROB_DIR" && docker compose up -d); then
        ROB_UP=1
      else
        echo "    warning: ROB docker compose failed" >&2
      fi
    else
      echo "==> ROB skipped (no ../ROB/docker-compose.yml)"
    fi

    # fib — Qwik + Canvas algorithm visualizer
    if [[ -f "${FIB_DIR}/docker-compose.yml" ]]; then
      echo "==> FIB              http://localhost:8090  (docker compose)"
      if (cd "$FIB_DIR" && docker compose up -d); then
        FIB_UP=1
      else
        echo "    warning: FIB docker compose failed" >&2
      fi
    else
      echo "==> FIB skipped (no ../fib/docker-compose.yml)"
    fi

    # Grafics — Vanilla TS + Vite + WebGL2 shader playground
    if [[ -f "${GRAFICS_DIR}/docker-compose.yml" ]]; then
      echo "==> Grafics          http://localhost:8093  (docker compose)"
      if (cd "$GRAFICS_DIR" && docker compose up -d); then
        GRAFICS_UP=1
      else
        echo "    warning: Grafics docker compose failed" >&2
      fi
    else
      echo "==> Grafics skipped (no ../fib/G/web/docker-compose.yml)"
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
