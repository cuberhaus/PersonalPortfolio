---
name: desastresIA Web App
overview: "Build a full-stack web app for the desastresIA project: a Python (FastAPI) backend reimplementing the Java local search logic, and a Solid.js (Vite) frontend with an interactive 2D map solver and an experiment comparison dashboard."
todos:
  - id: backend-models
    content: Create Python data models (Centro, Grupo, State) and problem generator reimplementing IA.Desastres library
    status: completed
  - id: backend-board
    content: Implement board with distance matrix precomputation and state class with 3 initial state generators + operators
    status: completed
  - id: backend-heuristics
    content: Port all 3 heuristic functions and 6 successor functions from Java to Python
    status: completed
  - id: backend-solver
    content: Implement Hill Climbing and Simulated Annealing solvers with metrics collection
    status: completed
  - id: backend-api
    content: Create FastAPI app with /api/solve and /api/experiment endpoints, structured route response
    status: completed
  - id: frontend-scaffold
    content: Scaffold Solid.js + Vite + TypeScript project with dark theme CSS
    status: completed
  - id: frontend-solver
    content: Build SolverPage with parameter controls, 2D Canvas map (centers, groups, routes), and results panel
    status: completed
  - id: frontend-experiments
    content: Build ExperimentPage with batch config, boxplot charts for algorithm comparison
    status: completed
  - id: docker
    content: Create Dockerfile (2-stage), docker-compose.yml, and Makefile with dev/docker/help targets
    status: completed
  - id: portfolio-integration
    content: Add LiveAppEmbed to PersonalPortfolio, update dev-all-demos.sh script
    status: completed
isProject: false
---

# desastresIA Web App

## Architecture

```mermaid
graph TD
    subgraph frontend [Solid.js Frontend - Vite]
        SolverPage["Solver Page"]
        ExperimentPage["Experiment Dashboard"]
        MapCanvas["2D Canvas Map"]
        Controls["Parameter Controls"]
        Charts["Boxplot Charts"]
    end

    subgraph backend [FastAPI Backend - Python]
        API["REST API"]
        Generator["Problem Generator"]
        Solver["HC / SA Solver"]
        Heuristics["Heuristic Functions 1-3"]
        Successors["Successor Functions 1-6"]
        Evaluator["State Evaluator"]
    end

    SolverPage --> Controls
    SolverPage --> MapCanvas
    Controls -->|"POST /api/solve"| API
    ExperimentPage -->|"POST /api/experiment"| API
    API --> Generator
    API --> Solver
    Solver --> Successors
    Solver --> Heuristics
    Solver --> Evaluator
    API -->|"JSON result"| SolverPage
    API -->|"JSON batch results"| ExperimentPage
    ExperimentPage --> Charts
```



## Backend: Python reimplementation of Java logic

The `IA.Desastres` JAR is gitignored and unavailable. The library API is simple (documented in Javadoc) -- just seed-based random generation. We reimplement everything in Python.

### Files to create under `desastresIA/web/backend/`

- `**models.py**` -- Data classes for `Centro`, `Grupo`, `Helicopter`, `State`
  - `Centro(x: int, y: int, n_helicopters: int)`
  - `Grupo(x: int, y: int, priority: int, n_personas: int)`
  - `State` = list of lists (helicopter -> ordered group IDs), same as Java `estado.asignacion`
- `**generator.py**` -- Reimplement `IA.Desastres.Centros` and `IA.Desastres.Grupos`
  - `generate_centros(n: int, helicopters_per_center: int, seed: int) -> list[Centro]`
  - `generate_grupos(n: int, seed: int) -> list[Grupo]`
  - Uses Python `random.Random(seed)` to match the Java `Random(seed)` distribution
  - Note: exact seed parity with Java is not guaranteed, but the statistical properties will be identical
- `**board.py**` -- Reimplement `Desastres.board`
  - Precompute center-group and group-group Euclidean distance matrices
  - Same `get_distance(id1, id2, mode)` interface
  - Store helicopter-to-center mapping
- `**state.py**` -- Reimplement `Desastres.estado`
  - Three initial state generators: `random`, `all_to_one`, `greedy`
  - Greedy uses priority queue with nearest-group logic (port of [estado.java](desastresIA/Desastres/src/Desastres/estado.java) `gen_estado_inicial_greedy`)
  - Operators: `swap_groups(i, j, x, y)`, `reassign_general(i, j, x, y)`, `reassign_reduced(id1, id2)`
- `**heuristics.py**` -- Port all 3 heuristic functions from Java
  - `heuristic_1(state, board)` -- weighted total time (port of [DesastresHeuristicFunction1.java](desastresIA/Desastres/src/Desastres/DesastresHeuristicFunction1.java))
  - `heuristic_2(state, board)` -- plain sum of times
  - `heuristic_3(state, board)` -- weighted + priority rescue time
  - Physics model: 1.66667 km/min speed, max 15 people per trip, max 3 groups per trip, 10 min cooldown, 2x time for priority groups
- `**successors.py**` -- Port successor functions 1-6
  - SF1: full SWAP enumeration
  - SF2: reassign general (all positions)
  - SF3: reassign reduced (last element only)
  - SF4: SWAP + general combined
  - SF5: SWAP + reduced combined
  - SF6: randomized mix for SA
- `**solver.py**` -- Hill Climbing and Simulated Annealing
  - `hill_climbing(problem) -> SolveResult` -- steepest ascent, returns final state + metrics
  - `simulated_annealing(problem, steps, stiter, k, lambda_) -> SolveResult` -- with temperature schedule
  - `SolveResult`: final state, heuristic value, execution time (ms), nodes expanded, per-helicopter times, iteration trace (for SA convergence chart)
- `**app.py**` -- FastAPI application
  - `POST /api/solve` -- single run with full config, returns state + routes + metrics
  - `POST /api/experiment` -- batch run: sweep over seeds/configs, returns aggregated metrics
  - `GET /api/status` -- health check
  - Response includes structured route data (per-helicopter trip legs with coordinates) for frontend visualization

### Key design decisions

- The `POST /api/solve` response includes **resolved route geometry**: for each helicopter, an ordered list of `{from: {x,y}, to: {x,y}, group_id, trip_number}` segments. The frontend doesn't need to compute routes -- it just draws them.
- The experiment endpoint runs in a thread pool to avoid blocking, with progress streaming via SSE if needed.

## Frontend: Solid.js + Vite + HTML5 Canvas

### Files to create under `desastresIA/web/frontend/`

Scaffold with `npm create vite@latest frontend -- --template solid-ts`.

- `**src/App.tsx`** -- Root with tab navigation (Solver / Experiments)
- `**src/pages/SolverPage.tsx`** -- Interactive solver
  - Left panel: parameter controls (seed, ngrupos, ncentros, nhelicopters, algorithm toggle HC/SA, successor function dropdown, heuristic dropdown, initial state dropdown, SA params when SA selected)
  - Center: 2D Canvas map showing centers (blue squares with helicopter count badges) and groups (circles color-coded: red=priority 1, orange=normal). After solving, draws helicopter routes as colored polylines with trip segments, animated direction arrows
  - Right panel: results -- heuristic value, execution time, nodes expanded, per-helicopter breakdown table (time, groups, trips)
  - "Generate" button to randomize a new scenario (changes seed), "Solve" button to run
- `**src/pages/ExperimentPage.tsx`** -- Batch comparison dashboard
  - Config: select which algorithms/heuristics/successors to compare, seed range, problem size
  - Results: boxplot charts (using a lightweight Canvas chart lib or custom SVG) for heuristic value and execution time across configurations
  - Mirrors what `python_scripts/plots.py` does but interactively
- `**src/components/MapCanvas.tsx**` -- Reusable Canvas component
  - Renders centers, groups, routes with pan/zoom
  - Color legend for priority groups and helicopter assignments
  - Tooltip on hover showing group details (people count, priority)
  - Animated route drawing after solve completes
- `**src/components/Controls.tsx**` -- Parameter form with Solid.js signals
- `**src/components/ResultsPanel.tsx**` -- Metrics display + per-helicopter table
- `**src/components/BoxplotChart.tsx**` -- SVG-based boxplot for experiments
- `**src/lib/api.ts**` -- Fetch wrapper for backend calls
- `**src/styles/` ** -- Dark theme CSS (to match the user's preference)

## Dockerization

- `**desastresIA/Dockerfile`** -- 2-stage build
  - Stage 1: `node:22-slim` to build Solid.js frontend (`npm run build`)
  - Stage 2: `python:3.12-slim` for FastAPI, copies built frontend into static serving
  - Single container serving both API and static files
- `**desastresIA/docker-compose.yml`** -- simple service on port 8083

## Makefile and Integration

- `**desastresIA/Makefile`** -- targets: `dev`, `install`, `docker-build`, `docker-up`, `docker-down`, `help`
- Update `**desastresIA/.gitignore`** to include `web/frontend/node_modules/`, `web/frontend/dist/`, `__pycache__/`
- Add to `PersonalPortfolio/scripts/dev-all-demos.sh` for the full portfolio spin-up
- Add a `LiveAppEmbed` to the portfolio's desastresIA demo page (if one exists, or create one)

## Dark Theme

All UI uses a dark color scheme consistent with the user's preference:

- Background: deep navy (#0f0f1a / #1a1a2e)
- Canvas: dark grid with light entities
- Controls: dark inputs with subtle borders
- Accent colors: helicopter routes use distinct bright colors (cyan, magenta, lime, orange, etc.)

