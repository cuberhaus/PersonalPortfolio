---
name: Simplify planificacion demo
overview: Remove the ENHSP "Run planner" section from the portfolio's Planificacion demo and simplify the comparison card. The demo becomes a clean static showcase; the full app (via LiveAppEmbed) handles all planner functionality.
todos:
  - id: remove-planner-ui
    content: Remove Run Planner section, PlanResult component, and planner state/logic from PlanificacionDemo.tsx
    status: completed
  - id: simplify-card
    content: Simplify the demo-vs-full-app comparison card text in all 3 languages
    status: completed
  - id: build-test
    content: Run npm run build and vitest to verify
    status: completed
isProject: false
---

# Simplify Planificacion Demo

## What changes

Remove the "Run planner" UI (editable textareas, run button, result display) from `PlanificacionDemo.tsx` and simplify the "demo vs full app" comparison card.

### 1. Remove planner UI from PlanificacionDemo.tsx

In [PlanificacionDemo.tsx](PersonalPortfolio/src/components/demos/PlanificacionDemo.tsx):

- Remove all planner-related state (`domainEdit`, `problemEdit`, `running`, `result`, `fetchErr`, `showLog`, `plannerUrl`)
- Remove the `runPlanner()` function
- Remove the `PlanResult` sub-component
- Remove the "Run planner" card (lines ~528-620) with its textareas, run/reset buttons, error display, and log viewer
- Remove i18n keys related to planner execution (`runPlanner`, `runReq`, `notConfig`, `notConfigDesc`, `domainLabel`, `problemLabel`, `running`, `reset`, `plan`, `steps`, `total`, `rawActions`, `showLog`, `hideLog`, `missingApi`, `noPlan`)
- Keep: flight network diagram, constraints card, extensions list, PDDL viewer (read-only), download links, LiveAppEmbed

### 2. Simplify the comparison card

Update the "demo vs full app" card in the same file:

- Remove the "Run planner UI (uses remote ENHSP backend)" line from `demoFeatures`
- Simplify `fullAppDesc` / `fullAppFeatures` wording -- no need to mention "Metric-FF" by name, just say "built-in planner" or "real planner execution"
- All three language blocks (en/es/ca)

### 3. Clean up planner-api references (optional)

The `planner-api/` folder, `dev-with-planner.sh`, and planner-api entries in `dev-all-demos.sh` / `Makefile` can stay for now (they don't hurt anything and someone might still use them). But the demo page itself will no longer reference or depend on them.

### 4. Build and test

- `npm run build` to verify no broken imports
- `npx vitest run` to check existing tests pass
