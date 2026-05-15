/**
 * E2E tests for live iframe demos (require Docker backends running).
 *
 * Prerequisites: Run `npm run dev:all` or start individual Docker services.
 *
 * Run: npx playwright test --project=live-demos
 */

import { test, expect } from '@playwright/test';
import { listLivePortfolioBackends } from '../src/data/demo-services';

// Curated allowlist of slugs we e2e-test live. Heavy backends (tfg-polyps,
// bitsx-marato, par, rob, etc.) and ones that have moved to browser-native
// mocks (caim) are excluded so we don't waste CI time probing services that
// rarely run locally. Add a slug here once you want it covered.
const LIVE_E2E_SLUGS = new Set<string>([
  'tenda',
  'draculin',
  'desastres-ia',
  'sbc-ia',
  'planificacion',
  'joc-eda',
  'mpids',
  'phase-transitions',
  'prop',
]);

const LIVE_DEMOS = listLivePortfolioBackends()
  .filter((d) => LIVE_E2E_SLUGS.has(d.slug))
  .map((d) => ({ slug: d.slug, port: d.port, name: d.displayName }));

// ─── Check if backends are reachable before testing ─────────────

for (const demo of LIVE_DEMOS) {
  test.describe(`${demo.name} (live iframe)`, () => {
    test.beforeEach(async ({ page }) => {
      // Skip if backend is not running
      try {
        const response = await page.request.get(`http://localhost:${demo.port}/`);
        test.skip(!response.ok(), `Backend on port ${demo.port} is not running`);
      } catch {
        test.skip(true, `Backend on port ${demo.port} is not reachable`);
      }
    });

    test('shows green live indicator', async ({ page }) => {
      await page.goto(`/demos/${demo.slug}`, { waitUntil: 'domcontentloaded' });
      // Wait for probe to complete
      await page.waitForTimeout(3000);
      // Should show green dot
      const liveText = page.getByText(
        /Live app detected|App en vivo detectada|App en viu detectada/
      );
      await expect(liveText.first()).toBeVisible();
    });

    test('renders iframe with correct src', async ({ page }) => {
      await page.goto(`/demos/${demo.slug}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const iframe = page.locator(`iframe[src*="localhost:${demo.port}"]`);
      await expect(iframe).toBeVisible();
    });

    test('collapse/expand button works', async ({ page }) => {
      await page.goto(`/demos/${demo.slug}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Find collapse button
      const collapseBtn = page
        .getByRole('button', { name: /collapse|colapsar|col·lapsar/i })
        .first();
      if (await collapseBtn.isVisible()) {
        await collapseBtn.click();
        // Iframe should be hidden
        const iframe = page.locator(`iframe[src*="localhost:${demo.port}"]`);
        await expect(iframe).not.toBeVisible();

        // Click expand
        const expandBtn = page.getByRole('button', { name: /show|mostrar/i }).first();
        await expandBtn.click();
        await expect(iframe).toBeVisible();
      }
    });

    test('open-in-new-tab link has correct URL', async ({ page }) => {
      await page.goto(`/demos/${demo.slug}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const link = page.locator(`a[href*="localhost:${demo.port}"][target="_blank"]`);
      await expect(link.first()).toBeVisible();
    });
  });
}
