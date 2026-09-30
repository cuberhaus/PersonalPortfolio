/**
 * Setup for the `analytics-consent` project: builds a copy of the site with a
 * fake GA4 measurement ID baked in (see analytics-consent-site.ts for why).
 * Playwright runs it automatically before any analytics-consent test.
 *
 * Iterating on the spec? Skip the ~30 s rebuild once a build exists:
 *   PLAYWRIGHT_REUSE_CONSENT_BUILD=1 npx playwright test --project=analytics-consent
 */
import { test as setup } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ASTRO_BIN, CONSENT_SITE_DIR, CONSENT_TEST_MEASUREMENT_ID } from './analytics-consent-site';

setup('build the site with analytics configured', async () => {
  setup.setTimeout(300_000);

  if (
    process.env.PLAYWRIGHT_REUSE_CONSENT_BUILD &&
    existsSync(join(CONSENT_SITE_DIR, 'index.html'))
  ) {
    return;
  }

  await new Promise<void>((resolveBuild, rejectBuild) => {
    const build = spawn(process.execPath, [ASTRO_BIN, 'build', '--outDir', CONSENT_SITE_DIR], {
      env: { ...process.env, PUBLIC_GA_ID: CONSENT_TEST_MEASUREMENT_ID },
      stdio: 'inherit',
    });
    build.once('error', rejectBuild);
    build.once('exit', (code) =>
      code === 0 ? resolveBuild() : rejectBuild(new Error(`astro build exited with code ${code}`))
    );
  });
});
