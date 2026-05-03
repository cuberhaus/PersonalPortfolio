---
name: lgtm-poc-planificacion
overview: Build a self-contained, VPS-ready LGTM + Pyroscope + Faro PoC inside `Practica_de_Planificacion/observability/`, instrumenting the SvelteKit app end-to-end with OpenTelemetry, continuous profiling, and browser RUM, with dashboards / alerts / load-tests committed as code.
todos:
  - id: phase1-stack
    content: Phase 1 — stack bring-up. Write `observability/docker-compose.obs.yml` with MinIO, Tempo, Loki, Mimir, Pyroscope, OTel Collector (contrib), Grafana, Alertmanager. Author each backend's config (`tempo.yaml`, `loki.yaml`, `mimir.yaml`, `pyroscope.yaml`) pointed at MinIO via `${S3_ENDPOINT}`. Provision MinIO buckets on first run via a one-shot init container running `minio/provision.sh`. Provision Grafana datasources via `grafana/provisioning/datasources/datasources.yaml`. Verify by clicking through Grafana > Explore on each datasource.
    status: pending
  - id: phase2-otel-sveltekit
    content: Phase 2 — SvelteKit OTel auto-instrumentation. Add `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` + `@opentelemetry/exporter-trace-otlp-http` to [`web/package.json`](Practica_de_Planificacion/web/package.json). Create `web/src/lib/otel/init.ts` that calls `NodeSDK.start()` with resource attrs `service.name=planificacion`, `service.version=$SENTRY_RELEASE`, `deployment.environment=$SENTRY_ENVIRONMENT`. Import it at the top of [`web/src/hooks.server.ts`](Practica_de_Planificacion/web/src/hooks.server.ts) BEFORE the Sentry init line. Wrap Metric-FF subprocess in a manual `tracer.startActiveSpan('planner.metric_ff', ...)` in [`web/src/routes/api/plan/+server.ts`](Practica_de_Planificacion/web/src/routes/api/plan/+server.ts) recording exit code as a span attribute, and same for `generator.py` in [`web/src/routes/api/generate/+server.ts`](Practica_de_Planificacion/web/src/routes/api/generate/+server.ts). Add RED meters in `web/src/lib/otel/metrics.ts`. Replace the existing JSON-line `console.*` wrapper in `hooks.server.ts` with `pino` + `pino-opentelemetry-transport` so logs ride OTLP. Verify a request shows up as a span tree in Tempo Explore.
    status: pending
  - id: phase3-profiling-rum
    content: "Phase 3 — profiling + RUM. Add `@pyroscope/nodejs` to package.json; init in `web/src/lib/otel/init.ts` after the OTel SDK with `Pyroscope.init({ serverAddress, appName: 'planificacion' })`. Add `@grafana/faro-web-sdk` and `@grafana/faro-web-tracing` to package.json; create `web/src/lib/rum/faro.ts` with `initializeFaro({ url, app, instrumentations: [WebVitals, Sessions, Errors, FaroTraceContextHeader] })` and import it in [`web/src/routes/+layout.svelte`](Practica_de_Planificacion/web/src/routes/+layout.svelte) inside an `onMount`. Add the Faro receiver to `observability/otel-collector/config.yaml` (`receivers.faro`). Verify: a click in the browser produces a Faro session in Grafana, and a CPU flame graph appears in Pyroscope while a planner request runs."
    status: pending
  - id: phase4-dashboards
    content: "Phase 4 — dashboards-as-code. Author 4 dashboards as JSON committed under `observability/grafana/dashboards/`: `sveltekit-red.json` (rate / errors / duration p50-95-99 per route from Mimir), `planner-deep-dive.json` (planner success rate, subprocess wall time histogram, plan-size histogram, top-5 slowest domains via TraceQL), `node-process.json` (heap / GC / event-loop lag from auto-instrumented `runtime.*` metrics), `browser-rum.json` (LCP / INP / CLS / JS errors per route from Faro). Wire `provisioning/dashboards/dashboards.yaml` to load the directory. Verify each dashboard renders against live data."
    status: pending
  - id: phase5-alerts-loadtest
    content: "Phase 5 — alerts + load tests + scenarios. Author Mimir-managed alert rules in `observability/alerts/sveltekit.yml`: `HighErrorRate` (5xx ratio > 1%, 5min), `PlannerSlowP95` (planner span p95 > 10s), `HighEventLoopLag` (Node event-loop p95 > 200ms), `PlannerSubprocessFailureRate` (non-zero exit > 5%, 10min). Configure Alertmanager to route to a webhook receiver pointing at a local Grafana OnCall stub or just a `webhook.site` URL for the PoC. Write three k6 scripts under `observability/load-test/`: `k6-baseline.js` (10 RPS for 5min), `k6-error-spike.js` (malformed PDDL every 10th request for 1min), `k6-latency-regression.js` (heavy domain, 1 RPS for 3min). Author `observability/SCENARIOS.md` with the two end-to-end checks and expected outcomes."
    status: pending
  - id: phase6-vps-docs
    content: Phase 6 — VPS-ready polish + docs. Make the S3 backend swappable via `${S3_ENDPOINT}` / `${S3_BUCKET}` / `${S3_ACCESS_KEY}` / `${S3_SECRET_KEY}` env vars in every backend config; commit `.env.obs.example` with both local-MinIO and a commented Hetzner Object Storage block. Set `mem_limit` / `cpus` on each service so the whole stack fits in 4 GB / 2 vCPU. Add Makefile targets `obs-up` / `obs-down` / `obs-logs` / `obs-load-baseline` / `obs-load-spike` to [`Practica_de_Planificacion/Makefile`](Practica_de_Planificacion/Makefile). Author `observability/README.md` (ports, run cmd, common queries, troubleshooting) and a top-level `obs-experiment-notes.md` to capture what each signal got right and wrong on the two scenarios — this is the comparable artefact for the next stack-experiment.
    status: pending
isProject: false
---

# LGTM + Pyroscope + Faro PoC for Practica_de_Planificacion

Standalone observability experiment built into the repo on a branch (`obs-experiment-lgtm`). Sentry SDK stays in [`web/src/hooks.server.ts`](Practica_de_Planificacion/web/src/hooks.server.ts) for now so the two stacks can be A/B'd; OTel layers alongside it.

## Architecture (data flow)

```mermaid
flowchart LR
    browser["Browser<br/>+layout.svelte"]
    faroSdk["Faro Web SDK<br/>traces / logs / Web Vitals / errors"]
    sveltekitNode["SvelteKit Node server<br/>hooks.server.ts"]
    otelSdk["OTel Node SDK<br/>auto-instrument http/fs/child_process<br/>+ manual planner spans"]
    pyroNode["Pyroscope Node SDK<br/>continuous CPU profiling"]
    pinoLogs["pino logs<br/>JSON, trace-id correlated"]
    metricFF["Metric-FF subprocess<br/>(C binary, opaque)"]
    pythonGen["generator.py<br/>(Python subprocess)"]

    otelColl["OpenTelemetry Collector<br/>(contrib distro)<br/>OTLP + Faro receivers"]

    tempo["Tempo<br/>traces + TraceQL"]
    loki["Loki<br/>logs + LogQL"]
    mimir["Mimir<br/>metrics + PromQL"]
    pyroSrv["Pyroscope server<br/>profiles + flame graphs"]
    minio["MinIO<br/>S3-compatible object store<br/>(local) → real S3 on VPS"]

    grafana["Grafana<br/>provisioned datasources<br/>+ dashboards-as-code"]
    alertmgr["Alertmanager"]

    browser --> faroSdk --> otelColl
    sveltekitNode --> otelSdk --> otelColl
    sveltekitNode --> pinoLogs --> otelColl
    sveltekitNode --> pyroNode --> pyroSrv
    sveltekitNode --> metricFF
    sveltekitNode --> pythonGen

    otelColl --> tempo
    otelColl --> loki
    otelColl --> mimir

    tempo --> minio
    loki --> minio
    mimir --> minio
    pyroSrv --> minio

    tempo --> grafana
    loki --> grafana
    mimir --> grafana
    pyroSrv --> grafana
    mimir --> alertmgr
```

## Repo layout (target)

```
Practica_de_Planificacion/
  observability/
    docker-compose.obs.yml
    .env.obs.example                  # MinIO creds + retention knobs
    otel-collector/config.yaml        # OTLP gRPC/HTTP + Faro receivers
    tempo/tempo.yaml                  # S3 backend, TraceQL
    loki/loki.yaml                    # S3 backend, BoltDB shipper
    mimir/mimir.yaml                  # monolithic mode, S3 blocks storage
    pyroscope/pyroscope.yaml          # S3 backend
    grafana/
      grafana.ini
      provisioning/datasources/datasources.yaml
      provisioning/dashboards/dashboards.yaml
      dashboards/
        sveltekit-red.json
        planner-deep-dive.json
        node-process.json
        browser-rum.json
    alerts/sveltekit.yml              # Mimir-managed rules
    alertmanager/alertmanager.yaml
    minio/provision.sh                # creates obs-tempo / obs-loki / obs-mimir / obs-pyro
    load-test/
      k6-baseline.js
      k6-error-spike.js
      k6-latency-regression.js
    README.md                         # ports, run cmd, where to click
    SCENARIOS.md                      # the two scenarios + expected outcomes
  web/
    src/
      hooks.server.ts                 # OTel SDK started before SvelteKit handle
      lib/
        otel/init.ts                  # NodeSDK setup, exporter wiring
        otel/spans.ts                 # planner / generator span helpers
        otel/metrics.ts               # RED meters + planner-success counter
        log/pino.ts                   # pino logger w/ trace-id mixin
        rum/faro.ts                   # @grafana/faro-web-sdk init
      routes/
        +layout.svelte                # imports rum/faro client-side
        api/plan/+server.ts           # wraps Metric-FF spawn in span+metric
        api/generate/+server.ts       # wraps generator.py spawn in span+metric
    package.json                      # +@opentelemetry/* +pino +@pyroscope/nodejs +@grafana/faro-*
  Makefile                            # adds obs-up / obs-down / obs-load / obs-baseline
```

## Architectural calls baked into the plan

- **Collector**: OTel Collector contrib (not Alloy). Vendor-neutral, includes the Faro receiver and OTLP-to-Loki exporter natively. Single config file describes the whole pipeline.
- **Metrics backend**: Mimir in monolithic mode (single binary, S3-backed). One config away from horizontal-scale microservices on the VPS.
- **Object store**: MinIO locally on the same docker-compose network. VPS swap is two env vars (`S3_ENDPOINT`, `S3_BUCKET`) — no config diffs in Tempo/Loki/Mimir/Pyroscope themselves.
- **Logs**: pino + `pino-opentelemetry-transport` so logs ride OTLP to the Collector, then to Loki. Correlation with traces is automatic via OTel's log API.
- **Profiling**: Pyroscope Node SDK in push mode (the SDK pushes profiles to Pyroscope server). Easier than configuring Pyroscope to scrape `/debug/pprof` from a Node process.
- **RUM**: Faro Web SDK in `+layout.svelte`, sending to Faro receiver in the OTel Collector. Browser traces propagate `traceparent` so the same trace links browser ↔ Node handler ↔ subprocess.
- **Sentry coexistence**: Both SDKs initialise; nothing fights over scope. The point is to compare on the same workload, not to remove Sentry yet.
- **Sample rates**: 100% locally (high-signal). Tail-based sampling configured in the Collector but disabled by default — flip on for the VPS.

## Phased todos

Each phase ends in a runnable, observable state — you can stop after any phase and have a working subset.

## What gets validated (the two scenarios)

[`SCENARIOS.md`](Practica_de_Planificacion/observability/SCENARIOS.md) documents the two end-to-end checks. Both run via `make obs-load` against the running stack.

1. **Latency regression**: drive `/api/plan` with a large PDDL domain that pushes Metric-FF past 5s. Expected: latency dashboard panel goes red, `PlannerSlowP95` alert fires, Tempo trace shows the subprocess span dominating, Pyroscope flame graph shows the Metric-FF wait dominating event-loop time.
2. **Error spike**: POST malformed PDDL on every 10th request. Expected: `HighErrorRate` alert fires, Loki query `{service="planificacion"} |= "level=error"` shows the JSON-line stream, Faro RUM dashboard shows correlated browser-side `fetch` errors with the same `trace_id`.

After the PoC: commit a one-page `obs-experiment-notes.md` to the repo recording what each signal got right and wrong on the two scenarios. That's the comparable artefact for the next stack-experiment in the matrix (Elastic on `tenda_online`, etc.).

## Time budget (~22h, mostly waiting on Docker images)

- Phase 1 (stack bring-up): ~5h
- Phase 2 (OTel app instrumentation): ~4h
- Phase 3 (Pyroscope + Faro): ~4h
- Phase 4 (dashboards-as-code): ~4h
- Phase 5 (alerts + load tests): ~3h
- Phase 6 (VPS-ready polish + docs): ~2h