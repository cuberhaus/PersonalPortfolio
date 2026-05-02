/**
 * Server-side Sentry configuration (Astro SSR / static build hooks).
 *
 * The portfolio is statically generated for GitHub Pages, so this mostly
 * captures errors during the build itself rather than runtime requests. Kept
 * minimal on purpose.
 */
import * as Sentry from '@sentry/astro';

const DSN_FALLBACK = 'https://test@test/0';

Sentry.init({
  dsn: process.env.PUBLIC_SENTRY_DSN ?? DSN_FALLBACK,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'local',
  tracesSampleRate: 0,
});
