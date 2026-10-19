// Picks where the tour's window parks on each section, and where each ink plate sits, so that no
// held frame slices through a line of text or a card.
//
// The page scrolls inside a 999 px window (WIN). A cut line at page row `e` is clean when the rows
// around it hold no content (capture/sections.json `bands`, measured by shoot-tour.mjs), and
// "text-clean" when it only crosses the padding of a card (`textBands`: no text line is sliced). A stop at window top `y` has two cuts: `y` (top) and `y + WIN` (bottom). For each
// section this picks the `y` that puts both on clean bands (text-clean when a section is too tall
// for that), keeps the section's own header (kicker, numeral, heading)
// fully in view, and never ends the window inside the next section's header (an orphan kicker or
// half a heading). Plates are placed the same way: on empty rows when there are any, else with
// their top and bottom edges on clean rows so they cover whole blocks rather than slicing lines.
//
// Prints the STOPS table and the plate CSS for compositions/frames/01-one-scroll.html and a
// diagnostics table. Nothing is written; paste the output into the composition.
//
// Usage: node scripts/pick-stops.mjs [capture-dir] [--explain]   (--explain lists every y in range per stop)

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const captureDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? join(here, '..', 'capture');
const sections = JSON.parse(readFileSync(join(captureDir, 'sections.json'), 'utf8'));
const { content } = JSON.parse(readFileSync(join(captureDir, 'layout.json'), 'utf8'));

const WIN = 999; // window height: 1080 canvas minus the 81 px strip
const STRIP = 81;
const PAGE_H = sections.height;
const inBands = (list, e) => e <= 0 || e >= PAGE_H || list.some(([a, b]) => e - 3 >= a && e + 3 <= b);
// A cut at row e (between rows e-1 and e) is clean when 3 rows each side are empty.
// 0 = between blocks, 1 = crosses only a card's padding or an image, 2 = between two lines of text,
// 3 = slices a line of text.
const grade = (e) =>
  inBands(sections.bands, e) ? 0 : inBands(sections.textBands, e) ? 1 : inBands(sections.lineBands, e) ? 2 : 3;
const clean = (e) => grade(e) === 0;
const GRADE_COST = [0, 250, 300, 800]; // a card-only cut leaves a stray line or card edge at the frame edge: nearly as bad as a line gap
const PLATE_EDGE_COST = [0, 25, 45, 90];
const GRADE_NAME = ['clean', 'card-only', 'line gap', 'CUT'];

// Header block of a section: from its first content row to just under the heading.
const headerOf = (s) => {
  const inHeader = content.filter(([, y0]) => y0 >= s.top && y0 < s.headingTop + 2);
  const first = inHeader.length ? Math.min(...inHeader.map(([, y0]) => y0)) : s.headingTop - 40;
  const headingRects = content.filter(([, y0, , y1]) => Math.abs(y0 - s.headingTop) <= 6 && y1 - y0 <= 140);
  const headingBottom = headingRects.length ? Math.max(...headingRects.map(([, , , y1]) => y1)) : s.headingTop + 70;
  return { first, headingBottom };
};
const headers = sections.sections.map(headerOf);
// A window may end above a section's header or below its subtitle line, never in between: that would leave a
// bare kicker, or a heading sitting on the frame edge with its underline cut.
const insideHeader = (e, k) => k < headers.length && e > headers[k].first - 2 && e < headers[k].headingBottom + 56;

// A text line that starts within TIGHT px under a top cut (or ends within TIGHT px above a bottom cut) hugs
// the frame edge: whole, but cramped against the strip or the bottom of the frame.
const TIGHT = 20;
const TEXT = content.filter((r) => r[4] === 't');
const hugsTop = (e) => e > 0 && TEXT.some(([, y0, , y1]) => y0 < e + TIGHT && y1 > e);
const hugsBottom = (e) => e < PAGE_H && TEXT.some(([, y0, , y1]) => y1 > e - TIGHT && y0 < e);
const HUG_COST = 150;

const stops = [];
const notes = [];
for (const [k, s] of sections.sections.entries()) {
  const h = headers[k];
  let lo;
  let hi;
  let want;
  if (k === 0) {
    // The hero: crop the hidden nav row and the empty top padding.
    lo = 0;
    hi = 260;
    want = 150;
  } else {
    lo = h.first - 220;
    hi = h.first - 24;
    want = h.first - 70;
  }
  let best = null;
  const options = [];
  for (let y = Math.max(0, lo); y <= hi; y++) {
    const bottom = y + WIN;
    const topG = grade(y);
    const bottomG = insideHeader(bottom, k + 1) ? 3 : grade(bottom);
    const score =
      GRADE_COST[topG] + GRADE_COST[bottomG] + (topG > 0 && hugsTop(y) ? HUG_COST : 0) + (bottomG > 0 && hugsBottom(bottom) ? HUG_COST : 0) + Math.abs(y - want);
    options.push({ y, topG, bottomG });
    if (!best || score < best.score) best = { y, score, topG, bottomG };
  }
  if (process.argv.includes('--explain')) {
    // Every y in range as runs of equal (top, bottom) grades, to see what a stop could be instead.
    const runs = [];
    for (const o of options) {
      const last = runs[runs.length - 1];
      if (last && last.topG === o.topG && last.bottomG === o.bottomG && o.y === last.to + 1) last.to = o.y;
      else runs.push({ from: o.y, to: o.y, topG: o.topG, bottomG: o.bottomG });
    }
    console.error(`stop ${k + 1} ${s.heading} (want ${want}, range ${lo}..${hi}):`);
    for (const r of runs) console.error(`   y ${r.from}..${r.to}  top ${GRADE_NAME[r.topG]} / bottom ${GRADE_NAME[r.bottomG]}`);
  }
  stops.push({ label: s.heading, y: best.y, headingTop: s.headingTop, topG: best.topG, bottomG: best.bottomG });
  if (best.topG === 3 || best.bottomG === 3) notes.push(`stop ${k + 1} (${s.heading}): an edge slices text`);
}

// ---- Plates -----------------------------------------------------------------------------------
// Canvas row c of a window parked at y is page row c - STRIP + y. Plate boxes are left-aligned at x = 59.
const PLATES = [
  { id: 't01-p-open', stop: 0, w: 440, minH: 110, maxH: 126, prefer: 700, avoid: 70 },
  { id: 't01-p-client', stop: 1, w: 620, minH: 110, maxH: 150, prefer: 720, avoid: 70 },
  { id: 't01-p-demos', stop: 2, w: 780, minH: 110, maxH: 170, prefer: 760, avoid: 150 },
  { id: 't01-p-url', stop: 8, w: 970, minH: 134, maxH: 190, prefer: 700, avoid: 130 },
];
const X0 = 59;
const PAD = 8;

const placed = PLATES.map((p) => {
  const y = stops[p.stop].y;
  const h0 = headers[p.stop];
  const x1 = X0 + p.w;
  // Content rows that overlap the plate's x-range, as page-row intervals.
  const hits = content.filter(([cx0, , cx1]) => cx1 > X0 - PAD && cx0 < x1 + PAD);
  // Rows of [a, b) hidden under the plate, text rows weighing more than card padding.
  const covered = (a, b) => {
    const rows = { t: new Set(), i: new Set(), b: new Set() };
    for (const [, y0, , y1, kind] of hits) for (let r = Math.max(a, y0); r < Math.min(b, y1); r++) rows[kind].add(r);
    return rows.t.size + rows.i.size * 0.4 + rows.b.size * 0.15;
  };
  // The plate must not sit on the stop's own header: kicker, heading and what follows it (`avoid` px below the
  // heading: the subtitle, the filter pills, the intro paragraph).
  const headerEnd = h0.headingBottom + p.avoid;
  let best = null;
  for (let top = 150; top <= 888 - p.minH; top++) {
    for (let h = p.minH; h <= p.maxH; h += 2) {
      if (top + h > 888) break;
      const a = top - STRIP + y;
      const b = a + h;
      if (a < headerEnd && b > h0.first - 4) continue;
      const overlap = covered(a, b);
      const edges = PLATE_EDGE_COST[grade(a)] + PLATE_EDGE_COST[grade(b)];
      const score = overlap * 2 + edges + Math.abs(h - p.minH) * 0.3 + Math.abs(top - p.prefer) * 0.15;
      if (!best || score < best.score) best = { top, h, score, overlap: Math.round(overlap), topG: grade(a), bottomG: grade(b) };
    }
  }
  return { ...p, ...best };
});

// ---- Output -----------------------------------------------------------------------------------
console.log(`// look: ${sections.look.design}/${sections.look.theme}   page ${sections.viewport.width}x${PAGE_H}\n`);
console.log('var STOPS = [');
for (const s of stops) console.log(`  [${JSON.stringify(s.label)}, ${s.y}, ${s.headingTop}],`);
console.log('];\n');
for (const p of placed) console.log(`#${p.id} { top: ${p.top}px; height: ${p.h}px; }`);
console.log('\n// diagnostics');
for (const s of stops) console.log(`//  stop y=${String(s.y).padStart(5)}  top ${GRADE_NAME[s.topG].padEnd(9)} bottom ${GRADE_NAME[s.bottomG].padEnd(9)} ${s.label}`);
for (const p of placed) console.log(`//  plate ${p.id.padEnd(13)} top=${p.top} h=${p.h} text rows under it: ${p.overlap}  edges ${GRADE_NAME[p.topG]}/${GRADE_NAME[p.bottomG]}`);
for (const n of notes) console.log(`// WARN ${n}`);
