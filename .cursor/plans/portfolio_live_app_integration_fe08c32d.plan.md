---
name: Portfolio live app integration
overview: Add auto-detection of locally running Docker services to the four portfolio demo pages (TFG, bitsXlaMarato, pro2, planificacion). When a backend is available, show the real web app in an iframe above the existing mock; when not, show a small "not available" hint and keep the current mock demo unchanged.
todos:
  - id: live-embed-component
    content: Create reusable LiveAppEmbed.tsx component with health-check probe, iframe, and offline fallback card
    status: completed
  - id: tfg-integrate
    content: Add LiveAppEmbed to TfgPolypDemo.tsx (url=localhost:8082, docker compose up)
    status: completed
  - id: bitsx-integrate
    content: Add LiveAppEmbed to BitsXMaratoDemo.tsx (url=localhost:8001, docker compose up)
    status: completed
  - id: pro2-integrate
    content: Add LiveAppEmbed to Pro2Demo.tsx (url=localhost:8000, make docker-run)
    status: completed
  - id: planificacion-integrate
    content: Add LiveAppEmbed to PlanificacionDemo.tsx (url=localhost:3000, make docker-run)
    status: completed
  - id: build-test
    content: Run npm run build and vitest to verify no regressions
    status: completed
isProject: false
---

# Portfolio Live App Integration

## Architecture

Each of the four Dockerized projects exposes a web app on a known local port:

- **TFG** -> `http://localhost:8082` (React + FastAPI dashboard)
- **bitsXlaMarato** -> `http://localhost:8001` (Angular + FastAPI)
- **pracpro2** -> `http://localhost:8000` (Vue + D3 + FastAPI)
- **planificacion** -> `http://localhost:3000` (SvelteKit + Metric-FF)

## Shared component: `LiveAppEmbed.tsx`

Create a single reusable React component at `[src/components/demos/LiveAppEmbed.tsx](PersonalPortfolio/src/components/demos/LiveAppEmbed.tsx)`:

- **Props**: `url: string`, `title: string`, `dockerCmd: string`, localized strings for the banner
- **On mount**: fires a `fetch(url, { mode: 'no-cors', signal: AbortSignal.timeout(1500) })` to probe if the service is up. `no-cors` avoids CORS errors -- an opaque response still means the server is reachable. A network error means it is not.
- **State**: `status: 'checking' | 'online' | 'offline'`
- **Renders**:
  - `checking`: nothing (invisible, avoids layout shift)
  - `online`: a styled banner ("Live app detected -- running on `{url}`") + a full-width `<iframe src={url}>` with reasonable height (~80vh), border, rounded corners matching the portfolio theme. A "close" button to dismiss the iframe and see the mock underneath.
  - `offline`: a subtle card at the top saying "Run locally with Docker to see the full app" with the `dockerCmd` in a `<code>` block. Styled with muted colors so it doesn't dominate the page.
- The existing mock demo always renders below, regardless of status.

```
+--------------------------------------------------+
| "Live app detected" banner  [x close]            |  <-- only when online
|  iframe (full web app at localhost:PORT)          |
+--------------------------------------------------+
|                                                   |
|  Existing mock demo (always visible below)        |
|                                                   |
+--------------------------------------------------+
```

## i18n

Add localized strings to each demo's `TRANSLATIONS` object (en/es/ca) for:

- "Live app detected"
- "Run locally with Docker"
- "The full web app is running at"
- "Not available -- start with:"

No changes needed to the global `ui.ts` since demo translations are per-component.

## Changes per demo page

### 1. TFG (`tfg-polyps`)

- In `[TfgPolypDemo.tsx](PersonalPortfolio/src/components/demos/TfgPolypDemo.tsx)`: import `LiveAppEmbed`, render it at the top with `url="http://localhost:8082"` and `dockerCmd="cd TFG && docker compose up"`
- Update the existing "Local Dashboard" card text from `make run` to also mention `docker compose up`

### 2. bitsXlaMarato (`bitsx-marato`)

- In `[BitsXMaratoDemo.tsx](PersonalPortfolio/src/components/demos/BitsXMaratoDemo.tsx)`: import `LiveAppEmbed`, render at top with `url="http://localhost:8001"` and `dockerCmd="cd bitsXlaMarato && docker compose up"`

### 3. pracpro2 (`pro2`)

- In `[Pro2Demo.tsx](PersonalPortfolio/src/components/demos/Pro2Demo.tsx)`: import `LiveAppEmbed`, render at top with `url="http://localhost:8000"` and `dockerCmd="cd pracpro2 && make docker-run"`

### 4. planificacion

- In `[PlanificacionDemo.tsx](PersonalPortfolio/src/components/demos/PlanificacionDemo.tsx)`: import `LiveAppEmbed`, render at top with `url="http://localhost:3000"` and `dockerCmd="cd Practica_de_Planificacion && make docker-run"`
- The existing `plannerBaseUrl()` + ENHSP integration stays as-is (the planner-api is a separate lighter service for the portfolio's own PDDL editor)

## Testing

- `npm run build` to ensure no TypeScript/build errors
- Run existing Vitest suite (`data-integrity.test.ts` checks demos.json/icon/page parity -- no changes needed there since we are not adding new slugs)

