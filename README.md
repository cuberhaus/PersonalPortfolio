# Personal Portfolio

**Live:** [polcasacubertagil.me](https://polcasacubertagil.me)

Dark-themed portfolio built with **[Astro 5](https://astro.build)** and **React 19** islands for 20 interactive demos. Three-locale i18n (EN / ES / CA). Deployed to **GitHub Pages** via Actions.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Astro 5.18, TypeScript strict |
| Interactive UI | React 19 islands (`client:visible` / `client:load`) |
| Visualisation | D3, Canvas, WebGL2, Babylon.js |
| CV demos | Web Workers, OpenCV.js, WASM |
| i18n | 3 locales — file-based routing (`/`, `/es/`, `/ca/`) |
| Testing | Vitest 4 (30 unit suites, 516 tests) · Playwright (3 e2e specs, 141 tests) |

## Getting started

```bash
make install             # npm install + Go/Rust toolchains
make dev                 # Astro only — http://localhost:4321
make dev-all             # All local demo backends + Astro (see below)
make build               # Build all Docker images + Astro static site
make preview             # Serve dist/ locally
make test                # Run ALL test suites (Vitest + Playwright + backend pytests + Go + Rust + …)
make clean               # Remove dist/, node_modules/, .astro/, .build-stamps/
make help                # Show all available targets
```

### `make dev-all`

One command starts everything the demos can use locally (then **Ctrl+C** tears it all down). Use `make stop` to tear down leftover containers, and `make health` to verify all backends are responding.

| Service | Port | Demo | Source |
|---------|------|------|--------|
| Tenda | 8888 | `/demos/tenda` | `../tenda_online` — Docker |
| Draculin | 8889 (API) / 8890 (web) | `/demos/draculin` | `../Draculin-Backend` — Docker |
| TFG | 8082 | `/demos/tfg-polyps` | `../TFG` — Docker |
| BitsXLaMarató | 8001 | `/demos/bitsx-marato` | `../bitsXlaMarato` — Docker (GPU) |
| Pro2 | 8000 | `/demos/pro2` | `../pracpro2` — Docker |
| Planificación | 3000 | `/demos/planificacion` | `../Practica_de_Planificacion` — Docker |
| Desastres IA | 8083 | `/demos/desastres-ia` | `../desastresIA` — Docker |
| MPIDS | 8084 | `/demos/mpids` | `../MD` — Docker |
| Phase Transitions | 8085 | `/demos/phase-transitions` | `../MD2` — Docker |
| CAIM | 8086 | `/demos/caim` | `../CAIM` — Docker |
| Joc EDA | 8087 | `/demos/joc-eda` | `../joc_eda` — Docker |
| SBC IA | 8088 | `/demos/sbc-ia` | `../SBC_IA` — Docker |
| PAR | 8089 | `/demos/par-parallel` | `../PAR` — Docker |
| FIB Algorithms | 8090 | `/demos/algorithms` | `../fib` — Docker |
| ROB Robotics | 8092 | `/demos/rob-robotics` | `../ROB` — Docker |
| Grafics | 8093 | `/demos/grafics` | — Docker |
| PROP | 8081 | `/demos/prop` | `../subgrup-prop7.1` — Spring Boot |
| planner-api | 8765 | `/demos/planificacion` Run planner | `planner-api/` (in this repo) — Python + Java 17+ |
| **Astro** | 4321 | Site | this repo |

Requires **bash** and **Docker**. Missing sibling repos are silently skipped. `planner-api/` ships with this project.

Flags: `--skip-docker`, `--skip-planner`.

**Windows:** use **WSL** or **Git Bash**, or start each stack manually.

Optional env (copy from `.env.example`):

| Variable | Purpose |
|----------|---------|
| `PUBLIC_PLANNER_URL` | Base URL of [planner-api](planner-api/) for `/demos/planificacion` **Run planner** (production builds; dev defaults to `http://127.0.0.1:8765`) |

## Demo pages

Routes live under `/demos/<slug>/` (and `/es/demos/<slug>/`, `/ca/demos/<slug>/`). Demo cards on the homepage are driven by `src/data/demos.json` (+ `.es.json`, `.ca.json`).

| Slug | Demo | Browser-only | Notes |
|------|------|:------------:|-------|
| `tfg-polyps` | Polyp Detection (Bachelor's Thesis) | ✓ | Model comparison table + mock inference; full Faster R-CNN via backend |
| `draculin` | Draculin | Mock on Pages | Flutter embed in dev; React mock on Pages |
| `bitsx-marato` | BitsXLaMarató — Aorta | ✓ | Mock overlay + diameter explorer; full Mask R-CNN via backend |
| `matriculas` | License Plate Detection | ✓ | CV pipeline in a Web Worker (OpenCV.js) |
| `joc-eda` | Programming Game Viewer | ✓ | Replay upload / viewer (Mithril.js + Canvas) |
| `jsbach` | JSBach Interpreter | ✓ | Custom ANTLR4 language + Web Audio |
| `tenda` | Tenda Online | Mock on Pages | Real PHP app in iframe when backend runs |
| `pro2` | WPGMA Clustering | ✓ | Phylogenetic tree builder (D3) |
| `mpids` | MPIDS Solver | ✓ | Graph MDS + greedy / local search (D3) |
| `phase-transitions` | Graph Phase Transitions | ✓ | Percolation / connectivity experiments (Canvas) |
| `planificacion` | Travel Agency (PDDL) | Partially | Browse PDDL + **Run planner** if API is up |
| `desastres-ia` | Desastres IA | ✓ | HC + SA on toy instance in browser; full solver via backend |
| `apa-practica` | ML — Hypothyroid (k-NN) | ✓ | Interactive k-NN on a 2D data slice (Canvas) |
| `prop` | Recommendation System | ✓ | Mock on Pages; full Spring Boot app via backend |
| `caim` | CAIM IR Explorer | ✓ | TF-IDF + PageRank + Zipf tabs (D3) |
| `sbc-ia` | Trip Planner (Expert System) | ✓ | HTMX + Alpine.js; full Litestar app via backend |
| `par-parallel` | Parallel Computing Labs | ✓ | C/OpenMP kernels compiled to WASM (Preact + Canvas) |
| `rob-robotics` | Robotics Dashboard | ✓ | Ember.js + Babylon.js; EKF visualisation |
| `algorithms` | Algorithm Visualizer | ✓ | Qwik + Canvas; sorting & graph algorithms |
| `grafics` | Computer Graphics Shaders | ✓ | WebGL2 / GLSL shader playground |

### Planificación — live planner (ENHSP)

The [planificación demo](src/pages/demos/planificacion.astro) can solve PDDL via **`POST /plan`** on a small FastAPI service (**ENHSP**, not stock Fast Downward — no `:fluents` support there). See [`planner-api/README.md`](planner-api/README.md) for setup, Docker, and production deployment.

## Testing

```bash
make test   # runs everything: Vitest + Playwright + backend pytests + Go + Rust + JS
```

`make test` runs, in order:

1. **Vitest** — 30 unit suites, 516 tests ([`vitest.config.ts`](vitest.config.ts))
2. **Playwright** — 3 e2e specs, 141 tests ([`playwright.config.ts`](playwright.config.ts), auto-starts dev server)
3. **pytest** — backend tests for TFG, bitsXlaMarato, desastresIA, MPIDS, Phase Transitions, CAIM, SBC_IA, planner-api, Draculin (Django)
4. **Go** — joc_eda backend
5. **Rust (cargo test)** — pracpro2 backend
6. **Vitest (JS)** — Planificación web

## Project layout

```
Makefile              # All workflows: dev, build, test, stop, health, clean
planner-api/          # FastAPI + ENHSP for planificación demo
scripts/              # dev-all-demos.sh orchestrator
e2e/                  # Playwright e2e specs
src/
  __tests__/          # 30 Vitest unit test files
  components/         # Astro layout components (Navbar, Hero, Contact, …)
  components/demos/   # React demo components (one per demo)
  data/               # JSON data files + i18n variants (.es.json, .ca.json)
  i18n/               # ui.ts, utils.ts, demos/ (per-demo translations)
  layouts/            # Layout.astro, DemoLayout.astro
  lib/                # Shared utilities
  pages/              # index.astro, 404.astro, demos/, [lang]/
public/               # Static assets (demo images, PDDL files, joc-eda viewer, …)
```

## Customizing

- **Identity / hero / contact**: `src/components/` (e.g. `Contact.astro`)
- **Content data**: `src/data/*.json` (skills, experience, education, work projects)
- **Demo list**: `src/data/demos.json` (+ `.es.json`, `.ca.json`)
- **i18n UI strings**: `src/i18n/ui.ts`
- **Site URL**: `site` in `astro.config.mjs`

## Deployment

Workflow: `.github/workflows/deploy.yml` — push to `main` triggers build (Node 22) and deploy to GitHub Pages.

In the repo: **Settings → Pages → Source → GitHub Actions**.

To build locally (parallel Docker image builds + Astro):

```bash
make build     # incremental — skips unchanged images
make rebuild   # force rebuild everything (ignore cache)
```

## Troubleshooting

### Stale Vite cache — "jsxDEV is not a function" / "Cannot read properties of null (reading 'useState')"

If e2e (Playwright) tests or the browser console show these errors on demo pages, the Vite dependency optimization cache is stale — React was bundled in **production mode** during a previous `astro build` and the dev server is still serving those cached files.

**Fix:**

```bash
rm -rf node_modules/.vite   # clear the Vite dep cache
npm run dev                  # restart — Vite rebuilds in development mode
```

Or start the dev server with `--force` to skip the cache:

```bash
npx astro dev --force
```

**Why it happens:** Vite pre-bundles dependencies into `node_modules/.vite/deps/`. If `NODE_ENV=production` was set (or `astro build` ran), the cache bakes in `process.env.NODE_ENV === 'production'` → `true`. The next `astro dev` reuses that cache, so `react/jsx-dev-runtime` exports `jsxDEV = void 0` (production strips it) and React hydration breaks.

---

*Most demo backends live in sibling repos and are optional. The PDDL planner lives in **`planner-api/`** inside this project.*
