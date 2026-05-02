# Centralized Debugging — Architecture Decision Notes

Working notes for the upcoming centralized debugging system shared between
`Layout.astro` (main page) and `DemoLayout.astro` (every demo). Two orthogonal
choices drive the design:

1. **Foundation** — what produces log records.
2. **Pattern** — how those records flow to consumers (overlay, console, network sink).

The on-screen overlay, network tap, FPS sampler and state inspector are always
custom regardless of the foundation chosen.

## Decision guide by need

Pick the row that matches your priority. Detailed rationale, trade-offs and
alternatives follow further down.

| What you actually need | Best fit | Why |
|---|---|---|
| Just debug while coding on a laptop, nothing else | **In-page overlay only** (custom event bus + `DebugOverlay.tsx`, gated by `import.meta.env.DEV`) | Zero third-party, nothing ships to visitors, ~150 LOC. DevTools covers the rest. |
| Watch a live dashboard on a second monitor while developing | **Local WebSocket-streamed dashboard** (Node server on `localhost:9229` + dashboard page at `/_debug`) | Real-time, no SaaS, persists across reloads, fully local, fun to build. |
| Polished hosted dashboard, easiest path, don't care about owning data | **Sentry hosted free tier** with `@sentry/astro` | ~5 min to first dashboard view. 5K errors / 50 replays / 10K perf events per month free. Most popular tool by far. |
| Hosted dashboard, but you want to own the data / open source | **Highlight.io self-hosted on Hetzner VPS** (~€13/mo, 8 GB RAM) | Apache-2.0, includes session replay, ~1–2 h setup, full data ownership. |
| Custom dashboards, OpenTelemetry standard, no vendor lock-in | **Grafana Faro + Grafana Cloud free tier** (or fully self-hosted Grafana + Loki + Tempo) | Maximum flexibility, you build dashboards. Steepest learning curve. |
| Record real users including DOM replay | **Sentry hosted** (50 replays/mo free) or **LogRocket** (replay-first, paid) | Replay is the only thing that beats reading logs after the fact. |
| Errors only, nothing else | **Sentry hosted**, default config | One file, paste DSN, done. Free tier. |
| Multi-demo portfolio with WebGL / canvas / heavy JS | **Custom event bus + in-page overlay + Sentry hosted** (layered) | Overlay catches FPS/state issues instantly; Sentry catches what escapes your view. |
| Zero third-party deps, zero hosted services | **In-page overlay only** | Pure local, no SaaS, no cloud. |
| Deploy a dashboard to your own cloud / VPS | **Highlight.io self-hosted on Hetzner** (cheap) or **Render / Railway** (managed) | See [Hosting on cloud](#hosting-on-cloud) below for cost/effort comparison. |
| You're a Cursor / Astro developer trying to debug a portfolio | **This project's chosen path:** custom event bus + overlay + `@sentry/astro` (Sentry hosted free) | Matches everything in this row above; see [Recommendation](#recommendation). |

## Quick chooser — by foundation × pattern

If you're picking the *implementation* primitives rather than choosing the
overall need:

| Constraint | Best foundation | Best pattern |
|---|---|---|
| Smallest bundle, full control | Custom event-bus | Event bus |
| Most conventional, lowest novelty | `debug` (visionmedia) | Transport pipeline |
| Prettiest dev console, modern DX | `consola` | Transport pipeline |
| Future-proof structured logs | `pino` browser | Transport pipeline |
| Real production observability | Sentry SDK | Event bus (Sentry as a sink) |
| One file, one demo, prototype | n/a | Plain facade |

---

## Foundations

### 1. Custom event-bus (≈1–2 KB, zero deps)

A thin module that emits `CustomEvent`s on a global `EventTarget`; consumers
subscribe.

**Pros**
- Smallest possible footprint, fully tree-shakable.
- Tailored exactly to overlay / network / state taps.
- No version churn, no breaking-change risk.
- Trivially mockable in tests (`new EventTarget()`).
- Identical surface in Astro components and React islands.

**Cons**
- ~150 LOC you write and maintain yourself.
- No prior-art docs to point new contributors at.
- Re-invents redaction, sampling, throttling if ever needed.
- No plugin ecosystem.

### 2. `debug` (visionmedia, ≈5 KB)

The de-facto namespace pattern. `localStorage.debug='demo:*'` enables filtering.

**Pros**
- Industry-standard namespace convention; muscle memory for many devs.
- ~12 years stable, used by Express, Mongoose, Socket.io.
- Excellent `*` / `-namespace` filter syntax out of the box.

**Cons**
- Single log level only — no `info` / `warn` / `error` distinction.
- API is positional (`log('msg %o', obj)`), not structured.
- No transports — overlay sink layer is still your problem.
- Format strings (`%o`, `%s`) feel dated vs structured `{...}`.
- Browser build still ships Node-style coloring code.

### 3. `consola` (≈8 KB)

Modern UnJS / Nuxt-ecosystem logger.

**Pros**
- Beautiful console output, typed levels, tags.
- TS-first fluent API: `log.warn(...)`, `log.success(...)`.
- Already plugin-style via "reporters" (transports).
- Active maintenance.

**Cons**
- Largest of the "tiny" options.
- Designed primarily for Node/CLI; browser path is less idiomatic.
- Pretty-print bytes are pure overhead — overlay re-parses anyway.
- Tag/level taxonomy maps awkwardly to nested namespaces (`demo:rob:fk`).

### 4. `pino` browser build (≈15 KB)

Structured-JSON logger used as the standard in Node observability stacks.

**Pros**
- JSON records from day one; trivially shippable to a backend later.
- Designed for very high throughput.
- Standard format — plugs into Datadog, Loki, Elastic, etc.
- Clean child-logger composition: `logger.child({ demo: 'rob' })`.

**Cons**
- ~15 KB minified.
- JSON-only output is overkill for a portfolio with ~5 demos.
- Browser story is a second-class citizen vs Node.
- You still build the overlay; pino just produces records.
- Configuring browser transports (worker, send) is fiddly.

### 5. Sentry SDK (≈50 KB, ≈80–100 KB with replay)

Hosted error reporting + breadcrumbs + optional session replay.

**Pros**
- Production-grade error reporting on a free hobby tier.
- Source-mapped stack traces, releases, breadcrumbs.
- Performance monitoring, optional session replay, user feedback widget.
- Dashboards, alerts, Slack integration — actual ops, not just an overlay.
- `Sentry.captureMessage` / `addBreadcrumb` is itself a logger.

**Cons**
- Heavy by far.
- External SaaS — privacy / GDPR considerations for visitors.
- Network calls on every error; CSP needs `*.sentry.io`.
- Vendor lock-in around breadcrumb / transaction concepts.
- The on-screen overlay is **not** what Sentry provides — still custom.
- Overkill if the goal is "debug a demo running on my laptop".

---

## Architectural patterns

### A. Event bus

Logger emits events on a shared `EventTarget`; overlay, console mirror and
network sink subscribe independently.

```ts
bus.emit('log', { level, ns, args });
bus.on('log', overlayAppend);
bus.on('log', consoleMirror);
```

**Pros**
- Producers and consumers fully decoupled.
- Adding a new sink (Sentry, BroadcastChannel, IndexedDB) = one subscriber, no
  changes to call sites.
- Native `EventTarget` works in workers and main thread.
- Easy to mock in tests.

**Cons**
- Indirection: stack traces show the bus, not the call site (mitigable with
  `new Error().stack` capture).
- Slight ordering subtlety if a sink does sync work that re-emits.
- Slightly more code than a plain function call.
- Less discoverable — "where do logs go?" requires reading subscribers.

### B. Transport pipeline (Winston / Pino style)

Logger pushes records through a formatter to an explicit ordered list of
transports.

```ts
logger.add(consoleTransport);
logger.add(overlayTransport);
logger.info(...) // → formatter → both transports
```

**Pros**
- Familiar to anyone who's used Node loggers.
- Explicit and ordered.
- Each transport can have its own level filter, format, error handling.
- Structured composition: `logger.add(httpTransport)` is obvious.

**Cons**
- Heavier abstraction (formatter + transport interfaces + level enums).
- Non-log signals (FPS samples, network requests) feel forced — they're not
  really "log records".
- Tighter coupling between logger and transport list (vs broadcast).
- More TypeScript types to maintain.

### C. Plain facade

A single global function with hard-coded sinks.

**Pros**
- Smallest code (~30 LOC).
- One file, one default export.
- Zero learning curve.

**Cons**
- Hard-coded sinks: changing destinations = rewriting the facade.
- Mixes concerns (knows about console, overlay, fetch, FPS, …).
- Hard to test in isolation.
- Will eventually be refactored into A or B as it grows.

### D. React context + Astro global

Logger injected via React context for `.tsx` demos, exposed as a global for
Astro and inline scripts.

**Pros**
- Best testability for `.tsx` demos: pass a fake logger via context.
- Clear DI boundary — components declare they need a logger.
- Plays well with React DevTools / strict mode / future RSC.

**Cons**
- Two parallel systems (context + global) — duplicated wiring.
- Provider needed in every Astro island.
- Astro's island model doesn't share React context across islands without
  re-providing.
- Cognitive overhead disproportionate to a personal portfolio.

---

## Recommendation

> **Final priorities:** want a polished dashboard to watch what's happening,
> don't care about complexity or bundle weight, don't care about owning the
> data, and OK with starting locally and flipping on production later.

**`@sentry/astro` (hosted free tier) + custom in-page overlay + custom event
bus.**

The three layers solve three different problems:

1. **Custom event bus** (`lib/debug.ts`) — single producer surface every
   component logs into. Decouples call sites from sinks; trivially mockable
   in tests.
2. **In-page overlay** (`DebugOverlay.tsx`) — instant feedback while debugging
   a single demo at the laptop; no round-trip to a dashboard needed for the
   common case.
3. **Sentry hosted** — real dashboard at `https://sentry.io/organizations/...`
   with:
   - Error grouping with source-mapped stack traces (Astro integration uploads
     maps automatically).
   - Auto-captured breadcrumbs from `console.*`, `fetch`, `XHR`, navigation,
     clicks — much of the "network/state info" arrives without writing taps.
   - Session replay — DOM mutations, console logs and network requests aligned
     on a timeline (50 replays/mo on the free tier).
   - Performance monitoring with Web Vitals.
   - Free hobby tier: 5 000 errors / 50 replays / 10 000 perf events / month,
     30-day retention.
   - Official Astro integration: `npx astro add @sentry/astro`.

The bus emits to all three sinks, so a `debug('demo:rob').error(...)` call
shows up instantly in the overlay, in the dev console, and in the Sentry
dashboard, with the surrounding session captured for replay.

### Why not Highlight.io (self-hosted)?

Highlight was the leading candidate when "owning the data" was on the
priority list. Once that constraint dropped, Sentry wins on every remaining
axis:

- Time-to-dashboard: ~5 min vs ~1–2 h setup.
- Maintenance burden: zero vs Docker stack + patches + backups.
- Astro integration: official package vs manual SDK init.
- Popularity / community size: ~50 M weekly downloads vs single-digit million.
- Free-tier error budget: 5 000/mo vs 1 000/mo.

Highlight remains the right pick the moment you actually need data ownership
(GDPR-sensitive PII, regulated industry, philosophical preference) — see
[Hosting on cloud](#hosting-on-cloud) below for what that path costs.

### Strong second choices

- **Highlight.io self-hosted** — when data ownership matters; see below.
- **PostHog (self-hosted or hosted)** — when you want analytics + feature
  flags + replay + errors in one stack.
- **Grafana Faro + Grafana Cloud free tier** — when you want to build your
  own dashboards and care about OpenTelemetry standardisation.
- **Local WebSocket dashboard** — when "local only" is a hard requirement and
  no third-party service is acceptable.

### What's deliberately rejected now

- `debug` / `consola` / `loglevel` / custom-only — none come with a dashboard.
- LogRocket / Datadog RUM — proprietary SaaS with paid-only meaningful tiers.
- OpenTelemetry browser SDK without a backend — produces records with nowhere
  to look at them.

---

## Hosting on cloud

Reference table for if/when you want to self-host a dashboard backend
(Highlight, PostHog, Grafana stack) instead of using Sentry hosted. Costs are
March 2026 list prices.

| Path | Up-front time | Monthly $ | Maintenance | Best for |
|---|---|---|---|---|
| Hetzner Cloud VPS (CPX31, 4 vCPU, 8 GB) + Docker Compose | 1–2 h | ~€13 (~$14) | OS patches, backups | Cheapest viable self-host |
| DigitalOcean Droplet (4 vCPU, 8 GB) + Docker Compose | 1–2 h | ~$48 | OS patches, backups | If you already use DO |
| Render / Railway / Fly.io | 2–4 h | $30–80 | Mostly automated | No SSH, no OS patching |
| Kubernetes (Helm chart) | 30 min if cluster exists | Cluster cost dominates | Cluster ops | If you already run k8s |
| Highlight Inc. hosted SaaS | 5 min | $0 (hobby tier) | None | When data ownership stops mattering — at which point Sentry is usually a better pick |

### Concrete steps for Hetzner + Docker Compose (Highlight self-host)

1. Provision a Hetzner CPX31 (Ubuntu 24.04) and add an SSH key.
2. Point a subdomain (e.g. `highlight.example.com`) at the VPS IP via DNS.
3. SSH in, install Docker Engine + Docker Compose plugin.
4. `git clone https://github.com/highlight/highlight && cd highlight/docker`.
5. Edit `.env` — set admin password, JWT secret, OAuth creds if any.
6. `docker compose up -d` — boots Postgres, ClickHouse, Redis, Kafka,
   Highlight backend + frontend (~5 min first time).
7. Add Caddy as reverse proxy for free Let's Encrypt TLS:
   ```
   highlight.example.com {
     reverse_proxy localhost:8082
   }
   ```
8. Visit `https://highlight.example.com`, create a project, copy the project
   ID and backend URL.
9. Configure `@highlight-run/client` in the portfolio with those values.

### Same path for PostHog or Grafana

PostHog and Grafana ship the same Docker-Compose-on-VPS pattern; substitute
the repo URL and the published port. PostHog is the lightest of the three
(single container possible for hobby use); Grafana + Loki + Tempo + Faro is
the heaviest.

---

## Sketch of the chosen design

```
                ┌────────────────────────────────────────┐
                │         debug('demo:rob').info(...)    │
                │         debug('theme').error(...)      │
                └──────────────────┬─────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   bus  (EventTarget)         │
                    │   ring buffer, level gate    │
                    └────┬───────┬───────┬─────────┘
                         │       │       │
            ┌────────────┘       │       └─────────────────┐
            ▼                    ▼                         ▼
 ┌──────────────────┐ ┌────────────────────┐ ┌────────────────────────┐
 │ console mirror   │ │ in-page overlay    │ │ @sentry/astro          │
 │ (dev or opt-in)  │ │ Logs/State/Net/Perf│ │ captureException +     │
 └──────────────────┘ └────────────────────┘ │ addBreadcrumb +        │
                                ▲            │ Replay integration     │
                                │            └───────────┬────────────┘
              ┌─────────────────┴────────────────┐       │
              │  fetch/XHR taps emit 'network'   │       ▼
              │  rAF FPS sampler emits 'perf'    │  ┌────────────────────┐
              │  global error/unhandledrejection │  │ Sentry hosted SaaS │
              └──────────────────────────────────┘  │ sentry.io          │
                                                    │ (errors, replays,  │
                                                    │ perf, breadcrumbs) │
                                                    └────────────────────┘
```

State of the system at runtime:

- **Disabled state** → bus is a no-op except for buffering errors; the inline
  init script is ~1 KB. Sentry SDK is loaded by the official Astro integration
  but `Sentry.init()` is gated by env so visitors don't ship traffic to your
  Sentry project unless you flip the flag.
- **Enabled state** → overlay + network tap + Sentry transport all subscribe;
  everything happens live in the overlay and is replayable in Sentry's
  dashboard.
- **Bus is the single producer** → swapping Sentry for Highlight, Faro or a
  local WebSocket sink is a one-line subscriber change.

---

## Other alternatives worth mentioning

The five foundations and four patterns above are the most likely picks. The
sections below catalogue everything else that came up while researching, so a
future revisit doesn't need to redo the search.

### Other logging libraries

- **`loglevel`** (≈1 KB) — truly minimal; just `log.info` / `warn` / `error`
  level-gated by `log.setLevel()`. No namespaces, no transports. Use if you
  want a library smaller than rolling your own.
- **`tslog`** (≈10 KB) — TS-first, hierarchical loggers, pretty stack traces
  with source maps. Strong DX, slightly verbose API.
- **`roarr`** (≈4 KB) — structured JSON like `pino` but lighter; designed for
  later shipping to log aggregators.
- **`bunyan`** — `pino`'s predecessor; structured JSON, browser story is weak.
- **`winston`** — the OG transport pipeline; browser support exists but the
  bundle is heavy and Node-shaped.
- **`ulog`** — universal-tiny logger, namespace + level, ≈2 KB. Less popular,
  less maintained.
- **`signale`** — pretty CLI logger; works in browser but built for Node.
- **Native `console` features** — `console.group`, `console.table`,
  `console.dir`, `console.time`, `%c` styled output. Free, underused, and
  enough for many projects without any library.

### Other hosted error / RUM platforms (Sentry alternatives)

- **Bugsnag** — similar feature set, slightly cheaper, smaller SDK.
- **Rollbar** — error tracking with grouping/dedup, mature.
- **TrackJS** — browser-only, lightweight SDK, weaker dashboards.
- **Raygun** — error monitoring + RUM + crash reporting bundle.
- **Honeybadger.io** — small-team friendly, simpler UI.
- **Highlight.io** — open-source-core, self-hostable, includes session replay.
- **LogRocket** — session-replay-first; replays user sessions with logs aligned.
- **Datadog Browser RUM** — enterprise-tier, integrates with the Datadog stack.
- **Grafana Faro** — open-source frontend SDK built on OpenTelemetry; ships to
  Grafana Cloud or self-hosted Loki/Tempo/Prometheus.
- **OpenTelemetry browser SDK** — vendor-neutral standard; biggest bundle but
  no lock-in. Pair with any OTLP backend.
- **PostHog** — product analytics platform that also captures errors and
  console logs; ≈30 KB.
- **Embrace** — mobile-first but has a web SDK.

### Other architectural patterns

- **RxJS `Subject` bus** — same shape as the event bus but with operators
  (`debounce`, `throttle`, `groupBy`). Adds ≈10 KB unless tree-shaken
  carefully; useful if you already use RxJS in demos.
- **Service-Worker fetch interception** — instead of monkey-patching `fetch`,
  register a SW that proxies network requests and reports them via
  `postMessage`. Captures requests from iframes too, but adds SW lifecycle
  complexity and HTTPS / scope constraints.
- **`console` proxy / monkey-patch** — wrap `console.log` / `warn` / `error`
  on `window.console` so *every* call site is intercepted automatically. Zero
  call-site changes, but loses namespacing and can interfere with browser
  DevTools' own line-mapping.
- **`BroadcastChannel` cross-tab mirror** — same logger emits across tabs;
  useful when debugging multi-tab interactions (e.g. theme sync).
- **IndexedDB-persisted ring buffer** — buffer survives reloads and crashes;
  good for catching errors that fire just before a navigation. ~2 KB extra.
- **Web Worker offloading** — heavy logging (JSON.stringify of large objects)
  done off the main thread to avoid jank in WebGL/Canvas demos.
- **Vite HMR-style WebSocket sink** — open a WS to a local dev server and
  stream structured logs there in real time, like Vite's overlay does for
  errors. Excellent DX in dev, no impact in prod.
- **Browser DevTools Extension** — pull state out of the page into a custom
  panel via `chrome.devtools.*`. Massive setup cost, but gives a "real" tool
  rather than an in-page overlay.
- **Iframe-sandboxed overlay** — render the debug UI inside a sandboxed
  iframe so its CSS/JS can't conflict with the host page (relevant given the
  many `data-design`/`data-theme` design variants). Heavier wiring.
- **Functional / `Effect`-style logging** — model logs as effects in a monadic
  stack (effect-ts, fp-ts). Powerful but very heavy for a portfolio.
- **Tracing-first model** (OpenTelemetry semantics) — replace logs with
  spans + events; standard for distributed systems but mismatched to a
  single-page portfolio.

### Pattern × foundation matrix

Not every combination is sensible. Useful guide:

| Foundation ↓ / Pattern → | Event bus | Transport pipeline | Plain facade | Context + global |
|---|---|---|---|---|
| Custom event-bus | natural | overkill | works | works |
| `debug` (visionmedia) | works | natural | works | overkill |
| `consola` | works | natural | overkill | overkill |
| `pino` browser | works | natural | overkill | overkill |
| `loglevel` | works | overkill | natural | works |
| `tslog` | works | natural | works | works |
| Sentry / Faro / OTel | natural (as sink) | works | locked-in | overkill |

"natural" = the library/pattern was designed for this combination.
"works" = sensible but has friction.
"overkill" = adds abstraction without payoff.
"locked-in" = the foundation forces the pattern; switching later is costly.

### When NOT to centralize at all

For completeness: building this whole system is only worth it if at least two
of the following hold:

- You have ≥3 demos with non-trivial runtime state (Babylon, simulations,
  interactive D3) that benefit from live introspection.
- You ship to a live URL where you can't pop open a local debugger.
- You want to capture user-reported bugs ("this slider broke") with
  reproducible state.
- Multiple people (or future-you in a year) will work on the codebase.

If none of those hold, `console.log` plus DevTools is genuinely the right
answer and this whole document is over-engineering.

---

## Migration cost between options

The event-bus design makes **every code-level migration a one-file swap**: the
backend appears in exactly one subscriber file (e.g. `lib/debug-sentry.ts`).
Replace that file, change `package.json`, rotate environment variables,
re-upload source maps. None of the call sites
(`debug('demo:rob').info(...)`), the bus, the overlay, the network tap or the
tests change.

What's lossy is **data**, not code: historical errors, replays, traces,
alerts, dashboards, saved searches and team-membership rarely export across
platforms.

### Migration matrix (assuming the chosen path: Sentry hosted)

| Move from Sentry to… | Code work | Config / build work | Time | What's lost (data side) | What's gained |
|---|---|---|---|---|---|
| **Highlight self-hosted** | Replace `debug-sentry.ts` (~30 LOC) | Remove `@sentry/astro` integration; install `@highlight-run/client`; swap source-map upload step; new env vars; provision VPS | 1–2 h code + 1–2 h ops | History, replays, alerts, dashboards | Data ownership, unlimited replay, included replay tier |
| **Highlight hosted (app.highlight.io)** | Same as above | Same minus VPS provisioning | 1–2 h | History, replays, alerts | Replay-included free tier; no Docker |
| **PostHog self-hosted** | Replace subscriber to use `posthog-js` API (~40 LOC) | Install `posthog-js`; remove Sentry; new env vars; provision VPS | 1–2 h code + 1–2 h ops | History, replays, alerts | Analytics + feature flags + replay in one stack |
| **PostHog Cloud (free tier)** | Same as above | Same minus VPS | 1–2 h | History, replays, alerts | Same as above; no Docker |
| **Grafana Faro + Grafana Cloud** | Replace subscriber with `@grafana/faro-web-sdk` calls (~60 LOC — log/exception/measurement APIs differ) | Install Faro packages; remove Sentry; configure OTLP endpoint; new env vars | 2–4 h | History, replays (Faro has no replay), Sentry's auto-breadcrumbs | OpenTelemetry standard; Loki/Tempo backend; vendor-neutral |
| **Grafana Faro self-hosted** | Same code work as above | Same plus provision Grafana + Loki + Tempo (Docker stack) | 2–4 h code + 4–6 h ops | Same as above | Full stack ownership |
| **Custom local WebSocket dashboard** | Replace subscriber with WebSocket transport (~50 LOC); add `scripts/debug-server.mjs` (~150 LOC); add `pages/_debug/index.astro` (~250 LOC) | Add `concurrently` + `ws` to dev deps; add `dev:debug` script | 4–8 h | Everything Sentry had | Zero SaaS, fully local, custom UI |
| **In-page overlay only (no backend)** | Delete the Sentry subscriber file; remove its registration call (~3 LOC) | Remove `@sentry/astro`; clean up `astro.config.mjs`; delete env vars | 15 min | Everything in Sentry's dashboard | Zero external traffic; smaller bundle |
| **Add Highlight as a *second* backend (run both in parallel)** | Add `lib/debug-highlight.ts` subscriber alongside the Sentry one (~30 LOC) | Install Highlight; configure both DSN/project IDs | 30–60 min | Nothing | A/B comparison; dual-write during evaluation |

### What's portable across *every* migration

These never need editing regardless of backend swap:

- `lib/debug.ts` — the bus.
- `lib/useDebug.ts` — the React hook.
- `lib/debug-network.ts` — fetch/XHR taps (their output is generic).
- `components/DebugInit.astro` — except for the one-line backend init call.
- `components/DebugOverlay.tsx` — entirely.
- All call sites in `.astro` / `.tsx` files (`debug(ns).info(...)`).
- `__tests__/debug.test.ts`.
- Both layouts.

### Concept mapping cheat sheet

When swapping backends, this is what each Sentry concept becomes elsewhere:

| Sentry | Highlight | PostHog | Grafana Faro |
|---|---|---|---|
| `Sentry.init({ dsn })` | `H.init(projectId, options)` | `posthog.init(token, { api_host })` | `initializeFaro({ url, app })` |
| `captureException(err)` | `H.consumeError(err)` | `posthog.captureException(err)` | `faro.api.pushError(err)` |
| `captureMessage(msg, lvl)` | `H.log(lvl, msg)` | `posthog.capture('log', { msg, lvl })` | `faro.api.pushLog([msg], { level: lvl })` |
| `addBreadcrumb({...})` | implicit (auto-recorded) | implicit | `faro.api.pushEvent(...)` |
| `setUser({ id, email })` | `H.identify(email, { id })` | `posthog.identify(id, { email })` | `faro.api.setUser({ id, email })` |
| `setTag(k, v)` | `H.metadata(k, v)` | `posthog.register({ [k]: v })` | `faro.api.pushMeasurement(...)` (no direct equivalent) |
| `setContext(name, obj)` | `H.metadata(name, obj)` | `posthog.register({ [name]: obj })` | bound on init or per-log |
| Source-map upload | `highlight-cli sourcemaps upload` | `posthog-cli sourcemaps inject` | `@grafana/faro-rollup-plugin` |
| Astro integration | manual JS init | manual JS init | manual JS init |

### Reverse direction (Highlight → Sentry, Faro → Sentry, etc.)

Symmetric for code work — replace one subscriber file. Data-loss profile is
a mirror image: you lose whatever was in the *current* dashboard; you gain
whatever the *new* dashboard offers (e.g. larger free error tier, Astro
integration, more polished UI).

### Practical tip: dual-write during evaluation

If you're unsure which backend to commit to, the cheapest path is to register
**both** subscribers on the bus for a week, watch how each dashboard renders
your real workload, then unregister the loser. The bus pattern means that's
zero-effort beyond writing the second subscriber.

---

## Migration cost between foundations

Foundation migrations are **purely internal refactors** — no data is lost, no
external service changes. The cost is the LOC delta plus the risk of
introducing regressions in call sites. Three classes of impact matter:

1. **Call-site impact** — does every `debug('ns').info(...)` need rewriting,
   or do they keep working through a thin shim?
2. **Feature delta** — does the new foundation lose levels, namespaces or
   structured records that existing call sites rely on?
3. **Bundle delta** — net change to shipped JS.

The table below assumes the chosen path (custom event-bus). All entries
preserve the bus + overlay + Sentry subscriber; only the **logger primitive**
changes.

| Move from custom event-bus to… | Call-site impact | Feature delta | Bundle delta | Total time | Notes |
|---|---|---|---|---|---|
| **`debug` (visionmedia)** | Wrap with shim — call sites unchanged | Lose `info`/`warn`/`error` distinction (debug has one level); namespaces preserved | +5 KB | 1–2 h | Adopt `localStorage.debug='ns:*'` filter syntax. Levels collapse into one — recreate them as namespace suffixes (`ns:warn`, `ns:error`). |
| **`consola`** | Light shim — same `info/warn/error` API | Gain pretty console output, typed levels; lose namespace tree (consola uses flat tags) | +8 KB | 2–3 h | Map `debug('demo:rob:fk')` → `consola.withTag('demo:rob:fk')`. Fluent API like `.success()` is bonus. |
| **`pino` browser** | Heavy refactor — pino is structured-record first | Gain structured JSON ready for backend shipping; lose ergonomic `info('msg', obj)` (becomes `info({...})`) | +15 KB | 4–6 h | Worth it only if you plan to ship JSON to a log aggregator. Child loggers (`pino.child({ ns })`) replace namespaces cleanly. |
| **`loglevel`** | Light shim | Lose namespaces entirely (loglevel is global) | +1 KB | 1 h | You'd add a tiny namespace layer on top → effectively recreates 80 % of the custom bus. Rarely worth swapping to. |
| **`tslog`** | Light shim | Gain pretty stack traces with source maps; hierarchical loggers map well | +10 KB | 2 h | Closest drop-in replacement: `new Logger({ name: 'demo:rob' })` ≈ `debug('demo:rob')`. |
| **Sentry SDK as the foundation** (no bus) | Total rewrite of every call site to use `Sentry.captureMessage` directly | Tightly couples the codebase to Sentry; reverses the migration matrix above | +30 KB (already shipped) | 6–10 h | **Anti-pattern.** Don't do this — you trade a flexible bus for vendor lock-in, and every backend migration becomes a full-codebase refactor. |

### What stays put across every foundation swap

- `lib/debug-network.ts` (fetch/XHR taps).
- `components/DebugOverlay.tsx`.
- `components/DebugInit.astro` enable detection.
- All backend subscribers (Sentry, Highlight, etc. — they consume bus events,
  not raw logger calls).
- Tests at the bus layer (you'd add tests for the new shim).

### Reverse direction notes

- **Anything → custom event-bus**: same shape as the table above. The shim
  goes the other direction (your existing `consola.info(...)` calls become
  `bus.emit('log', { level: 'info', ... })`).
- **`debug` → `consola`** (skipping the bus): trivial because both share
  level-less ↔ level-with-tag patterns; ~1 h.
- **`pino` → `consola`** (skipping the bus): structured records lose
  resolution; ~3 h.

### Why this is uniformly cheap

Because the **bus is the public API** that every call site uses. The
foundation choice is hidden behind a one-file adapter. Without that adapter
layer, swapping `consola` for `debug` would touch every call site in every
demo — easily a multi-day refactor.

This is the second payoff of the bus pattern (the first being free backend
swaps).

---

## Migration cost between architectural patterns

Pattern migrations are the **heaviest internal refactor** — they restructure
how producers, the logger and consumers are wired. Costs scale with how many
consumers exist (overlay, console, Sentry, network tap, FPS sampler, future
sinks).

The table below assumes the chosen path (event bus, ≈4 consumers).

| Move from event bus to… | Call-site impact | Consumer wiring | Test impact | Time | Notes |
|---|---|---|---|---|---|
| **Transport pipeline** (Winston-style) | None — call sites still use `debug(ns)` | Each subscriber becomes a `Transport` object with `level`, `format`, `log()`. Logger holds an ordered list. | Rewrite bus tests as transport tests | 4–6 h | Gain explicit ordering + per-transport level filters. Lose ability for *any* code to subscribe at runtime — transports must be added at logger init. |
| **Plain facade** | None directly, but composability evaporates | All consumers collapse into one function: `function log(...) { console.log(...); overlay.append(...); Sentry.captureMessage(...); }` | Mock `console`, `overlay`, `Sentry` separately | 2–3 h | **Regression.** Adding a new sink later means editing the facade. Only sane for prototypes. |
| **React context + Astro global** | High — every `.tsx` demo needs `useDebug()` to read from context; every `<X client:idle />` needs a `<LoggerProvider>` wrapper | Logger lives at the React tree root for islands, plus a global for inline scripts | Add provider mocks to every island test | 6–10 h | Gain testability via DI; lose simplicity. Dual-system (context + global) duplication is permanent. Worth it only if you start writing many isolated unit tests of demos. |
| **RxJS `Subject`-based bus** | Light — `bus.on('log', fn)` becomes `subject$.subscribe(fn)` | Each subscriber becomes an Observable consumer; gain `pipe(filter, debounce, throttle, ...)` | Update tests to use `TestScheduler` | 3–4 h | Gain operators (rate-limit, group, replay). Add ≈10 KB unless you tree-shake aggressively. Worth it only if you already use RxJS in demos. |
| **OpenTelemetry tracing-first** | Total — every `debug(ns).info(...)` becomes a span event inside an active span context | Spans replace logs as the primary unit; logs become attached events | Rewrite all tests | 10–15 h | Standard for distributed systems, mismatch for a single-page portfolio. Only worth it if you go all-in on OTel and Faro/Honeycomb backends. |

### Reverse direction (and cross-pattern) notes

| Direction | Cost | Notes |
|---|---|---|
| Plain facade → event bus | 4–6 h | Have to invent the abstraction layer; every hard-coded sink call gets routed through the bus. Likely the migration you'd actually do once a prototype outgrows its facade. |
| Plain facade → transport pipeline | 4–6 h | Same shape as above; the inventory of sinks becomes the transport list. |
| Transport pipeline → event bus | 2–3 h | Easier than the reverse — drop the transport interface, register `(record) => transport.log(record)` as a subscriber. |
| Context + global → event bus | 1–2 h | Drop the provider tree; convert `useDebug()` to import the bus directly. |
| RxJS Subject → event bus | 1 h | Replace `subject$.next(...)` with `bus.emit(...)`; subscribers re-attach as plain `addEventListener`. |
| Anything → OTel tracing-first | 10–15 h | Always heavy; OTel changes the data model, not just the wiring. |

### What stays put across every pattern swap

- The list of *who* logs (every call site).
- The contents of each log entry (level, namespace, message, args).
- The overlay UI rendering (input shape preserved by adapter at the boundary).
- Backend subscribers (their input is whatever the new pattern dispatches).
- The network tap, FPS sampler, error listeners.

### Why pattern migrations are the heaviest

Because they re-shape *every* coupling between producer and consumer. The
foundation migration only touches the producer side; the backend migration
only touches one consumer. The pattern migration touches both sides plus the
glue.

Implication: if there's any chance you'll change *patterns* later, do it
early — before adding many consumers.

---

## Migration cost summary across all three axes

| Axis | What changes | Typical effort | Data loss? |
|---|---|---|---|
| **Backend** (Sentry → Highlight, etc.) | One subscriber file + config + env vars | 30 min – 2 h | Yes — historical events / replays |
| **Foundation** (custom bus → consola, etc.) | One adapter file behind the bus | 1–6 h | None |
| **Pattern** (event bus → transport pipeline, etc.) | Logger core + every consumer's wiring | 2–15 h | None |
| **All three at once** | Effectively rewriting the system | 1–2 days | Yes |

Practical rule: **lock in the pattern first, swap foundations and backends
freely later.** This is exactly the order the recommendation section
implements — pattern-decision (event bus) is committed up front; foundation
(custom) and backend (Sentry hosted) are interchangeable downstream.

---

## Testing locally before committing

The chosen path can be exercised end-to-end on a laptop without ever creating
a sentry.io account. Three layers, each with its own local test surface.

### Layer 1 — Pure-code units (bus, overlay, network tap, hook)

Vitest is already configured (`[PersonalPortfolio/package.json](PersonalPortfolio/package.json)`,
existing tests in `[PersonalPortfolio/src/__tests__/](PersonalPortfolio/src/__tests__/)`).
`debug.test.ts` covers:

- Namespace filtering (`debug('demo:rob:fk').info(...)` matched by
  `'demo:rob:*'`).
- Level gating.
- Ring-buffer eviction (oldest entries dropped past max).
- `fetch` interception via `vi.stubGlobal('fetch', ...)`.
- Bus event ordering (subscribers fire in registration order).

Runs offline in milliseconds: `npm test`.

### Layer 2 — Integration with Sentry SDK via Sentry Spotlight

[Sentry Spotlight](https://spotlightjs.com) is a free, open-source (MIT) local
dashboard maintained by the Sentry team. It receives the **same events** the
official Astro Sentry integration would send to the cloud, renders them in a
sidecar UI injected into `astro dev`, and never opens a network connection
outside `localhost`.

Setup:

```bash
npm install @sentry/astro @spotlightjs/astro
```

```ts
// astro.config.mjs
import sentry from '@sentry/astro';
import spotlight from '@spotlightjs/astro';

export default defineConfig({
  integrations: [
    sentry({ dsn: 'https://test@test/0', environment: 'local' }),
    spotlight(),  // automatically stripped from production builds
  ],
});
```

What you get locally:

- Sentry-style dashboard at the dev toolbar — no account required.
- Errors, transactions, breadcrumbs, source-mapped stack traces.
- Source maps from Vite work without manual upload.
- Same SDK behaviour as production → no "works locally, breaks in prod"
  surprises.

What's *not* covered by Spotlight (vs hosted Sentry):

- Session replay (Spotlight doesn't render replays).
- Alerts and notifications (no alerting backend locally).
- Issue grouping across releases (single-session view only).
- Team / org / SSO features.

Replay specifically can be verified separately by enabling the Replay
integration once with a real DSN; you only need to do this once to confirm
the wiring.

### Layer 3 — Real Sentry hosted dashboard

When the time comes to verify the actual `sentry.io` dashboard:

1. Free account + new "Astro" project; copy DSN.
2. Replace the fake DSN in `astro.config.mjs` (or move it behind
   `import.meta.env.PUBLIC_SENTRY_DSN` and put the real value in `.env`).
3. Run `astro dev`, trigger a test error → confirm it lands in the hosted UI
   within ~5 s.
4. If unsatisfied: delete the project, restore the fake DSN, back to
   Spotlight only. No data orphaned.

### Why Spotlight changes the migration story

Spotlight removes the "I have to commit to Sentry to find out if I like it"
risk. The whole event pipeline can be exercised against the same SDK, with a
real dashboard, without any external dependency. Migration to a different
backend later is still trivial (one subscriber file), but Spotlight makes the
pre-commit evaluation effectively free.

For the other backends in the migration matrix:

| Backend | Local-only test path |
|---|---|
| **Sentry hosted** | Sentry Spotlight (this section) |
| **Highlight self-hosted** | `docker compose up` from the Highlight repo — same code as production |
| **Highlight hosted** | Free hobby project at app.highlight.io |
| **PostHog self-hosted** | Single-container `posthog/posthog` Docker image |
| **PostHog Cloud** | Free hobby project at app.posthog.com |
| **Grafana Faro** | Local Grafana + Loki + Tempo stack via `docker compose`, or Grafana Cloud free tier |
| **Custom local WS dashboard** | n/a — it *is* the local stack |
| **In-page overlay only** | `astro dev` — nothing else needed |

So every option in the matrix has a no-account, no-cloud path that exercises
the same SDK / wiring as the production deployment. You're not choosing
blind.
