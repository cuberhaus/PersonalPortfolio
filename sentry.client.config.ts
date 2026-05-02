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
 * tracePropagationTargets: regex covers every demo backend port from
 * `src/data/demo-services.json`. Distributed traces flow from the browser
 * fetch into the backend handler when both sides have a Sentry SDK
 * configured. Bumping a port here and there is fine — keep the list in
 * sync with the registry or new backends won't appear as a single trace.
 */
import * as Sentry from '@sentry/astro';

const DSN_FALLBACK = 'https://test@test/0';

const DEMO_BACKEND_PORTS = [
  // FastAPI / uvicorn / Flask / Django
  8001, 8082, 8083, 8084, 8085, 8086, 8088, 8089, 8765, 8889, 8890,
  // Static / framework backends
  8087, 8090, 8092, 8093, 8888, 8081, 8000, 3000,
];

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN ?? DSN_FALLBACK,
  environment: import.meta.env.PROD ? 'production' : 'local',
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,
  tracePropagationTargets: [
    'localhost',
    new RegExp(
      `^http:\\/\\/localhost:(${DEMO_BACKEND_PORTS.join('|')})(\\/|$)`,
    ),
  ],
});
