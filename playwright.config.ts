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
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
