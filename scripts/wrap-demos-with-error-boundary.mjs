#!/usr/bin/env node
/**
 * One-shot codemod: wrap every demo's default export with the
 * `withDemoErrorBoundary` HOC. After this runs, importing the demo from any
 * Astro page picks up the boundary automatically — no per-page changes
 * needed.
 *
 * Idempotent: detects the HOC marker comment and skips already-wrapped files.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DEMOS = [
  'ApaPracticaDemo',
  'BitsXMaratoDemo',
  'CAIMDemo',
  'DesastresIADemo',
  'DraculinDemo',
  'FibDemo',
  'GraficsDemo',
  'JSBachDemo',
  'MPIDSDemo',
  'ParDemo',
  'PhaseTransitionsDemo',
  'PlanificacionDemo',
  'Pro2Demo',
  'RobDemo',
  'SPMatriculasDemo',
  'SbcDemo',
  'TendaDemo',
  'TfgPolypDemo',
];

const MARKER = '// __DEMO_ERROR_BOUNDARY_APPLIED__';

/**
 * Find the line index of the last line of the top-of-file import block.
 * Tracks brace balance so multi-line `import { ... }` statements aren't split.
 */
function lastImportLine(lines) {
  let depth = 0;
  let inImport = false;
  let lastImportEnd = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!inImport) {
      if (/^import\s/.test(trimmed)) {
        inImport = true;
        depth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        if (depth === 0 && /;\s*$/.test(line)) {
          lastImportEnd = i;
          inImport = false;
        }
      } else if (trimmed === '' || /^\/\//.test(trimmed) || /^\/\*/.test(trimmed)) {
        // skip blank / comment lines between imports
      } else if (lastImportEnd >= 0) {
        // first non-import non-blank line after the block — stop
        break;
      }
    } else {
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (depth === 0 && /;\s*$/.test(line)) {
        lastImportEnd = i;
        inImport = false;
      }
    }
  }
  return lastImportEnd;
}

let updated = 0;
let skipped = 0;

for (const name of DEMOS) {
  const path = join(ROOT, 'src', 'components', 'demos', `${name}.tsx`);
  const original = readFileSync(path, 'utf8');

  if (original.includes(MARKER)) {
    skipped += 1;
    continue;
  }

  const exportPattern = new RegExp(`export default function ${name}\\(`);
  if (!exportPattern.test(original)) {
    console.error(`! ${name}: could not locate default export — manual wrap required`);
    continue;
  }
  const renamed = original.replace(exportPattern, `function ${name}(`);

  const lines = renamed.split('\n');
  const importEnd = lastImportLine(lines);
  if (importEnd < 0) {
    console.error(`! ${name}: no import block found`);
    continue;
  }

  const importLine = `import { withDemoErrorBoundary } from '../DemoErrorBoundary';`;
  lines.splice(importEnd + 1, 0, importLine);

  const slug = name.replace(/Demo$/, '').toLowerCase();
  const trailer = `\n${MARKER}\nexport default withDemoErrorBoundary(${name}, '${slug}');\n`;

  writeFileSync(path, lines.join('\n').trimEnd() + trailer);
  updated += 1;
  console.log(`✓ ${name}`);
}

console.log(`\nDone — wrapped ${updated}, skipped ${skipped} already-wrapped.`);
