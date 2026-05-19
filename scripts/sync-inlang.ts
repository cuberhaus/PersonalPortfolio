/**
 * sync-inlang.ts
 *
 * Bridges Pattern B (data JSONs) and Pattern C (demo TS modules) with inlang's
 * flat JSON message files in `messages/{locale}.json`.
 *
 * Pattern A (UI strings) is now handled natively by i18next — translation files
 * live in `locales/{locale}/ui.json` and inlang reads them directly via
 * `@inlang/plugin-i18next`.
 *
 * Usage:
 *   npx tsx scripts/sync-inlang.ts export   # native → messages/*.json
 *   npx tsx scripts/sync-inlang.ts import   # messages/*.json → native
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOCALES, DEFAULT_LOCALE, type Locale } from '../src/config/locales';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, 'src');
const MESSAGES_DIR = resolve(ROOT, 'messages');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTranslatableDataFile(filename: string): boolean {
  if (!filename.endsWith('.json')) return false;
  const filePath = resolve(SRC, 'data', filename);
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    return parsed.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as { copy?: unknown };
      if (!candidate.copy || typeof candidate.copy !== 'object') return false;
      const copy = candidate.copy as Record<string, unknown>;
      return copy.en && typeof copy.en === 'object';
    });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// EXPORT: native → messages/{locale}.json
// ---------------------------------------------------------------------------

function doExport() {
  mkdirSync(MESSAGES_DIR, { recursive: true });

  // Collect all messages per locale
  const messages: Record<Locale, Record<string, string>> = {} as any;
  for (const locale of LOCALES) {
    messages[locale] = {};
  }

  // Pattern B: Data JSON files
  const dataFiles = readdirSync(resolve(SRC, 'data')).filter(isTranslatableDataFile);
  for (const filename of dataFiles) {
    const filePath = resolve(SRC, 'data', filename);
    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Array<{
      identity: Record<string, unknown>;
      copy: Record<string, Record<string, unknown>>;
    }>;
    const prefix = filename.replace('.json', '');

    // Use stable index-based keys to avoid collisions when multiple items
    // share the same identity field (e.g. same role in work_projects.json).
    for (let idx = 0; idx < data.length; idx++) {
      const item = data[idx];

      for (const locale of LOCALES) {
        const copy = item.copy?.[locale] ?? {};
        for (const [field, value] of Object.entries(copy)) {
          if (typeof value === 'string') {
            messages[locale][`${prefix}[${idx}].${field}`] = value;
          } else if (Array.isArray(value)) {
            value.forEach((v, i) => {
              if (typeof v === 'string') {
                messages[locale][`${prefix}[${idx}].${field}.${i}`] = v;
              }
            });
          }
        }
      }
    }
  }

  // Write one file per locale
  for (const locale of LOCALES) {
    const sorted = Object.fromEntries(
      Object.entries(messages[locale]).sort(([a], [b]) => a.localeCompare(b))
    );
    const outPath = resolve(MESSAGES_DIR, `${locale}.json`);
    writeFileSync(outPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  }

  const keyCount = Object.keys(messages.en).length;
  console.log(`✓ Exported ${keyCount} messages × ${LOCALES.length} locales to messages/`);
  console.log(`\nTranslators can now use:`);
  console.log(`  • Sherlock (VS Code extension) — edit inline`);
  console.log(`  • Fink (https://fink.inlang.com) — web editor`);
  console.log(`\nAfter translation, run: npx tsx scripts/sync-inlang.ts import`);
}

// ---------------------------------------------------------------------------
// IMPORT: messages/{locale}.json → native
// ---------------------------------------------------------------------------

function doImport() {
  // Read all message files
  const messages: Record<Locale, Record<string, string>> = {} as any;
  for (const locale of LOCALES) {
    const filePath = resolve(MESSAGES_DIR, `${locale}.json`);
    messages[locale] = JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  let patchedFiles = 0;

  // --- Pattern B: Data JSON files ---
  const dataFiles = readdirSync(resolve(SRC, 'data')).filter(isTranslatableDataFile);
  for (const filename of dataFiles) {
    const filePath = resolve(SRC, 'data', filename);
    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Array<{
      identity: Record<string, unknown>;
      copy: Record<string, Record<string, unknown>>;
    }>;
    const prefix = filename.replace('.json', '');
    let fileChanged = false;

    for (let idx = 0; idx < data.length; idx++) {
      const item = data[idx];

      for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
        if (!item.copy[locale]) item.copy[locale] = {};
        const copy = item.copy[locale];

        for (const [fullKey, newValue] of Object.entries(messages[locale])) {
          // Match: prefix[idx].field or prefix[idx].field.arrayIndex
          const fieldPattern = `${prefix}[${idx}].`;
          if (!fullKey.startsWith(fieldPattern)) continue;

          const rest = fullKey.slice(fieldPattern.length);
          const arrayMatch = rest.match(/^([^.]+)\.(\d+)$/);

          if (arrayMatch) {
            const [, field, indexStr] = arrayMatch;
            const index = parseInt(indexStr, 10);
            if (!Array.isArray(copy[field])) {
              const enArr = item.copy.en[field];
              copy[field] = Array.isArray(enArr) ? [...(enArr as string[])] : [];
            }
            if ((copy[field] as string[])[index] !== newValue) {
              (copy[field] as string[])[index] = newValue;
              fileChanged = true;
            }
          } else {
            // Simple string field
            if (copy[rest] !== newValue) {
              copy[rest] = newValue;
              fileChanged = true;
            }
          }
        }
      }
    }

    if (fileChanged) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      patchedFiles++;
      console.log(`  ✓ src/data/${filename}`);
    }
  }

  console.log(`\n✓ Import complete — patched ${patchedFiles} file(s).`);
  console.log('\nNext steps:');
  console.log('  npx vitest run   # validate parity');
  console.log('  git diff          # review changes');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const command = process.argv[2];

if (command === 'export') {
  doExport();
} else if (command === 'import') {
  doImport();
} else {
  console.error('Usage: npx tsx scripts/sync-inlang.ts <export|import>');
  console.error('  export  — native source files → messages/{locale}.json');
  console.error('  import  — messages/{locale}.json → native source files');
  process.exit(1);
}
