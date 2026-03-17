import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://cuberhaus.github.io',
  base: '/PersonalPortfolio',
  integrations: [react()],
});