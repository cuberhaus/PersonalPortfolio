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

## Adding a new demo

The end-to-end checklist (where to put files, how to wire i18n, how to register routes, what tests to add) lives in [docs/adding-a-demo.md](docs/adding-a-demo.md). The codemods in `scripts/wrap-demos-with-error-boundary.mjs` and `scripts/wire-demos-og-image.mjs` will pick up new demos automatically when re-run.

## Architecture decisions and observability

- [docs/decisions.md](docs/decisions.md) — why the codebase looks the way it does (logging, debug bus, design choices)
- [docs/observability.md](docs/observability.md) — Sentry self-hosted + MLOps overlay setup
- [docs/i18n.md](docs/i18n.md) — translation file structure and conventions
- [docs/debugging-architecture.md](docs/debugging-architecture.md) — the in-page debug overlay

## Reporting issues

Open a GitHub issue. Include the demo slug (or "site-wide"), browser + OS, and a screenshot if it's visual. Console output and the URL of the failing page help a lot.
