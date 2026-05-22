# Adding a new demo to the portfolio

End-to-end checklist. Steps **1–7** are the **simple path** — every demo
needs them, and a browser-only demo finishes here. Steps **8+** are
**backend & observability** — only follow them if your demo ships a Docker
service.

> **Single source of truth:** [`src/data/demo-services.json`](../../src/data/demo-services.json) drives the
> orchestrator, the iframe forwarder, the log relay, the registry test
> and this doc. The card on the homepage comes from
> [`src/data/demos.json`](../../src/data/demos.json) (+ `.es.json`, `.ca.json`).

---

## 1. Pick a slug + decide if you need a backend

- **Slug:** lowercase letters, digits, hyphens (regex enforced by
  [`src/i18n/demo-schema.ts`](../../src/i18n/demo-schema.ts)). Example:
  `my-cool-demo`. The folder name on disk and every cross-reference uses
  this slug verbatim.
- **Backend?** Three flavours:
  - **Browser-only** (no Docker): runs entirely client-side. Examples:
    `apa-practica`, `matriculas`, `joc-eda`, `jsbach`. **Do steps 1–7.**
  - **Mock-on-Pages, live locally:** ships a Docker backend used during
    `make dev-bare`, but on GitHub Pages a mock UI is shown instead.
    Examples: `tenda`, `draculin`, `prop`. **Do all steps.**
  - **Live backend everywhere:** rare for a portfolio site; same as above
    but no mock. **Do all steps.**

If unsure, start browser-only — you can always add a backend later.

---

## 2. Skeleton: page, component, (optional) translations

Create these files (`<slug>` lowercase, `<Slug>` PascalCase — e.g.
`my-cool-demo` → `MyCoolDemo`):

```text
src/pages/demos/<slug>.astro            # routed page
src/components/demos/<Slug>Demo.tsx     # interactive island (omit if iframe-only)
locales/{en,es,ca}/<slug>-demo.json     # OPTIONAL — see step 6
src/i18n/demos/<slug>-demo.ts           # OPTIONAL namespace accessor
```

**Astro page** — copy [`src/pages/demos/mpids.astro`](../../src/pages/demos/mpids.astro)
as a starting point. The shape:

```astro
---
import DemoLayout from '../../layouts/DemoLayout.astro';
import DemoHeader from '../../components/DemoHeader.astro';
import MyCoolDemo from '../../components/demos/MyCoolDemo';
import LiveAppEmbed from '../../components/demos/LiveAppEmbed';
import { getLangFromUrl, useTranslations } from '../../i18n/utils';
import { getDemo } from '../../i18n/demo';

const lang = getLangFromUrl(Astro.url);
const t = useTranslations(lang);
const demo = getDemo('<slug>', lang);
---

<DemoLayout title={demo.title} description={demo.metaDescription} slug="<slug>">
  <DemoHeader
    badge={demo.badge}
    title={demo.title}
    lead={demo.lead}
    githubUrl={demo.github}
    githubLabel={t('demo.viewSource')}
    accent={demo.accent}
  />

  <!-- For iframe-embedded backends only: -->
  <LiveAppEmbed slug="<slug>" title="My Cool Demo" lang={lang} client:load />

  <MyCoolDemo lang={lang} client:visible />
</DemoLayout>
```

Pass `slug="<slug>"` to `DemoLayout` so the log-relay subscriber wires up
automatically. Read `getDemo(slug, lang)` instead of hard-coding strings —
all card-level fields (title, lead, badge, accent, github, …) live in
`demos.json`.

**React island** — minimal browser-only skeleton. Copy
[`MPIDSDemo.tsx`](../../src/components/demos/MPIDSDemo.tsx) for an interactive
example, or [`BitsXMaratoDemo.tsx`](../../src/components/demos/BitsXMaratoDemo.tsx)
for a "mock-on-Pages, live in dev" pattern. The bare skeleton:

```tsx
import { withDemoErrorBoundary } from '../DemoErrorBoundary';

function MyCoolDemo({ lang = 'en' }: { lang?: 'en' | 'es' | 'ca' }) {
  return <div>hello, {lang}</div>;
}

export default withDemoErrorBoundary(MyCoolDemo, 'my-cool-demo');
```

> **No backend, but want a "mock UI" banner?** Wrap your component with
> [`MockBanner`](../../src/components/demos/MockBanner.tsx):
> `<MockBanner>Showing mock data — live backend runs only in dev</MockBanner>`.
> See `BitsXMaratoDemo.tsx` for the canonical usage.

---

## 3. Add the demo card to `demos.json`

The homepage demo grid is generated from [`src/data/demos.json`](../../src/data/demos.json)
(plus `.es.json` and `.ca.json`). Append the same entry to all **three**
files — same shape, same field set, same order. Parity is enforced by
[`content-parity.test.ts`](../../src/__tests__/content-parity.test.ts) and the
schema in [`src/i18n/demo-schema.ts`](../../src/i18n/demo-schema.ts).

```jsonc
{
  "identity": {
    "slug": "<slug>",
    "tags": ["Tag 1", "Tag 2"],
    "icon": "cpu",                                       // see icon enum below
    "github": "https://github.com/cuberhaus/<repo>",     // string OR string[]
    "image": "",
    "accent": { "from": "#10b981", "to": "#0ea5e9" }     // card gradient
  },
  "copy": {
    "en": { "title": "...", "description": "...", "lead": "...", "badge": "...",
            "metaTitle": "...", "metaDescription": "..." },
    "es": { ... },
    "ca": { ... }
  }
}
```

**Schema constraints (enforced at module load):**

- `slug` regex: `^[a-z0-9-]+$`.
- `icon` is an enum — must be one of the keys in
  [`src/lib/demo-icons.ts`](../../src/lib/demo-icons.ts) `ICON_PATHS`.
- `github` must be a `https://github.com/` URL (single string or array of
  strings for multi-repo demos like `draculin`).
- The `en` entry must exist; other locales fall back to `en`.
- A title must exist either at `identity.title` (shared across locales) or
  in every present locale's `copy.title`.

See [docs/i18n.md § Pattern B](./i18n.md#pattern-b--locale-json-triples-structured-content)
for the parity rule that applies to every JSON-triple file.

---

## 4. Register in `demo-services.json`

Append to [`src/data/demo-services.json`](../../src/data/demo-services.json):

```json
{
  "slug": "<slug>",
  "page": "src/pages/demos/<slug>.astro",
  "component": "src/components/demos/<Slug>Demo.tsx",
  "hasBackend": false
}
```

For a backed demo, replace `"hasBackend": false` with the full block:

```json
{
  "slug": "<slug>",
  "page": "src/pages/demos/<slug>.astro",
  "component": "src/components/demos/<Slug>Demo.tsx",
  "hasBackend": true,
  "backend": {
    "container": "<slug>",
    "port": 8094,
    "iframeUrl": "http://localhost:8094",
    "composeFile": "../<repo>/docker-compose.yml",
    "makefile": "../<repo>/Makefile",
    "stack": "fastapi",
    "needsSentry": true,
    "orchestrator": { "displayName": "<DisplayName>", "type": "compose", "extra": "" },
    "dockerCmd": "cd <repo> && docker compose up -d",
    "notes": "..."
  }
}
```

The registry test [`demo-registry.test.ts`](../../src/__tests__/demo-registry.test.ts)
asserts:

- every `page` and `component` path exists on disk;
- every `hasBackend: true` entry has `container`, `port`, `stack`;
- backend `port`s are unique across the registry;
- the orchestrator script's service list matches the registry;
- every `<LiveAppEmbed/>` use passes `slug=`, never a literal URL.

---

## 5. Add the slug to the browser-smoke spec

[`e2e/browser-demos.spec.ts`](../../e2e/browser-demos.spec.ts) loads every
demo route and asserts it renders without console errors. Append your
slug to the `ALL_SLUGS` array near the top of the file:

```ts
const ALL_SLUGS = [
  'tfg-polyps',
  // …
  '<slug>',
];
```

(Other Playwright projects — `live-demos`, `themes`, `a11y`, `keyboard`,
`visual` — pick up the new route automatically. Add a custom spec only if
your demo has unique interactions worth asserting.)

---

## 6. (Optional) Page-specific copy with HTML or placeholders

If your page or React island has copy that contains inline HTML
(<strong>`, `<code>`, links) or `{0}`-style placeholders, create a per-demo
locale namespace:

- `locales/{en,es,ca}/<slug>-page.json` — for page-level UI strings, or
- `locales/{en,es,ca}/<slug>-demo.json` — for client-island copy.

If TypeScript/React code needs an import, add a lightweight accessor under
`src/i18n/demos/` that calls `getDemoT('<slug>-page', lang)` or
`getDemoTranslations('<slug>-demo')`. **Don't** duplicate fields that already
live in `demos.json` (title, description, lead, badge, about) — keep this for
page-specific UI only.

Full rules: [docs/i18n.md § Pattern C](./i18n.md#pattern-c--per-demo-namespace-json).

---

## 7. Verify the simple path

```bash
make check-registry                                  # registry-only fast check
npx vitest run                                       # full unit suite (incl. content parity)
npx playwright test --project=browser-demos          # smoke
make dev                                             # then open http://localhost:4321/demos/<slug>/
```

Visit `/demos/<slug>/`, `/es/demos/<slug>/`, and `/ca/demos/<slug>/` to
confirm all three locales render. **For `hasBackend: false` demos, you're done.**

---

## Backend & observability

Everything below applies only to demos with `hasBackend: true`. If your
demo is browser-only, you can stop here.

## 8. Backend logging (Sentry SDK + structured stdout)

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

1. **Iframe forwarder** — install `debug-iframe-emitter` (see step 9) so the
   embedded app's `console.*`, `window.error`, and unhandled rejections
   reach the parent overlay tagged as `iframe:demo:<slug>`.
2. **Browser Sentry** — the parent page already runs `@sentry/astro`,
   which captures any cross-origin errors that bubble up from the
   iframe via `window.onerror`/CSP reports. Set `needsSentry: false`
   in the registry for these stacks (`qwik`, `ember`).

There's nothing to install or initialize on the static side. Just keep
the iframe origin pinned in `src/data/demo-services.json` →
`backend.iframeUrl`.

## 9. Iframe-embedded demos

If the embedded app is `<LiveAppEmbed slug="<slug>" />`, copy the tiny
`debug-iframe-emitter` snippet into the embedded app's bootstrap so its
in-iframe logs reach the parent overlay:

```ts
import { installEmbedDebug } from '../../lib/debug-iframe-emitter';
installEmbedDebug(); // mirrors console.* by default
window.__embed_debug?.info('demo:<slug>', 'mounted', { build: '0.1.2' });
```

The parent only accepts envelopes from the registered iframe origin
(see `src/data/demo-services.json` → `backend.iframeUrl`). Anything else
is dropped — including buggy third-party iframes.

## 10. Docker plumbing

- `Dockerfile`: turn off output buffering for whichever runtime you use
  (`ENV PYTHONUNBUFFERED=1`, `node --enable-source-maps`,
  `JAVA_OPTS=-Dlogging.config=logback-json.xml -Dsun.stdout.flush=true`,
  `RUST_LOG=info`, etc.) so the relay tails fresh lines.
- `docker-compose.yml`: pin the exposed host port (no random
  `${RANDOM}:8000`) and propagate the Sentry env vars.
- Pick a unique port not used by another demo. The registry test
  asserts uniqueness on the field `backend.port`.

## 11. Makefile

Two edits to [`PersonalPortfolio/Makefile`](../../Makefile):

**(a)** Add a `_db-<slug>` target, mirroring the existing `_db-tfg`,
`_db-bitsx`, etc. (see lines ~406–453):

```makefile
_db-<slug>:
	$(call build_if_changed,<slug>,$(PARENT)/<repo>,<DisplayName>     :<port>,\
		docker compose -f "$(PARENT)/<repo>/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
```

**(b)** Append the target to `DEMO_TARGETS` (Makefile line ~402) so
`make build` rebuilds it in parallel with the rest:

```makefile
DEMO_TARGETS := _db-tfg _db-bitsx ... _db-grafics _db-<slug>
```

The `.PHONY` block at the top of the file (line ~14) also lists every
`_db-*` target — add yours there too.

`scripts/dev-all-demos.sh` reads the registry directly, so no edit there.
Confirm with:

```bash
make help          # prints the registry-derived service list
make dev-bare      # boots everything + log-relay + Astro
```

## 12. Browser logging (debug bus + `useDemoLifecycle`)

Now that the demo runs end-to-end, instrument it. Use the namespaced bus
— always prefix with `demo:<slug>` so the overlay filter pills and the
registry test stay consistent:

```tsx
import { useDebug, useDemoLifecycle } from '../../lib/useDebug';

export default function MyDemo({ lang = 'en' }: { lang?: 'en' | 'es' | 'ca' }) {
  useDemoLifecycle('demo:<slug>', { lang }); // mount / unmount + i18n trace
  const log = useDebug('demo:<slug>');

  const onRun = () => {
    log.info('run', { params }); // user interactions
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

Verify in the in-page debug overlay:

```bash
make dev-bare
# in another shell
open http://localhost:4321/demos/<slug>/?debug=1
# press Alt+Shift+D
```

You should see, in order:

1. `nav.info navigated { path, lang, title }`
2. `demo:<slug>.info mount`
3. backend `demo:<slug>:backend.info subscribed { url }` (dev-only)
4. backend log lines tagged `BE` (source: backend)
5. iframe log lines tagged `I` (source: iframe), if any

Switch the level filter to `trace` and you should also see per-step
traces (`raf`, `algo-step`, etc.).

---

## Removing a demo

To safely retire a demo, delete in order:

1. `src/pages/demos/<slug>.astro`
2. `src/components/demos/<Slug>Demo.tsx`
3. `locales/{en,es,ca}/<slug>-page.json` / `<slug>-demo.json` plus any
   `src/i18n/demos/<slug>-*.ts` accessor
4. The entry in `src/data/demos.json` (+ `.es.json` + `.ca.json`)
5. The entry in `src/data/demo-services.json`
6. The slug in `e2e/browser-demos.spec.ts` `ALL_SLUGS`
7. The `_db-<slug>` Makefile target, its `DEMO_TARGETS` reference, and its `.PHONY` listing
8. Any `e2e/<slug>.spec.ts` fixture
9. Mention in `README.md` if the demo is featured

`make check-registry` will catch leftovers in steps 1–5.
