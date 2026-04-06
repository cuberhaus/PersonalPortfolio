.PHONY: install dev dev-all dev-planner build preview stop-all clean test help

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

stop-all: ## Stop all demo backend containers/services
	@echo "Stopping portfolio demo services..."
	-docker compose -f ../TFG/docker-compose.yml down 2>/dev/null
	-docker compose -f ../bitsXlaMarato/docker-compose.yml down 2>/dev/null
	-docker compose -f ../tenda_online/docker/docker-compose.yml down 2>/dev/null
	-docker compose -f ../Draculin-Backend/docker-compose.yml down 2>/dev/null
	-docker rm -f portfolio-pro2 2>/dev/null
	-docker rm -f portfolio-planif 2>/dev/null
	-fuser -k 8081/tcp 2>/dev/null
	-fuser -k 8765/tcp 2>/dev/null
	@echo "Done."

clean: ## Remove build artifacts and node_modules
	rm -rf dist/ node_modules/ .astro/

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
	@echo "  PROP             :8081  (Spring Boot)"
	@echo "  planner-api      :8765  (ENHSP)"
