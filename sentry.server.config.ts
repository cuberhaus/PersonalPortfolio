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
  // Mirror the same `portfolio@<sha>[-dirty]` identifier the client and
  // backends use, so build-time errors land on the same release in the
  // Sentry UI as the runtime traffic they correspond to.
  release: process.env.PUBLIC_SENTRY_RELEASE ?? 'portfolio@local-dev',
  tracesSampleRate: 0,
});
