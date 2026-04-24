# ─── Cross-platform support ────────────────────────────────────────
# On Windows, use Git Bash's sh.exe so POSIX utilities (find, rm,
# grep, awk, curl …) are available in recipe lines.
ifeq ($(OS),Windows_NT)
  SHELL := sh.exe
  .SHELLFLAGS := -c
endif

.PHONY: install dev dev-all build preview stop restart health \
       rebuild free-ports \
       clean test help \
       _db-tfg _db-bitsx _db-tenda _db-draculin _db-pro2 _db-planif \
       _db-desastres _db-mpids _db-phase _db-caim _db-joceda _db-sbcia \
       _db-rob _db-par _db-fib _db-grafics

default: help

install: ## Install project dependencies
	npm install
ifeq ($(OS),Windows_NT)
	@command -v go >/dev/null 2>&1 || echo "Go not found - install via:  choco install golang   OR   winget install GoLang.Go"
	@$(CARGO_ENV) command -v cargo >/dev/null 2>&1 || echo "Rust not found - install via:  choco install rustup.install   OR   winget install Rustlang.Rustup"
else
	@command -v go >/dev/null 2>&1 || { echo "Installing Go..."; sudo apt-get update && sudo apt-get install -y golang-go; }
	@$(CARGO_ENV) \
	command -v cargo >/dev/null 2>&1 || { echo "Installing Rust..."; curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; }
endif

dev: ## Start Astro dev server with hot-reload (no demo backends)
	npm run dev

# All ports used by demo backends (keep in sync with SERVICE_REGISTRY in dev-all-demos.sh)
DEMO_PORTS := 8888 8889 8890 8082 8001 8083 8084 8085 8086 8087 8088 8089 8092 8090 8093 8000 3000 8081 8765

free-ports: ## Kill any process occupying demo backend ports
	@echo "Freeing demo ports..."
	@for p in $(DEMO_PORTS); do \
		if ! ss -tlnH sport = :$$p 2>/dev/null | grep -q .; then continue; fi; \
		echo "  port $$p in use"; \
		cids=$$(docker ps -aq --filter "publish=$$p" 2>/dev/null); \
		[ -n "$$cids" ] && echo "$$cids" | xargs -r docker rm -f 2>/dev/null || true; \
		cids=$$(docker ps -a --format '{{.ID}} {{.Ports}}' 2>/dev/null \
			| grep -E "(^|[ ,])0\.0\.0\.0:([0-9]+-)?$$p(-[0-9]+)?->" \
			| awk '{print $$1}'); \
		[ -n "$$cids" ] && echo "$$cids" | xargs -r docker rm -f 2>/dev/null || true; \
		cgroup=$$(ss -tlnpe sport = :$$p 2>/dev/null | grep -oP 'docker-\K[a-f0-9]{64}' | head -1); \
		if [ -n "$$cgroup" ]; then \
			cid=$$(echo "$$cgroup" | cut -c1-12); \
			cname=$$(docker inspect --format '{{.Name}}' "$$cid" 2>/dev/null | sed 's|^/||'); \
			echo "    host-network container: $$cname ($$cid) — stopping..."; \
			docker stop "$$cid" 2>/dev/null && docker rm -f "$$cid" 2>/dev/null || true; \
		fi; \
		if ss -tlnH sport = :$$p 2>/dev/null | grep -q .; then \
			echo "    fuser -k $$p/tcp"; \
			fuser -k $$p/tcp 2>/dev/null || sudo -n fuser -k $$p/tcp 2>/dev/null || true; \
		fi; \
	done
	@echo "  waiting for ports to release..."
	@tries=0; while [ $$tries -lt 10 ]; do \
		busy=0; \
		for p in $(DEMO_PORTS); do \
			if ss -tlnH sport = :$$p 2>/dev/null | grep -q .; then busy=1; break; fi; \
		done; \
		[ $$busy -eq 0 ] && break; \
		tries=$$((tries + 1)); sleep 0.5; \
	done
	@stuck=""; for p in $(DEMO_PORTS); do \
		if ss -tlnH sport = :$$p 2>/dev/null | grep -q .; then stuck="$$stuck $$p"; fi; \
	done; \
	if [ -n "$$stuck" ]; then \
		echo "  ⚠ Could not free ports:$$stuck"; \
		echo "  Run: docker ps --format '{{.Names}}' | xargs docker stop"; \
		exit 1; \
	fi
	@echo "Done."

dev-all: free-ports ## Start Astro + ALL demo backends (Docker + planner-api + PROP)
	npm run dev:all

stop: ## Stop all demo backend containers/services
	@bash scripts/dev-all-demos.sh --stop

restart: stop dev-all ## Restart all demo backends and Astro dev server

health: ## Check if all demo backends are responding
	@bash scripts/dev-all-demos.sh --health

build: ## Build Astro site for production and all demo Docker images
	@echo ""
	@echo "━━━ Building $(words $(DEMO_TARGETS)) demo Docker images ($(NPROC) parallel) ━━━"
	@echo ""
	@START=$$(date +%s); \
	$(MAKE) --no-print-directory $(DEMO_TARGETS) -j$(NPROC); \
	rc=$$?; \
	END=$$(date +%s); \
	ELAPSED=$$((END - START)); \
	MIN=$$((ELAPSED / 60)); SEC=$$((ELAPSED % 60)); \
	echo ""; \
	if [ $$rc -eq 0 ]; then \
		echo "✅ All demo images ready  ($${MIN}m $${SEC}s)"; \
	else \
		echo "❌ Docker builds failed  ($${MIN}m $${SEC}s)"; exit $$rc; \
	fi
	@echo ""
	@echo "━━━ Building Astro site ━━━"
	@echo ""
	npm run build

rebuild: ## Force rebuild all Docker images (ignore cache) and Astro site
	@rm -rf "$(STAMPS)" dist/
	+@$(MAKE) build DOCKER_BUILD_OPTS="--no-cache --pull"

preview: ## Serve the built static site from dist/ to verify production behavior
	npm run preview

test: ## Run ALL test suites (portfolio + every demo backend)
	npm test
	npx playwright test
	@echo ""
	@echo "=== Python backends (pytest) ==="
	cd "$(PARENT)/projectA/web"   && $(SYS_PYTHON) -m pytest backend/test_app.py -v
	cd "$(PARENT)/desastresIA/web" && $(SYS_PYTHON) -m pytest backend/test_app.py -v
	cd "$(PARENT)/projectA2/web"  && $(SYS_PYTHON) -m pytest backend/test_app.py -v
	cd "$(PARENT)/CAIM/web"       && $(SYS_PYTHON) -m pytest backend/test_app.py -v
	cd "$(PARENT)/bitsXlaMarato/web/backend" && $(SYS_PYTHON) -m pytest test_app.py -v
	cd "$(PARENT)/SBC_IA/web"     && $(SYS_PYTHON) -m pytest backend/test_app.py -v
	cd "$(PARENT)/TFG/backend"    && $(SYS_PYTHON) -m pytest test_main.py -v
	cd "planner-api"              && $(SYS_PYTHON) -m pytest tests/ -v
	@echo ""
	@echo "=== Django (Draculin) ==="
	cd "$(PARENT)/Draculin-Backend" && $(SYS_PYTHON) manage.py test dracu -v2
	@echo ""
	@echo "=== Go (joc_eda) ==="
	@if command -v go >/dev/null 2>&1; then \
		cd "$(PARENT)/joc_eda/web/backend-go" && go test -v ./...; \
	else \
		echo "SKIP: go not found"; \
	fi
	@echo ""
	@echo "=== Rust (pracpro2) ==="
	@$(CARGO_ENV) \
	if command -v cargo >/dev/null 2>&1; then \
		cd "$(PARENT)/pracpro2/web/backend" && cargo test --verbose; \
	else \
		echo "SKIP: cargo not found"; \
	fi
	@echo ""
	@echo "=== JS (Planificacion) ==="
	cd "$(PARENT)/Practica_de_Planificacion/web" && npx vitest run
	@echo ""
	@echo "All test suites passed."

clean: ## Remove build artifacts and node_modules
	rm -rf dist/ node_modules/ .astro/ .build-stamps/

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Demo backends started by dev-all:"
	@bash scripts/dev-all-demos.sh --list

PARENT := $(abspath $(dir $(MAKEFILE_LIST))..)

# Ensure pytest commands use the system Python, not an accidentally activated venv
unexport VIRTUAL_ENV
ifeq ($(OS),Windows_NT)
  SYS_PYTHON := $(shell PATH="$$(echo "$$PATH" | tr ':' '\n' | grep -v '\.venv' | tr '\n' ':')" which python 2>/dev/null || echo python)
  NPROC      := $(or $(NUMBER_OF_PROCESSORS),4)
  CARGO_ENV  := . "$(HOME)/.cargo/env" 2>/dev/null;
else
  SYS_PYTHON := $(shell PATH="$$(echo "$$PATH" | tr ':' '\n' | grep -v '\.venv' | tr '\n' ':')" which python)
  NPROC      := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
  CARGO_ENV  := . "$(HOME)/.local/share/cargo/env" 2>/dev/null;
endif

STAMPS := .build-stamps
FIND_EXCLUDES := -not -path '*/node_modules/*' \
                 -not -path '*/.git/*' \
                 -not -path '*/dist/*' \
                 -not -path '*/__pycache__/*' \
                 -not -path '*/.next/*' \
                 -not -path '*/build/*' \
                 -not -path '*/.astro/*' \
                 -not -path '*/.gradle/*' \
                 -not -path '*/target/*' \
                 -not -name '*.pyc'

# $(1)=stamp name  $(2)=source dir  $(3)=label  $(4)=build command
define build_if_changed
	@if [ ! -d "$(2)" ]; then \
		echo "  ⏭  $(3) skipped (not found)"; \
	elif [ ! -f "$(STAMPS)/$(1)" ] || \
	     [ -n "$$(find "$(2)" $(FIND_EXCLUDES) -newer "$(STAMPS)/$(1)" -print -quit 2>/dev/null)" ]; then \
		echo "  🔨 $(3)  building…"; \
		S=$$(date +%s); \
		if $(4); then \
			mkdir -p "$(STAMPS)" && touch "$(STAMPS)/$(1)"; \
			E=$$(date +%s); D=$$((E - S)); \
			echo "  ✅ $(3)  done ($${D}s)"; \
		else \
			E=$$(date +%s); D=$$((E - S)); \
			echo "  ❌ $(3)  FAILED ($${D}s)"; \
			exit 1; \
		fi; \
	else \
		echo "  ✔  $(3)  up to date"; \
	fi
endef

# Use cached base images by default; 'make rebuild' pulls fresh ones
DOCKER_BUILD_OPTS ?=

DEMO_TARGETS := _db-tfg _db-bitsx _db-tenda _db-draculin _db-pro2 _db-planif \
                _db-desastres _db-mpids _db-phase _db-caim _db-joceda _db-sbcia \
                _db-rob _db-par _db-fib _db-grafics

_db-tfg:
	$(call build_if_changed,tfg,$(PARENT)/TFG,TFG              :8082,\
		docker compose -f "$(PARENT)/TFG/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-bitsx:
	$(call build_if_changed,bitsx,$(PARENT)/bitsXlaMarato,bitsXlaMarato    :8001,\
		docker compose -f "$(PARENT)/bitsXlaMarato/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-tenda:
	$(call build_if_changed,tenda,$(PARENT)/tenda_online,Tenda Online     :8888,\
		docker compose -f "$(PARENT)/tenda_online/docker/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-draculin:
	$(call build_if_changed,draculin,$(PARENT)/Draculin-Backend,Draculin         :8890,\
		docker compose -f "$(PARENT)/Draculin-Backend/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-pro2:
	$(call build_if_changed,pro2,$(PARENT)/pracpro2,pracpro2         :8000,\
		docker build $(DOCKER_BUILD_OPTS) -t pracpro2 "$(PARENT)/pracpro2")
_db-planif:
	$(call build_if_changed,planif,$(PARENT)/Practica_de_Planificacion,Planificacion    :3000,\
		docker build $(DOCKER_BUILD_OPTS) -t practica-planificacion "$(PARENT)/Practica_de_Planificacion")
_db-desastres:
	$(call build_if_changed,desastres,$(PARENT)/desastresIA,DesastresIA      :8083,\
		docker compose -f "$(PARENT)/desastresIA/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-mpids:
	$(call build_if_changed,mpids,$(PARENT)/projectA,MPIDS            :8084,\
		docker compose -f "$(PARENT)/projectA/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-phase:
	$(call build_if_changed,phase,$(PARENT)/projectA2,PhaseTransitions :8085,\
		docker compose -f "$(PARENT)/projectA2/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-caim:
	$(call build_if_changed,caim,$(PARENT)/CAIM,CAIM             :8086,\
		docker compose -f "$(PARENT)/CAIM/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-joceda:
	$(call build_if_changed,joceda,$(PARENT)/joc_eda,JocEDA           :8087,\
		docker compose -f "$(PARENT)/joc_eda/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-sbcia:
	$(call build_if_changed,sbcia,$(PARENT)/SBC_IA,SBC_IA           :8088,\
		docker compose -f "$(PARENT)/SBC_IA/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-rob:
	$(call build_if_changed,rob,$(PARENT)/ROB,ROB              :8092,\
		docker compose -f "$(PARENT)/ROB/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-par:
	$(call build_if_changed,par,$(PARENT)/PAR,PAR              :8089,\
		docker compose -f "$(PARENT)/PAR/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-fib:
	$(call build_if_changed,fib,$(PARENT)/fib,FIB              :8090,\
		docker compose -f "$(PARENT)/fib/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-grafics:
	$(call build_if_changed,grafics,$(PARENT)/fib/G/web,Grafics          :8093,\
		docker compose -f "$(PARENT)/fib/G/web/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
