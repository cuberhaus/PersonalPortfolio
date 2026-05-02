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
    sentry({ sourceMapsUploadOptions: { disable: true } }),
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
