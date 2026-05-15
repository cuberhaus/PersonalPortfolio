#!/usr/bin/env node
/**
 * Capture OpenGraph screenshots — one global card from the homepage,
 * plus one per demo from src/data/demos.json.
 *
 * - Hits a running server (defaults to http://localhost:4321)
 * - Writes 1200x630 PNGs:
 *     <out>/og-image.png       ← global, referenced by Layout/DemoLayout
 *     <out>/og/<slug>-og.png   ← per-demo, referenced by each demo page
 *
 * Output dir is `public/` by default; CI overrides it to `dist/` so the
 * images land directly in the build artifact and never get committed.
 *
 * Env:
 *   OG_BASE_URL   server URL to screenshot (default http://localhost:4321)
 *   OG_OUT_DIR    output dir relative to repo root (default "public")
 */

// Use @playwright/test's chromium (matches the version that
// `npx playwright install` downloads in CI). Importing from the
// `playwright` package directly pulls in a different pinned version
// and points at a browser build that was never installed.
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE = process.env.OG_BASE_URL ?? 'http://localhost:4321';
const OUT_ROOT = resolve(ROOT, process.env.OG_OUT_DIR ?? 'public');
const DEMO_OUT_DIR = resolve(OUT_ROOT, 'og');

async function loadSlugs() {
  const raw = await readFile(resolve(ROOT, 'src/data/demos.json'), 'utf8');
  const demos = JSON.parse(raw);
  return demos.map((d) => d.identity.slug).filter(Boolean);
}

async function capture(context, url, outPath) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(500);
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    await writeFile(outPath, buffer);
    console.info(`[og] captured ${url} → ${outPath}`);
    return true;
  } catch (err) {
    console.error(`[og] failed ${url}: ${err.message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function main() {
  if (!existsSync(DEMO_OUT_DIR)) {
    await mkdir(DEMO_OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  const targets = [
    { url: `${BASE}/`, out: resolve(OUT_ROOT, 'og-image.png') },
    ...(await loadSlugs()).map((slug) => ({
      url: `${BASE}/demos/${slug}`,
      out: resolve(DEMO_OUT_DIR, `${slug}-og.png`),
    })),
  ];

  let captured = 0;
  let failed = 0;
  for (const t of targets) {
    const ok = await capture(context, t.url, t.out);
    if (ok) captured += 1;
    else failed += 1;
  }

  await browser.close();
  console.info(`[og] done — ${captured} captured, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
