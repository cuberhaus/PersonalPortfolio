#!/usr/bin/env node
/**
 * Capture per-demo OpenGraph screenshots.
 *
 * - Reads slugs from src/data/demos.json
 * - Hits the running dev server (defaults to http://localhost:4321)
 * - Saves 1200x630 PNGs to public/og/<slug>-og.png
 *
 * Usage:
 *   npm run dev          # in another terminal
 *   npm run og:capture   # writes public/og/*-og.png
 *
 * Wire each captured image into the demo page by passing
 * `ogImage="/og/<slug>-og.png"` to <DemoLayout>.
 */

import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE = process.env.OG_BASE_URL ?? 'http://localhost:4321';
const OUT_DIR = resolve(ROOT, 'public/og');

async function loadSlugs() {
  const raw = await readFile(resolve(ROOT, 'src/data/demos.json'), 'utf8');
  const demos = JSON.parse(raw);
  return demos.map((d) => d.identity.slug).filter(Boolean);
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  const slugs = await loadSlugs();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  let captured = 0;
  let failed = 0;

  for (const slug of slugs) {
    const url = `${BASE}/demos/${slug}`;
    const out = resolve(OUT_DIR, `${slug}-og.png`);
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(500);
      const buffer = await page.screenshot({ type: 'png', fullPage: false });
      await writeFile(out, buffer);
      console.info(`[og] captured ${slug} → ${out}`);
      captured += 1;
    } catch (err) {
      console.error(`[og] failed ${slug}: ${err.message}`);
      failed += 1;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.info(`[og] done — ${captured} captured, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
