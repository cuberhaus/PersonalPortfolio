import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
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
    },
    {
      name: 'keyboard',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /keyboard\.spec\.ts/,
      // Tab-order assertions are deterministic — retries waste CI time.
      retries: 0,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
