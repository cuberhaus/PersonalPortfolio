---
name: DesastresIA portfolio demo
overview: "Add a new demo page for desastresIA under PersonalPortfolio: homepage card, `/demos/desastres-ia/`, and a React section that explains the problem, algorithms, and structure—with a simple schematic visualization—since the real solver is Java/offline."
todos:
  - id: demos-json-icon
    content: Add demos.json entry + helicopter icon in Demos.astro
    status: pending
  - id: page-component
    content: Create desastres-ia.astro + DesastresIADemo.tsx (problem, diagram, algo tables)
    status: pending
  - id: github-readme
    content: Wire GitHub link + optional README demo row
    status: pending
isProject: false
---

# DesastresIA demo page

## Context

[desastresIA/README.md](desastresIA/README.md) describes a **FIB-UPC IA** assignment: helicopters assign rescue trips to groups at centers; **Hill Climbing** and **Simulated Annealing** (AIMA) with multiple **successor** and **heuristic** variants. There is **no web build** of the Java app, so the demo is **educational + visual**, not a port of the JAR.

## Implementation

### 1. Register the demo

- Add an entry to [PersonalPortfolio/src/data/demos.json](PersonalPortfolio/src/data/demos.json): e.g. slug `desastres-ia`, title **Desastres IA** (or **Disaster relief search**), short description, tags `Java`, `AIMA`, `Local search`, `UPC`, and a new icon key e.g. `helicopter`.

### 2. Demo card icon

- In [PersonalPortfolio/src/components/Demos.astro](PersonalPortfolio/src/components/Demos.astro), add an SVG branch for `helicopter` (simple rotor + fuselage, matches disaster-relief theme).

### 3. New route

- Create [PersonalPortfolio/src/pages/demos/desastres-ia.astro](PersonalPortfolio/src/pages/demos/desastres-ia.astro) using `DemoLayout` (same pattern as [planificacion.astro](PersonalPortfolio/src/pages/demos/planificacion.astro)): header + lead + `DesastresIADemo client:load` + **About** block with course context and **GitHub** link.

**GitHub URL:** align with where you actually host the code. If `desastresIA` is only inside the monorepo, use a tree URL (e.g. `https://github.com/<user>/<repo>/tree/main/desastresIA`); if it is a standalone repo, use that. The plan assumes you will set the final `href` to match your layout (same as other demos).

### 4. React demo component

- Add [PersonalPortfolio/src/components/demos/DesastresIADemo.tsx](PersonalPortfolio/src/components/demos/DesastresIADemo.tsx), styled consistently with other demos (dark card, monospace for code names).

Suggested sections (tabs or stacked cards):


| Section                     | Content                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problem**                 | State = assignment of helicopters to rescue sequences; centers, groups, times; goal is to minimize total / weighted rescue time (high level, no need to mirror Java APIs).                                                                                                |
| **Schematic**               | Small **SVG or CSS diagram**: bases → helicopters → centers/groups as abstract nodes, to make the assignment story visual.                                                                                                                                                |
| **Algorithms**              | Bullet list: HC, SA; pointer to AIMA.                                                                                                                                                                                                                                     |
| **Successors / heuristics** | Compact tables mapping `DesastresSuccessorFunction1–6` and `DesastresHeuristicFunction1–3` to short descriptions (from README / javadoc intent: swap, reassign, combined moves; time-based vs priority heuristics). Exact wording can stay high-level if JavaDoc is thin. |
| **Experiments**             | One paragraph: Python `plots.py` / TSV pipeline; optional static **one-off** chart only if you add a tiny `public/demos/desastres-ia/summary.json` with a few numbers—**optional** to avoid scope creep; default is text-only.                                            |


No backend, no WASM Java.

### 5. README (optional)

- One line in [PersonalPortfolio/README.md](PersonalPortfolio/README.md) demo table row for `desastres-ia` (“Browser: overview + schematic; full solver: Java repo”).

## Out of scope (unless you ask later)

- Running HC/SA in the browser (would require reimplementing or emulating the Java state space).
- Auto-importing all TSV experiment files into live charts (large assets; better as a follow-up).

