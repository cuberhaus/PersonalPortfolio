# Contributing

Quick reference for getting set up and shipping changes.

## First clone

```bash
git clone https://github.com/cuberhaus/PersonalPortfolio.git
cd PersonalPortfolio
make install
```

`make install` runs `npm install`, then `npx playwright install chromium`. It also probes for Go and Rust toolchains (printed if missing — needed only for the joc-eda and pracpro2 backend tests; safe to skip if you're not touching those).

If `make install` errored on the Playwright browser fetch (corp proxy, flaky network), re-run `npx playwright install chromium` directly.

You also need **Docker** + **jq** for `make dev-bare` (the multi-backend dev mode). Skip if you're only touching the Astro side of things.

## Day-to-day

| Command         | What it does                                                           |
| --------------- | ---------------------------------------------------------------------- |
| `make dev`      | Astro dev server only — fastest iteration, no demo backends            |
| `make dev-bare` | Astro + every demo's Docker backend (no Sentry / MLOps)                |
| `make all`      | Everything: Sentry self-hosted + MLOps overlay + every backend + Astro |
| `make stop`     | Stop all containers and processes started above                        |
| `make health`   | Ping every backend port and report up/down                             |
| `make help`     | List every Makefile target with its description                        |

The full backend matrix (which port serves which demo, where each lives on disk) is in the [README](README.md#make-dev-bare).

## Before you commit

```bash
npm run check          # astro check (TypeScript strict)
npm run lint           # eslint
npm run format         # prettier --write
npm test               # vitest (~1300 tests)
```

Lefthook is configured in [lefthook.yml](lefthook.yml):

- **pre-commit** auto-runs `eslint --fix` and `prettier --write` on staged JS/TS/Astro/JSON/MD/YAML/CSS files. Fixes are restaged before the commit lands.
- **commit-msg** has a `no-commit-on-main` guard — direct commits to `main` are rejected. Branch off, push, open a PR.

If lefthook itself ever misbehaves on Windows (rare, usually a node_modules platform mismatch from a WSL `npm install`), bypass with `LEFTHOOK=0 git commit -m "..."` and fix the install separately.

## The test layer cake

Run the same checks CI runs, locally:

| Layer                     | Command                                                               | Where it runs in CI          |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------- |
| Type-check                | `npm run check`                                                       | `quality` job                |
| Lint                      | `npm run lint`                                                        | `quality` job                |
| Format                    | `npm run format:check`                                                | `quality` job                |
| Audit (prod deps)         | `npm run audit:ci`                                                    | `quality` job                |
| Unit                      | `npm test`                                                            | `vitest` job                 |
| Backend (FastAPI planner) | `cd planner-api && pytest`                                            | `planner-api` job            |
| Browser smoke             | `make test-keyboard`, `npx playwright test --project=portfolio-smoke` | `playwright (matrix)` job    |
| A11y                      | `make test-a11y`                                                      | `playwright-a11y` (4 shards) |
| Visual regression         | `make test-visual` (after baselines committed)                        | `playwright-visual`          |
| Performance               | `npm run lhci`                                                        | `lighthouse` job             |

`make test` runs _everything_ including the optional Go and Rust backend tests in sibling repos — that's the full CI equivalent.

### A11y test patterns

The `a11y` Playwright project ([e2e/a11y.spec.ts](e2e/a11y.spec.ts)) runs three kinds of audit, each cycling through every theme:

| Block                    | What it catches                                                                                                                                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `homepage shells`        | Standard axe-core scan over `/`, `/es/`, `/ca/` per theme. Catches missing labels, ARIA misuse, color-contrast on solid backgrounds.                                                                                                                                       |
| `demo routes`            | Same axe scan over each demo route. Catches a11y issues unique to interactive demo UIs.                                                                                                                                                                                    |
| `hover states`           | Hovers each card-ish selector (`.work-card`, `.timeline-content`, etc.) before scanning. Catches the **yellow-card-with-faint-bullets** class of bug — issues that only manifest on `:hover`.                                                                              |
| `gradient text contrast` | Custom WCAG luminance check on `button` / `a.btn` / `.btn-primary`. axe-core returns `incomplete` (not `violation`) when the background is a gradient — we sample the gradient ourselves and assert >= 4.5:1. Skips invisible elements (`display:none`, `opacity < 0.05`). |

#### When to add a new selector or route

- **New gradient button:** if it's `button`/`a.btn`/`.btn-primary`, it's already covered when its route is in the test list. Otherwise add the selector to `GRADIENT_TEXT_SELECTORS`.
- **New card-style component with hover state changes:** add the selector to `HOVER_TARGETS`.
- **New route with interactive UI worth hover-testing:** the hover block hits `/` only; the gradient-contrast block hits a small `routes` array. Extend `routes` to include the new path.

#### Fixing gradient-text contrast violations

The standard fix is a black overlay layer that darkens the gradient enough for white text:

```css
background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), var(--accent-gradient);
color: #fff;
```

This works across every theme (the worst offender is phosphor — pure green; even there a 0.5 overlay clears 4.5:1). See [Contact.astro](src/components/Contact.astro), [ScrollToTop.astro](src/components/ScrollToTop.astro), and the demo button styles for live examples.

For inline-style React components, the equivalent is:

```tsx
background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), linear-gradient(135deg, ${accent1}, ${accent2})`,
color: '#fff',
```

## Adding a new demo

The end-to-end checklist (where to put files, how to wire i18n, how to register routes, what tests to add) lives in [docs/adding-a-demo.md](docs/adding-a-demo.md). The codemods in `scripts/wrap-demos-with-error-boundary.mjs` and `scripts/wire-demos-og-image.mjs` will pick up new demos automatically when re-run.

## Architecture decisions and observability

- [docs/decisions.md](docs/decisions.md) — why the codebase looks the way it does (logging, debug bus, design choices)
- [docs/observability.md](docs/observability.md) — Sentry self-hosted + MLOps overlay setup
- [docs/i18n.md](docs/i18n.md) — translation file structure and conventions
- [docs/debugging-architecture.md](docs/debugging-architecture.md) — the in-page debug overlay

## Reporting issues

Open a GitHub issue. Include the demo slug (or "site-wide"), browser + OS, and a screenshot if it's visual. Console output and the URL of the failing page help a lot.
