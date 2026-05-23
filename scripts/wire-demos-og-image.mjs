#!/usr/bin/env node
/**
 * One-shot codemod: add `ogImage="/og/<slug>-og.png"` to every
 * `<DemoLayout slug="...">` in src/pages/demos/*.astro.
 *
 * Idempotent: skips files that already include `ogImage=`.
 *
 * Use after running the OG-capture workflow and committing the PNGs to
 * `public/og/`.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEMOS_DIR = join(ROOT, 'src', 'pages', 'demos');

let updated = 0;
let skipped = 0;
let errors = 0;

for (const file of readdirSync(DEMOS_DIR)) {
  if (!file.endsWith('.astro')) continue;
  const path = join(DEMOS_DIR, file);
  const original = readFileSync(path, 'utf8');

  if (/\bogImage=/.test(original)) {
    skipped += 1;
    continue;
  }

  // Match the slug="..." attribute on a <DemoLayout> tag (works whether
  // the tag is single-line or spans multiple lines, since we don't anchor
  // on the opening "<DemoLayout").
  const slugMatch = original.match(/<DemoLayout\b[^>]*?\bslug="([a-z0-9-]+)"/s);
  if (!slugMatch) {
    console.error(`! ${file}: no <DemoLayout slug="..."> found`);
    errors += 1;
    continue;
  }
  const slug = slugMatch[1];
  const ogAttr = ` ogImage="/og/${slug}-og.png"`;

  // Insert the new attribute right after the matched slug="..."
  const replaced = original.replace(
    /<DemoLayout\b([^>]*?\bslug="[a-z0-9-]+")/s,
    (_full, attrs) => `<DemoLayout${attrs}${ogAttr}`
  );

  writeFileSync(path, replaced);
  updated += 1;
  console.log(`✓ ${file} (slug=${slug})`);
}

console.log(`\nDone — wired ${updated}, skipped ${skipped} already-wired, ${errors} errors.`);
if (errors > 0) process.exitCode = 1;
