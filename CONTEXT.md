# Portfolio Domain Context

## Demo service registry

`src/data/demo-services.json` is the source of truth for demo identity, backend
ports, iframe origins, run hints, and local orchestration metadata. Runtime code
does not reinterpret that JSON ad hoc:

- `src/data/demo-services.ts` validates it with Zod and exposes browser-facing
  projections for Astro, React, Sentry, and tests.
- `scripts/demo-registry.mjs` validates the same file for Node and shell-facing
  consumers, then exposes process-oriented projections and small CLI views.

The registry is data; each runtime adapter owns only the representation and
side effects required by that runtime.

## Live app orchestration

A live app definition is the resolved URL plus optional run hints for one demo.
`src/lib/live-app-embed.ts` owns registry resolution, explicit overrides,
origin extraction, bounded probing, cancellation, and probe events.
`LiveAppEmbed.tsx` owns presentation and delegates those policies to the
orchestrator.

## Debug lifecycle

The debug lifecycle is the idempotent owner of debug adapter activation. It
installs and tears down network instrumentation, Sentry forwarding, and visible
Docker subscriptions as one generation-aware operation. A pending asynchronous
Sentry install must still receive exactly one teardown after it resolves.

## Demo page context

A demo page context combines the locale selected by the URL, the localized
translation function, and the localized metadata record returned by `getDemo`.
`src/lib/demo-page.ts` owns that assembly. Individual Astro routes retain their
unique content, fallback markup, and component choices; they should not repeat
locale and metadata lookup policy.
