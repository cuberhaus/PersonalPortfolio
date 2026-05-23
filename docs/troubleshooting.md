# Troubleshooting

Footguns we've hit and the fix for each. Search by error message — most
entries lead with the literal text the tool prints.

> **Before you blame the project:** clear caches and try again.
> `rm -rf node_modules/.vite dist .astro` is harmless and fixes ~30% of
> "it worked yesterday" reports.

---

## Frontend / dev server

### "jsxDEV is not a function" / "Cannot read properties of null (reading 'useState')"

**Symptom:** Playwright tests or browser console fail on demo pages with one
of those messages, often after running `astro build` and then `npm run dev`.

**Cause:** Vite's dependency optimization cache (`node_modules/.vite/deps/`)
was populated with `NODE_ENV=production`. The dev server reuses it, so
`react/jsx-dev-runtime` exports `jsxDEV = void 0` (production strips it)
and React hydration breaks.

**Fix:**

```bash
rm -rf node_modules/.vite
make dev
```

Or pass `--force` to skip the cache: `npx astro dev --force`.

---

### "Module not found: ../../../<sibling-repo>/..."

**Symptom:** TypeScript or `astro check` errors referencing a sibling repo
path (e.g. `../../subgrup-prop7.1/...`).

**Cause:** the project is laid out as part of a monorepo where each demo
backend is a sibling directory. Imports / link references that cross those
boundaries only resolve when the sibling exists.

**Fix:** clone the sibling next to `PersonalPortfolio/`, or — if you're
not touching that demo — ignore. Tests skip when siblings are absent
(see [demo-registry.test.ts](../src/__tests__/demo-registry.test.ts) `inParent` check).

---

### Astro dev server picks an unexpected port

**Symptom:** Playwright says "connection refused on :4321" but the Astro
banner shows `:4322` (or higher).

**Cause:** another process already owns 4321 — usually a stale `astro dev`
from a previous session, or a Docker container with `--network host`.

**Fix:**

```bash
make stop                          # stops every dev demo container
make free-ports                    # frees the demo backend ports
lsof -i :4321 || ss -tlnp '( sport = :4321 )'   # find the holder
```

If it's a leftover `astro dev`, kill it. If Playwright keeps failing, set
`PORT=…` and update `playwright.config.ts` `baseURL` accordingly.

---

## Test failures

### Visual diff fails locally but passes in CI (or vice-versa)

**Cause:** font hinting differs between Linux/macOS/Windows. The committed
PNG baselines in `e2e/visual.spec.ts-snapshots/` were generated on Linux
to match the Playwright CI runner.

**Fix:** don't regenerate baselines on macOS/Windows. Use the
**Refresh visual baselines** GitHub Action, or run
`make test-visual-update` inside WSL/Linux.

If you just want to inspect the diff locally on macOS/Windows, run
`make test-visual` and read the side-by-side diff in
`playwright-report/`. Don't commit the new baselines from there.

CI source: [.github/workflows/visual-baselines-refresh.yml](../.github/workflows/visual-baselines-refresh.yml).

---

### Playwright `a11y` job: "Target page closed" / context-closed timeouts

**Cause:** axe-core scans plus theme switching plus a busy box plus too
many parallel workers can outpace what the dev server can serve.

**Fix:** drop the worker count locally:

```bash
npx playwright test --project=a11y --workers=4   # what `make test-a11y` does
```

If you still see it, drop to `--workers=2`. CI pins this to 4 workers
across 4 shards, see [playwright.config.ts](../playwright.config.ts) `a11y`
project.

---

### Vitest: "Cannot find module '../data/foo.json'" after editing JSON

**Cause:** Vitest caches resolved modules. Adding a new locale file or
restructuring a JSON triple while watch mode is running can stick.

**Fix:** kill the watcher (`Ctrl+C` in the terminal) and re-run
`npx vitest`. If `npm test` (run mode) still fails, it's a real shape
mismatch — read the failing assertion in
[content-parity.test.ts](../src/__tests__/content-parity.test.ts) carefully.

---

### `make check-registry` fails: "every backend stack" missing one

**Cause:** [demo-registry.test.ts](../src/__tests__/demo-registry.test.ts)
asserts that [docs/guides/adding-a-demo.md](docs/guides/adding-a-demo.md)
mentions every stack listed in the registry. Adding a backend with a new
stack fails the test until the doc is updated.

**Fix:** add the stack name (lowercase) anywhere in the doc. The test does
a literal substring search. Recommended: extend the per-stack table in
the "Backend & observability" half of the doc.

---

## Docker / dev-bare

### `make dev-bare`: "port already in use"

**Fix:**

```bash
make stop          # stop everything started by previous dev-bare
make free-ports    # kill lingering containers / processes on demo ports
make dev-bare
```

`make free-ports` walks every port listed in [src/data/demo-services.json](../src/data/demo-services.json),
removes Docker containers publishing it, and falls back to `fuser -k` for
host processes.

---

### A demo backend isn't reachable on its port

**Symptom:** `make health` reports a demo down; `live-demos.spec.ts` skips it.

**Diagnose:**

```bash
docker ps --filter "publish=<port>"          # is the container up?
docker logs <container> --tail=50             # what does it say?
make health                                   # batch check
```

If the sibling repo doesn't exist locally, `make dev-bare` silently skips
it — by design. Clone the sibling next to `PersonalPortfolio/` and re-run.

---

### "WSL: cannot connect to docker daemon"

**Fix:** ensure Docker Desktop is running and the WSL integration is
enabled for your distro: Docker Desktop → Settings → Resources → WSL
integration.

If you're using Docker Engine inside WSL natively (no Docker Desktop),
make sure the daemon is started: `sudo service docker start`.

---

### Playwright on WSL: "browserType.launch: Host system is missing dependencies"

**Cause:** the Playwright browser bundle ships with native deps that aren't
installed on a fresh WSL Ubuntu.

**Fix:**

```bash
npx playwright install-deps chromium
# or, if you want all browsers:
sudo npx playwright install-deps
```

---

## Lefthook / git hooks

### `git commit` rejected: "no-commit-on-main"

**Cause:** the commit-msg hook in [lefthook.yml](../lefthook.yml) blocks
direct commits to `main`.

**Fix:** branch off, commit, push, open a PR.

```bash
git checkout -b feature/my-change
git commit -m "..."
git push -u origin feature/my-change
gh pr create
```

---

### Lefthook misbehaves on Windows: "command not found"

**Cause:** rare — usually a `node_modules` platform mismatch from running
`npm install` inside WSL on a Windows-mounted folder, then trying to run
hooks from Git Bash on the Windows side.

**Fix:**

```bash
LEFTHOOK=0 git commit -m "..."   # bypass for this commit
rm -rf node_modules && npm install   # reinstall on the platform you commit from
```

Don't use `--no-verify` — it skips lefthook _and_ the no-commit-on-main
guard, which can land bad commits on `main`.

---

## planner-api / Java

### `make test`: planner-api fails with "command not found: java"

**Cause:** [planner-api/](../planner-api/) wraps ENHSP, a JVM-based PDDL
planner. Java 17+ must be on `PATH`.

**Fix:** install OpenJDK 17 or newer.

```bash
# Ubuntu
sudo apt-get install openjdk-17-jre-headless
# macOS
brew install openjdk@17
# Windows (Chocolatey)
choco install openjdk17
```

See [planner-api/README.md](../planner-api/README.md) for the full setup.

---

### `/demos/planificacion` "Run planner" returns 500

**Diagnose:** check that the planner-api container is up:

```bash
curl http://localhost:8765/health
```

If the response is non-200, look at planner-api logs:

```bash
docker logs <planner-api-container> --tail=100
```

Most often: a malformed PDDL file, or ENHSP refusing a domain feature it
doesn't support (no `:fluents` — that's why we're not on Fast Downward).

---

## Sentry / observability

### Spotlight banner doesn't appear

**Cause:** Spotlight only mounts when `astro dev` runs, not on
`astro preview` (production build).

**Fix:** use `make dev` or `make dev-bare`. For production, paste a real
DSN into `.env.shared` (see
[docs/architecture/observability.md](./architecture/observability.md)).

---

### Self-hosted Sentry: web UI loads but events don't appear

**Diagnose:** [docs/architecture/observability.md § Verifying tag-based filtering](./architecture/observability.md#verifying-tag-based-filtering)
covers the canonical check.

Most common causes:

- DSN points at `localhost:9000` but backends run inside Docker — they
  need `host.docker.internal:9000`. The orchestrator script rewrites this
  automatically; if you set `SENTRY_DSN` somewhere it bypasses, fix the
  hostname.
- The Sentry stack is still warming up (Snuba can take 60s after `obs-up`).
  Wait, refresh.
- `SENTRY_RELEASE` mismatch — the frontend release ID and backend release
  ID must match for traces to link. See
  [docs/architecture/observability.md](docs/architecture/observability.md)
  release-ID section.

---

## Builds / deployment

### `make build` fails on a demo image but the demo isn't yours

**Cause:** `make build-images` builds **every** demo's Docker image in
parallel. A broken sibling repo blocks the full build.

**Quick fix:** build just the Astro site:

```bash
npm run build
```

Long fix: identify which `_db-<slug>` target failed (in the make output)
and fix the sibling, or temporarily remove that demo from
[src/data/demo-services.json](../src/data/demo-services.json) (revert before
committing).

---

### `make rebuild` takes forever

**Cause:** `--no-cache --pull` re-downloads every base image. Expected on
the first run, painful afterward.

**Fix:** use `make build` (incremental, sub-second when nothing changed)
unless you specifically need a clean rebuild.

---

## Still stuck?

- **Search:** `git log --all --grep "<error fragment>"` — past commits often
  contain the fix in the message.
- **Read the source:** every test file starts with a `/** … */` block
  explaining what it covers.
- **Open an issue:** include the error text, OS, what you ran, and what
  you expected. See [CONTRIBUTING.md § Reporting issues](../CONTRIBUTING.md#reporting-issues).
