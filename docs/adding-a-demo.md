# Adding a new demo to the portfolio

This is the end-to-end checklist for adding a new project demo so it
plugs into every system the portfolio already runs:

- the centralized debug overlay (logs, network, perf, source filter)
- the dev orchestrator (`make dev-all`)
- the log relay (Docker `stdout` → in-page overlay)
- the Sentry forwarder (errors + breadcrumbs)
- the i18n machinery
- the tests and the registry consistency check

Every step below is mandatory unless explicitly marked optional.

> **Single source of truth:** `src/data/demo-services.json` drives the
> orchestrator, the iframe forwarder, the log relay, the registry test
> and this doc. New demo? Add the entry first, then come back here.

## 1. Skeleton

Create the following files (replace `<slug>` and `<Slug>` with your demo's
slug, e.g. `tfg-polyps` / `TfgPolyps`):

```
src/pages/demos/<slug>.astro                # routed page
src/components/demos/<Slug>Demo.tsx         # interactive island (optional)
src/i18n/demos/<slug>.ts                    # translations (en/es/ca)
```

The `.astro` page should use `DemoLayout` and pass `slug` so the
log-relay subscriber can wire up automatically:

```astro
<DemoLayout title={demo.metaTitle} description={demo.metaDescription} slug="<slug>">
  <DemoHeader badge={demo.badge} title={demo.title} lead={demo.lead}
              githubUrl="https://github.com/..." accentFrom="#..." accentTo="#..." />
  <LiveAppEmbed slug="<slug>" title="..." dockerCmd="..." lang={lang} client:load />
  ...
</DemoLayout>
```

## 2. Browser logging (Phase 1–6 of the debug architecture)

Use the namespaced bus. Always prefix with `demo:<slug>` so the overlay
filter pills and the registry test stay consistent.

```tsx
import { useDebug, useDemoLifecycle } from '../../lib/useDebug';

export default function MyDemo({ lang = 'en' }: { lang?: 'en' | 'es' | 'ca' }) {
  useDemoLifecycle('demo:<slug>', { lang });    // mount / unmount + i18n trace
  const log = useDebug('demo:<slug>');

  const onRun = () => {
    log.info('run', { params });                // user interactions
    try {
      doWork();
      log.info('run-ok', { result });
    } catch (err) {
      log.error('run-failed', { err: String(err) }, err as Error);
    }
  };

  return <button onClick={onRun}>Run</button>;
}
```

Levels:

- `trace` — per-frame / per-step (RAF, BFS step, OCR pipeline progress)
- `info` — meaningful state change (run, mount, sample picked)
- `warn` — recoverable (probe-aborted, frame-stall, fallback path)
- `error` — exception, fatal, lost data

Network calls inside the demo use the `net:<slug>` namespace:

```ts
const net = debug('net:<slug>');
net.info('fetch', { url });
net.warn('fetch-fallback', { url, status });
```

## 3. Backend logging (Option A — Sentry SDK + structured stdout)

Demos that ship a backend MUST install the Sentry SDK for their stack
and emit structured JSON to `stdout` so the log relay can forward
`{ level, ns, msg }` directly.

### Common environment

`PersonalPortfolio/.env.shared` (gitignored) propagates a shared DSN:

```bash
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
SENTRY_ENVIRONMENT=local-dev
SENTRY_TRACES_SAMPLE_RATE=1.0
```

Every backend's `docker-compose.yml` must propagate the variable:

```yaml
services:
  api:
    environment:
      - SENTRY_DSN
      - SENTRY_ENVIRONMENT
      - SENTRY_TRACES_SAMPLE_RATE
```

### Per-stack snippets

#### FastAPI / uvicorn (`tfg-polyps`, `bitsx-marato`, `phase-transitions`, `caim`, `sbc-ia`, `desastres-ia`, `planner-api`)

The recommended path is to copy the canonical helper into your backend
directory rather than inlining the SDK setup. The helper handles Sentry
init + service-tag attachment (via `before_send_transaction`, immune to
ASGI scope forking on older sentry-sdk 2.x versions) and JSON-line stdout
logging in 99 LOC.

```bash
cp PersonalPortfolio/scripts/sentry-snippets/_sentry_obs.py \
   <your-backend>/_sentry_obs.py
```

Then at the **very top** of `app.py` / `main.py` (before any other
imports — Sentry needs to wrap them):

```python
# ── Phase 14 — observability bootstrap ────────────────────────────
# IMPORTANT: use an absolute import + sys.path injection, NOT a
# relative `from ._sentry_obs import …`. uvicorn launched as
# `uvicorn app:app` loads the module as `__main__` (no parent
# package) and a relative import will raise `ImportError`, which
# the bare `except` below silently swallows — your SDK never inits
# and events vanish. The pattern below works regardless of whether
# uvicorn is launched as `app:app` (script context) or
# `backend.app:app` (package context).
import os as _os
import sys as _sys

_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
try:
    from _sentry_obs import init_observability  # type: ignore[import-not-found]

    init_observability(service="<slug>")
except ImportError:
    pass
```

Set `ENV PYTHONUNBUFFERED=1` in the Dockerfile so JSON log lines stream
without buffering.

> **Why a hook instead of `sentry_sdk.set_tag()`?** sentry-sdk 2.0–2.20
> forks a fresh isolation scope per ASGI request that does not inherit
> init-time tags, so `set_tag("service", …)` at startup never reaches
> transaction events on those versions. The helper sets the tag via
> `before_send` / `before_send_transaction` instead, which fires after
> every scope merge and works on every SDK version (1.x through 2.x).

<details>
<summary>Inline alternative (not recommended — duplicates the helper's logic)</summary>

```python
import os, sys, json, time, logging
import sentry_sdk

def _service_tagger(event, _hint):
    tags = event.setdefault("tags", [])
    if isinstance(tags, list) and not any(t[0] == "service" for t in tags):
        tags.append(["service", "<slug>"])
    return event

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN", ""),
    environment=os.environ.get("SENTRY_ENVIRONMENT", "local-dev"),
    traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
    before_send=_service_tagger,
    before_send_transaction=_service_tagger,
)

class JsonLineHandler(logging.Handler):
    def emit(self, record):
        level = {logging.DEBUG: "trace", logging.INFO: "info",
                 logging.WARNING: "warn", logging.ERROR: "error",
                 logging.CRITICAL: "error"}.get(record.levelno, "info")
        line = {"level": level, "ns": record.name, "msg": record.getMessage(), "ts": time.time()}
        sys.stdout.write(json.dumps(line) + "\n")
        sys.stdout.flush()

logging.basicConfig(level=logging.INFO, handlers=[JsonLineHandler()], force=True)
```

</details>

#### Flask (`mpids`)

```python
from sentry_sdk.integrations.flask import FlaskIntegration
sentry_sdk.init(..., integrations=[FlaskIntegration()])
```

Use the same `JsonLineHandler` shown above.

#### Django (`draculin`)

```python
# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN"],
    integrations=[DjangoIntegration()],
    traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
    send_default_pii=False,
)
sentry_sdk.set_tag("service", "draculin")
```

#### Spring Boot (`prop`)

```xml
<!-- web/pom.xml -->
<dependency>
  <groupId>io.sentry</groupId>
  <artifactId>sentry-spring-boot-starter-jakarta</artifactId>
  <version>7.x</version>
</dependency>
```

```yaml
# application.yml
sentry:
  dsn: ${SENTRY_DSN}
  environment: ${SENTRY_ENVIRONMENT:local-dev}
  traces-sample-rate: 1.0
  send-default-pii: false
logging.config: classpath:logback-json.xml
```

Use Logback's JSON encoder so each log line is a single JSON object.

#### SvelteKit (`planificacion`)

```bash
npm install @sentry/sveltekit
npx @sentry/wizard@latest -i sveltekit
```

For structured stdout, replace `console.log` with `pino` (`pino({ formatters: { level: (l) => ({ level: l }) } })`).

#### Rust + axum (`pro2`)

```toml
[dependencies]
sentry = "0.34"
sentry-tower = "0.34"
tower-http = { version = "0.5", features = ["trace"] }
tracing-subscriber = { version = "0.3", features = ["json"] }
```

```rust
let _guard = sentry::init((env::var("SENTRY_DSN").ok(),
    sentry::ClientOptions { release: sentry::release_name!(), traces_sample_rate: 1.0, ..Default::default() }));
tracing_subscriber::fmt().json().init();
```

#### Go (`joc-eda`)

```bash
go get github.com/getsentry/sentry-go github.com/getsentry/sentry-go/http
```

```go
sentry.Init(sentry.ClientOptions{ Dsn: os.Getenv("SENTRY_DSN"), TracesSampleRate: 1.0 })
log.SetFlags(0)            // raw output
log.SetOutput(jsonWriter)  // wraps log.Print into JSON {level, ns, msg}
mux := http.NewServeMux()
http.ListenAndServe(":8087", sentryhttp.New(sentryhttp.Options{}).Handle(mux))
```

#### PHP (`tenda`)

```bash
composer require sentry/sentry
```

```php
\Sentry\init([
  'dsn' => getenv('SENTRY_DSN'),
  'environment' => getenv('SENTRY_ENVIRONMENT'),
  'traces_sample_rate' => 1.0,
]);
\Sentry\configureScope(fn ($scope) => $scope->setTag('service', 'tenda'));
error_log(json_encode([...]));   // for log relay
```

#### Static frontends — Qwik / Ember / Vite (`par-parallel`, `algorithms`, `grafics`, `rob-robotics`)

These demos ship a static bundle behind nginx and have **no backend
process** to instrument. They get observability through two channels
instead:

1. **Iframe forwarder** — install `debug-iframe-emitter` (see §4) so the
   embedded app's `console.*`, `window.error`, and unhandled rejections
   reach the parent overlay tagged as `iframe:demo:<slug>`.
2. **Browser Sentry** — the parent page already runs `@sentry/astro`,
   which captures any cross-origin errors that bubble up from the
   iframe via `window.onerror`/CSP reports. Set `needsSentry: false`
   in the registry for these stacks (`qwik`, `ember`).

There's nothing to install or initialize on the static side. Just keep
the iframe origin pinned in `src/data/demo-services.json` →
`backend.iframeUrl`.

## 4. Iframe-embedded demos

If the embedded app is `<LiveAppEmbed slug="<slug>" />`, copy the tiny
`debug-iframe-emitter` snippet into the embedded app's bootstrap so its
in-iframe logs reach the parent overlay:

```ts
import { installEmbedDebug } from '../../lib/debug-iframe-emitter';
installEmbedDebug();                       // mirrors console.* by default
window.__embed_debug?.info('demo:<slug>', 'mounted', { build: '0.1.2' });
```

The parent only accepts envelopes from the registered iframe origin
(see `src/data/demo-services.json` → `backend.iframeUrl`). Anything else
is dropped — including buggy third-party iframes.

## 5. Docker plumbing

- `Dockerfile`: turn off output buffering for whichever runtime you use
  (`ENV PYTHONUNBUFFERED=1`, `node --enable-source-maps`,
  `JAVA_OPTS=-Dlogging.config=logback-json.xml -Dsun.stdout.flush=true`,
  `RUST_LOG=info`, etc.) so the relay tails fresh lines.
- `docker-compose.yml`: pin the exposed host port (no random
  `${RANDOM}:8000`) and propagate the Sentry env vars.
- Pick a unique port not used by another demo. The registry test
  asserts uniqueness on the field `backend.port`.

## 6. Makefile

Add a `_db-<slug>` target in `PersonalPortfolio/Makefile`, mirroring the
existing `_db-tfg`, `_db-bitsx`, etc.:

```makefile
_db-<slug>:
	$(call build_if_changed,<slug>,$(PARENT)/<repo>,<DisplayName>     :<port>,\
		docker compose -f "$(PARENT)/<repo>/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
```

Then add it to `DEMO_TARGETS` so `make build` rebuilds it in parallel
with the rest.

## 7. Service registry

Append the entry to `src/data/demo-services.json`:

```json
{
  "slug": "<slug>",
  "page": "<slug>.astro",
  "component": "<Slug>Demo.tsx",
  "hasBackend": true,
  "backend": {
    "container": "<slug>",
    "port": 8094,
    "iframeUrl": "http://localhost:8094",
    "composeFile": "../<repo>/docker-compose.yml",
    "makefile": "../<repo>/Makefile",
    "stack": "fastapi",
    "needsSentry": true,
    "notes": "..."
  }
}
```

`hasBackend: false` is allowed for purely-static demos
(`apa-practica`, `matriculas`); skip the `backend` block entirely.

## 8. dev-all-demos.sh

No edit. The orchestrator already reads the registry. Confirm with:

```bash
make help          # prints the registry-derived service list
make dev-all       # boots everything + log-relay + Astro
```

## 9. Tests

Add or copy an end-to-end fixture into `e2e/` (look at the closest
existing demo). Then:

```bash
npm test           # vitest — includes the registry consistency test
npx playwright test
make check-registry  # registry-only fast check (used by pre-commit)
```

The registry test enforces all of:

- pages and components referenced from the registry exist on disk
- ports are unique across demos
- every backend with `hasBackend: true` has `container`, `port`, `stack`
- the orchestrator script's service list matches the registry
- every `LiveAppEmbed` use passes `slug`, never a literal URL
- this very file mentions every backend stack in the registry

## 10. Verify the wiring

```bash
make dev-all
# in another shell
open http://localhost:4321/demos/<slug>/?debug=1
# press Alt+Shift+D
```

Confirm in the overlay you see, in order:

1. `nav.info navigated { path, lang, title }`
2. `demo:<slug>.info mount`
3. backend `demo:<slug>:backend.info subscribed { url }` (dev-only)
4. backend log lines tagged `BE` (source: backend)
5. iframe log lines tagged `I` (source: iframe), if any

Switch the level filter to `trace` and you should also see per-step
traces (`raf`, `algo-step`, etc.).

## 11. Removing a demo

To safely retire a demo, delete in order:

1. `src/pages/demos/<slug>.astro`
2. `src/components/demos/<Slug>Demo.tsx`
3. `src/i18n/demos/<slug>.ts`
4. The corresponding entry in `src/data/demo-services.json`
5. The `_db-<slug>` Makefile target and `DEMO_TARGETS` reference
6. Any `e2e/<slug>.spec.ts` fixture
7. Mention in `README.md` if the demo is featured

`make check-registry` will catch leftovers in steps 1–5.
