# Architecture overview

One page. Big picture map of what the portfolio is and how the pieces fit
together. Read this **before** the deeper architecture docs — those answer
_why_, this answers _what_.

## The 30-second model

```mermaid
flowchart LR
    visitor["Visitor"] --> astro["Astro 5 site<br/>(static, GH Pages)"]
    astro --> islands["React 19 islands<br/>(per-demo)"]
    astro --> registry[("demo-services.json<br/>(SSOT)")]
    registry --> browserProjection["demo-services.ts<br/>(validated browser projection)"]
    registry --> nodeProjection["demo-registry.mjs<br/>(validated Node projection)"]
    browserProjection --> islands
    browserProjection --> live["live-app-embed.ts<br/>(resolve + probe)"]
    nodeProjection --> orchestrator["dev-all-demos.sh<br/>(local only)"]
    nodeProjection --> scripts["Make / gallery / log relay"]
    orchestrator --> docker["Docker backends<br/>(sibling repos)"]
    live -. "iframe" .-> docker
    astro --> sentry["Sentry<br/>(errors, replay, traces)"]
    docker --> sentry
```

**Read it as:** the static Astro site is the surface area. Each demo card
links to a page that hydrates a React island; the island either renders a
browser-only mock or iframes a Docker backend running on `localhost:<port>`.
The whole thing is observable through one Sentry org.

---

## What lives where

```text
PersonalPortfolio/
├── CONTEXT.md              Domain glossary for demo runtime boundaries
├── src/
│   ├── pages/                Astro routes
│   │   ├── index.astro         # Homepage (the section list)
│   │   ├── 404.astro / 500.astro
│   │   ├── [lang]/             # Localized routes (/es/…, /ca/…)
│   │   └── demos/<slug>.astro  # One per demo
│   ├── components/           Astro layout + Swiss-design sections
│   │   └── demos/              React islands (one per demo)
│   ├── data/                 Source of truth + validated browser projections
│   │   ├── demo-services.json  ← orchestrator, ports, backends
│   │   ├── demo-registry-contract.mjs ← shared browser/Node validation
│   │   ├── demos.json          ← homepage cards (+ .es / .ca parity)
│   │   ├── experience.json, education.json, ...
│   ├── i18n/                 Translation infrastructure
│   │   ├── ui.ts               # Pattern A — flat key/value
│   │   └── demos/              # Pattern C — per-feature TS modules
│   ├── lib/                  Shared utilities
│   │   ├── debug.ts            # Custom event bus
│   │   ├── debug-lifecycle.ts  # Idempotent adapter activation/teardown
│   │   ├── debug-bootstrap.ts  # Dynamic adapter composition
│   │   ├── debug-event.mjs     # Shared ingress normalization
│   │   ├── debug-sentry.ts     # Bus → Sentry forwarder
│   │   ├── demo-page.ts        # Shared localized route context
│   │   ├── demo-dispatch.ts    # Typed localized demo lookup
│   │   ├── filtered-collection.ts # Filter/grid DOM protocol
│   │   ├── live-app-fallback.ts # Live status → fallback visibility
│   │   ├── live-app-embed.ts   # Registry resolution + bounded probe
│   │   └── ...                 # Per-demo algorithms (wpgma, etc.)
│   ├── config/
│   │   ├── section-ids.ts      # Section order SSOT (homepage + nav)
│   │   ├── sections.ts         # ↑ + Astro component bindings
│   │   └── site.ts             # Identity (name, URL, socials)
│   └── styles/               Global CSS + theme token blocks
├── e2e/                      Playwright specs (9 named projects)
├── planner-api/              FastAPI + ENHSP (PDDL planner demo)
├── scripts/                  Validated Node projections, orchestration, relay
├── public/                   Static assets (images, PDFs, mock data)
└── docs/
    ├── guides/                 # everyday-tasks, adding-a-demo, i18n, testing
    └── architecture/           # this file, decisions, debugging-architecture, observability
```

---

## Three sources of truth

The codebase is built around three SSOTs. Editing one of these is a
documented "everyday task"; editing things derived from them isn't.

| File                                                              | Drives                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/data/demo-services.json](../../src/data/demo-services.json)  | Validated browser projection, Node projection, orchestration, log relay, `LiveAppEmbed.tsx`'s iframe URLs, Makefile `DEMO_PORTS`, Sentry traced-port list, and `live-demos.spec.ts`. Adding a backend means editing this and following the [adding-a-demo.md](../guides/adding-a-demo.md) checklist. |
| [src/data/demos.json](../../src/data/demos.json) (+ `.es`, `.ca`) | Homepage demo grid. Card title, description, accent colors, icon, github link. Schema is enforced by [demo-schema.ts](../../src/i18n/demo-schema.ts) (Zod).                                                                                                                                          |
| [src/config/section-ids.ts](../../src/config/section-ids.ts)      | Homepage section order, navbar anchor order, scroll-spy targets. Numbered prefixes (`01`, `02`, …) auto-derived from `numbered: true` flags.                                                                                                                                                         |

The [demo-registry.test.ts](../../src/__tests__/demo-registry.test.ts) and
[structural.test.ts](../../src/__tests__/structural.test.ts) suites police
consistency between these and everything that derives from them.

---

## How a request flows

### Static homepage

1. `astro build` produces `dist/` — pure HTML/CSS/JS, no server.
2. GitHub Pages serves it. No Node runtime in production.
3. The locale prefix in the URL (`/`, `/es/`, `/ca/`) selects which
   translation table renders — see [i18n.md](../guides/i18n.md).

### Demo with a browser-only island

1. Visitor lands on `/demos/<slug>/`.
2. The Astro page imports the React component with `client:visible` (Astro
   only ships JS when the component scrolls into view).
3. The island runs in the browser. Pure JS, no backend.

### Demo with a live backend

1. Locally, `make dev-bare` asks the validated Node registry projection for
   service rows and starts each listed Docker compose service on its declared
   port.
2. The demo page renders `<LiveAppEmbed slug="…" />`, which resolves and
   probes the iframe URL through [live-app-embed.ts](../../src/lib/live-app-embed.ts).
3. The iframe loads `http://localhost:<port>/`. On GitHub Pages it falls
   back to `<MockBanner />` because there's no backend to embed.
4. The iframe app voluntarily emits debug events via
   [debug-iframe-emitter.ts](../../src/lib/debug-iframe-emitter.ts)
   (postMessage); the parent forwards them onto the central debug bus.

`LiveAppFallbackRegion.astro` owns the relationship between the embed and the
route-specific fallback. `LiveAppEmbed.tsx` dispatches `checking`, `online`,
or `offline` from its own status root; the region hides the fallback only for
`online`. The route still owns the fallback's actual mock or local demo markup.

### Filtered collections

The demos and certifications grids share one runtime protocol in
[`filtered-collection.ts`](../../src/lib/filtered-collection.ts). It finds
controls by `data-filter-value`, the grid by its ID, and the live announcer by
`aria-live`. It owns filtering, responsive page limits, hidden state,
`aria-expanded`, and animation cancellation. The Astro callers expose those
semantic inputs without leaking implementation marker attributes.

---

## The debug bus and lifecycle

A single producer surface
([src/lib/debug.ts](../../src/lib/debug.ts)) every component logs into.
Consumers subscribe independently:

```text
                ┌─ DebugOverlay.tsx (in-page)
                ├─ console mirror (dev only)
debug(ns).info ─┼─ debug-sentry.ts → Sentry SDK
                └─ debug-network.ts (X-Session-Id forwarder)
```

`DebugOverlay.tsx` owns one `DebugLifecycle`. The lifecycle makes network,
iframe, Sentry, and Docker subscriptions idempotent and generation-aware,
including the case where an asynchronous Sentry import resolves after debug
mode was disabled. Docker relay parsing and rate limiting live in a focused
internal log processor; transport and visibility remain behind the same
lifecycle-facing adapter.

`debug-bootstrap.ts` is the composition boundary for the dynamically imported
adapters, so the overlay only controls the lifecycle. Iframe envelopes and
Docker/relay lines enter through the shared `debug-event.mjs` normalizer. The
normalizer supplies canonical levels, namespaces, messages, arguments, and
timestamps; origin allowlisting remains in the iframe adapter and rate
limiting remains in the backend adapter.

Backend events arrive at the same Sentry org tagged with `service:<slug>`
and the same `session_id` as the browser session, so a Sentry filter
`session_id:<uuid>` reconstructs the full cross-stack trace.

Deep dive: [debugging-architecture.md](./debugging-architecture.md).

---

## i18n model

Three locales — `en` (default), `es`, `ca`. Three patterns coexist, each
the right tool for one kind of content:

| Pattern | Where                                   | When to use                                             |
| ------- | --------------------------------------- | ------------------------------------------------------- |
| **A**   | `locales/{locale}/ui.json`              | Short shared UI strings (button labels, ARIA, nav).     |
| **B**   | `src/data/*.json` + locale JSON triples | Structured content (experience, demos, certifications). |
| **C**   | `locales/{locale}/<slug>-*.json`        | Page/demo copy with inline HTML or `{0}` placeholders.  |

`src/i18n/demos/*.ts` files are lightweight namespace accessors; the copy lives
in `locales/`. `ui.json` is nested by topic, then flattened for dotted-key calls
like `t('nav.about')`.

The "i18n parity rule" applies to Pattern B: sibling JSON files must stay
lock-step (same length, same field set, same order). Enforced by
[content-parity.test.ts](../../src/__tests__/content-parity.test.ts). Full
walkthrough: [i18n.md](../guides/i18n.md).

---

## Theming

Two orthogonal axes:

- **Theme** — palette tokens. Multiple themes registered in
  [src/lib/themes.ts](../../src/lib/themes.ts), applied via
  `html[data-theme="…"]`. Picker in the Ctrl+K modal.
- **Design** — typography / layout flavor. Applied via
  `html[data-design="…"]` (e.g. `swiss`).

Both persist in `localStorage` and are restored before paint by
[ThemeInit.astro](../../src/components/ThemeInit.astro) so there's no FOUC.

## Localized demo dispatch

The localized `[lang]/demos/[demo].astro` route uses one typed eager module glob
for both lookup and static-path generation. The pure
[`demo-dispatch.ts`](../../src/lib/demo-dispatch.ts) helper extracts slugs and
builds the lookup without non-null assertions or unchecked module casts. A
missing slug receives a localized 404 page and a `404` response status; the
individual demo pages keep their route-specific markup.

---

## What's _not_ in this overview

- **Why** any of these choices were made — see
  [decisions.md](./decisions.md) for the catalogue of alternatives weighed
  and rejected.
- **How** the observability stack is operated — see
  [observability.md](./observability.md) for DSNs, dashboards, and
  per-stack snippets.
- **How** to add or change things — see [guides/](../guides/):
  [everyday-tasks.md](../guides/everyday-tasks.md),
  [adding-a-demo.md](../guides/adding-a-demo.md),
  [testing.md](../guides/testing.md).

---

## See also

- [decisions.md](./decisions.md) — full decision-rationale catalogue
- [0001-validated-demo-runtime-boundaries.md](../adr/0001-validated-demo-runtime-boundaries.md) — runtime projection and ownership decision
- [debugging-architecture.md](./debugging-architecture.md) — debug bus +
  Sentry SDK rollout
- [observability.md](./observability.md) — operational manual
- [ui-experiments.md](./ui-experiments.md) — visual / interaction explorations
