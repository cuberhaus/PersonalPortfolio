// Web Worker: runs the plate detection pipeline using pure JS image processing.
// No external dependencies — instant startup, no download.

import {
  rgbaToGray,
  grayToRGBA,
  adaptiveThresholdMean,
  clearBorder,
  fillHoles,
  bitwiseNot,
  thresholdOtsu,
  labelConnectedComponents,
  computeRegionStats,
  allRegionStatsEfficient,
  letterboxGray,
  glyphMatchScore,
  cropGray,
  cropRGBA,
  drawRectRGBA,
  type GrayImage,
  type RGBAImage,
  type RegionStats,
  type Rect,
} from "./imgproc";


const CHAR_LABELS = [
  "1","2","3","4","5","6","7","8","9","0",
  "a","b","e","h","i","k","m","n","p","t","x","y","z",
];

/**
 * Fixed x-ranges for each glyph in Greek-License-Plate-Font-2004.jpg after crop [15,0,500,70].
 * Matches MATLAB lettersImagePreprocess + OCR_feature_matching (not connected-components).
 * Columns 204–224 (0-based) are whited out like the original dash between "0" and "a".
 */
function fontCellRects(cropWidth: number): { x: number; w: number }[] {
  const W = Math.min(500, cropWidth);
  const rects: { x: number; w: number }[] = [
    { x: 0, w: 18 },
    { x: 18, w: 21 },
    { x: 39, w: 20 },
    { x: 59, w: 20 },
    { x: 79, w: 21 },
    { x: 100, w: 20 },
    { x: 120, w: 20 },
    { x: 140, w: 20 },
    { x: 160, w: 20 },
    { x: 180, w: 24 },
    { x: 225, w: 23 },
    { x: 248, w: 21 },
    { x: 269, w: 21 },
    { x: 290, w: 19 },
    { x: 309, w: 10 },
    { x: 319, w: 22 },
    { x: 341, w: 20 },
    { x: 361, w: 22 },
    { x: 383, w: 22 },
    { x: 405, w: 18 },
    { x: 423, w: 21 },
    { x: 444, w: 20 },
    { x: 464, w: Math.max(0, W - 464) },
  ];
  return rects.filter((r) => r.w > 2);
}

/** Greek plates: AAA-1234 → 3 letters + 4 digits (no separator in OCR). */
function isPlateDigitLabel(s: string): boolean {
  return s.length === 1 && s >= "0" && s <= "9";
}
function isPlateLetterLabel(s: string): boolean {
  return s.length === 1 && s >= "a" && s <= "z";
}

interface GlyphTemplate {
  label: string;
  tmpl: GrayImage;
  /** Trimmed ink bbox aspect width/height (font glyph). */
  ar: number;
}

interface ImageBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  label: string;
}

function report(data: any) {
  self.postMessage(data);
}

function grayToBuffer(img: GrayImage, label: string): ImageBuffer {
  const rgba = grayToRGBA(img);
  return { data: rgba.data, width: rgba.width, height: rgba.height, label };
}

function rgbaToBuffer(img: RGBAImage, label: string): ImageBuffer {
  return { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height, label };
}

// ─── Region extraction from binary images ───

function getPlateRegions(bin: GrayImage, relaxExtent: boolean): RegionStats[] {
  const { labels, count } = labelConnectedComponents(bin);
  const m = Math.max(bin.width, bin.height);
  const maxMajor = Math.min(450, Math.max(320, m * 0.38));
  const minMinor = Math.max(14, Math.min(24, Math.floor(m / 55)));

  let regions = allRegionStatsEfficient(bin, labels, count, "plate");
  const filter = (stats: RegionStats) => {
    if (stats.area < 10) return false;
    if (stats.majorAxisLength >= maxMajor || stats.minorAxisLength < minMinor) return false;
    if (stats.eccentricity < 0.9) return false;
    if (!relaxExtent && (stats.extent < 0.6 || stats.extent > 1)) return false;
    if (stats.orientation < -15 || stats.orientation > 15) return false;
    return stats.solidity >= 0.6;
  };
  regions = regions.filter(filter);

  if (regions.length === 0 && count > 0) {
    const ac = new Int32Array(count + 1);
    for (let i = 0; i < labels.length; i++) {
      const L = labels[i];
      if (L > 0) ac[L]++;
    }
    const ids = Array.from({ length: count }, (_, i) => i + 1)
      .filter((L) => ac[L] >= 180)
      .sort((a, b) => ac[b] - ac[a])
      .slice(0, 50);
    for (const id of ids) {
      const stats = computeRegionStats(bin, labels, id);
      if (filter(stats)) regions.push(stats);
    }
  }
  return regions;
}

/** Favor real plates over floor cracks: aspect, vertical band, area; penalize bottom strip. */
function scorePlateGeometry(s: RegionStats, iw: number, ih: number): number {
  const { bbox } = s;
  const cy = (bbox.y + bbox.h * 0.5) / ih;
  const ar = bbox.w / Math.max(1, bbox.h);
  const relA = s.area / Math.max(1, iw * ih);

  if (ar < 2.1 || ar > 8) return -1e9;
  if (relA < 0.0006 || relA > 0.14) return -1e9;

  let score = s.solidity * 2.1 + s.extent * 1.1;
  const arFit = Math.exp(-Math.pow((Math.log(ar + 1e-6) - Math.log(4.0)) / 0.42, 2));
  score += arFit * 1.6;
  const vertPeak = Math.exp(-Math.pow((cy - 0.56) / 0.24, 2));
  score += vertPeak * 2.2;
  if (cy > 0.9) score -= 14;
  else if (cy > 0.86) score -= 9;
  else if (cy > 0.83) score -= 4;
  else if (cy > 0.82) score -= 1.2;
  if (cy < 0.22) score -= 1.8;
  const bottomFrac = (bbox.y + bbox.h) / ih;
  if (bottomFrac > 0.96) score -= 10;
  else if (bottomFrac > 0.93) score -= 4;
  else if (bottomFrac > 0.91) score -= 1.5;
  const cx = (bbox.x + bbox.w * 0.5) / iw;
  const cxFit = Math.exp(-Math.pow((cx - 0.5) / 0.55, 2));
  score += cxFit * 0.35;
  return score;
}

function expandRect(r: Rect, frac: number, iw: number, ih: number): Rect {
  const px = Math.max(2, Math.round(r.w * frac));
  const py = Math.max(2, Math.round(r.h * frac));
  const x = Math.max(0, r.x - px);
  const y = Math.max(0, r.y - py);
  const w = Math.min(iw - x, r.w + 2 * px);
  const h = Math.min(ih - y, r.h + 2 * py);
  return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

/** Rough count of char-sized components (true plate → ~7). */
function countCharLikeBlobs(plateRGBA: RGBAImage): number {
  const gray = rgbaToGray(plateRGBA);
  const inv = bitwiseNot(adaptiveThresholdMean(gray, 0.7));
  const cleared = clearBorder(inv);
  const { labels, count } = labelConnectedComponents(cleared);
  let n = 0;
  const ph = cleared.height;
  for (let id = 1; id <= count; id++) {
    const st = computeRegionStats(cleared, labels, id);
    if (st.area < 35 || st.area > 3500) continue;
    if (st.bbox.w < 4 || st.bbox.h < Math.max(10, ph * 0.12)) continue;
    if (st.bbox.h > Math.min(120, ph * 0.92)) continue;
    if (st.extent < 0.18 || st.eccentricity > 0.995) continue;
    if (Math.abs(st.orientation) < 55 && st.eccentricity > 0.9) continue;
    n++;
  }
  return n;
}

function getCharCandidates(bin: GrayImage): { bbox: Rect }[] {
  const { labels, count } = labelConnectedComponents(bin);
  const stats =
    count > 400
      ? allRegionStatsEfficient(bin, labels, count, "char")
      : Array.from({ length: count }, (_, i) => computeRegionStats(bin, labels, i + 1)).filter((p) => p.area > 0);

  const cands: { bbox: Rect }[] = [];
  for (const p of stats) {
    if (p.area < 30) continue;
    if (p.majorAxisLength < 12 || p.majorAxisLength > 180) continue;
    if (p.area < 50 || p.extent < 0.25 || p.eccentricity > 0.99) continue;
    if (Math.abs(p.orientation) < 60 && p.eccentricity > 0.9) continue;
    cands.push({ bbox: p.bbox });
  }
  return cands.sort((a, b) => a.bbox.x - b.bbox.x);
}

// ─── Pipeline stages ───

function bboxDist2(a: Rect, b: Rect): number {
  const ax = a.x + a.w * 0.5, ay = a.y + a.h * 0.5;
  const bx = b.x + b.w * 0.5, by = b.y + b.h * 0.5;
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

type FindPlateResult = { plateRect: Rect | null; stages: ImageBuffer[] };

function pushMorphDebugStages(stages: ImageBuffer[], gray: GrayImage): void {
  for (const sens of [0.55, 0.65, 0.75, 0.85]) {
    const bin = adaptiveThresholdMean(gray, sens);
    const filled = fillHoles(clearBorder(bin));
    stages.push(
      grayToBuffer(filled, `Morph input (s=${sens}) — clear-border + fill-holes`)
    );
  }
}

/** Bumper band below grille (front plate sits here on most sedans). */
function bumperSearchRoi(iw: number, ih: number): Rect {
  const rx = Math.floor(iw * 0.17);
  const ry = Math.floor(ih * 0.535);
  const rw = Math.min(Math.floor(iw * 0.66), iw - rx);
  const rh = Math.min(Math.floor(ih * 0.215), ih - ry);
  return { x: rx, y: ry, w: rw, h: rh };
}

/** When global CC misses the plate — search only lower bumper, not grille. */
function findPlateBumperRoi(
  gray: GrayImage,
  iw: number,
  ih: number
): Rect | null {
  const roi = bumperSearchRoi(iw, ih);
  const { x: rx, y: ry, w: rw, h: rh } = roi;
  if (rw < 90 || rh < 36) return null;
  const sub = cropGray(gray, roi);
  const roiArea = rw * rh;
  const imArea = iw * ih;
  const maxPlatePx = Math.min(roiArea * 0.11, imArea * 0.024);

  type Cand = { sc: number; cyF: number; bbox: Rect };
  const cands: Cand[] = [];

  for (const sens of [0.52, 0.6, 0.68, 0.76, 0.84]) {
    for (const inv of [true, false]) {
      let bin = adaptiveThresholdMean(sub, sens);
      if (inv) bin = bitwiseNot(bin);
      const cleared = clearBorder(bin);
      const { labels, count } = labelConnectedComponents(cleared);
      for (let id = 1; id <= count; id++) {
        const st = computeRegionStats(cleared, labels, id);
        const ar = st.bbox.w / Math.max(1, st.bbox.h);
        if (ar < 2.45 || ar > 7.5) continue;
        if (st.area < 180 || st.area > maxPlatePx) continue;
        if (st.extent < 0.38 || st.solidity < 0.5) continue;
        if (st.eccentricity < 0.84) continue;
        const cyF = (ry + st.bbox.y + st.bbox.h * 0.5) / ih;
        const cxF = (rx + st.bbox.x + st.bbox.w * 0.5) / iw;
        if (cyF < 0.558 || cyF > 0.785) continue;
        if (cyF > 0.68 && cxF < 0.32) continue;
        if (cyF > 0.68 && cxF > 0.68) continue;
        const relY = (st.bbox.y + st.bbox.h * 0.5) / rh;
        let sc =
          st.bbox.w *
          st.extent *
          st.solidity *
          (0.45 + st.eccentricity) *
          (0.35 + relY) ** 2.2;
        if (cxF > 0.34 && cxF < 0.66) sc *= 1.28;
        if (cyF > 0.62 && cyF < 0.74) sc *= 1.45;
        const bb: Rect = { x: rx + st.bbox.x, y: ry + st.bbox.y, w: st.bbox.w, h: st.bbox.h };
        cands.push({ sc, cyF, bbox: bb });
      }
    }
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.sc - a.sc);
  const top = cands[0].sc;
  const near = cands.filter((c) => c.sc >= top * 0.82);
  near.sort((a, b) => b.cyF - a.cyF);
  const best = near[0];
  const padX = Math.max(4, Math.round(best.bbox.w * 0.1));
  const padY = Math.max(4, Math.round(best.bbox.h * 0.28));
  let x = best.bbox.x - padX;
  let y = best.bbox.y - padY;
  let w = best.bbox.w + 2 * padX;
  let h = best.bbox.h + 2 * padY;
  x = Math.max(0, x);
  y = Math.max(0, y);
  w = Math.min(w, iw - x);
  h = Math.min(h, ih - y);
  return { x, y, w: Math.max(24, w), h: Math.max(14, h) };
}


function findPlate(src: RGBAImage): FindPlateResult {
  const stages: ImageBuffer[] = [];
  const gray = rgbaToGray(src);
  const iw = src.width, ih = src.height;
  stages.push(grayToBuffer(gray, "Grayscale"));

  type Item = { stats: RegionStats; g: number };
  const pool: Item[] = [];

  for (let sens = 0.4; sens <= 1.0 + 1e-6; sens += 0.1) {
    const bin = adaptiveThresholdMean(gray, sens);
    if (sens <= 0.5) stages.push(grayToBuffer(bin, `Binarized (s=${sens.toFixed(1)})`));
    const cleared = clearBorder(bin);
    const filled = fillHoles(cleared);
    const filtered = getPlateRegions(filled, sens > 0.4);
    for (const s of filtered) {
      const g = scorePlateGeometry(s, iw, ih);
      if (g > -1e8) pool.push({ stats: s, g });
    }
  }

  if (pool.length === 0) {
    for (let sens = 0.4; sens <= 1.0 + 1e-6; sens += 0.1) {
      const bin = adaptiveThresholdMean(gray, sens);
      const cleared = clearBorder(bin);
      const filled = fillHoles(cleared);
      const filtered = getPlateRegions(filled, true);
      for (const s of filtered) pool.push({ stats: s, g: scorePlateGeometry(s, iw, ih) });
    }
  }
  if (pool.length === 0) {
    pushMorphDebugStages(stages, gray);
    const fb = findPlateBumperRoi(gray, iw, ih);
    if (fb) {
      const dbg: RGBAImage = { data: new Uint8ClampedArray(src.data), width: iw, height: ih };
      drawRectRGBA(dbg, bumperSearchRoi(iw, ih), [0, 210, 255], 2);
      drawRectRGBA(dbg, fb, [0, 255, 0], 3);
      stages.push(rgbaToBuffer(dbg, "Lower-bumper ROI (below grille) — green = plate"));
      stages.push(rgbaToBuffer(cropRGBA(src, fb), "Plate crop"));
      return { plateRect: fb, stages };
    }
    stages.push(
      grayToBuffer(
        gray,
        "No plate CC globally or in bumper ROI (contrast / angle)"
      )
    );
    return { plateRect: null, stages };
  }

  pool.sort((a, b) => b.g - a.g);
  const minD2 = Math.min(iw, ih) * 0.08;
  const minD2Sq = minD2 * minD2;
  const diverse: Item[] = [];
  for (const it of pool) {
    if (diverse.some((d) => bboxDist2(d.stats.bbox, it.stats.bbox) < minD2Sq)) continue;
    diverse.push(it);
    if (diverse.length >= 18) break;
  }
  while (diverse.length < 8 && diverse.length < pool.length) {
    const next = pool.find((p) => !diverse.some((d) => bboxDist2(d.stats.bbox, p.stats.bbox) < minD2Sq * 0.25));
    if (!next) break;
    diverse.push(next);
  }

  const cyOf = (st: RegionStats) => (st.bbox.y + st.bbox.h * 0.5) / ih;
  const hasUpperCandidate = diverse.some((it) => {
    const cy = cyOf(it.stats);
    return cy >= 0.32 && cy <= 0.81;
  });
  const plateCandidates = hasUpperCandidate
    ? diverse.filter((it) => cyOf(it.stats) <= 0.855)
    : diverse;
  let workList = plateCandidates.length > 0 ? plateCandidates : diverse;

  /** Front plates sit ~center; false positives sit on pavement corners (IMG_0380). */
  const isFloorLikePlateBox = (bbox: Rect) => {
    const cx = (bbox.x + bbox.w * 0.5) / iw;
    const cy = (bbox.y + bbox.h * 0.5) / ih;
    if (cy > 0.798) return true;
    if (cy > 0.7 && cx < 0.345) return true;
    if (cy > 0.715 && cx > 0.655) return true;
    return false;
  };
  const notFloor = workList.filter((it) => !isFloorLikePlateBox(it.stats.bbox));
  if (notFloor.length > 0) workList = notFloor;
  else {
    pushMorphDebugStages(stages, gray);
    const vis: RGBAImage = { data: new Uint8ClampedArray(src.data), width: iw, height: ih };
    const show = workList.slice(0, 14);
    for (const it of show) drawRectRGBA(vis, it.stats.bbox, [255, 115, 35], 2);
    stages.push(
      rgbaToBuffer(
        vis,
        `Orange boxes: ${workList.length} candidate(s) — all rejected as floor-like (low/corner)`
      )
    );
    stages.push(
      grayToBuffer(
        fillHoles(clearBorder(adaptiveThresholdMean(gray, 0.7))),
        "Same binary as above @ s=0.7 (where CCs are extracted)"
      )
    );
    const fb2 = findPlateBumperRoi(gray, iw, ih);
    if (fb2) {
      const dbg: RGBAImage = { data: new Uint8ClampedArray(src.data), width: iw, height: ih };
      drawRectRGBA(dbg, bumperSearchRoi(iw, ih), [0, 210, 255], 2);
      drawRectRGBA(dbg, fb2, [0, 255, 0], 3);
      stages.push(rgbaToBuffer(dbg, "Lower-bumper ROI after floor reject"));
      stages.push(rgbaToBuffer(cropRGBA(src, fb2), "Plate crop"));
      return { plateRect: fb2, stages };
    }
    return { plateRect: null, stages };
  }

  let best = workList[0].stats;
  let bestTotal = workList[0].g;

  for (const it of workList) {
    const cy = cyOf(it.stats);
    const exp = expandRect(it.stats.bbox, 0.06, iw, ih);
    const crop = cropRGBA(src, exp);
    const nb = countCharLikeBlobs(crop);
    let bonus = 0;
    if (cy <= 0.84) {
      if (nb >= 6 && nb <= 8) bonus = 8;
      else if (nb >= 5 && nb <= 9) bonus = 5;
      else if (nb >= 4 && nb <= 10) bonus = 2;
    } else if (cy <= 0.88 && nb >= 6 && nb <= 8) bonus = 1;
    if (nb > 22) bonus -= 4;
    const total = it.g + bonus;
    if (total > bestTotal) {
      bestTotal = total;
      best = it.stats;
    }
  }

  const vis: RGBAImage = { data: new Uint8ClampedArray(src.data), width: iw, height: ih };
  drawRectRGBA(vis, best.bbox, [0, 255, 0], 3);
  stages.push(rgbaToBuffer(vis, "Plate detected"));

  const plateCrop = cropRGBA(src, best.bbox);
  stages.push(rgbaToBuffer(plateCrop, "Plate crop"));
  return { plateRect: best.bbox, stages };
}

function scoreCharCount(n: number): number {
  if (n >= 7 && n <= 8) return 220 + n;
  if (n === 6 || n === 9) return 180;
  if (n === 5 || n === 10) return 130;
  if (n === 4 || n === 11) return 70;
  return n;
}

function medianNums(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Rejects pavement speckle “7 characters” (random sizes, no shared baseline, tiny span).
 */
function isPlausiblePlateCharRow(cands: { bbox: Rect }[], pw: number, ph: number): boolean {
  if (cands.length < 6 || cands.length > 11) return false;
  const sorted = [...cands].sort((a, b) => a.bbox.x - b.bbox.x);
  const hs = sorted.map((c) => c.bbox.h);
  const hm = medianNums(hs);
  if (hm < ph * 0.062 || hm > ph * 0.9) return false;

  let badH = 0;
  for (const h of hs) if (h < hm * 0.42 || h > hm * 2.05) badH++;
  if (badH > Math.max(1, Math.floor(cands.length * 0.32))) return false;

  const cys = sorted.map((c) => c.bbox.y + c.bbox.h * 0.5);
  if (Math.max(...cys) - Math.min(...cys) > Math.min(ph * 0.36, hm * 2.35)) return false;

  const x0 = sorted[0].bbox.x;
  const x1 = sorted[sorted.length - 1].bbox.x + sorted[sorted.length - 1].bbox.w;
  const span = x1 - x0;
  if (span < pw * (cands.length >= 7 ? 0.36 : 0.44)) return false;

  const gaps: number[] = [];
  let overlaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    const g = sorted[i].bbox.x - (sorted[i - 1].bbox.x + sorted[i - 1].bbox.w);
    if (g < -4) overlaps++;
    else if (g >= 0) gaps.push(g);
  }
  if (overlaps > 1) return false;
  if (gaps.length >= 4) {
    const mg = gaps.reduce((u, v) => u + v, 0) / gaps.length;
    if (mg < pw * 0.004) return false;
    const vr = gaps.reduce((u, g) => u + (g - mg) ** 2, 0) / gaps.length;
    const sd = Math.sqrt(vr);
    if (mg > 1e-6 && sd / mg > 1.18) return false;
  }
  return true;
}

function findChars(plate: RGBAImage): { charRects: Rect[]; stages: ImageBuffer[] } | null {
  const gray = rgbaToGray(plate);
  const pw = plate.width, ph = plate.height;
  type Row = { sc: number; n: number; bin: GrayImage; cands: { bbox: Rect }[] };
  const rows: Row[] = [];

  const tryBin = (bin: GrayImage) => {
    const cleared = clearBorder(bin);
    const cands = getCharCandidates(cleared);
    const n = cands.length;
    if (n < 6 || n > 14) return;
    rows.push({ sc: scoreCharCount(n), n, bin, cands });
  };

  for (const sens of [0.48, 0.55, 0.62, 0.7, 0.78, 0.85, 0.92]) {
    const b = adaptiveThresholdMean(gray, sens);
    tryBin(bitwiseNot(b));
    tryBin(b);
  }
  const o1 = thresholdOtsu(gray, true);
  const o0 = thresholdOtsu(gray, false);
  tryBin(o1);
  tryBin(bitwiseNot(o1));
  tryBin(o0);
  tryBin(bitwiseNot(o0));

  rows.sort((a, b) => b.sc - a.sc || Math.abs(a.n - 7) - Math.abs(b.n - 7));
  for (const r of rows) {
    if (r.n < 6) continue;
    if (!isPlausiblePlateCharRow(r.cands, pw, ph)) continue;

    const stages: ImageBuffer[] = [];
    stages.push(grayToBuffer(r.bin, "Binarization (segmentation)"));
    const vis: RGBAImage = { data: new Uint8ClampedArray(plate.data), width: pw, height: ph };
    for (const c of r.cands) drawRectRGBA(vis, c.bbox, [0, 255, 0], 2);
    stages.push(rgbaToBuffer(vis, `${r.n} characters found`));
    return { charRects: r.cands.map((c) => c.bbox), stages };
  }
  return null;
}

function prepareTemplates(fontRGBA: RGBAImage): GlyphTemplate[] {
  const gray = rgbaToGray(fontRGBA);
  const cropH = Math.min(70, gray.height);
  const cw = Math.min(500, Math.max(0, gray.width - 15));
  const cropped = cropGray(gray, { x: 15, y: 0, w: cw, h: cropH });

  for (let y = 0; y < cropped.height; y++) {
    for (let x = 204; x <= 224 && x < cropped.width; x++) {
      cropped.data[y * cropped.width + x] = 255;
    }
  }

  const binFull = thresholdOtsu(cropped, true);
  const rects = fontCellRects(cropped.width);
  const tmpls: GlyphTemplate[] = [];

  for (let i = 0; i < rects.length && i < CHAR_LABELS.length; i++) {
    const { x, w } = rects[i];
    if (x + w > cropped.width || w < 3) continue;
    const cell = cropGray(binFull, { x, y: 0, w, h: cropped.height });
    const trimmed = trimInkBox(cell, 2);
    if (trimmed.width < 2 || trimmed.height < 4) continue;
    const ar = trimmed.width / Math.max(1, trimmed.height);
    tmpls.push({
      label: CHAR_LABELS[i],
      tmpl: letterboxGray(trimmed, 20, 30, 0),
      ar,
    });
  }
  return tmpls;
}

/** Gaussian in log-aspect space; helps M (wide) vs n (narrow). */
function letterAspectBonus(qw: number, qh: number, tmplAr: number): number {
  const rq = qw / Math.max(1, qh);
  const d = Math.log((rq + 1e-6) / (tmplAr + 1e-6));
  return Math.exp(-(d * d) / (2 * 0.28 * 0.28));
}

function trimInkBox(bin: GrayImage, pad: number): GrayImage {
  const { width: w, height: h, data: d } = bin;
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[y * w + x] > 127) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return bin;
  minX = Math.max(0, minX - pad);
  maxX = Math.min(w - 1, maxX + pad);
  minY = Math.max(0, minY - pad);
  maxY = Math.min(h - 1, maxY + pad);
  return cropGray(bin, { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
}

function identifyChars(
  plate: RGBAImage,
  charRects: Rect[],
  templates: GlyphTemplate[]
): { text: string; charImages: ImageBuffer[] } {
  const charImages: ImageBuffer[] = [];
  let text = "";
  const greek7 = charRects.length === 7;

  for (let si = 0; si < charRects.length; si++) {
    const r = charRects[si];
    const cx = Math.max(0, r.x), cy = Math.max(0, r.y);
    const cw = Math.min(r.w, plate.width - cx), ch = Math.min(r.h, plate.height - cy);
    if (cw <= 0 || ch <= 0) continue;

    const letterOnly = greek7 && si < 3;
    const digitOnly = greek7 && si >= 3;

    const charRGBA = cropRGBA(plate, { x: cx, y: cy, w: cw, h: ch });
    const gray = rgbaToGray(charRGBA);
    const binAdapt = bitwiseNot(adaptiveThresholdMean(gray, 0.7));
    const binOtsu = thresholdOtsu(gray, true);

    let bestScore = -Infinity;
    let bestLabel = "?";
    let displayLb = letterboxGray(trimInkBox(binAdapt, 2), 20, 30, 0);

    const candidates = [binAdapt, binOtsu, bitwiseNot(binOtsu)];
    for (const cand of candidates) {
      const trimmed = trimInkBox(cand, 2);
      if (trimmed.width < 1 || trimmed.height < 1) continue;
      const lb = letterboxGray(trimmed, 20, 30, 0);
      for (const t of templates) {
        if (letterOnly && !isPlateLetterLabel(t.label)) continue;
        if (digitOnly && !isPlateDigitLabel(t.label)) continue;
        let sc = glyphMatchScore(lb, t.tmpl);
        if (letterOnly) sc += 0.12 * letterAspectBonus(trimmed.width, trimmed.height, t.ar);
        if (sc > bestScore) {
          bestScore = sc;
          bestLabel = t.label;
          displayLb = lb;
        }
      }
    }

    charImages.push(grayToBuffer(displayLb, ""));
    text += bestLabel;
  }
  return { text, charImages };
}

// ─── Main processing entry ───

function toRGBA(buf: { data: Uint8ClampedArray; width: number; height: number }): RGBAImage {
  return { data: new Uint8ClampedArray(buf.data), width: buf.width, height: buf.height };
}

/** Plate bbox on `detect` scaled to `ocr`, with padding so glyphs aren’t clipped. */
function mapPlateRectToOcr(
  r: Rect,
  detectW: number,
  detectH: number,
  ocr: RGBAImage
): Rect {
  const sx = ocr.width / detectW;
  const sy = ocr.height / detectH;
  const padX = Math.max(10, Math.round(r.w * sx * 0.1));
  const padY = Math.max(8, Math.round(r.h * sy * 0.28));
  let x = Math.floor(r.x * sx) - padX;
  let y = Math.floor(r.y * sy) - padY;
  let w = Math.ceil(r.w * sx) + 2 * padX;
  let h = Math.ceil(r.h * sy) + 2 * padY;
  x = Math.max(0, x);
  y = Math.max(0, y);
  w = Math.min(w, ocr.width - x);
  h = Math.min(h, ocr.height - y);
  return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

/**
 * CC plate hits are often a fragment; widen to plausible Greek plate size so OCR
 * has enough pixels and ~7 char blobs can appear.
 */
function normalizePlateRectOcr(r: Rect, ocrW: number, ocrH: number): Rect {
  let w = r.w, h = r.h;
  const cx = r.x + w * 0.5, cy = r.y + h * 0.5;
  const ar = w / Math.max(1, h);
  const minW = Math.round(ocrW * 0.095);
  const minH = Math.round(ocrH * 0.016);
  if (ar < 2.35) w = Math.max(minW, Math.min(Math.round(ocrW * 0.52), Math.round(h * 4.35)));
  else w = Math.max(w, minW);
  h = Math.max(h, minH);
  w = Math.min(w, Math.round(ocrW * 0.58));
  h = Math.min(h, Math.round(ocrH * 0.09));
  let x = Math.round(cx - w * 0.5);
  let y = Math.round(cy - h * 0.5);
  x = Math.max(0, Math.min(x, ocrW - 1));
  y = Math.max(0, Math.min(y, ocrH - 1));
  w = Math.min(w, ocrW - x);
  h = Math.min(h, ocrH - y);
  return { x, y, w: Math.max(32, w), h: Math.max(14, h) };
}

function expandRectCentered(r: Rect, scale: number, ocrW: number, ocrH: number): Rect {
  const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.5;
  let w = Math.min(Math.round(r.w * scale), ocrW);
  let h = Math.min(Math.round(r.h * scale), ocrH);
  let x = Math.round(cx - w * 0.5);
  let y = Math.round(cy - h * 0.5);
  x = Math.max(0, Math.min(x, ocrW - w));
  y = Math.max(0, Math.min(y, ocrH - h));
  w = Math.min(w, ocrW - x);
  h = Math.min(h, ocrH - y);
  return { x, y, w: Math.max(32, w), h: Math.max(14, h) };
}

/** Slide crop vertically (bumper vs floor on dark garage shots like IMG_0380). */
function bestPlateWindowBySegmentation(
  ocr: RGBAImage,
  base: Rect
): { crop: RGBAImage; rect: Rect; charRes: NonNullable<ReturnType<typeof findChars>> } | null {
  const W = ocr.width, H = ocr.height;
  const shifts = [-0.17, -0.12, -0.075, -0.038, 0, 0.045, 0.09];
  let best: { crop: RGBAImage; rect: Rect; charRes: NonNullable<ReturnType<typeof findChars>>; sc: number } | null =
    null;

  for (const f of shifts) {
    const dy = Math.round(f * H);
    let y = base.y + dy;
    let h = base.h;
    if (y < 0) {
      h += y;
      y = 0;
    }
    if (h < 20) continue;
    if (y + h > H) h = H - y;
    const x = Math.max(0, Math.min(base.x, W - base.w));
    const w = Math.min(base.w, W - x);
    if (w < 28) continue;
    const rect = { x, y, w, h };
    const crop = cropRGBA(ocr, rect);
    const charRes = findChars(crop);
    const n = charRes?.charRects.length ?? 0;
    if (n < 5) continue;
    const sc = scoreCharCount(n) - Math.abs(n - 7) * 8;
    if (!best || sc > best.sc) best = { crop, rect, charRes: charRes!, sc };
  }
  return best;
}

function processImage(
  detectBuf: { data: Uint8ClampedArray; width: number; height: number },
  ocrBuf: { data: Uint8ClampedArray; width: number; height: number },
  fontBuf: { data: Uint8ClampedArray; width: number; height: number }
) {
  const detect = toRGBA(detectBuf);
  const ocr = toRGBA(ocrBuf);
  const fontRGBA = toRGBA(fontBuf);
  const templates = prepareTemplates(fontRGBA);

  const plateRes = findPlate(detect);
  if (!plateRes.plateRect) {
    return {
      plateText: "(no plate found)",
      stage1: plateRes.stages,
      stage2: [] as ImageBuffer[],
      stage3: [] as ImageBuffer[],
      charImages: [] as ImageBuffer[],
    };
  }

  const W = ocr.width, H = ocr.height;
  const rect0 = normalizePlateRectOcr(
    mapPlateRectToOcr(plateRes.plateRect, detect.width, detect.height, ocr),
    W,
    H
  );
  const yUp = Math.max(0, rect0.y - Math.round(0.11 * H));
  const rectUp: Rect = { ...rect0, y: yUp, h: Math.min(rect0.h, H - yUp) };

  let win =
    bestPlateWindowBySegmentation(ocr, rect0) ||
    bestPlateWindowBySegmentation(ocr, expandRectCentered(rect0, 1.42, W, H)) ||
    bestPlateWindowBySegmentation(ocr, rectUp) ||
    bestPlateWindowBySegmentation(ocr, expandRectCentered(rectUp, 1.38, W, H));

  let plateCrop: RGBAImage;
  let charRes: NonNullable<ReturnType<typeof findChars>>;
  if (win) {
    plateCrop = win.crop;
    charRes = win.charRes;
  } else {
    plateCrop = cropRGBA(ocr, rect0);
    const last = findChars(plateCrop);
    if (!last?.charRects.length) {
      return {
        plateText: "(no characters found)",
        stage1: (() => {
          const st = plateRes.stages;
          const i = st.length - 1;
          const buf = rgbaToBuffer(plateCrop, "Plate crop");
          return i >= 0 && st[i].label === "Plate crop" ? [...st.slice(0, -1), buf] : [...st, buf];
        })(),
        stage2: [rgbaToBuffer(plateCrop, "Plate — no characters detected")],
        stage3: [] as ImageBuffer[],
        charImages: [] as ImageBuffer[],
      };
    }
    charRes = last;
  }

  const stage1WithPlateCrop = () => {
    const st = plateRes.stages;
    const i = st.length - 1;
    if (i >= 0 && st[i].label === "Plate crop") {
      return [...st.slice(0, -1), rgbaToBuffer(plateCrop, "Plate crop")];
    }
    return [...st, rgbaToBuffer(plateCrop, "Plate crop")];
  };
  const stage1 = stage1WithPlateCrop();

  const ocrOut = identifyChars(plateCrop, charRes.charRects, templates);
  return {
    plateText: ocrOut.text,
    stage1,
    stage2: charRes.stages,
    stage3: [] as ImageBuffer[],
    charImages: ocrOut.charImages,
  };
}

/** Legacy single-buffer path (small images). */
function processImageSingle(
  imgBuf: { data: Uint8ClampedArray; width: number; height: number },
  fontBuf: { data: Uint8ClampedArray; width: number; height: number }
) {
  return processImage(imgBuf, imgBuf, fontBuf);
}

// ─── Worker message handler ───

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === "init") {
    // No download needed — ready immediately
    report({ type: "progress", phase: "ready", percent: 100 });
    report({ type: "ready" });
  } else if (msg.type === "process") {
    try {
      const result =
        msg.ocr && msg.detect
          ? processImage(msg.detect, msg.ocr, msg.font)
          : processImageSingle(msg.image, msg.font);
      report({ type: "result", ...result });
    } catch (err: any) {
      report({ type: "error", message: err.message });
    }
  }
};
