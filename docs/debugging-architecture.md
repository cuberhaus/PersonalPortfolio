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
