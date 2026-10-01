/**
 * Shared helpers for the analytics-consent Playwright project (issue #13).
 *
 * Consent behaviour only exists in a site built with a GA4 measurement ID, but
 * every other project must keep testing the default (analytics-off) site. So
 * the `analytics-consent-build` setup project builds a *second* copy of the
 * site with a fake ID (and a fake visit-counter code, which the same spec
 * covers), and each test worker serves it from its own static server on a
 * free port (no fixed port to collide with a dev server or a stale process).
 * Imported by the setup file and the spec.
 */
import { spawn } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = '127.0.0.1';

/** Well-formed but fake GA4 ID. Google is never contacted: the spec stubs every Google request. */
export const CONSENT_TEST_MEASUREMENT_ID = 'G-TESTCONSENT';

/** Well-formed but fake GoatCounter site code. GoatCounter is never contacted: the spec stubs every request to it. */
export const CONSENT_TEST_COUNTER_CODE = 'test-counter';

/** Where the visit counter must send views for that code. Spelled out so a typo in the module cannot hide itself. */
export const COUNTER_TEST_ENDPOINT = 'https://test-counter.goatcounter.com/count';

/** Output of the analytics-enabled build. Under node_modules/.cache so every tool already ignores it. */
export const CONSENT_SITE_DIR = resolve(
  repoRoot,
  'node_modules',
  '.cache',
  'analytics-consent-site'
);

export const ASTRO_BIN = resolve(repoRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

/** The default site every other project tests: built without PUBLIC_GA_ID, so it must show no consent UI and load no consent script. */
export const DEFAULT_SITE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://${process.env.PLAYWRIGHT_HOST ?? HOST}:${process.env.PLAYWRIGHT_PORT ?? '4322'}`;

function findFreePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createServer();
    probe.once('error', rejectPort);
    probe.listen(0, HOST, () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolvePort(port));
    });
  });
}

/**
 * Serve the analytics-enabled build with the repo's own static server (the
 * one CI and `make preview` use) on a free port. Resolves once it answers.
 */
export async function startConsentSite(): Promise<{ url: string; stop: () => void }> {
  const port = await findFreePort();
  const url = `http://${HOST}:${port}`;
  const server = spawn(
    process.execPath,
    [
      resolve(repoRoot, 'scripts', 'static-preview.mjs'),
      CONSENT_SITE_DIR,
      '--host',
      HOST,
      '--port',
      String(port),
    ],
    { stdio: 'ignore' }
  );
  const stop = () => {
    server.kill();
  };

  const deadline = Date.now() + 30_000;
  for (;;) {
    if (server.exitCode !== null) {
      throw new Error(
        `static-preview exited early (code ${server.exitCode}) for ${CONSENT_SITE_DIR}`
      );
    }
    try {
      if ((await fetch(url)).ok) return { url, stop };
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) {
      stop();
      throw new Error(
        `The analytics-enabled site did not respond at ${url}. ` +
          `Did the analytics-consent-build project run (and did ${CONSENT_SITE_DIR} get built)?`
      );
    }
    await new Promise((wait) => setTimeout(wait, 100));
  }
}
