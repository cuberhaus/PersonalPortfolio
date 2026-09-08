# ADR-0001: Validated Runtime Boundaries for Demos

- Status: accepted
- Date: 2026-03-31

## Context

The portfolio has one demo registry but several consumers: Astro and React
code, Sentry configuration, Make, shell orchestration, the log relay, and the
screenshot gallery. Those consumers had begun to parse the same JSON and
reconstruct different policies. Demo routes also repeated locale and metadata
assembly, while debug adapters were activated from more than one owner.

## Decision

Keep `src/data/demo-services.json` as the registry source of truth and expose
explicit runtime projections:

1. `src/data/demo-services.ts` validates the registry with Zod and publishes
   typed browser projections.
2. `scripts/demo-registry.mjs` validates the registry for Node and shell
   consumers and owns the CLI projections used by Make and orchestration.
3. `src/lib/live-app-embed.ts` owns live URL resolution and probing; the React
   component renders the resulting state.
4. `src/lib/debug-lifecycle.ts` owns idempotent activation and generation-safe
   teardown for debug adapters.
5. `src/lib/demo-page.ts` owns shared locale, translation, and demo metadata
   assembly; page files keep only route-specific content.

Tests cross these public seams instead of duplicating the implementation under
test.

## Consequences

- Registry shape errors fail at the browser or Node boundary instead of later in
  a script, page, or iframe.
- Runtime-specific adapters remain small and can evolve without making the
  JSON schema a shell or React API.
- A route still has local markup, but repeated setup policy has one owner.
- Debug teardown is safe across repeated toggles and asynchronous imports.
- Adding a registry field requires updating the schema and the projections that
  intentionally expose it; this is explicit maintenance rather than hidden
  coupling.

## Alternatives rejected

- Let every consumer parse raw JSON: minimal initial code, but duplicated
  validation and policy drift remain invisible until runtime.
- Put all runtime behavior in the JSON file: makes data encode side effects and
  couples shell, browser, and observability concerns.
- Replace every demo page with one highly configurable template: would hide
  meaningful demo-specific markup and make the route abstraction shallow.
