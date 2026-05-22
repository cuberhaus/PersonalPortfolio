/**
 * Visual regression suite. Compares each route against a committed PNG
 * baseline so theme, layout, or component refactors that change pixels
 * surface as a CI failure with a side-by-side diff in the artifact.
 *
 * Baselines live under e2e/visual.spec.ts-snapshots/ and must be regenerated
 * on Linux (matching CI) — see Makefile target `test-visual-update` and the
 * README's visual-regression section for the workflow.
 *
 * Run: npx playwright test --project=visual
 * Refresh: npx playwright test --project=visual --update-snapshots
 */
import { test, expect, type Page } from '@playwright/test';

test.skip(process.platform !== 'linux', 'Visual baselines are Linux-only; run in WSL/Linux or CI.');

const PREVIEW_URL = new URL(
  process.env.PLAYWRIGHT_BASE_URL ??
    `http://${process.env.PLAYWRIGHT_HOST ?? '127.0.0.1'}:${process.env.PLAYWRIGHT_PORT ?? '4322'}`
);
const PREVIEW_PORT = PREVIEW_URL.port || (PREVIEW_URL.protocol === 'https:' ? '443' : '80');
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

// Same source-of-truth slug list as browser-demos.spec.ts. Kept inline
// (rather than imported) because importing src/data/demos.json from a
// Playwright spec means crossing the Vite/Node boundary, which prior PRs
// have hit issues with under Node 22's import-attribute requirement.
const ALL_SLUGS = [
  'tfg-polyps',
  'draculin',
  'bitsx-marato',
  'matriculas',
  'joc-eda',
  'jsbach',
  'tenda',
  'pro2',
  'mpids',
  'phase-transitions',
  'planificacion',
  'desastres-ia',
  'apa-practica',
  'prop',
  'caim',
  'sbc-ia',
  'par-parallel',
  'rob-robotics',
  'algorithms',
  'grafics',
];

// CSS injected during the initial document load (before any page script
// runs) to disable animations / transitions so transient frames can't leak
// into the screenshot baseline. Done via an init script rather than
// page.addStyleTag because Astro's ClientRouter can navigate / replace the
// document mid-load, which destroys the page context and breaks
// addStyleTag with "Target page, context or browser has been closed".
const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }

  .reveal,
  .reveal-stagger > * {
    opacity: 1 !important;
    transform: none !important;
  }
`;

test.beforeEach(async ({ page }) => {
  await page.route(
    (url) => {
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');
      const isPreview = url.hostname === PREVIEW_URL.hostname && port === PREVIEW_PORT;
      return LOOPBACK_HOSTS.has(url.hostname) && !isPreview;
    },
    (route) => route.abort('connectionrefused')
  );

  await page.addInitScript((css) => {
    // Inject as early as possible; re-inject on each navigation so
    // ClientRouter swaps don't drop the override.
    const inject = () => {
      if (document.getElementById('__visual-no-anim__')) return;
      const style = document.createElement('style');
      style.id = '__visual-no-anim__';
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.readyState !== 'loading') inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });
    document.addEventListener('astro:after-swap', inject);
  }, DISABLE_ANIMATIONS_CSS);
});

async function settle(page: Page) {
  // Wait for hydration / async data to land. Use 'load' rather than
  // 'networkidle' — the latter never fires on pages that keep a long-poll
  // open (e.g. dev-server HMR websocket). 'load' is enough to know the
  // page's top-level scripts ran, including ClientRouter's view-transition
  // handlers, so subsequent operations don't race a context destruction.
  await page.waitForLoadState('load').catch(() => undefined);
  // Settle one more frame for layout to absorb async hydration.
  await page.waitForTimeout(300);
}

test.describe('Homepage visual', () => {
  test('/ matches baseline', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await expect(page).toHaveScreenshot('home.png', {
      // Mask volatile widgets that would otherwise diff every run.
      mask: [page.locator('canvas'), page.locator('iframe')],
      fullPage: true,
    });
  });
});

test.describe('Demo pages visual', () => {
  for (const slug of ALL_SLUGS) {
    test(`/demos/${slug} matches baseline`, async ({ page }) => {
      await page.goto(`/demos/${slug}`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      await expect(page).toHaveScreenshot(`${slug}.png`, {
        mask: [page.locator('canvas'), page.locator('iframe')],
        fullPage: true,
      });
    });
  }
});
