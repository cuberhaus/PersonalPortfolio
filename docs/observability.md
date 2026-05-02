# Observability — operational guide

This document is the **operational manual** for the dashboards events are
sent to. The architectural rationale (why Sentry, why Option A SDK rollout,
etc.) lives in [`debugging-architecture.md`](./debugging-architecture.md);
this document only covers running and using the dashboards.

> **TL;DR** — for daily local development, use **Sentry Spotlight** (ships
> with the Astro dev server, zero setup). For real queryable filtering /
> distributed traces / issue grouping, run **self-hosted Sentry** with
> `make obs-up`. For production deploys, use **Sentry.io cloud free tier**.

---

## Where do my events go? — quick chooser

| Need | Pick | Setup time | Resource cost | Queryable tags? | Trace waterfalls? |
|---|---|---|---|---|---|
| "Is anything reaching me at all" while coding | **Spotlight** | 0 (built-in) | ~0 MB | No | Basic |
| Real local dashboard with full Sentry parity | **Self-hosted Sentry** | 15-25 min first run | ~3-10 GB RAM, 30 GB disk | **Yes** | **Full** |
| Lightest queryable local dashboard, less polished | **GlitchTip** | 3-5 min | ~1-2 GB RAM | Yes | Basic |
| Persistent + remote-accessible, don't care about data ownership | **Sentry.io free tier** | 5 min signup | 0 (cloud) | Yes | Full |

The four options are **mutually exclusive at the DSN level**: every backend
reads `SENTRY_DSN` from `.env.shared` and points at exactly one collector.
You can switch by editing `.env.shared` and bouncing the backends.

---

## Option 1 — Sentry Spotlight (default)

Spotlight is integrated by `@spotlightjs/astro` in [`astro.config.mjs`](../astro.config.mjs).
It starts automatically when you run `npm run dev` or `make dev-all`.

**To use it:**

1. Set in `PersonalPortfolio/.env.shared`:
   ```bash
   SENTRY_DSN=http://public@localhost:8969/1
   ```
2. `make stop && make dev-all`
3. Open <http://localhost:8969> (or click the Spotlight badge in the
   bottom-left of any page).

**What works:**
- All errors, transactions, and breadcrumbs from frontend + every backend
  (Python, Java/Spring, SvelteKit, Rust, Go, PHP) appear within seconds.
- Frontend ↔ backend traces are linked by `sentry-trace` headers — click
  a `</>` browser pageload to see the chained 🐍 backend handler underneath.

**What's intentionally limited:**
- The search box only filters on transaction names. **Tag filtering like
  `service:tfg-polyps` does NOT work** — Spotlight is a notification bus,
  not a queryable database. Use Option 2 or 4 for that.
- All events are kept in memory and lost when the dev server restarts.
- No issue grouping, alerts, dashboards, replay, or release tracking.

---

## Option 2 — Self-hosted Sentry (recommended for serious local debugging)

The full Sentry stack runs as ~22 Docker containers under
`~/cuberhaus/sentry-self-hosted/`. The repo is checked out at tag `26.4.1`.

### One-time install

```bash
cd ~/cuberhaus/PersonalPortfolio
make obs-install      # runs ~/cuberhaus/sentry-self-hosted/install.sh
```

The installer is **interactive** and will:

1. Pull all required Docker images (~15 GB the first time).
2. Run database migrations and seed Snuba/ClickHouse.
3. Prompt you for an admin email + password for the web UI.
4. Take 15-25 minutes on a first run.

### Daily operation

| Command | What it does |
|---|---|
| `make obs-up` | Start the stack (UI ready in ~30-60s) |
| `make obs-down` | Stop the stack (volumes preserved — data survives) |
| `make obs-restart` | `obs-down` + `obs-up` |
| `make obs-status` | `docker compose ps` for the Sentry stack |
| `make obs-logs` | `docker compose logs -f` for all Sentry containers |
| `make obs-wipe` | **DESTRUCTIVE** — stop and delete all volumes (asks for `yes`) |

### First-time configuration

After `make obs-up` succeeds and <http://localhost:9000> loads:

1. Log in with the admin credentials from `obs-install`.
2. **Create a project** → Platform: "Multiple platforms" → name it
   `portfolio-backends`.
3. **Settings → Client Keys (DSN)** → copy the DSN. Format:
   ```text
   http://abc1234567890@localhost:9000/2
   ```
4. Paste into `PersonalPortfolio/.env.shared`:
   ```bash
   SENTRY_DSN=http://abc1234567890@localhost:9000/2
   ```
5. Bounce the backends:
   ```bash
   make stop && make dev-all
   ```

The `dev-all-demos.sh` orchestrator detects that the DSN host is
`localhost` and rewrites it to `host.docker.internal:9000` for Dockerized
backends (`SENTRY_DSN_DOCKER`). Host-only processes (PROP, planner-api)
keep the original DSN.

### Verifying tag-based filtering

In the Sentry UI, search box:

```text
service:tfg-polyps
```

Returns events from the TFG backend only. The `service` tag is set by
[`scripts/sentry-snippets/_sentry_obs.py`](../scripts/sentry-snippets/_sentry_obs.py)
(Python backends) and the equivalent `set_tag("service", ...)` calls in
each non-Python stack's observability hook.

Other useful tags to filter on:

| Filter | Effect |
|---|---|
| `environment:local-dev` | Only events from local dev (vs production) |
| `release:local-dev` | Only the current release |
| `http.status_code:5xx` | Only 500-class responses |
| `transaction:/api/dataset/{split}` | A specific endpoint |
| `service:tfg-polyps AND http.status_code:5xx` | Combine with `AND` |

### Resource footprint

Idle: ~3-4 GB RAM, low CPU.  
Active ingestion: ~6-10 GB RAM, moderate CPU spikes during Snuba flushes.  
Disk growth: ~100 MB/day at portfolio traffic levels. Run `make obs-wipe`
to reclaim, or use Sentry's built-in retention policies (Settings → Project
→ Data & Limits).

---

## Option 3 — GlitchTip (lightweight Sentry-API-compatible alternative)

If 16 GB RAM for self-hosted Sentry is overkill, GlitchTip implements the
Sentry ingestion protocol with ~5 containers and ~1 GB RAM.

```bash
mkdir -p ~/cuberhaus/glitchtip && cd ~/cuberhaus/glitchtip
curl -fsSL https://gitlab.com/glitchtip/glitchtip/-/raw/master/docker-compose.yml -o docker-compose.yml
echo "SECRET_KEY=$(openssl rand -hex 32)" > .env
echo "PORT=8001" >> .env
echo "EMAIL_URL=consolemail://" >> .env
echo "GLITCHTIP_DOMAIN=http://localhost:8001" >> .env
echo "DEFAULT_FROM_EMAIL=glitchtip@localhost" >> .env
docker compose up -d
```

Open <http://localhost:8001>, sign up (first user is admin), create a
project, copy the DSN, paste into `.env.shared`, bounce backends.

GlitchTip does **not** have a `make` target in this repo because it lives
outside `PersonalPortfolio/` and is optional — manage with plain
`docker compose` from its own directory.

What you get vs full Sentry: queryable tags ✓, performance ✓, basic trace
view ◐, no replay / sessions / discover query builder.

---

## Option 4 — Sentry.io cloud free tier

Recommended for production deploys (no local resource cost, persistent,
accessible from anywhere).

1. Sign up at <https://sentry.io/signup/>.
2. Create org → create project `portfolio-backends`.
3. Copy DSN (format `https://<key>@o<org>.ingest.sentry.io/<project>`).
4. Paste into `.env.shared`, bounce backends.

Free tier: 5 K errors / 10 K transactions / 50 attachments / 10 K replays
per month per org. For a portfolio with low real traffic this is
effectively unlimited.

The HTTPS DSN means **no Docker rewrite is needed** — `dev-all-demos.sh`
only rewrites `localhost`/`127.0.0.1` hosts. Containers reach the cloud
directly.

---

## Switching between dashboards

All four options use the same `SENTRY_DSN` env variable, so switching is:

```bash
# Edit one line in .env.shared:
sed -i 's|^SENTRY_DSN=.*|SENTRY_DSN=http://public@localhost:8969/1|' .env.shared

# Bounce the backends so they reinitialise their SDKs:
make stop && make dev-all
```

The frontend re-reads the DSN on every Astro dev-server restart.

---

## Troubleshooting

### "Looks like there are no traces recorded matching the applied search & filters"

You're using **Spotlight** and trying to filter by tag. Tag filtering only
works in self-hosted Sentry or sentry.io — see Option 2/4 above.

### Events appear in the browser overlay but not in Sentry

Check the DSN is set:

```bash
grep SENTRY_DSN PersonalPortfolio/.env.shared
```

If empty/commented, the SDKs initialise as no-ops by design. Set a DSN and
`make stop && make dev-all`.

### Frontend events appear but backend events don't

This is almost always a Docker networking issue. Verify a container is
actually reaching the dashboard:

```bash
# Replace with any backend container name:
docker exec draculin-backend-backend-1 env | grep SENTRY_DSN
# Expect: SENTRY_DSN=http://...@host.docker.internal:9000/...

docker exec draculin-backend-backend-1 \
  python3 -c "import urllib.request; print(urllib.request.urlopen('http://host.docker.internal:9000/api/0/', timeout=2).status)"
# Expect a 200/302/401 (anything that's not a connection error)
```

If `host.docker.internal` doesn't resolve, the container's
`docker-compose.yml` is missing `extra_hosts: ["host.docker.internal:host-gateway"]`.
This was added in Phase 14 to every backend compose file — see
[`scripts/sentry-snippets/_sentry_obs.py`](../scripts/sentry-snippets/_sentry_obs.py)
and the per-stack files referenced from `debugging-architecture.md`.

### Port 9000 is already in use

Another tool (Portainer, MinIO, etc.) is on port 9000. To remap:

```bash
cd ~/cuberhaus/sentry-self-hosted
# Edit .env (created by install.sh) and change SENTRY_BIND=0.0.0.0:9000 to
# the desired port, e.g. SENTRY_BIND=0.0.0.0:9100
make obs-restart
# Update the DSN port in PersonalPortfolio/.env.shared accordingly.
```

### `make obs-install` fails with "minimum requirements not met"

The installer enforces 8 GB RAM and Docker Compose v2.x. Check
`free -h` and `docker compose version`. If memory is fine but compose
version detection misfires, set `SKIP_USER_CREATION=0` and
`SENTRY_NO_DOCKER_COMPOSE_CHECK=1` before running install.sh.

### Self-hosted Sentry containers keep restarting

Almost always Postgres or ClickHouse failed to come up cleanly. Check:

```bash
make obs-logs | grep -E "ERROR|Exception" | head -20
```

The most common cause is Snuba migrations on first ingestion — wait
30-60 s after `make obs-up` before sending events.

### Backend SDK is initialised but still no events appear

Some Sentry SDKs default to `traces_sample_rate=0` (errors only). Set in
`.env.shared`:

```bash
SENTRY_TRACES_SAMPLE_RATE=1.0
```

This is propagated to every backend's SDK config.

---

## Cross-references

- [`debugging-architecture.md`](./debugging-architecture.md) — *why* Sentry was
  chosen and the full Option A vs B vs C vs D trade-off matrix.
- [`adding-a-demo.md`](./adding-a-demo.md) — how to wire a brand-new demo's
  backend into this observability pipeline (per-stack SDK init).
- [`scripts/sentry-snippets/_sentry_obs.py`](../scripts/sentry-snippets/_sentry_obs.py) —
  canonical Python observability hook copied into every Python backend.
- [`scripts/dev-all-demos.sh`](../scripts/dev-all-demos.sh) — DSN propagation
  and `localhost` → `host.docker.internal` rewrite logic.
