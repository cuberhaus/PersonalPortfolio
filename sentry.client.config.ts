/**
 * Client-side Sentry configuration.
 *
 * Picked up automatically by `@sentry/astro` at build time. Keep settings
 * here rather than inline in astro.config.mjs (the inline form was deprecated
 * in @sentry/astro v8+).
 *
 * DSN: defaults to a placeholder so a fresh clone works against Spotlight
 * without any setup. Set `PUBLIC_SENTRY_DSN` in `.env` to point at a real
 * sentry.io project.
 *
 * tracePropagationTargets: derived from `src/data/demo-services.json` via
 * `listTracedBackendPorts()` so the registry is the single source of truth
 * — new backends propagate trace headers automatically as soon as their
 * entry has `needsSentry: true`.
 */
import * as Sentry from '@sentry/astro';

import { listTracedBackendPorts } from './src/data/demo-services';
import { getSessionId } from './src/lib/debug-session';

const DSN_FALLBACK = 'https://test@test/0';

const DEMO_BACKEND_PORTS = listTracedBackendPorts();

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN ?? DSN_FALLBACK,
  environment: import.meta.env.PROD ? 'production' : 'local',
  // Release identifier: `portfolio@<short-sha>[-dirty]`, derived by
  // scripts/_release_id.sh and exported as PUBLIC_SENTRY_RELEASE by
  // scripts/dev-all-demos.sh / the Makefile build target. Falls back to
  // `portfolio@local-dev` when neither is in play (e.g. plain `npm run dev`
  // outside the orchestrator). Keep this value identical to the backends'
  // `SENTRY_RELEASE` so the Sentry Releases tab can correlate frontend
  // and backend events for the same deploy.
  release:
    import.meta.env.PUBLIC_SENTRY_RELEASE ?? 'portfolio@local-dev',
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,
  // Stamp every browser event with the stable session id so it joins
  // backend events carrying the same tag. The header propagation lives
  // in `src/lib/debug-network.ts`; the backend side is in
  // `_sentry_obs.py`'s SessionIdMiddleware.
  initialScope: {
    tags: { session_id: getSessionId() },
  },
  // Explicit browser-tracing integration (`@sentry/astro` enables it
  // implicitly when `tracesSampleRate > 0`, but listing it here makes the
  // Web Vitals capture grep-able and lets us tune the long-task / long-
  // animation-frame collection in one place).
  // - enableLongTask          → emits `ui.long-task` spans (>50 ms)
  // - enableLongAnimationFrame → emits `ui.long-animation-frame` spans
  //                              (Chrome 123+, finer-grained than long-task)
  // Web Vitals (LCP, INP, CLS, FCP, TTFB) are emitted automatically as part
  // of the pageload transaction, no separate flag needed.
  integrations: [
    Sentry.browserTracingIntegration({
      enableLongTask: true,
      enableLongAnimationFrame: true,
    }),
  ],
  tracePropagationTargets: [
    'localhost',
    new RegExp(
      `^http:\\/\\/localhost:(${DEMO_BACKEND_PORTS.join('|')})(\\/|$)`,
    ),
  ],
});
