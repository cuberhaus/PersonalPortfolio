# Testing guide

Tour of the test pyramid: which suite catches which class of bug, where to
add a new test, and how to run only the slice you care about.

> **Day-to-day pre-commit:** `npm run check && npm run lint && npm test`.
> Lefthook re-runs eslint + prettier on staged files automatically; see
> [CONTRIBUTING.md § Before you commit](../../CONTRIBUTING.md#before-you-commit).

> **Full CI parity locally:** `make test` runs Vitest + Playwright + every
> backend's pytest / Go / Rust suite. Use it before opening a PR; use the
> targeted commands below day-to-day.

---

## The pyramid at a glance

```text
              ┌────────────────────────────┐
              │  visual  (Linux only)      │  pixel diffs vs PNG baselines
              ├────────────────────────────┤
              │  a11y    (axe + custom)    │  WCAG AA × every theme
              ├────────────────────────────┤
              │  Playwright projects       │  smoke / browser-demos / live /
              │  (8 named projects)        │  themes / debug-overlay / keyboard
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

---

## Vitest — unit and integration

`npm test` runs every `*.test.ts` / `*.test.tsx` file under
[src/\_\_tests\_\_/](../../src/__tests__/). Watch mode: `npx vitest`.

### Categories

| Category                      | Examples                                                                                                                                                                                                                                   | What they catch                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pure logic**                | [wpgma.test.ts](../../src/__tests__/wpgma.test.ts), [graph-phase.test.ts](../../src/__tests__/graph-phase.test.ts), [imgproc.test.ts](../../src/__tests__/imgproc.test.ts), [par-kernels.test.ts](../../src/__tests__/par-kernels.test.ts) | Algorithm regressions in demos. Cheap, deterministic, no DOM.                                                                                                                                |
| **Content parity**            | [content-parity.test.ts](../../src/__tests__/content-parity.test.ts), [data-integrity.test.ts](../../src/__tests__/data-integrity.test.ts)                                                                                                 | i18n parity rule: `foo.json` / `foo.es.json` / `foo.ca.json` must match length, field set, and order. **Run these after every content edit.**                                                |
| **Schema enforcement**        | [demo-schema.test.ts](../../src/__tests__/demo-schema.test.ts), [content-schemas.test.ts](../../src/__tests__/content-schemas.test.ts)                                                                                                     | Zod schemas for demo cards, certifications, etc. Catches typos in icon enum, broken github URLs.                                                                                             |
| **Cross-file SSOT**           | [structural.test.ts](../../src/__tests__/structural.test.ts), [demo-registry.test.ts](../../src/__tests__/demo-registry.test.ts)                                                                                                           | Section IDs match between sections SSOT and Astro components, every demo's component path exists, ports unique, every backend stack is documented in [adding-a-demo.md](./adding-a-demo.md). |
| **Static contrast**           | [theme-contrast.test.ts](../../src/__tests__/theme-contrast.test.ts)                                                                                                                                                                       | WCAG AA on token pairs in `global.css` + `themes.css`. Complements axe, which only sees rendered DOM.                                                                                        |
| **Debug bus internals**       | [debug.test.ts](../../src/__tests__/debug.test.ts), [debug-sentry.test.ts](../../src/__tests__/debug-sentry.test.ts), [debug-session.test.ts](../../src/__tests__/debug-session.test.ts)                                                   | The custom event bus that drives the in-page overlay + Sentry forwarder.                                                                                                                     |
| **React component rendering** | [error-boundary.test.tsx](../../src/__tests__/error-boundary.test.tsx), [live-app-embed.test.ts](../../src/__tests__/live-app-embed.test.ts)                                                                                               | Component-level behavior in jsdom. Cheaper than Playwright but you don't get a real browser.                                                                                                 |
| **Demo state machines**       | [tenda-demo-state.test.ts](../../src/__tests__/tenda-demo-state.test.ts), [draculin-demo-state.test.ts](../../src/__tests__/draculin-demo-state.test.ts), [planificacion-demo.test.ts](../../src/__tests__/planificacion-demo.test.ts)     | Per-demo logic that's complex enough to deserve unit coverage independent of the playback path.                                                                                              |

### Adding a unit test

Skeleton — see also [everyday-tasks.md § 12](./everyday-tasks.md#12-adding-a-vitest-unit-test):

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
```

---

## Playwright — end-to-end

8 named projects in [playwright.config.ts](../../playwright.config.ts), each
with its own `testMatch` regex. `npm run test:e2e` runs all of them and
auto-starts the dev server on port 4321.

| Project           | What it covers                                                                                                                                             | Spec                                                         | Local command                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `portfolio-smoke` | Homepage + localized shells render, navbar anchors point at real sections, scroll-spy works.                                                               | [portfolio-smoke.spec.ts](../../e2e/portfolio-smoke.spec.ts) | `npm run test:e2e:smoke`                                        |
| `browser-demos`   | Every demo route in `ALL_SLUGS` loads without uncaught console errors. Sidebar nav covers every demo.                                                      | [browser-demos.spec.ts](../../e2e/browser-demos.spec.ts)     | `npx playwright test --project=browser-demos`                   |
| `live-demos`      | Iframe-embedded demos against running Docker backends. **Auto-skips** if the backend on its port doesn't answer.                                           | [live-demos.spec.ts](../../e2e/live-demos.spec.ts)           | `make dev-bare` then `npx playwright test --project=live-demos` |
| `themes`          | Ctrl+K modal opens, design + palette persist across reload, font-family actually changes.                                                                  | [themes.spec.ts](../../e2e/themes.spec.ts)                   | `npx playwright test --project=themes`                          |
| `debug-overlay`   | `?debug=1` gates the overlay, the in-DOM ring buffer captures the right namespaces / levels, `?debug=0` disables it.                                       | [debug-overlay.spec.ts](../../e2e/debug-overlay.spec.ts)     | `npx playwright test --project=debug-overlay`                   |
| `keyboard`        | Skip-to-content link reachable, Enter-to-submit handlers fire, no keyboard traps inside demos.                                                             | [keyboard.spec.ts](../../e2e/keyboard.spec.ts)               | `make test-keyboard`                                            |
| `a11y`            | axe-core scan over `/`, `/es/`, `/ca/`, every demo route, every theme, including hover states and a custom gradient-contrast check.                        | [a11y.spec.ts](../../e2e/a11y.spec.ts)                       | `make test-a11y` / `make test-a11y-grep PATTERN=…`              |
| `visual`          | Pixel-diff vs committed PNG baselines, 1% drift tolerance. Animations disabled via `addInitScript`. **Linux-only baselines** (font hinting differs by OS). | [visual.spec.ts](../../e2e/visual.spec.ts)                   | `make test-visual`                                              |

### Adding a Playwright test

Pick an existing project whose `testMatch` regex catches your filename, then
copy the closest spec as a starting point. Skeleton — see also
[everyday-tasks.md § 13](./everyday-tasks.md#13-adding-a-playwright-e2e-test).

If the new test doesn't fit any existing project, add a new `projects[]`
entry in [playwright.config.ts](../../playwright.config.ts) — match the
existing pattern (testMatch regex, sensible `retries: 0` for deterministic
suites, custom timeout if it's slow).

### A11y patterns

The `a11y` project runs three kinds of audit per theme:

| Block               | Catches                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `homepage shells`   | Standard axe scan over `/`, `/es/`, `/ca/`. Missing labels, ARIA misuse, color contrast on solid backgrounds.                         |
| `demo routes`       | Same axe scan over each demo. A11y issues unique to interactive demo UIs.                                                             |
| `hover states`      | Hovers each card-ish selector before scanning. Catches contrast bugs that only manifest on `:hover` (yellow-card-with-faint-bullets). |
| `gradient contrast` | Custom WCAG luminance check on gradient buttons (axe returns `incomplete` on gradients). Skips invisible elements (`opacity < 0.05`). |

When to extend it — see [CONTRIBUTING.md § A11y test patterns](../../CONTRIBUTING.md#a11y-test-patterns).

### Visual baselines

Baselines live at `e2e/visual.spec.ts-snapshots/` and **must be regenerated
on Linux**. Two paths:

- **Recommended:** trigger the `Refresh visual baselines` GitHub Action
  (`Actions → Run workflow`). Opens a PR with the diff so each route's
  change is reviewable inline.
- **Locally on Linux/WSL:** `make test-visual-update`, then commit the
  regenerated PNGs.

Don't regenerate on macOS or Windows — the diff will pass locally and fail
in CI because of font hinting.

### Live demos: why they auto-skip

[live-demos.spec.ts](../../e2e/live-demos.spec.ts) probes
`http://localhost:<port>/` in `beforeEach` and calls `test.skip(...)` if it
doesn't answer. Run `make dev-bare` first to bring backends up; otherwise
the suite is a no-op (intentional — CI without sibling repos can't run it).

The live-tested slug list is curated in `LIVE_E2E_SLUGS` — heavy GPU
backends and ones that have moved to browser-native mocks are excluded.

---

## Backend tests (`make test`)

`make test` runs everything CI runs in order:

1. **Vitest** — `npm test`
2. **Playwright** — all 8 projects, dev server auto-started
3. **pytest** — TFG, MPIDS, Phase, CAIM, SBC_IA, DesastresIA, BitsX,
   planner-api
4. **Django** — Draculin
5. **Go** — joc-eda backend (skipped if `go` not installed)
6. **Rust** — pracpro2 backend (skipped if `cargo` not installed)
7. **Vitest (JS)** — Planificación web

Sibling repos that are missing are silently skipped — running `make test`
inside a CI checkout that only has PersonalPortfolio is supported.

---

## Performance

Lighthouse CI via `npm run lhci`. Configured in [lighthouserc.json](../../lighthouserc.json).
Runs against the production `dist/` build. Asserts targets in the same job
named `lighthouse` in CI.

---

## CI matrix (in [.github/workflows/](../../.github/workflows/))

| Layer                      | Job                          |
| -------------------------- | ---------------------------- |
| Type-check + lint + format | `quality`                    |
| Audit (prod deps)          | `quality`                    |
| Vitest                     | `vitest`                     |
| Backend (FastAPI planner)  | `planner-api`                |
| Browser smoke              | `playwright (matrix)`        |
| A11y                       | `playwright-a11y` (4 shards) |
| Visual regression          | `playwright-visual`          |
| Performance                | `lighthouse`                 |

---

## See also

- [everyday-tasks.md](./everyday-tasks.md) — recipes 12–14 for adding tests
- [adding-a-demo.md](./adding-a-demo.md) — what to test when adding a demo
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — pre-commit + CI parity
- [README.md § Testing](../../README.md#testing) — `make test` order &
  visual-regression workflow
