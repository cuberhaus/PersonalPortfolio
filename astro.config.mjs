import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://polcasacubertagil.com',
  integrations: [react(), sitemap()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'ca'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});