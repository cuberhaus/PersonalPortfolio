/**
 * Accessibility audits using axe-core against every browser-only demo route
 * plus the localized homepage shells. Asserts zero serious or critical
 * violations — moderate/minor are surfaced via console for triage.
 *
 * Run: npx playwright test --project=a11y
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HOME_ROUTES = ['/', '/es/', '/ca/'];

const DEMO_SLUGS = [
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

const STANDARD_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

async function runAxe(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  // AxeBuilder's `Page` type comes from a slightly older playwright-core version
  // pinned by @axe-core/playwright; a structural cast keeps both happy.
  const results = await new AxeBuilder({ page: page as never }).withTags(STANDARD_TAGS).analyze();

  const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''));
  if (results.violations.length > 0) {
    const summary = results.violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodes)`);
    console.info(`[a11y] ${route} — violations:\n  ${summary.join('\n  ')}`);
  }
  return blocking;
}

test.describe('a11y — homepage shells', () => {
  for (const route of HOME_ROUTES) {
    test(`${route} has no serious/critical axe violations`, async ({ page }) => {
      const blocking = await runAxe(page, route);
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});

test.describe('a11y — demo routes', () => {
  for (const slug of DEMO_SLUGS) {
    test(`/demos/${slug} has no serious/critical axe violations`, async ({ page }) => {
      const blocking = await runAxe(page, `/demos/${slug}`);
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});
