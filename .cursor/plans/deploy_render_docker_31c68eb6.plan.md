---
name: Deploy Render Docker
overview: Dockerize the Practica_de_Planificacion SvelteKit app for deployment on Render, using a multi-stage Dockerfile that compiles Metric-FF, builds SvelteKit with adapter-node, and bundles everything into a lean runtime image with Node.js + Python3.
todos:
  - id: adapter-node
    content: Install adapter-node and update svelte.config.js
    status: completed
  - id: dockerfile
    content: Create multi-stage Dockerfile (planner compile, SvelteKit build, runtime)
    status: completed
  - id: dockerignore
    content: Create .dockerignore
    status: completed
  - id: render-yaml
    content: Create render.yaml for Render Blueprint deploy
    status: completed
  - id: makefile
    content: Add docker-build and docker-run targets to Makefile
    status: completed
isProject: false
---

# Deploy Practica de Planificacion on Render

## Why Docker is necessary here

The app needs three runtimes that Render's native Node.js environment doesn't provide:

- **Node.js** for SvelteKit
- **Python3** for `generator.py` (PDDL problem generation)
- **gcc/flex/bison** to compile **Metric-FF** (C planner binary)

Docker bundles all three cleanly into one image.

## Container filesystem layout

```
/app/
  Basico/            # PDDL exercise directories (copied from repo)
  Extension_1/ ... Extension_4/
  Extra_2/
  web/
    build/           # SvelteKit adapter-node output
    generator.py     # Python PDDL generator
    tools/metric-ff/ff  # Compiled planner binary
    node_modules/    # Production deps only
    package.json
```

Working directory is `/app/web`, which keeps all existing `path.resolve('..')` references in `[web/src/lib/server/files.ts](Practica_de_Planificacion/web/src/lib/server/files.ts)` and `[web/src/lib/server/planner.ts](Practica_de_Planificacion/web/src/lib/server/planner.ts)` correct without code changes.

## Changes

### 1. Switch to adapter-node

Replace `@sveltejs/adapter-auto` with `@sveltejs/adapter-node` in:

- `[web/package.json](Practica_de_Planificacion/web/package.json)` -- swap the dependency
- `[web/svelte.config.js](Practica_de_Planificacion/web/svelte.config.js)` -- change the import

### 2. Create `Dockerfile`

Multi-stage build at `[Practica_de_Planificacion/Dockerfile](Practica_de_Planificacion/Dockerfile)`:

- **Stage 1 (planner)**: Debian slim, install gcc/flex/bison, clone and compile Metric-FF (reuses the same sed fixes from `install-planner.sh`)
- **Stage 2 (build)**: Node 22 slim, `npm ci`, `npm run build` (produces `web/build/`)
- **Stage 3 (runtime)**: Node 22 slim + python3, copy `web/build/`, `web/node_modules/` (prod), `web/generator.py`, `web/tools/metric-ff/ff`, and the PDDL directories. Entry: `node build/index.js`

Expected image size: ~250MB (Node slim + Python3 + small binary).

### 3. Create `.dockerignore`

At `[Practica_de_Planificacion/.dockerignore](Practica_de_Planificacion/.dockerignore)` to exclude `node_modules/`, `.svelte-kit/`, `web/tools/`, `*.zip`, `.git`.

### 4. Create `render.yaml`

At `[Practica_de_Planificacion/render.yaml](Practica_de_Planificacion/render.yaml)` for one-click Render Blueprint deploy:

```yaml
services:
  - type: web
    name: practica-planificacion
    runtime: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: PORT
        value: 3000
```

### 5. Add Makefile targets

Add `docker-build` and `docker-run` to `[Practica_de_Planificacion/Makefile](Practica_de_Planificacion/Makefile)` for local testing:

```makefile
docker-build: ## Build Docker image
	docker build -t practica-planificacion .

docker-run: ## Run Docker container locally (bind-mounts PDDL dirs for persistence)
	docker run --rm -p 3000:3000 \
	  -v $(PWD)/Basico:/app/Basico \
	  -v $(PWD)/Extension_1:/app/Extension_1 \
	  -v $(PWD)/Extension_2:/app/Extension_2 \
	  -v $(PWD)/Extension_3:/app/Extension_3 \
	  -v $(PWD)/Extension_4:/app/Extension_4 \
	  -v $(PWD)/Extra_2:/app/Extra_2 \
	  practica-planificacion
```

## Render considerations

- **Free tier**: 512MB RAM, service spins down after 15min of inactivity (~30s cold start). Sufficient for this app.
- **Ephemeral filesystem**: PDDL file edits are lost on redeploy (confirmed acceptable).
- **PORT env var**: Render sets `PORT` automatically; adapter-node respects it by default.

