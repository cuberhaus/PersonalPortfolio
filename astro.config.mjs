import { defineConfig } from 'astro/config';
import { writeFile } from 'node:fs/promises';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import spotlight from '@spotlightjs/astro';

const SITE = process.env.SITE_URL ?? 'https://polcasacubertagil.com';

/** Writes public/CNAME (for GitHub Pages) with the site's hostname at build time. */
const cnameIntegration = {
  name: 'write-cname',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await writeFile(new URL('CNAME', dir), new URL(SITE).hostname + '\n');
    },
  },
};

export default defineConfig({
  site: SITE,
  integrations: [
    react(),
    sitemap(),
    cnameIntegration,
    sentry({
      sourceMapsUploadOptions: {
        // When SENTRY_AUTH_TOKEN is unset (the default for local dev and
        // contributors without Sentry credentials), the integration injects
        // debug IDs into the bundles but skips the upload step — no auth
        // failures, no broken builds. Upload only fires in CI / on a build
        // where the operator has set the three vars below.
        //
        // Required for upload:
        //   SENTRY_AUTH_TOKEN  — created at sentry.io > Settings > Auth Tokens
        //   SENTRY_ORG         — the org slug (e.g. "polcasacubertagil")
        //   SENTRY_PROJECT     — the project slug (e.g. "portfolio")
        //
        // Without these, prod stack traces remain minified — see
        // docs/observability.md for the full setup.
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        // Pin source maps to the same release identifier the runtime uses
        // (portfolio@<sha>[-dirty]), so Sentry's release tab can match
        // events to maps automatically.
        release: { name: process.env.PUBLIC_SENTRY_RELEASE },
        // Suppress the Sentry CLI build-time telemetry probe.
        telemetry: false,
      },
    }),
    spotlight(),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'ca'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});
