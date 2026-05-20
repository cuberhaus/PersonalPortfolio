/**
 * i18n review tool — generates a local HTML page showing all translation
 * namespaces side-by-side (en / es / ca) with missing/empty keys highlighted.
 *
 * Usage:
 *   npx tsx scripts/i18n-review.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const LOCALES_DIR = join(import.meta.dirname, '..', 'locales');
const OUT_FILE = join(import.meta.dirname, '..', 'node_modules', '.cache', 'i18n-review.html');
const BASE_LOCALE = 'en';

// ─── Load all locale data ───────────────────────────────────────

const locales = readdirSync(LOCALES_DIR).filter(
  (f) => !f.includes('.') // only directories
);

const namespaces = readdirSync(join(LOCALES_DIR, BASE_LOCALE))
  .filter((f) => f.endsWith('.json'))
  .map((f) => basename(f, '.json'))
  .sort();

type FlatMap = Record<string, string>;

/**
 * Recursively flattens a JSON object to dotted keys.
 * `{ "0": { "role": "x" } }` → `{ "0.role": "x" }`
 */
function flatten(obj: unknown, prefix = ''): FlatMap {
  const out: FlatMap = {};
  if (typeof obj !== 'object' || obj === null) {
    out[prefix] = String(obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else if (Array.isArray(v)) {
      out[key] = JSON.stringify(v);
    } else {
      out[key] = String(v ?? '');
    }
  }
  return out;
}

function loadNamespace(locale: string, ns: string): FlatMap {
  const path = join(LOCALES_DIR, locale, `${ns}.json`);
  try {
    return flatten(JSON.parse(readFileSync(path, 'utf-8')));
  } catch {
    return {};
  }
}

// ─── Compute stats ──────────────────────────────────────────────

interface NsData {
  name: string;
  keys: string[];
  localeData: Record<string, FlatMap>;
  missing: Record<string, string[]>; // locale → missing keys
  empty: Record<string, string[]>; // locale → empty-value keys
}

const nsDataList: NsData[] = namespaces.map((ns) => {
  const localeData: Record<string, FlatMap> = {};
  for (const locale of locales) localeData[locale] = loadNamespace(locale, ns);

  const baseKeys = Object.keys(localeData[BASE_LOCALE]);
  const missing: Record<string, string[]> = {};
  const empty: Record<string, string[]> = {};

  for (const locale of locales) {
    if (locale === BASE_LOCALE) continue;
    missing[locale] = baseKeys.filter((k) => !(k in localeData[locale]));
    empty[locale] = baseKeys.filter(
      (k) => k in localeData[locale] && localeData[locale][k].trim() === ''
    );
  }

  return { name: ns, keys: baseKeys, localeData, missing, empty };
});

const totalMissing = nsDataList.reduce(
  (sum, ns) => sum + Object.values(ns.missing).flat().length,
  0
);
const totalEmpty = nsDataList.reduce((sum, ns) => sum + Object.values(ns.empty).flat().length, 0);

// ─── Generate HTML ──────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cellClass(locale: string, key: string, ns: NsData): string {
  if (ns.missing[locale]?.includes(key)) return 'missing';
  if (ns.empty[locale]?.includes(key)) return 'empty';
  return '';
}

function renderValue(locale: string, key: string, ns: NsData): string {
  if (ns.missing[locale]?.includes(key)) return '<span class="badge missing-badge">MISSING</span>';
  const val = ns.localeData[locale][key] ?? '';
  return `<span class="val">${esc(val.length > 120 ? val.slice(0, 120) + '…' : val)}</span>`;
}

const nsNav = namespaces
  .map((ns) => {
    const d = nsDataList.find((n) => n.name === ns)!;
    const hasIssues =
      Object.values(d.missing).flat().length + Object.values(d.empty).flat().length > 0;
    return `<a href="#ns-${esc(ns)}" class="${hasIssues ? 'has-issues' : ''}">${esc(ns)}</a>`;
  })
  .join('\n');

const nsSections = nsDataList
  .map((ns) => {
    const nsTotal = Object.values(ns.missing).flat().length + Object.values(ns.empty).flat().length;
    const badge =
      nsTotal > 0 ? `<span class="ns-badge">${nsTotal} issue${nsTotal > 1 ? 's' : ''}</span>` : '';

    const rows = ns.keys
      .map((key) => {
        const rowClass = locales
          .filter((l) => l !== BASE_LOCALE)
          .some((l) => ns.missing[l]?.includes(key) || ns.empty[l]?.includes(key))
          ? 'row-issue'
          : '';

        const cells = locales
          .map((locale) => {
            if (locale === BASE_LOCALE) {
              const val = ns.localeData[locale][key] ?? '';
              return `<td class="base"><span class="val">${esc(val.length > 120 ? val.slice(0, 120) + '…' : val)}</span></td>`;
            }
            const cls = cellClass(locale, key, ns);
            return `<td class="${cls}">${renderValue(locale, key, ns)}</td>`;
          })
          .join('');

        return `<tr class="${rowClass}"><td class="key">${esc(key)}</td>${cells}</tr>`;
      })
      .join('\n');

    return `
<section id="ns-${esc(ns.name)}" class="ns-section">
  <h2>${esc(ns.name)} ${badge}</h2>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Key</th>
          ${locales.map((l) => `<th>${l}${l === BASE_LOCALE ? ' ★' : ''}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</section>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>i18n Review — PersonalPortfolio</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 13px/1.5 system-ui, sans-serif; background: #0f0f0f; color: #d4d4d4; display: flex; }

  /* Sidebar */
  nav { width: 220px; min-width: 220px; height: 100vh; position: sticky; top: 0;
        overflow-y: auto; padding: 16px 12px; border-right: 1px solid #2a2a2a; background: #141414; }
  nav h1 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em;
            color: #888; margin-bottom: 12px; }
  nav .summary { font-size: 11px; color: #888; margin-bottom: 16px; line-height: 1.7; }
  nav .summary .ok { color: #4ade80; }
  nav .summary .bad { color: #f87171; }
  nav a { display: block; font-size: 12px; color: #a3a3a3; text-decoration: none;
           padding: 3px 6px; border-radius: 4px; white-space: nowrap; overflow: hidden;
           text-overflow: ellipsis; }
  nav a:hover { background: #222; color: #fff; }
  nav a.has-issues { color: #fbbf24; }
  nav a.has-issues::after { content: ' ●'; font-size: 8px; vertical-align: middle; }

  /* Content */
  main { flex: 1; padding: 24px 28px; overflow-x: auto; }
  main > h1 { font-size: 18px; color: #e5e5e5; margin-bottom: 4px; }
  main > p { font-size: 12px; color: #666; margin-bottom: 28px; }

  .ns-section { margin-bottom: 48px; }
  .ns-section h2 { font-size: 14px; color: #e5e5e5; margin-bottom: 10px;
                   padding-bottom: 6px; border-bottom: 1px solid #2a2a2a;
                   display: flex; align-items: center; gap: 8px; }
  .ns-badge { font-size: 10px; background: #7c2d12; color: #fca5a5;
              padding: 1px 6px; border-radius: 10px; }

  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th { background: #1a1a1a; color: #888; font-weight: 500; text-align: left;
       padding: 6px 10px; border: 1px solid #2a2a2a; white-space: nowrap; }
  th:first-child { width: 220px; min-width: 220px; }
  td { padding: 5px 10px; border: 1px solid #1e1e1e; vertical-align: top; }
  td.key { font-family: monospace; font-size: 11px; color: #888; white-space: nowrap; }
  td.base .val { color: #d4d4d4; }
  .val { word-break: break-word; }
  tr.row-issue { background: #1a1208; }
  td.missing { background: #2d1515; }
  td.empty { background: #1a1a0a; }
  .missing-badge { font-size: 10px; background: #7f1d1d; color: #fca5a5;
                   padding: 1px 6px; border-radius: 4px; font-weight: 600; }
  tr:hover td { background-color: #1c1c1c; }
  tr:hover td.missing { background: #3a1c1c; }
  tr:hover td.empty { background: #232310; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0f0f0f; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
</style>
</head>
<body>
<nav>
  <h1>Namespaces</h1>
  <div class="summary">
    <span class="${totalMissing + totalEmpty === 0 ? 'ok' : 'bad'}">
      ${totalMissing} missing · ${totalEmpty} empty
    </span><br>
    ${namespaces.length} namespaces · ${locales.join(' / ')}
  </div>
  ${nsNav}
</nav>
<main>
  <h1>i18n Review</h1>
  <p>Generated ${new Date().toLocaleString()} — <code>npx tsx scripts/i18n-review.ts</code> to refresh</p>
  ${nsSections}
</main>
</body>
</html>`;

// ─── Write & open ───────────────────────────────────────────────

import { mkdirSync } from 'fs';
mkdirSync(join(import.meta.dirname, '..', 'node_modules', '.cache'), { recursive: true });
writeFileSync(OUT_FILE, html, 'utf-8');

console.log(`\n✓ ${nsDataList.length} namespaces · ${locales.length} locales`);
if (totalMissing > 0) console.log(`  ⚠ ${totalMissing} missing translations`);
if (totalEmpty > 0) console.log(`  ⚠ ${totalEmpty} empty translations`);
console.log(`\nOpening: ${OUT_FILE}\n`);

// Open in default browser (cross-platform)
const openCmd =
  process.platform === 'win32'
    ? `start "" "${OUT_FILE}"`
    : process.platform === 'darwin'
      ? `open "${OUT_FILE}"`
      : `xdg-open "${OUT_FILE}"`;
execSync(openCmd, { shell: 'cmd.exe' });
