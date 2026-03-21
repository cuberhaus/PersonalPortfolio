.PHONY: install dev build preview clean help

# Default target when just running `make`
default: help

install: ## Install project dependencies
	npm install

dev: ## Start the Astro development server
	npm run dev

dev-all: ## Start the Astro development server and all demo backend services
	npm run dev:all

dev-planner: ## Start the Astro development server and the planner backend service
	npm run dev:with-planner

build: ## Build the project for production
	npm run build

preview: ## Preview the production build locally
	npm run preview

clean: ## Remove build artifacts and node_modules
	rm -rf dist/
	rm -rf node_modules/
	rm -rf .astro/

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
