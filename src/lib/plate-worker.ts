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
  resizeGray,
  matchTemplateNCC,
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
  const regions: RegionStats[] = [];
  for (let id = 1; id <= count; id++) {
    const stats = computeRegionStats(bin, labels, id);
    if (stats.area < 10) continue;
    if (stats.majorAxisLength >= 450 || stats.minorAxisLength < 24) continue;
    if (stats.eccentricity < 0.9) continue;
    if (!relaxExtent && (stats.extent < 0.6 || stats.extent > 1)) continue;
    if (stats.orientation < -15 || stats.orientation > 15) continue;
    if (stats.solidity < 0.6) continue;
    regions.push(stats);
  }
  return regions;
}

function getCharCandidates(bin: GrayImage): { bbox: Rect }[] {
  const { labels, count } = labelConnectedComponents(bin);
  const cands: { bbox: Rect }[] = [];
  for (let id = 1; id <= count; id++) {
    const p = computeRegionStats(bin, labels, id);
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

function prepareTemplates(fontRGBA: RGBAImage): { label: string; tmpl: GrayImage }[] {
  const gray = rgbaToGray(fontRGBA);
  const cropH = Math.min(70, gray.height);
  const cropped = cropGray(gray, { x: 15, y: 0, w: Math.min(500, gray.width - 15), h: cropH });

  // Clear the vertical bar between "0" and "a" templates
  for (let y = 0; y < cropped.height; y++)
    for (let x = 190; x <= Math.min(210, cropped.width - 1); x++)
      cropped.data[y * cropped.width + x] = 255;

  const bin = thresholdOtsu(cropped, true);
  const { labels, count } = labelConnectedComponents(bin);

  const boxes: Rect[] = [];
  for (let id = 1; id <= count; id++) {
    const stats = computeRegionStats(bin, labels, id);
    if (stats.area > 5) boxes.push(stats.bbox);
  }
  boxes.sort((a, b) => a.x - b.x);

  const tmpls: { label: string; tmpl: GrayImage }[] = [];
  for (let i = 0; i < Math.min(boxes.length, CHAR_LABELS.length); i++) {
    const roi = cropGray(bin, boxes[i]);
    tmpls.push({ label: CHAR_LABELS[i], tmpl: resizeGray(roi, 20, 30) });
  }
  return tmpls;
}

function identifyChars(
  plate: RGBAImage,
  charRects: Rect[],
  templates: { label: string; tmpl: GrayImage }[]
): { text: string; charImages: ImageBuffer[] } {
  const charImages: ImageBuffer[] = [];
  let text = "";

  for (const r of charRects) {
    const cx = Math.max(0, r.x), cy = Math.max(0, r.y);
    const cw = Math.min(r.w, plate.width - cx), ch = Math.min(r.h, plate.height - cy);
    if (cw <= 0 || ch <= 0) continue;

    const charRGBA = cropRGBA(plate, { x: cx, y: cy, w: cw, h: ch });
    const gray = rgbaToGray(charRGBA);
    const bin = thresholdOtsu(gray, true);
    const resized = resizeGray(bin, 20, 30);
    charImages.push(grayToBuffer(resized, ""));

    let bestScore = -Infinity, bestLabel = "?";
    for (const t of templates) {
      const sc = matchTemplateNCC(resized, t.tmpl);
      if (sc > bestScore) { bestScore = sc; bestLabel = t.label; }
    }
    text += bestLabel;
  }
  return { text, charImages };
}

// ─── Main processing entry ───

function processImage(
  imgBuf: { data: Uint8ClampedArray; width: number; height: number },
  fontBuf: { data: Uint8ClampedArray; width: number; height: number }
) {
  const src: RGBAImage = { data: new Uint8ClampedArray(imgBuf.data), width: imgBuf.width, height: imgBuf.height };
  const fontRGBA: RGBAImage = { data: new Uint8ClampedArray(fontBuf.data), width: fontBuf.width, height: fontBuf.height };
  const templates = prepareTemplates(fontRGBA);

  const plateRes = findPlate(src);
  if (!plateRes) {
    return {
      plateText: "(no plate found)",
      stage1: [rgbaToBuffer(src, "Original — no plate detected")],
      stage2: [] as ImageBuffer[],
      stage3: [] as ImageBuffer[],
      charImages: [] as ImageBuffer[],
    };
  }

  const plateCrop = cropRGBA(src, plateRes.plateRect);
  const charRes = findChars(plateCrop);
  if (!charRes || !charRes.charRects.length) {
    return {
      plateText: "(no characters found)",
      stage1: plateRes.stages,
      stage2: [rgbaToBuffer(plateCrop, "Plate — no characters detected")],
      stage3: [] as ImageBuffer[],
      charImages: [] as ImageBuffer[],
    };
  }

  const ocr = identifyChars(plateCrop, charRes.charRects, templates);
  return {
    plateText: ocr.text,
    stage1: plateRes.stages,
    stage2: charRes.stages,
    stage3: [] as ImageBuffer[],
    charImages: ocr.charImages,
  };
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
      const result = processImage(msg.image, msg.font);
      report({ type: "result", ...result });
    } catch (err: any) {
      report({ type: "error", message: err.message });
    }
  }
};
