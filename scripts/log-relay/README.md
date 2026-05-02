# Log relay

Dev-only Node SSE sidecar. Tails `docker logs -f` for every demo backend
declared in [`src/data/demo-services.json`](../../src/data/demo-services.json)
and exposes them as Server-Sent Event streams the in-page debug overlay can
subscribe to.

## Endpoints

| Method | Path                | Description                                         |
| ------ | ------------------- | --------------------------------------------------- |
| GET    | `/health`           | `{ ok: true, services: [slug...] }`                 |
| GET    | `/services`         | JSON list of `{ slug, container, stack }`           |
| GET    | `/stream/<slug>`    | `text/event-stream` tailing the matching container  |

## Running

```bash
cd PersonalPortfolio
node scripts/log-relay/index.mjs --port 9999
```

`make dev-all` boots it automatically together with the demo backends.

## Adding a new demo

No edit needed here. The relay reads `src/data/demo-services.json`. Add an
entry there with `hasBackend: true` and a `backend.container` and the relay
will pick it up on next restart.

## Structured logs

When a backend prints lines that parse as JSON with `{ level, ns, msg }`,
the relay forwards those fields verbatim. Otherwise the raw line is wrapped
into `{ level: 'info', ns: 'demo:<slug>:backend', msg: <line> }`. See the
adding-a-demo doc for per-stack snippets that emit structured stdout.
