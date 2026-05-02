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
 */
import * as Sentry from '@sentry/astro';

const DSN_FALLBACK = 'https://test@test/0';

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN ?? DSN_FALLBACK,
  environment: import.meta.env.PROD ? 'production' : 'local',
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,
});
