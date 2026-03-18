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

function findPlate(src: RGBAImage): { plateRect: Rect; stages: ImageBuffer[] } | null {
  const stages: ImageBuffer[] = [];
  const gray = rgbaToGray(src);
  stages.push(grayToBuffer(gray, "Grayscale"));

  let sens = 0.4;
  let best: RegionStats | null = null;
  while (sens <= 1.0 && !best) {
    const bin = adaptiveThresholdMean(gray, sens);
    if (sens <= 0.5) stages.push(grayToBuffer(bin, `Binarized (s=${sens.toFixed(1)})`));
    const cleared = clearBorder(bin);
    const filled = fillHoles(cleared);
    const filtered = getPlateRegions(filled, sens > 0.4);
    if (filtered.length > 0) {
      best = filtered.reduce((a, b) => a.solidity > b.solidity ? a : b);
      const vis: RGBAImage = { data: new Uint8ClampedArray(src.data), width: src.width, height: src.height };
      drawRectRGBA(vis, best.bbox, [0, 255, 0], 3);
      stages.push(rgbaToBuffer(vis, "Plate detected"));
    }
    sens += 0.1;
  }
  if (!best) return null;

  const plateCrop = cropRGBA(src, best.bbox);
  stages.push(rgbaToBuffer(plateCrop, "Plate crop"));
  return { plateRect: best.bbox, stages };
}

function findChars(plate: RGBAImage): { charRects: Rect[]; stages: ImageBuffer[] } | null {
  const stages: ImageBuffer[] = [];
  const gray = rgbaToGray(plate);
  const bin = adaptiveThresholdMean(gray, 0.7);
  const inv = bitwiseNot(bin);
  stages.push(grayToBuffer(inv, "Inverted threshold"));
  const cleared = clearBorder(inv);

  const cands = getCharCandidates(cleared);
  if (!cands.length) return null;

  const vis: RGBAImage = { data: new Uint8ClampedArray(plate.data), width: plate.width, height: plate.height };
  for (const c of cands) drawRectRGBA(vis, c.bbox, [0, 255, 0], 2);
  stages.push(rgbaToBuffer(vis, `${cands.length} characters found`));

  return { charRects: cands.map((c) => c.bbox), stages };
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
  const padX = Math.max(6, Math.round(r.w * sx * 0.05));
  const padY = Math.max(6, Math.round(r.h * sy * 0.15));
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
  if (!plateRes) {
    return {
      plateText: "(no plate found)",
      stage1: [rgbaToBuffer(detect, "Original — no plate detected")],
      stage2: [] as ImageBuffer[],
      stage3: [] as ImageBuffer[],
      charImages: [] as ImageBuffer[],
    };
  }

  const plateRectOcr = mapPlateRectToOcr(plateRes.plateRect, detect.width, detect.height, ocr);
  const plateCrop = cropRGBA(ocr, plateRectOcr);

  let stage1 = plateRes.stages;
  const last = stage1[stage1.length - 1];
  if (last?.label === "Plate crop") {
    stage1 = [...stage1.slice(0, -1), rgbaToBuffer(plateCrop, "Plate crop")];
  }

  const charRes = findChars(plateCrop);
  if (!charRes || !charRes.charRects.length) {
    return {
      plateText: "(no characters found)",
      stage1,
      stage2: [rgbaToBuffer(plateCrop, "Plate — no characters detected")],
      stage3: [] as ImageBuffer[],
      charImages: [] as ImageBuffer[],
    };
  }

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
