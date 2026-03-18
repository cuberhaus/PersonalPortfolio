// Web Worker: loads OpenCV.js and runs the plate detection pipeline off the main thread.
// All heavy work (download, compilation, image processing) happens here.

const OPENCV_URL = "https://cdn.jsdelivr.net/npm/opencv.js-webassembly@4.2.0/opencv.js";

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

interface RegionProps {
  bbox: { x: number; y: number; w: number; h: number };
  area: number;
  solidity: number;
  extent: number;
  eccentricity: number;
  orientation: number;
  majorAxisLength: number;
  minorAxisLength: number;
}

let cv: any = null;

function report(data: any) {
  self.postMessage(data);
}

// ---------- OpenCV loading via fetch + eval (runs entirely in worker) ----------

async function initOpenCV() {
  report({ type: "progress", phase: "downloading", percent: 0 });

  const resp = await fetch(OPENCV_URL);
  const total = Number(resp.headers.get("content-length") || 0);
  const reader = resp.body!.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    const est = total || 8_000_000;
    report({
      type: "progress",
      phase: "downloading",
      percent: Math.round((loaded / est) * 85),
      loadedMB: +(loaded / 1048576).toFixed(1),
      totalMB: total ? +(total / 1048576).toFixed(1) : undefined,
    });
  }

  report({ type: "progress", phase: "initializing", percent: 88 });

  const full = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) { full.set(c, off); off += c.length; }
  const code = new TextDecoder().decode(full);

  // Execute OpenCV.js in worker global scope
  const fn = new Function(code);
  fn.call(self);

  report({ type: "progress", phase: "initializing", percent: 93 });

  cv = (self as any).cv;
  if (!cv) throw new Error("OpenCV.js did not set cv");

  if (typeof cv === "function" && !cv.Mat) {
    cv = cv();
    if (cv && cv.then) cv = await cv;
  }
  if (cv && cv.onRuntimeInitialized !== undefined && !cv.Mat) {
    await new Promise<void>((r) => { cv.onRuntimeInitialized = r; });
  }
  if (!cv?.Mat) throw new Error("OpenCV.js failed to initialize");

  report({ type: "progress", phase: "ready", percent: 100 });
}

// ---------- Pipeline functions (no DOM, pure OpenCV) ----------

function matToBuffer(mat: any, label: string): ImageBuffer {
  let rgba = mat;
  let del = false;
  if (mat.type() === cv.CV_8UC1) {
    rgba = new cv.Mat(); cv.cvtColor(mat, rgba, cv.COLOR_GRAY2RGBA); del = true;
  } else if (mat.type() === cv.CV_8UC3) {
    rgba = new cv.Mat(); cv.cvtColor(mat, rgba, cv.COLOR_BGR2RGBA); del = true;
  }
  const data = new Uint8ClampedArray(rgba.data);
  const r = { data, width: rgba.cols, height: rgba.rows, label };
  if (del) rgba.delete();
  return r;
}

function computeRegionProps(contour: any): RegionProps {
  const area = cv.contourArea(contour);
  const rect = cv.boundingRect(contour);
  const hull = new cv.Mat();
  cv.convexHull(contour, hull);
  const hullArea = cv.contourArea(hull);
  hull.delete();
  const m = cv.moments(contour);
  const mu20 = m.mu20 / m.m00, mu02 = m.mu02 / m.m00, mu11 = m.mu11 / m.m00;
  const diff = mu20 - mu02, sum = mu20 + mu02;
  const sq = Math.sqrt(diff * diff + 4 * mu11 * mu11);
  const l1 = (sum + sq) / 2, l2 = (sum - sq) / 2;
  const major = 4 * Math.sqrt(Math.max(l1, 0));
  const minor = 4 * Math.sqrt(Math.max(l2, 0));
  return {
    bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
    area,
    solidity: hullArea > 0 ? area / hullArea : 0,
    extent: rect.width * rect.height > 0 ? area / (rect.width * rect.height) : 0,
    eccentricity: major > 0 ? Math.sqrt(1 - (minor * minor) / (major * major)) : 0,
    orientation: (0.5 * Math.atan2(2 * mu11, diff) * 180) / Math.PI,
    majorAxisLength: major,
    minorAxisLength: minor,
  };
}

function filterPlateRegions(regions: RegionProps[], relaxExtent: boolean) {
  return regions.filter((r) => {
    if (r.majorAxisLength >= 450 || r.minorAxisLength < 24) return false;
    if (r.eccentricity < 0.9) return false;
    if (!relaxExtent && (r.extent < 0.6 || r.extent > 1)) return false;
    if (r.orientation < -15 || r.orientation > 15) return false;
    return r.solidity >= 0.6;
  });
}

function clearBorder(binary: any) {
  const h = binary.rows, w = binary.cols;
  const mask = cv.Mat.zeros(h + 2, w + 2, cv.CV_8UC1);
  const res = binary.clone();
  for (let x = 0; x < w; x++) {
    if (res.ucharAt(0, x) > 0) cv.floodFill(res, mask, new cv.Point(x, 0), new cv.Scalar(0));
    if (res.ucharAt(h - 1, x) > 0) cv.floodFill(res, mask, new cv.Point(x, h - 1), new cv.Scalar(0));
  }
  for (let y = 0; y < h; y++) {
    if (res.ucharAt(y, 0) > 0) cv.floodFill(res, mask, new cv.Point(0, y), new cv.Scalar(0));
    if (res.ucharAt(y, w - 1) > 0) cv.floodFill(res, mask, new cv.Point(w - 1, y), new cv.Scalar(0));
  }
  mask.delete();
  return res;
}

function fillHoles(binary: any) {
  const inv = new cv.Mat(); cv.bitwise_not(binary, inv);
  const mask = cv.Mat.zeros(binary.rows + 2, binary.cols + 2, cv.CV_8UC1);
  cv.floodFill(inv, mask, new cv.Point(0, 0), new cv.Scalar(0));
  const res = new cv.Mat(); cv.bitwise_or(binary, inv, res);
  inv.delete(); mask.delete();
  return res;
}

function getRegions(binary: any): RegionProps[] {
  const contours = new cv.MatVector();
  const hier = new cv.Mat();
  cv.findContours(binary, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  const regions: RegionProps[] = [];
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    if (cv.contourArea(cnt) < 10) { cnt.delete(); continue; }
    regions.push(computeRegionProps(cnt));
    cnt.delete();
  }
  contours.delete(); hier.delete();
  return regions;
}

function adaptiveThresh(gray: any, sensitivity: number) {
  const res = new cv.Mat();
  let bs = Math.max(3, Math.floor(gray.cols / 8));
  if (bs % 2 === 0) bs += 1;
  const C = Math.round((sensitivity * 2 - 1) * 15);
  cv.adaptiveThreshold(gray, res, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, bs, C);
  return res;
}

function findPlate(src: any): { plate: any; stages: ImageBuffer[] } | null {
  const stages: ImageBuffer[] = [];
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  stages.push(matToBuffer(gray, "Grayscale"));

  let sens = 0.4;
  let best: RegionProps | null = null;
  while (sens <= 1.0 && !best) {
    const bin = adaptiveThresh(gray, sens);
    if (sens <= 0.5) stages.push(matToBuffer(bin, `Binarized (s=${sens.toFixed(1)})`));
    const cleared = clearBorder(bin);
    const filled = fillHoles(cleared);
    cleared.delete(); bin.delete();
    const filtered = filterPlateRegions(getRegions(filled), sens > 0.4);
    if (filtered.length > 0) {
      best = filtered.reduce((a, b) => a.solidity > b.solidity ? a : b);
      const vis = src.clone();
      cv.rectangle(vis,
        new cv.Point(best.bbox.x, best.bbox.y),
        new cv.Point(best.bbox.x + best.bbox.w, best.bbox.y + best.bbox.h),
        new cv.Scalar(0, 255, 0, 255), 3);
      stages.push(matToBuffer(vis, "Plate detected"));
      vis.delete();
    }
    filled.delete();
    sens += 0.1;
  }
  if (!best) { gray.delete(); return null; }
  const plate = src.roi(new cv.Rect(best.bbox.x, best.bbox.y, best.bbox.w, best.bbox.h));
  stages.push(matToBuffer(plate, "Plate crop"));
  gray.delete();
  return { plate, stages };
}

function findChars(plate: any): { chars: any[]; stages: ImageBuffer[] } | null {
  const stages: ImageBuffer[] = [];
  const gray = new cv.Mat();
  cv.cvtColor(plate, gray, cv.COLOR_RGBA2GRAY);
  const bin = adaptiveThresh(gray, 0.7);
  const inv = new cv.Mat(); cv.bitwise_not(bin, inv);
  stages.push(matToBuffer(inv, "Inverted threshold"));
  bin.delete();
  const cleared = clearBorder(inv); inv.delete();

  const contours = new cv.MatVector();
  const hier = new cv.Mat();
  cv.findContours(cleared, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const cands: { bbox: RegionProps["bbox"] }[] = [];
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    if (cv.contourArea(cnt) < 30) { cnt.delete(); continue; }
    const p = computeRegionProps(cnt); cnt.delete();
    if (p.majorAxisLength < 12 || p.majorAxisLength > 180) continue;
    if (p.area < 50 || p.extent < 0.25 || p.eccentricity > 0.99) continue;
    if (Math.abs(p.orientation) < 60 && p.eccentricity > 0.9) continue;
    cands.push({ bbox: p.bbox });
  }
  contours.delete(); hier.delete(); cleared.delete();
  if (!cands.length) { gray.delete(); return null; }
  cands.sort((a, b) => a.bbox.x - b.bbox.x);

  const vis = plate.clone();
  for (const c of cands)
    cv.rectangle(vis, new cv.Point(c.bbox.x, c.bbox.y),
      new cv.Point(c.bbox.x + c.bbox.w, c.bbox.y + c.bbox.h),
      new cv.Scalar(0, 255, 0, 255), 2);
  stages.push(matToBuffer(vis, `${cands.length} characters found`));
  vis.delete();

  const chars: any[] = [];
  for (const c of cands) {
    const { x, y, w, h } = c.bbox;
    const cx = Math.max(0, x), cy = Math.max(0, y);
    const cw = Math.min(w, plate.cols - cx), ch = Math.min(h, plate.rows - cy);
    if (cw > 0 && ch > 0) chars.push(plate.roi(new cv.Rect(cx, cy, cw, ch)));
  }
  gray.delete();
  return { chars, stages };
}

function prepareTemplates(fontMat: any) {
  const gray = new cv.Mat();
  if (fontMat.channels() > 1) cv.cvtColor(fontMat, gray, cv.COLOR_RGBA2GRAY);
  else fontMat.copyTo(gray);

  const cropH = Math.min(70, gray.rows);
  const cropped = gray.roi(new cv.Rect(15, 0, Math.min(500, gray.cols - 15), cropH));
  for (let y = 0; y < cropped.rows; y++)
    for (let x = 190; x <= Math.min(210, cropped.cols - 1); x++)
      cropped.ucharPtr(y, x)[0] = 255;

  const bin = new cv.Mat();
  cv.threshold(cropped, bin, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);
  const contours = new cv.MatVector();
  const hier = new cv.Mat();
  cv.findContours(bin, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < contours.size(); i++) {
    const r = cv.boundingRect(contours.get(i));
    boxes.push({ x: r.x, y: r.y, w: r.width, h: r.height });
  }
  boxes.sort((a, b) => a.x - b.x);

  const tmpls: { label: string; tmpl: any }[] = [];
  for (let i = 0; i < Math.min(boxes.length, CHAR_LABELS.length); i++) {
    const b = boxes[i];
    const roi = bin.roi(new cv.Rect(b.x, b.y, b.w, b.h));
    const resized = new cv.Mat(); cv.resize(roi, resized, new cv.Size(20, 30));
    tmpls.push({ label: CHAR_LABELS[i], tmpl: resized });
    roi.delete();
  }
  for (let i = 0; i < contours.size(); i++) contours.get(i).delete();
  contours.delete(); hier.delete(); bin.delete(); cropped.delete(); gray.delete();
  return tmpls;
}

function identifyChars(charMats: any[], templates: { label: string; tmpl: any }[]) {
  const charImages: ImageBuffer[] = [];
  let text = "";
  for (const charMat of charMats) {
    const gray = new cv.Mat();
    if (charMat.channels() > 1) cv.cvtColor(charMat, gray, cv.COLOR_RGBA2GRAY);
    else charMat.copyTo(gray);
    const bin = new cv.Mat();
    cv.threshold(gray, bin, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);
    const resized = new cv.Mat(); cv.resize(bin, resized, new cv.Size(20, 30));
    charImages.push(matToBuffer(resized, ""));

    let bestScore = -Infinity, bestLabel = "?";
    for (const t of templates) {
      const r = new cv.Mat();
      cv.matchTemplate(resized, t.tmpl, r, cv.TM_CCOEFF_NORMED);
      const sc = r.floatAt(0, 0); if (sc > bestScore) { bestScore = sc; bestLabel = t.label; }
      r.delete();
    }
    text += bestLabel;
    gray.delete(); bin.delete(); resized.delete();
  }
  return { text, charImages };
}

// ---------- Message handler ----------

function processImage(imgBuf: { data: Uint8ClampedArray; width: number; height: number },
                      fontBuf: { data: Uint8ClampedArray; width: number; height: number }) {
  const src = cv.matFromImageData(new ImageData(new Uint8ClampedArray(imgBuf.data), imgBuf.width, imgBuf.height));
  const fontMat = cv.matFromImageData(new ImageData(new Uint8ClampedArray(fontBuf.data), fontBuf.width, fontBuf.height));
  const templates = prepareTemplates(fontMat);
  fontMat.delete();

  const plateRes = findPlate(src);
  if (!plateRes) {
    const fb = matToBuffer(src, "Original — no plate detected");
    src.delete(); templates.forEach((t) => t.tmpl.delete());
    return { plateText: "(no plate found)", stage1: [fb], stage2: [] as ImageBuffer[], stage3: [] as ImageBuffer[], charImages: [] as ImageBuffer[] };
  }

  const charRes = findChars(plateRes.plate);
  if (!charRes || !charRes.chars.length) {
    const fb = matToBuffer(plateRes.plate, "Plate — no characters detected");
    plateRes.plate.delete(); src.delete(); templates.forEach((t) => t.tmpl.delete());
    return { plateText: "(no characters found)", stage1: plateRes.stages, stage2: [fb], stage3: [] as ImageBuffer[], charImages: [] as ImageBuffer[] };
  }

  const ocr = identifyChars(charRes.chars, templates);
  charRes.chars.forEach((c: any) => c.delete());
  plateRes.plate.delete(); src.delete(); templates.forEach((t) => t.tmpl.delete());

  return { plateText: ocr.text, stage1: plateRes.stages, stage2: charRes.stages, stage3: [] as ImageBuffer[], charImages: ocr.charImages };
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === "init") {
    try { await initOpenCV(); report({ type: "ready" }); }
    catch (err: any) { report({ type: "error", message: err.message }); }
  } else if (msg.type === "process") {
    try {
      const result = processImage(msg.image, msg.font);
      report({ type: "result", ...result });
    } catch (err: any) { report({ type: "error", message: err.message }); }
  }
};
