import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_HOST = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT ?? '4322';
const PLAYWRIGHT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}`;
const PLAYWRIGHT_WEB_SERVER_TIMEOUT = Number(process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT ?? 240_000);
const WEB_SERVER_COMMAND = process.env.CI
  ? `npm run preview:static -- --host ${PLAYWRIGHT_HOST} --port ${PLAYWRIGHT_PORT}`
  : `npm run build && npm run preview:static -- --host ${PLAYWRIGHT_HOST} --port ${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'portfolio-smoke',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /portfolio-smoke\.spec\.ts/,
    },
    {
      name: 'browser-demos',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /browser-demos\.spec\.ts/,
    },
    {
      name: 'live-demos',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /live-demos\.spec\.ts/,
    },
    {
      name: 'themes',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /themes\.spec\.ts/,
    },
    {
      name: 'debug-overlay',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /debug-overlay\.spec\.ts/,
    },
    {
      name: 'a11y',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /a11y\.spec\.ts/,
      // axe results are deterministic — retrying just spends CI minutes
      // on the same failure. Override the project default of 2 retries.
      retries: 0,
      // Theme switching + reload makes each test ~5-10s; with axe's own
      // browser-side work the default 30s isn't always enough on a busy box.
      timeout: 60_000,
      // Locally we let Playwright auto-detect (= half the cores). On CI we
      // pin to 4 to avoid swamping the single Astro dev server, and CI also
      // shards the suite across 4 runners (test.yml playwright-a11y job).
      // If you see "Target page closed" / context-closed timeouts locally,
      // drop this back to a fixed number (e.g. 8) until the dev server
      // catches up.
      workers: process.env.CI ? 4 : undefined,
    },
    {
      name: 'keyboard',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /keyboard\.spec\.ts/,
      // Tab-order assertions are deterministic — retries waste CI time.
      retries: 0,
    },
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /visual\.spec\.ts/,
      // Snapshot diffs are deterministic — a flaky run is a real signal,
      // not a retry candidate.
      retries: 0,
      expect: {
        toHaveScreenshot: {
          // 1% pixel drift tolerance covers font hinting and gradient
          // banding while still catching real layout shifts.
          maxDiffPixelRatio: 0.01,
        },
      },
    },
  ],
  webServer: {
    command: WEB_SERVER_COMMAND,
    url: PLAYWRIGHT_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: PLAYWRIGHT_WEB_SERVER_TIMEOUT,
  },
});
