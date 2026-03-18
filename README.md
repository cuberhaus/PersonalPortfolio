# Personal Portfolio

Dark-themed portfolio built with **[Astro](https://astro.build)** (static export) and **React** islands for interactive demos. Deployed to **GitHub Pages** via Actions.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Astro 5, TypeScript |
| Interactive UI | React (`client:load` on demo pages) |
| Styling | Scoped CSS + shared layout variables |
| CV / plate demos | Web Workers, Canvas (OpenCV.js where needed) |

## Getting started

```bash
npm install
npm run dev              # Astro only — http://localhost:4321
npm run dev:all          # All local demo backends + Astro (see below)
npm run dev:with-planner # planner-api + Astro only (no Docker)
npm run build
npm run preview
```

### `npm run dev:all`

One command starts everything the demos can use locally (then **Ctrl+C** tears it down):

| Service | Port | Demo | Folder (sibling of `PersonalPortfolio`) |
|---------|------|------|----------------------------------------|
| **Tenda** | 8888 | `/demos/tenda` iframe | `../tenda_online` — `docker compose up -d` |
| **Draculin** | 8890 (web), 8889 (API) | `/demos/draculin` | `../Draculin-Backend` — `docker compose up -d` |
| **planner-api** | 8765 | `/demos/planificacion` **Run planner** | **`planner-api/`** in this repo — Python + **Java 17+** |
| **Astro** | 4321 | Site | this repo |

Requires **bash**, **Docker** (for Tenda + Draculin), **Python 3** + Java for the planner. Missing **sibling** repos (Tenda/Draculin) are skipped. **`planner-api/`** ships with this project.

Flags (advanced): `bash scripts/dev-all-demos.sh --skip-docker` or `--skip-planner`.

**`npm run dev:with-planner`** — only **planner-api** + Astro (no Docker). Use when you don’t need Tenda/Draculin.

**Windows:** use **WSL** or **Git Bash**, or start each stack manually (README sections below).

Optional env (copy from `.env.example`):

| Variable | Purpose |
|----------|---------|
| `PUBLIC_PLANNER_URL` | Base URL of [planner-api](planner-api/) for `/demos/planificacion` **Run planner** (production builds; dev defaults to `http://127.0.0.1:8765`) |

## Demo pages

Routes live under `/demos/<slug>/`. Not everything runs fully on GitHub Pages without extra services.

| Slug | Demo | Runs in browser | Notes |
|------|------|-----------------|-------|
| `pro2` | WPGMA clustering | Yes | Phylogenetic tree builder (D3) |
| `jsbach` | JSBach interpreter | Yes | Custom language + Web Audio |
| `joc-eda` | EDA game viewer | Yes | Replay upload / viewer |
| `matriculas` | License plate detection | Yes | CV pipeline in a worker (OpenCV.js) |
| `mpids` | MPIDS solver | Yes | Graph MDS + greedy / local search |
| `phase-transitions` | Graph phase transitions | Yes | Percolation / connectivity experiments |
| `planificacion` | Travel agency (PDDL) | Partially | Browse PDDL + **Run planner** if API is up |
| `desastres-ia` | Desastres IA | Yes | HC + SA on toy instance in browser; full solver in Java |
| `tenda` | Tenda Online | Dev only | Real app in iframe when backend runs |
| `draculin` | Draculin | Dev + mock | Flutter embed in dev; mock on Pages |

Demo cards on the homepage are driven by `src/data/demos.json`.

### Planificación — live planner (ENHSP)

The [planificación demo](src/pages/demos/planificacion.astro) can solve PDDL via **`POST /plan`** on a small FastAPI service (**ENHSP**, not stock Fast Downward — no `:fluents` support there).

1. **Start the API** (Java 17+ on the host):

   ```bash
   cd planner-api
   pip install -r requirements.txt
   python -m uvicorn app.main:app --port 8765
   ```

   Docker (from portfolio root): `docker build -t planner-api ./planner-api && docker run --rm -p 8765:8000 planner-api`  
   (container listens on **8000**; map **8765:8000** to match the dev default.)

2. **Local dev:** With `npm run dev`, if `PUBLIC_PLANNER_URL` is unset, the UI uses `http://127.0.0.1:8765`. Start the API and use the **Run planner** tab.

3. **Production:** Deploy `planner-api/` (Fly/Railway/Docker), set `PUBLIC_PLANNER_URL`, and `CORS_ORIGINS` on the API. See [`planner-api/README.md`](planner-api/README.md).

### Tenda Online (local)

```bash
cd ../tenda_online
docker compose up -d   # http://localhost:8888
```

Dev: demo page iframes the real app. Production: client-side mock.

### Draculin (local)

```bash
cd ../Draculin-Backend
docker compose up -d   # API :8889, Flutter web :8890
```

Dev: embedded Flutter. Production: React mock.

## Project layout

```
planner-api/    # FastAPI + ENHSP for planificación demo (not deployed with static Pages)
src/
  components/   # Layout, home sections, Contact, …
  components/demos/
  data/
  layouts/
  lib/
  pages/
public/
```

## Customizing

- **Identity / hero / contact**: `src/components/` (e.g. `Contact.astro`)
- **Projects, skills, experience**: `src/data/*.json`
- **Demo list**: `src/data/demos.json`
- **GitHub Pages base URL**: `site` + `base` in `astro.config.mjs`

## Deployment

Workflow: `.github/workflows/deploy.yml` — push to `main` builds and publishes to GitHub Pages.

In the repo: **Settings → Pages → Source → GitHub Actions**.

---

*Tenda (`../tenda_online`) and Draculin (`../Draculin-Backend`) are optional sibling repos for local demos. The PDDL planner lives in **`planner-api/`** inside this project.*
