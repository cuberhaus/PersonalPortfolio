.PHONY: install dev dev-all dev-planner build preview stop-all docker-build-all docker-rebuild-all clean test help

default: help

install: ## Install project dependencies
	npm install

dev: ## Start Astro dev server only (no backends)
	npm run dev

dev-all: ## Start Astro + ALL demo backends (Docker + planner-api + PROP)
	npm run dev:all

dev-planner: ## Start Astro + planner-api only (no Docker)
	npm run dev:with-planner

build: ## Build for production
	npm run build

preview: ## Preview the production build locally
	npm run preview

test: ## Run Vitest test suite
	npm test

PARENT := $(abspath $(dir $(MAKEFILE_LIST))..)
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
		echo "==> $(3) skipped (not found)"; \
	elif [ ! -f "$(STAMPS)/$(1)" ] || \
	     [ -n "$$(find "$(2)" $(FIND_EXCLUDES) -newer "$(STAMPS)/$(1)" -print -quit 2>/dev/null)" ]; then \
		echo "==> $(3)  [building]"; \
		$(4) && mkdir -p "$(STAMPS)" && touch "$(STAMPS)/$(1)"; \
	else \
		echo "==> $(3)  [up to date]"; \
	fi
endef

docker-build-all: ## Build Docker images for demos (skips unchanged)
	@echo "Building demo Docker images (incremental)..."
	$(call build_if_changed,tfg,$(PARENT)/TFG,TFG              :8082,\
		docker compose -f "$(PARENT)/TFG/docker-compose.yml" build)
	$(call build_if_changed,bitsx,$(PARENT)/bitsXlaMarato,bitsXlaMarato    :8001,\
		docker compose -f "$(PARENT)/bitsXlaMarato/docker-compose.yml" build)
	$(call build_if_changed,tenda,$(PARENT)/tenda_online,Tenda Online     :8888,\
		docker compose -f "$(PARENT)/tenda_online/docker/docker-compose.yml" build)
	$(call build_if_changed,draculin,$(PARENT)/Draculin-Backend,Draculin         :8890,\
		docker compose -f "$(PARENT)/Draculin-Backend/docker-compose.yml" build)
	$(call build_if_changed,pro2,$(PARENT)/pracpro2,pracpro2         :8000,\
		docker build -t pracpro2 "$(PARENT)/pracpro2")
	$(call build_if_changed,planif,$(PARENT)/Practica_de_Planificacion,Planificacion    :3000,\
		docker build -t practica-planificacion "$(PARENT)/Practica_de_Planificacion")
	$(call build_if_changed,desastres,$(PARENT)/desastresIA,DesastresIA      :8083,\
		docker compose -f "$(PARENT)/desastresIA/docker-compose.yml" build)
	$(call build_if_changed,mpids,$(PARENT)/projectA,MPIDS            :8084,\
		docker compose -f "$(PARENT)/projectA/docker-compose.yml" build)
	$(call build_if_changed,phase,$(PARENT)/projectA2,PhaseTransitions :8085,\
		docker compose -f "$(PARENT)/projectA2/docker-compose.yml" build)
	$(call build_if_changed,caim,$(PARENT)/CAIM,CAIM             :8086,\
		docker compose -f "$(PARENT)/CAIM/docker-compose.yml" build)
	$(call build_if_changed,joceda,$(PARENT)/joc_eda,JocEDA           :8087,\
		docker compose -f "$(PARENT)/joc_eda/docker-compose.yml" build)
	@echo "Done."

docker-rebuild-all: ## Force rebuild all Docker images (ignore cache)
	@rm -rf "$(STAMPS)"
	@$(MAKE) docker-build-all

stop-all: ## Stop all demo backend containers/services
	@echo "Stopping portfolio demo services..."
	-docker compose -f ../TFG/docker-compose.yml down 2>/dev/null
	-docker compose -f ../bitsXlaMarato/docker-compose.yml down 2>/dev/null
	-docker compose -f ../tenda_online/docker/docker-compose.yml down 2>/dev/null
	-docker compose -f ../Draculin-Backend/docker-compose.yml down 2>/dev/null
	-docker rm -f portfolio-pro2 2>/dev/null
	-docker rm -f portfolio-planif 2>/dev/null
	-docker compose -f ../desastresIA/docker-compose.yml down 2>/dev/null
	-docker compose -f ../projectA/docker-compose.yml down 2>/dev/null
	-docker compose -f ../projectA2/docker-compose.yml down 2>/dev/null
	-docker compose -f ../CAIM/docker-compose.yml down 2>/dev/null
	-docker compose -f ../joc_eda/docker-compose.yml down 2>/dev/null
	-fuser -k 8081/tcp 2>/dev/null
	-fuser -k 8765/tcp 2>/dev/null
	@echo "Done."

clean: ## Remove build artifacts and node_modules
	rm -rf dist/ node_modules/ .astro/ .build-stamps/

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Demo backends started by dev-all:"
	@echo "  TFG              :8082  (docker compose)"
	@echo "  bitsXlaMarato    :8001  (docker compose, GPU)"
	@echo "  pracpro2         :8000  (docker run)"
	@echo "  Planificacion    :3000  (docker run)"
	@echo "  Tenda            :8888  (docker compose)"
	@echo "  Draculin         :8890  (docker compose)"
	@echo "  DesastresIA      :8083  (docker compose)"
	@echo "  MPIDS            :8084  (docker compose)"
	@echo "  PhaseTransitions :8085  (docker compose)"
	@echo "  CAIM             :8086  (docker compose)"
	@echo "  JocEDA           :8087  (docker compose)"
	@echo "  PROP             :8081  (Spring Boot)"
	@echo "  planner-api      :8765  (ENHSP)"
