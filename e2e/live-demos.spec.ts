/**
 * E2E tests for live iframe demos (require Docker backends running).
 * 
 * Prerequisites: Run `npm run dev:all` or start individual Docker services.
 *
 * Run: npx playwright test --project=live-demos
 */

import { test, expect } from '@playwright/test';

const LIVE_DEMOS = [
  { slug: 'tenda', port: 8888, name: 'Tenda Online' },
  { slug: 'draculin', port: 8890, name: 'Draculin' },
  { slug: 'desastres-ia', port: 8083, name: 'Desastres IA' },
  { slug: 'sbc-ia', port: 8088, name: 'SBC IA Trip Planner' },
  // CAIM is now a browser-native mock demo; iframe fallback still works but tested in browser-demos.spec.ts
  // { slug: 'caim', port: 8086, name: 'CAIM IR Explorer' },
  { slug: 'planificacion', port: 8765, name: 'Planificación' },
  { slug: 'joc-eda', port: 8082, name: 'Joc EDA' },
  { slug: 'mpids', port: 8085, name: 'MPIDS Solver' },
  { slug: 'phase-transitions', port: 8087, name: 'Phase Transitions' },
  { slug: 'prop', port: 8081, name: 'Prop Recommendation' },
];

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
      await page.goto(`/demos/${demo.slug}`, { waitUntil: 'networkidle' });
      // Wait for probe to complete
      await page.waitForTimeout(3000);
      // Should show green dot
      const greenDot = page.locator('[style*="#22c55e"], [style*="linear-gradient(135deg, rgba(16,185,129"]');
      await expect(greenDot.first()).toBeVisible();
    });

    test('renders iframe with correct src', async ({ page }) => {
      await page.goto(`/demos/${demo.slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const iframe = page.locator(`iframe[src*="localhost:${demo.port}"]`);
      await expect(iframe).toBeVisible();
    });

    test('collapse/expand button works', async ({ page }) => {
      await page.goto(`/demos/${demo.slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Find collapse button
      const collapseBtn = page.getByRole('button', { name: /collapse|colapsar|col·lapsar/i }).first();
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
      await page.goto(`/demos/${demo.slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const link = page.locator(`a[href*="localhost:${demo.port}"][target="_blank"]`);
      await expect(link.first()).toBeVisible();
    });
  });
}
