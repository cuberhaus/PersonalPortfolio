/**
 * E2E tests for hosted live apps: a demo service that runs on a public host and
 * sleeps until a visitor asks for it (see docs/guides/adding-a-demo.md,
 * "Hosted live app").
 *
 * The suite serves the normal production build under a non-loopback hostname
 * (`hosted.portfolio.test`, mapped to the preview server by this project's
 * `--host-resolver-rules`). That hostname is what switches a live app embed into
 * hosted mode. The registry keeps the pilot switched off until its service
 * exists, so each test rewrites the registry's `hosted` block inside the served
 * bundle to the state it needs and answers for the hosted origin itself: no
 * test depends on a real hosted service or on the registry's current switch.
 *
 * Run: npx playwright test --project=hosted-demos
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page, type Request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SLUG = 'sbc-ia';
const EMBED_TITLE = 'SBC_IA Trip Planner';
const HOSTED_ORIGIN = 'https://pilot.hosted.test';
const LOOPBACK_ORIGIN =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://${process.env.PLAYWRIGHT_HOST ?? '127.0.0.1'}:${process.env.PLAYWRIGHT_PORT ?? '4322'}`;

// The registry ships inside the client bundle; this is how its hosted block is
// serialized by the production build (`hosted:{url:null,enabled:!1}`).
const HOSTED_BLOCK = /hosted:\{url:[^,}]+,enabled:(?:!0|!1|true|false)\}/g;

const WAKE_DEADLINE_MS = 120_000;
const POLL_INTERVAL_MS = 3_000;

type Copy = Record<string, string>;

function readCopy(locale: string): Copy {
  const file = resolve(process.cwd(), 'locales', locale, 'live-app-embed.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Copy;
}

const en = readCopy('en');

interface HostedRegistryState {
  url: string | null;
  enabled: boolean;
}

/**
 * Rewrites the registry's hosted block in the JS the preview server sends. The
 * returned counter lets a test fail loudly if the bundle shape ever drifts,
 * instead of silently testing the shipped switch.
 */
async function serveHostedRegistry(page: Page, state: HostedRegistryState) {
  const counter = { rewrites: 0 };
  await page.route('**/_astro/*.js', async (route) => {
    // route.fetch runs in Node, where the browser's host mapping does not
    // apply, so ask the preview server through its loopback address.
    const { pathname } = new URL(route.request().url());
    const response = await route.fetch({ url: `${LOOPBACK_ORIGIN}${pathname}` });
    const body = (await response.text()).replace(HOSTED_BLOCK, () => {
      counter.rewrites += 1;
      return `hosted:{url:${JSON.stringify(state.url)},enabled:${state.enabled}}`;
    });
    await route.fulfill({
      response,
      body,
      headers: { ...response.headers(), 'content-length': String(Buffer.byteLength(body)) },
    });
  });
  return counter;
}

type HealthOutcome = number | 'hang';

/** Plays the hosted origin: `/health` answers per `health`, anything else is the live app. */
async function serveHostedService(page: Page, health: (call: number) => HealthOutcome) {
  const requests: Request[] = [];
  const service = {
    requests,
    healthCalls: 0,
    preflights: () => requests.filter((request) => request.method() === 'OPTIONS'),
  };

  await page.route(`${HOSTED_ORIGIN}/**`, async (route) => {
    const request = route.request();
    requests.push(request);

    if (new URL(request.url()).pathname === '/health') {
      service.healthCalls += 1;
      const outcome = health(service.healthCalls);
      if (outcome === 'hang') return;
      await route.fulfill({
        status: outcome,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ status: outcome === 200 ? 'ok' : 'waking' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Hosted live app</title><h1>Hosted live app fixture</h1>',
    });
  });

  return service;
}

const panel = (page: Page) => page.locator('[data-hosted-panel]');
const announcer = (page: Page) => page.locator('[data-live-app-region] [role="status"]');
const fallback = (page: Page) => page.locator('[data-live-app-fallback]');
const hostedFrame = (page: Page) => page.locator(`iframe[title="${EMBED_TITLE}"]`);

async function openWithRegistry(page: Page, state: HostedRegistryState, route = `/demos/${SLUG}`) {
  const registry = await serveHostedRegistry(page, state);
  await page.goto(route);
  await expect(panel(page)).toBeVisible();
  expect(registry.rewrites, 'the registry hosted block was not found in the served bundle').toBe(1);
}

test.describe('hosted live app (sbc-ia)', () => {
  test('sleeps until started: the start panel shows and nothing is requested', async ({ page }) => {
    const service = await serveHostedService(page, () => 200);
    await openWithRegistry(page, { url: HOSTED_ORIGIN, enabled: true });

    await expect(panel(page)).toContainText(en.hostedIdleTitle);
    await expect(panel(page).getByRole('button', { name: en.hostedStart })).toBeVisible();
    await expect(fallback(page)).toBeVisible();
    await expect(hostedFrame(page)).toHaveCount(0);
    await expect(announcer(page)).toHaveText('');

    await page.waitForLoadState('networkidle');
    expect(service.requests).toHaveLength(0);
  });

  test('wakes on demand, announces the wake, then shows the hosted live app', async ({ page }) => {
    await page.clock.install();
    const service = await serveHostedService(page, (call) => (call < 3 ? 503 : 200));
    await openWithRegistry(page, { url: HOSTED_ORIGIN, enabled: true });

    const start = panel(page).getByRole('button', { name: en.hostedStart });
    await start.click();

    await expect(announcer(page)).toHaveText(en.hostedWakingTitle);
    await expect(start).toHaveAttribute('aria-disabled', 'true');
    await expect(start).toBeFocused();
    await expect(fallback(page)).toBeVisible();

    await expect.poll(() => service.healthCalls).toBe(1);
    await page.clock.fastForward(POLL_INTERVAL_MS);
    await expect.poll(() => service.healthCalls).toBe(2);
    await expect(announcer(page)).toHaveText(en.hostedWakingTitle);
    await page.clock.fastForward(POLL_INTERVAL_MS);

    await expect(announcer(page)).toHaveText(en.hostedLive);
    await expect(hostedFrame(page)).toHaveAttribute('src', HOSTED_ORIGIN);
    await expect(
      page.frameLocator(`iframe[title="${EMBED_TITLE}"]`).getByRole('heading', {
        name: 'Hosted live app fixture',
      })
    ).toBeVisible();
    await expect(fallback(page)).toBeHidden();
    await expect(panel(page)).toHaveCount(0);
    expect(service.healthCalls).toBe(3);
  });

  test('polls with a simple CORS request: no preflight, no tracing or session headers', async ({
    page,
  }) => {
    const service = await serveHostedService(page, () => 200);
    await openWithRegistry(page, { url: HOSTED_ORIGIN, enabled: true });

    await panel(page).getByRole('button', { name: en.hostedStart }).click();
    await expect(announcer(page)).toHaveText(en.hostedLive);

    const health = service.requests.find(
      (request) => new URL(request.url()).pathname === '/health'
    );
    expect(health, 'the wake never polled /health').toBeDefined();
    const headers = await health!.allHeaders();
    expect(headers['x-session-id']).toBeUndefined();
    expect(headers['sentry-trace']).toBeUndefined();
    expect(headers['baggage']).toBeUndefined();
    expect(headers['cookie']).toBeUndefined();
    expect(service.preflights()).toHaveLength(0);
  });

  test('gives up after the wake deadline, keeps the demo, and lets the visitor try again', async ({
    page,
  }) => {
    await page.clock.install();
    let awake = false;
    const service = await serveHostedService(page, () => (awake ? 200 : 503));
    await openWithRegistry(page, { url: HOSTED_ORIGIN, enabled: true });

    await panel(page).getByRole('button', { name: en.hostedStart }).click();
    await expect.poll(() => service.healthCalls).toBe(1);

    await page.clock.fastForward(WAKE_DEADLINE_MS + POLL_INTERVAL_MS);

    await expect(announcer(page)).toHaveText(en.hostedUnavailableTitle);
    await expect(panel(page)).toContainText(en.hostedUnavailableDesc);
    await expect(fallback(page)).toBeVisible();
    const retry = panel(page).getByRole('button', { name: en.hostedRetry });
    await expect(retry).toBeVisible();

    awake = true;
    await retry.click();

    await expect(announcer(page)).toHaveText(en.hostedLive);
    await expect(hostedFrame(page)).toHaveAttribute('src', HOSTED_ORIGIN);
    await expect(fallback(page)).toBeHidden();
  });

  test('explains a switched-off hosted live app without an action or any request', async ({
    page,
  }) => {
    const service = await serveHostedService(page, () => 200);
    await openWithRegistry(page, { url: null, enabled: false });

    await expect(panel(page)).toContainText(en.hostedUnavailableTitle);
    await expect(panel(page)).toContainText(en.hostedDisabledDesc);
    await expect(panel(page).getByRole('button')).toHaveCount(0);
    await expect(fallback(page)).toBeVisible();
    await expect(announcer(page)).toHaveText('');

    await page.waitForLoadState('networkidle');
    expect(service.requests).toHaveLength(0);
  });

  for (const locale of ['es', 'ca']) {
    test(`speaks ${locale} on the localized page`, async ({ page }) => {
      const copy = readCopy(locale);
      await serveHostedService(page, () => 200);
      await openWithRegistry(
        page,
        { url: HOSTED_ORIGIN, enabled: true },
        `/${locale}/demos/${SLUG}`
      );

      await expect(panel(page)).toContainText(copy.hostedIdleTitle);
      await panel(page).getByRole('button', { name: copy.hostedStart }).click();

      await expect(announcer(page)).toHaveText(copy.hostedLive);
    });
  }

  test('stays on the local behaviour when the page is served from loopback', async ({ page }) => {
    const service = await serveHostedService(page, () => 200);
    await serveHostedRegistry(page, { url: HOSTED_ORIGIN, enabled: true });

    await page.goto(`${LOOPBACK_ORIGIN}/demos/${SLUG}`);

    // The local probe settles to offline (no backend) or online (Docker running).
    await expect(
      page.locator('[data-live-status="offline"], [data-live-status="online"]')
    ).toHaveCount(1);
    await expect(panel(page)).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(service.requests).toHaveLength(0);
  });
});

test.describe('hosted live app accessibility', () => {
  interface PanelState {
    name: string;
    registry: HostedRegistryState;
    /** What `/health` answers while this state is reached; defaults to 200. */
    health?: HealthOutcome;
    /** Install the fake clock so the wake deadline can be fast-forwarded. */
    clock?: boolean;
    /** Drives the page into this state after it has loaded. */
    arrive: (page: Page) => Promise<void>;
  }

  const STATES: PanelState[] = [
    {
      name: 'asleep',
      registry: { url: HOSTED_ORIGIN, enabled: true },
      arrive: async () => {},
    },
    {
      name: 'waking',
      registry: { url: HOSTED_ORIGIN, enabled: true },
      health: 'hang',
      arrive: async (page: Page) => {
        await panel(page).getByRole('button', { name: en.hostedStart }).click();
        await expect(announcer(page)).toHaveText(en.hostedWakingTitle);
      },
    },
    {
      name: 'unavailable after a timeout',
      registry: { url: HOSTED_ORIGIN, enabled: true },
      health: 503,
      clock: true,
      arrive: async (page: Page) => {
        await panel(page).getByRole('button', { name: en.hostedStart }).click();
        await page.clock.fastForward(WAKE_DEADLINE_MS + POLL_INTERVAL_MS);
        await expect(announcer(page)).toHaveText(en.hostedUnavailableTitle);
      },
    },
    {
      name: 'switched off',
      registry: { url: null, enabled: false },
      arrive: async () => {},
    },
  ];

  for (const theme of ['dark', 'light']) {
    for (const state of STATES) {
      test(`${state.name} panel has no serious or critical violations (${theme})`, async ({
        page,
      }) => {
        await page.addInitScript((id) => localStorage.setItem('theme', id), theme);
        if (state.clock) await page.clock.install();
        await serveHostedService(page, () => state.health ?? 200);
        await openWithRegistry(page, state.registry);
        await state.arrive(page);

        const results = await new AxeBuilder({ page: page as never })
          .include('[data-live-app-region] [data-live-status]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        const blocking = results.violations.filter((violation) =>
          ['serious', 'critical'].includes(violation.impact ?? '')
        );
        expect(
          blocking.map((violation) => `${violation.impact}: ${violation.id}`),
          `${state.name} / ${theme}`
        ).toEqual([]);
      });
    }
  }
});
