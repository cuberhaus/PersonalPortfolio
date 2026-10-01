# Testing guide

Tour of the test pyramid: which suite catches which class of bug, where to add a
new test, and how to run only the slice you care about.

> **Day-to-day pre-commit:** `make test`. Lefthook re-runs eslint + prettier on
> staged files automatically; see
> [CONTRIBUTING.md § Before you commit](../../CONTRIBUTING.md#before-you-commit).
> **Exhaustive local validation:** `make test-full` runs the fast gate +
> Playwright + every backend's pytest / Go / Rust suite. Use it before opening a
> PR; use the targeted commands below day-to-day.

---

## The pyramid at a glance

```text
              ┌────────────────────────────┐
              │  visual  (Linux only)      │  pixel diffs vs PNG baselines
              ├────────────────────────────┤
              │  a11y    (axe + custom)    │  WCAG AA × every theme
              ├────────────────────────────┤
              │  Playwright projects       │  smoke / browser-demos / live / hosted /
              │  (11 test projects)        │  themes / gallery / keyboard
              ├────────────────────────────┤
              │  Vitest  (~30 suites)      │  units, content parity, registry
              ├────────────────────────────┤
              │  Type-check + lint         │  `astro check`, eslint
              └────────────────────────────┘
```

Rule of thumb when adding a test:

| What you're protecting              | Where the test goes                                                 |
| ----------------------------------- | ------------------------------------------------------------------- |
| Pure logic / algorithm              | Vitest — sibling test next to closest existing one                  |
| Data file shape (JSON triples)      | Vitest — extend `content-parity.test.ts` / `data-integrity.test.ts` |
| SSOT consistency across files       | Vitest — extend `structural.test.ts` or `demo-registry.test.ts`     |
| React component behavior in DOM     | Vitest with `@testing-library/react` (jsdom env)                    |
| Page renders without console errors | Playwright `browser-demos` — append to `ALL_SLUGS`                  |
| Tab-order / focus / keyboard        | Playwright `keyboard`                                               |
| Color contrast / ARIA               | Playwright `a11y`                                                   |
| Layout drift                        | Playwright `visual` (regenerate baselines on Linux only)            |
| Live backend integration            | Playwright `live-demos` (auto-skips if backend down)                |
| Hosted (sleeping) live app flow     | Playwright `hosted-demos` (no backend needed; never skips)          |

---

## Vitest — unit and integration

`npm test` runs every `*.test.ts` / `*.test.tsx` file under
[src/\_\_tests\_\_/](../../src/__tests__/). Watch mode: `npx vitest`.

### Categories

| Category                      | Examples                                                                                                                                                                                                                                                                                                                                                                                                       | What they catch                                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pure logic**                | [wpgma.test.ts](../../src/__tests__/wpgma.test.ts), [graph-phase.test.ts](../../src/__tests__/graph-phase.test.ts), [imgproc.test.ts](../../src/__tests__/imgproc.test.ts), [par-kernels.test.ts](../../src/__tests__/par-kernels.test.ts)                                                                                                                                                                     | Algorithm regressions in demos. Cheap, deterministic, no DOM.                                                                                                                                   |
| **Content parity**            | [content-parity.test.ts](../../src/__tests__/content-parity.test.ts), [data-integrity.test.ts](../../src/__tests__/data-integrity.test.ts)                                                                                                                                                                                                                                                                     | i18n parity rule: `foo.json` / `foo.es.json` / `foo.ca.json` must match length, field set, and order. **Run these after every content edit.**                                                   |
| **Schema enforcement**        | [demo-schema.test.ts](../../src/__tests__/demo-schema.test.ts), [content-schemas.test.ts](../../src/__tests__/content-schemas.test.ts)                                                                                                                                                                                                                                                                         | Zod schemas for demo cards, certifications, etc. Catches typos in icon enum, broken github URLs.                                                                                                |
| **Cross-file SSOT**           | [structural.test.ts](../../src/__tests__/structural.test.ts), [demo-registry.test.ts](../../src/__tests__/demo-registry.test.ts), [demo-registry-adapter.test.ts](../../src/__tests__/demo-registry-adapter.test.ts)                                                                                                                                                                                           | Section IDs match between sections SSOT and Astro components, registry projections validate, ports are unique, and every backend stack is documented in [adding-a-demo.md](./adding-a-demo.md). |
| **Consent-first analytics**   | [analytics-consent.test.ts](../../src/__tests__/analytics-consent.test.ts), [analytics-source-guard.test.ts](../../src/__tests__/analytics-source-guard.test.ts)                                                                                                                                                                                                                                               | The consent controller against fake storage, window and document, plus static guards that only the consent module names Google. See [analytics-and-privacy.md](./analytics-and-privacy.md).     |
| **Static contrast**           | [theme-contrast.test.ts](../../src/__tests__/theme-contrast.test.ts)                                                                                                                                                                                                                                                                                                                                           | WCAG AA on token pairs in `global.css` + `themes.css`. Complements axe, which only sees rendered DOM.                                                                                           |
| **Debug bus internals**       | [debug.test.ts](../../src/__tests__/debug.test.ts), [debug-sentry.test.ts](../../src/__tests__/debug-sentry.test.ts), [debug-session.test.ts](../../src/__tests__/debug-session.test.ts), [debug-lifecycle.test.ts](../../src/__tests__/debug-lifecycle.test.ts), [debug-network.test.ts](../../src/__tests__/debug-network.test.ts), [debug-docker-log.test.ts](../../src/__tests__/debug-docker-log.test.ts) | The custom event bus, reversible network and iframe taps, Docker relay processing, and lifecycle that drive the in-page overlay + Sentry forwarder.                                             |
| **Runtime orchestration**     | [live-app-orchestration.test.ts](../../src/__tests__/live-app-orchestration.test.ts), [demo-page.test.ts](../../src/__tests__/demo-page.test.ts)                                                                                                                                                                                                                                                               | Live URL resolution/probing and shared locale/metadata assembly at their production seams.                                                                                                      |
| **React component rendering** | [error-boundary.test.tsx](../../src/__tests__/error-boundary.test.tsx), [live-app-embed.test.ts](../../src/__tests__/live-app-embed.test.ts)                                                                                                                                                                                                                                                                   | Component-level behavior in jsdom. Cheaper than Playwright but you don't get a real browser.                                                                                                    |
| **Demo state machines**       | [tenda-demo-state.test.ts](../../src/__tests__/tenda-demo-state.test.ts), [draculin-demo-state.test.ts](../../src/__tests__/draculin-demo-state.test.ts), [planificacion-demo.test.ts](../../src/__tests__/planificacion-demo.test.ts)                                                                                                                                                                         | Per-demo logic that's complex enough to deserve unit coverage independent of the playback path.                                                                                                 |

### Adding a unit test

Skeleton — see also
[everyday-tasks.md § 12](./everyday-tasks.md#12-adding-a-vitest-unit-test):

```ts
import { describe, it, expect } from 'vitest';
import { thingUnderTest } from '../lib/<thing>';

describe('thingUnderTest', () => {
  it('does the thing', () => {
    expect(thingUnderTest(42)).toBe('expected');
  });
});
```

Naming the file `<feature>.test.ts` is enough — Vitest picks it up via
[vitest.config.ts](../../vitest.config.ts).

### Useful filters

```bash
npx vitest run content-parity              # one suite by name
npx vitest run --reporter=verbose          # full per-test output
npx vitest                                  # watch mode
make check-registry                         # only the registry test (sub-second, pre-commit)
npx vitest run src/__tests__/live-app-orchestration.test.ts src/__tests__/debug-lifecycle.test.ts src/__tests__/debug-network.test.ts src/__tests__/demo-services.test.ts src/__tests__/demo-registry.test.ts src/__tests__/demo-registry-adapter.test.ts src/__tests__/demo-page.test.ts
```

The registry boundary can also be checked without starting the site:

```bash
node scripts/demo-registry.mjs --ports
node scripts/demo-registry.mjs --orchestrators
```

---

## Playwright — end-to-end

11 test projects (plus one setup project) in
[playwright.config.ts](../../playwright.config.ts), each with its own `testMatch`
regex. `npm run test:e2e` runs all of them and
auto-starts the dev server on port 4321.

| Project           | What it covers                                                                                                                                             | Spec                                                         | Local command                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `portfolio-smoke` | Homepage + localized shells render, navbar anchors point at real sections, scroll-spy works.                                                               | [portfolio-smoke.spec.ts](../../e2e/portfolio-smoke.spec.ts) | `npm run test:e2e:smoke`                                        |
| `browser-demos`   | Every demo route in `ALL_SLUGS` loads without uncaught console errors. Sidebar nav covers every demo.                                                      | [browser-demos.spec.ts](../../e2e/browser-demos.spec.ts)     | `npx playwright test --project=browser-demos`                   |
| `live-demos`      | Iframe-embedded demos against running Docker backends. **Auto-skips** if the backend on its port doesn't answer.                                           | [live-demos.spec.ts](../../e2e/live-demos.spec.ts)           | `make dev-bare` then `npx playwright test --project=live-demos` |
| `hosted-demos`    | Hosted live app: sleeps until started, wakes via `/health`, times out and retries, switched-off state, es/ca copy, loopback stays local, axe per state.    | [hosted-demos.spec.ts](../../e2e/hosted-demos.spec.ts)       | `npx playwright test --project=hosted-demos`                    |
| `themes`          | Ctrl+K modal opens, design + palette persist across reload, font-family actually changes.                                                                  | [themes.spec.ts](../../e2e/themes.spec.ts)                   | `npx playwright test --project=themes`                          |
| `debug-overlay`   | `?debug=1` gates the overlay, the in-DOM ring buffer captures the right namespaces / levels, `?debug=0` disables it.                                       | [debug-overlay.spec.ts](../../e2e/debug-overlay.spec.ts)     | `npx playwright test --project=debug-overlay`                   |
| `keyboard`        | Skip-to-content link reachable, Enter-to-submit handlers fire, no keyboard traps inside demos.                                                             | [keyboard.spec.ts](../../e2e/keyboard.spec.ts)               | `make test-keyboard`                                            |
| `a11y`            | axe-core scan over `/`, `/es/`, `/ca/`, every demo route, every theme, including hover states and a custom gradient-contrast check.                        | [a11y.spec.ts](../../e2e/a11y.spec.ts)                       | `make test-a11y` / `make test-a11y-grep PATTERN=…`              |
| `visual`          | Pixel-diff vs committed PNG baselines, 1% drift tolerance. Animations disabled via `addInitScript`. **Linux-only baselines** (font hinting differs by OS). | [visual.spec.ts](../../e2e/visual.spec.ts)                   | `make test-visual`                                              |
| `readme-gallery`  | Deterministic docs captures, including one canonical desktop JPEG per registered demo.                                                                     | [readme-gallery.spec.ts](../../e2e/readme-gallery.spec.ts)   | `npm run demo-gallery:capture`                                  |

Two more projects belong to consent-first analytics. `analytics-consent-build` is
the setup project: it builds a **second copy** of the site with a fake GA4 ID,
because the default `dist` must stay analytics-free for everything else.
`analytics-consent` then tests that copy in a real browser with every Google
request stubbed (`npm run test:e2e:consent`, `make test-consent`). See
[analytics-and-privacy.md § Testing](./analytics-and-privacy.md#testing).

`npm run demo-gallery:check` validates that the generated index is current and
that its stable JPEG set exactly matches the page-backed demo registry. CI also
runs the capture project so a route that cannot produce a screenshot fails. The
project pins a 1440x900 viewport, English locale, dark theme, minimal design,
animation clock, and offline backend state before waiting for fonts and canvas
rendering to settle.

### Refreshing the demo gallery

The `readme-gallery` CI job captures every demo and then runs
`npm run demo-gallery:compare`. It fails when `docs/demo-gallery.md` changed, when a
committed JPEG's dimensions changed, or when a capture differs materially from the
committed image. A UI change that shifts a demo's layout, such as a border that makes
every chip 2 px larger, therefore has to refresh that demo's image in the same PR.

"Materially" means either limit in `comparisonPolicy`
([compare-demo-gallery.mjs](../../scripts/compare-demo-gallery.mjs)) is exceeded, where a
pixel's delta is its largest difference in any colour channel:

| Limit      | Fails when                              | Catches                                                    |
| ---------- | --------------------------------------- | ---------------------------------------------------------- |
| Structural | more than 40 pixels differ by over 88   | changed content, layout or colour (anything high-contrast) |
| Broad      | more than 4,000 pixels differ by over 8 | wide, low-contrast changes such as a shifted background    |

Anything smaller is treated as rasterization noise. A glyph that lands one sub-pixel step
(a quarter pixel) off moves an edge pixel by at most a quarter of the text/background
contrast, about 64, plus a little from JPEG quantisation. A single "pixels over 8" count
cannot tell that apart from a real change, which is why the structural limit counts only
large deltas. The numbers were fitted to measured CI renders: the smallest real change in
the gallery's history has 78 pixels over 88 and the ROB canvas label font race had 123,
while the noise described below has none. If you retune a limit, check it against both
groups; [demo-gallery.test.ts](../../src/__tests__/demo-gallery.test.ts) models the noise
and the regressions.

Known noise: on 2026-10-01 one CI run rendered two of the twenty pages with some glyphs a
sub-pixel step off (`algorithms.jpg` 778 pixels over 8, `draculin.jpg` 1,000, largest delta
62). The next run, with identical content, was clean. The cause was not identified and about
1,300 local captures could not reproduce it, so the policy tolerates the symptom rather than
explaining it. Tolerated images are still logged as
`<slug>.jpg: tolerated <N> rasterized pixels (max delta <D>)`, so a recurrence, or a max delta
creeping towards 88, stays visible in the compare step's log.

Take the new images from CI, not from a local run: a Windows capture is not reliably
within these limits, and CI's capture is the one the job compares against.

1. Open the failing `Tests` run and read the compare step's log; it names every failing
   image with the limit it broke, the region of the picture that changed and the largest
   delta, for example
   `rob-robotics.jpg: 123 pixels changed by more than 88 (limit 40), in x603-701 y887-894; max delta 157`.
2. Download the `demo-gallery` artifact (kept for 7 days and uploaded even when the
   compare step fails).
3. Copy the named JPEGs from `assets/demo-gallery/` in the archive to
   `docs/assets/demo-gallery/`, commit them, and push. If the log also says
   `docs/demo-gallery.md changed`, copy `demo-gallery.md` to `docs/` too.

A UI change that moves both the gallery and the [visual baselines](#visual-baselines)
needs both refreshes, and each refresh PR fails the other's job until both are merged:
`playwright-visual` on the gallery PR, `readme-gallery` on the baselines PR. Merge them
back to back.

### Adding a Playwright test

Pick an existing project whose `testMatch` regex catches your filename, then
copy the closest spec as a starting point. Skeleton — see also
[everyday-tasks.md § 13](./everyday-tasks.md#13-adding-a-playwright-e2e-test).

If the new test doesn't fit any existing project, add a new `projects[]` entry
in [playwright.config.ts](../../playwright.config.ts) — match the existing
pattern (testMatch regex, sensible `retries: 0` for deterministic suites, custom
timeout if it's slow).

### A11y patterns

The `a11y` project runs three kinds of audit per theme:

| Block               | Catches                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `homepage shells`   | Standard axe scan over `/`, `/es/`, `/ca/`. Missing labels, ARIA misuse, color contrast on solid backgrounds.                         |
| `demo routes`       | Same axe scan over each demo. A11y issues unique to interactive demo UIs.                                                             |
| `hover states`      | Hovers each card-ish selector before scanning. Catches contrast bugs that only manifest on `:hover` (yellow-card-with-faint-bullets). |
| `gradient contrast` | Custom WCAG luminance check on gradient buttons (axe returns `incomplete` on gradients). Skips invisible elements (`opacity < 0.05`). |

The project emulates `prefers-reduced-motion: reduce` (`test.use` at the top of
`a11y.spec.ts`). The site then shows every `.reveal` section immediately, so axe
audits the whole homepage. Without it, sections below the fold sit at
`opacity: 0` until scrolled into view, axe treats them as not applicable, and only
what is revealed on load gets checked. It also removes the reveal fade, so no scan
lands mid-transition. Use `contextOptions: { reducedMotion: 'reduce' }`: Playwright
Test silently ignores a top-level `reducedMotion` option.

When to extend it — see
[CONTRIBUTING.md § A11y test patterns](../../CONTRIBUTING.md#a11y-test-patterns).

### Visual baselines

Baselines live at `e2e/visual.spec.ts-snapshots/` and **must be regenerated on
Linux**. Two paths:

- **Recommended:** trigger the `Refresh visual baselines` GitHub Action
  (`Actions → Run workflow`). Opens a PR with the diff so each route's change is
  reviewable inline. The PR opens **without any checks**: GitHub does not start
  workflows for events caused by the default `GITHUB_TOKEN`. Close and reopen it
  once so `Tests` runs, and merge when `playwright-visual` is green.
- **Locally on Linux/WSL:** `make test-visual-update`, then commit the
  regenerated PNGs.

Don't regenerate on macOS or Windows — the diff will pass locally and fail in CI
because of font hinting.

### Live demos: why they auto-skip

[live-demos.spec.ts](../../e2e/live-demos.spec.ts) probes
`http://localhost:<port>/` in `beforeEach` and calls `test.skip(...)` if it
doesn't answer. Run `make dev-bare` first to bring backends up; otherwise the
suite is a no-op (intentional — CI without sibling repos can't run it).

The live-tested slug list is curated in `LIVE_E2E_SLUGS` — heavy GPU backends
and ones that have moved to browser-native mocks are excluded.

### Hosted demos: how they are tested without a host

A hosted live app only appears when the page is **not** served from loopback, and
the registry ships its switch off until the service exists. The `hosted-demos`
project therefore builds the situation itself, against the normal production
build, so it never skips:

- **Public-looking hostname.** The project's baseURL is `hosted.portfolio.test`,
  mapped to the preview server by Chromium's `--host-resolver-rules` (see
  [playwright.config.ts](../../playwright.config.ts)). Any non-loopback page host
  switches the embed into hosted mode.
- **Registry state per test.** `serveHostedRegistry` rewrites the registry's
  `hosted` block inside the JS the preview server sends, so each test picks
  on/off and the URL. It asserts the block was found exactly once, so a change to
  the bundle's shape fails loudly instead of silently testing the shipped switch.
  `route.fetch` runs in Node, where the browser's host mapping does not apply, so
  it fetches through the loopback address.
- **The hosted origin is played by the test.** `serveHostedService` answers
  `/health` (503 while "waking", 200 when ready, or never) and serves a tiny
  page for the iframe. It also records requests so the suite can assert that
  nothing is sent before the visitor presses Start, and that the poll is a simple
  CORS request (no `X-Session-Id`, `sentry-trace`, `baggage` or cookies).
- **Time is controlled, not waited for.** `page.clock.fastForward` crosses the
  120 s wake deadline in one step.

The loopback test (`stays on the local behaviour…`) uses the plain
`127.0.0.1` URL, which is how `live-demos` and the rest of the suite keep seeing
the local demo service.

---

## Backend tests (`make test-full`)

`make test-full` runs the exhaustive local suites in order:

1. **Vitest** — `npm test`
2. **Playwright** — all 10 projects, dev server auto-started
3. **pytest** — TFG, MPIDS, Phase, CAIM, SBC_IA, DesastresIA, BitsX, planner-api
4. **Django** — Draculin
5. **Go** — joc-eda backend (skipped if `go` not installed)
6. **Rust** — pracpro2 backend (skipped if `cargo` not installed)
7. **Vitest (JS)** — Planificación web

Sibling repos that are missing are silently skipped — running `make test-full`
inside a CI checkout that only has PersonalPortfolio is supported.

---

## Performance

Lighthouse CI via `npm run lhci`. Configured in
[lighthouserc.json](../../lighthouserc.json). Runs against the production
`dist/` build. Asserts targets in the same job named `lighthouse` in CI.

---

## CI matrix (in [.github/workflows/](../../.github/workflows/))

| Layer                      | Job                          |
| -------------------------- | ---------------------------- |
| Type-check + lint + format | `quality`                    |
| Audit (prod deps)          | `quality`                    |
| Vitest                     | `vitest`                     |
| Backend (FastAPI planner)  | `planner-api`                |
| Browser smoke              | `playwright (matrix)`        |
| Analytics consent          | `playwright` (keyboard leg)  |
| A11y                       | `playwright-a11y` (8 shards) |
| Visual regression          | `playwright-visual`          |
| Performance                | `lighthouse`                 |

---

## See also

- [everyday-tasks.md](./everyday-tasks.md) — recipes 12–14 for adding tests
- [adding-a-demo.md](./adding-a-demo.md) — what to test when adding a demo
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — pre-commit + CI parity
- [README.md § Testing](../../README.md#testing) — `make test-full` order &
  visual-regression workflow
