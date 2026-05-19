/**
 * sync-inlang.ts
 *
 * Bridges the project's native i18n format with inlang's flat JSON message
 * files in `messages/{locale}.json`.
 *
 * Usage:
 *   npx tsx scripts/sync-inlang.ts export   # native → messages/*.json
 *   npx tsx scripts/sync-inlang.ts import   # messages/*.json → native
 *
 * After `export`, translators can use:
 *   - Sherlock (VS Code extension) for inline editing
 *   - Fink (https://fink.inlang.com) for a web-based translation UI
 *
 * After translators finish, run `import` to patch the native source files,
 * then `npx vitest run` to validate parity.
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

function extractLocaleBlock(content: string, locale: string): Record<string, string> {
  const result: Record<string, string> = {};
  const localePattern = new RegExp(`(?:^|\\n)\\s*${locale}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'm');
  const match = content.match(localePattern);
  if (!match) return result;

  const block = match[1];
  const kvPattern = /['"]([^'"]+)['"]\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  let kvMatch: RegExpExecArray | null;
  while ((kvMatch = kvPattern.exec(block)) !== null) {
    result[kvMatch[1]] = kvMatch[2] ?? kvMatch[3] ?? '';
  }
  return result;
}

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

  // Pattern A: ui.ts
  const uiContent = readFileSync(resolve(SRC, 'i18n/ui.ts'), 'utf-8');
  for (const locale of LOCALES) {
    const block = extractLocaleBlock(uiContent, locale);
    for (const [key, value] of Object.entries(block)) {
      messages[locale][`ui.${key}`] = value;
    }
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

  // Pattern C: Per-demo TS modules
  const demosDir = resolve(SRC, 'i18n/demos');
  const demoFiles = readdirSync(demosDir).filter(
    (f) => f.endsWith('.ts') && (f.includes('-page') || f.includes('-demo'))
  );
  for (const filename of demoFiles) {
    const content = readFileSync(resolve(demosDir, filename), 'utf-8');
    const prefix = filename.replace('.ts', '');

    for (const locale of LOCALES) {
      const block = extractLocaleBlock(content, locale);
      for (const [key, value] of Object.entries(block)) {
        messages[locale][`demo.${prefix}.${key}`] = value;
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

  // --- Pattern A: ui.ts ---
  const uiPath = resolve(SRC, 'i18n/ui.ts');
  let uiContent = readFileSync(uiPath, 'utf-8');
  let uiChanged = false;

  for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
    const localeBlockPattern = new RegExp(`(${locale}:\\s*\\{)([\\s\\S]*?)(\\n\\s*\\})`, 'm');
    const blockMatch = uiContent.match(localeBlockPattern);
    if (!blockMatch) continue;

    let block = blockMatch[2];
    const currentBlock = extractLocaleBlock(uiContent, locale);

    for (const [fullKey, newValue] of Object.entries(messages[locale])) {
      if (!fullKey.startsWith('ui.')) continue;
      const key = fullKey.slice(3); // strip "ui." prefix
      const oldValue = currentBlock[key];
      if (oldValue === undefined || oldValue === newValue) continue;

      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const kvPattern = new RegExp(
        `(['"]${escapedKey}['"]\\s*:\\s*)(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`
      );
      const quote = newValue.includes("'") && !newValue.includes('"') ? '"' : "'";
      const escaped =
        quote === "'"
          ? newValue.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
          : newValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      block = block.replace(kvPattern, `$1${quote}${escaped}${quote}`);
      uiChanged = true;
    }

    if (uiChanged) {
      uiContent = uiContent.replace(localeBlockPattern, `$1${block}$3`);
    }
  }

  if (uiChanged) {
    writeFileSync(uiPath, uiContent, 'utf-8');
    patchedFiles++;
    console.log('  ✓ src/i18n/ui.ts');
  }

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

  // --- Pattern C: Per-demo TS modules ---
  const demosDir = resolve(SRC, 'i18n/demos');
  const demoFiles = readdirSync(demosDir).filter(
    (f) => f.endsWith('.ts') && (f.includes('-page') || f.includes('-demo'))
  );
  for (const filename of demoFiles) {
    const filePath = resolve(demosDir, filename);
    let content = readFileSync(filePath, 'utf-8');
    const prefix = filename.replace('.ts', '');
    let fileChanged = false;

    for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
      const localeBlockPattern = new RegExp(`(${locale}:\\s*\\{)([\\s\\S]*?)(\\n\\s*\\})`, 'm');
      const blockMatch = content.match(localeBlockPattern);
      if (!blockMatch) continue;

      let block = blockMatch[2];
      const currentBlock = extractLocaleBlock(content, locale);

      for (const [fullKey, newValue] of Object.entries(messages[locale])) {
        const keyPrefix = `demo.${prefix}.`;
        if (!fullKey.startsWith(keyPrefix)) continue;

        const key = fullKey.slice(keyPrefix.length);
        const oldValue = currentBlock[key];
        if (oldValue === undefined || oldValue === newValue) continue;

        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const kvPattern = new RegExp(
          `(${escapedKey}\\s*:\\s*)(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`
        );
        const quote = newValue.includes("'") && !newValue.includes('"') ? '"' : "'";
        const escaped =
          quote === "'"
            ? newValue.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
            : newValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        block = block.replace(kvPattern, `$1${quote}${escaped}${quote}`);
        fileChanged = true;
      }

      if (fileChanged) {
        content = content.replace(localeBlockPattern, `$1${block}$3`);
      }
    }

    if (fileChanged) {
      writeFileSync(filePath, content, 'utf-8');
      patchedFiles++;
      console.log(`  ✓ src/i18n/demos/${filename}`);
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
