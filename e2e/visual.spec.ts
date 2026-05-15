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

async function settle(page: Page) {
  // Wait for hydration / async data to land. networkidle is fine for the
  // browser-only demos; the live-demo iframes are masked below regardless.
  await page.waitForLoadState('networkidle').catch(() => undefined);
  // Disable animations so transient transition states don't leak into the
  // baseline. Astro/React inline styles aren't affected, but animated
  // SVG elements and CSS keyframes are.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
  // Settle one more frame for layout to absorb the override.
  await page.waitForTimeout(150);
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
