// Pure JS image processing primitives — replaces OpenCV.js dependency.
// All functions operate on flat Uint8 arrays representing grayscale or RGBA images.

export interface GrayImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface RGBAImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RegionStats {
  bbox: Rect;
  area: number;
  solidity: number;
  extent: number;
  eccentricity: number;
  orientation: number;
  majorAxisLength: number;
  minorAxisLength: number;
}

// ─── Color conversion ───

export function rgbaToGray(src: RGBAImage): GrayImage {
  const n = src.width * src.height;
  const out = new Uint8Array(n);
  const d = src.data;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    out[i] = (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
  }
  return { data: out, width: src.width, height: src.height };
}

export function grayToRGBA(src: GrayImage): RGBAImage {
  const n = src.width * src.height;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const v = src.data[i];
    const o = i * 4;
    out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = 255;
  }
  return { data: out, width: src.width, height: src.height };
}

// ─── Threshold ───

export function otsuThreshold(src: GrayImage): number {
  const hist = new Int32Array(256);
  const d = src.data;
  for (let i = 0; i < d.length; i++) hist[d[i]]++;
  const total = d.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maxVar = 0, best = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) { maxVar = between; best = t; }
  }
  return best;
}

export function thresholdBinary(src: GrayImage, thresh: number, invert: boolean): GrayImage {
  const out = new Uint8Array(src.data.length);
  for (let i = 0; i < src.data.length; i++) {
    const pass = src.data[i] > thresh;
    out[i] = (invert ? !pass : pass) ? 255 : 0;
  }
  return { data: out, width: src.width, height: src.height };
}

export function thresholdOtsu(src: GrayImage, invert: boolean): GrayImage {
  return thresholdBinary(src, otsuThreshold(src), invert);
}

export function adaptiveThresholdMean(src: GrayImage, sensitivity: number): GrayImage {
  const { width: w, height: h, data: d } = src;
  // Build integral image (64-bit to avoid overflow)
  const integral = new Float64Array((w + 1) * (h + 1));
  const iw = w + 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      integral[(y + 1) * iw + (x + 1)] =
        d[y * w + x] + integral[y * iw + (x + 1)] + integral[(y + 1) * iw + x] - integral[y * iw + x];

  let bs = Math.max(3, Math.floor(w / 8));
  if (bs % 2 === 0) bs++;
  const half = bs >> 1;
  const C = (sensitivity * 2 - 1) * 15;

  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half), y2 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half), x2 = Math.min(w - 1, x + half);
      const count = (y2 - y1 + 1) * (x2 - x1 + 1);
      const sum =
        integral[(y2 + 1) * iw + (x2 + 1)] -
        integral[y1 * iw + (x2 + 1)] -
        integral[(y2 + 1) * iw + x1] +
        integral[y1 * iw + x1];
      const mean = sum / count;
      out[y * w + x] = d[y * w + x] > mean - C ? 255 : 0;
    }
  }
  return { data: out, width: w, height: h };
}

// ─── Morphological utilities ───

export function bitwiseNot(src: GrayImage): GrayImage {
  const out = new Uint8Array(src.data.length);
  for (let i = 0; i < src.data.length; i++) out[i] = 255 - src.data[i];
  return { data: out, width: src.width, height: src.height };
}

export function bitwiseOr(a: GrayImage, b: GrayImage): GrayImage {
  const out = new Uint8Array(a.data.length);
  for (let i = 0; i < a.data.length; i++) out[i] = a.data[i] | b.data[i];
  return { data: out, width: a.width, height: a.height };
}

export function floodFill(img: GrayImage, sx: number, sy: number, newVal: number): void {
  const { data: d, width: w, height: h } = img;
  const oldVal = d[sy * w + sx];
  if (oldVal === newVal) return;
  const stack = [sx, sy];
  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const idx = y * w + x;
    if (d[idx] !== oldVal) continue;
    d[idx] = newVal;
    stack.push(x - 1, y, x + 1, y, x, y - 1, x, y + 1);
  }
}

export function clearBorder(src: GrayImage): GrayImage {
  const res: GrayImage = { data: new Uint8Array(src.data), width: src.width, height: src.height };
  const { width: w, height: h } = res;
  for (let x = 0; x < w; x++) {
    if (res.data[x] > 0) floodFill(res, x, 0, 0);
    if (res.data[(h - 1) * w + x] > 0) floodFill(res, x, h - 1, 0);
  }
  for (let y = 0; y < h; y++) {
    if (res.data[y * w] > 0) floodFill(res, 0, y, 0);
    if (res.data[y * w + w - 1] > 0) floodFill(res, w - 1, y, 0);
  }
  return res;
}

export function fillHoles(src: GrayImage): GrayImage {
  const inv: GrayImage = bitwiseNot(src);
  floodFill(inv, 0, 0, 0);
  return bitwiseOr(src, inv);
}

// ─── Connected components & contour extraction ───

export interface Contour {
  points: { x: number; y: number }[];
}

export function labelConnectedComponents(bin: GrayImage): { labels: Int32Array; count: number } {
  const { data: d, width: w, height: h } = bin;
  const labels = new Int32Array(w * h);
  let nextLabel = 1;
  const parent = [0];

  function find(x: number): number {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }

  // Pass 1: assign temporary labels
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[y * w + x] === 0) continue;
      const above = y > 0 ? labels[(y - 1) * w + x] : 0;
      const left = x > 0 ? labels[y * w + x - 1] : 0;
      if (above === 0 && left === 0) {
        labels[y * w + x] = nextLabel;
        parent.push(nextLabel);
        nextLabel++;
      } else if (above !== 0 && left !== 0) {
        labels[y * w + x] = Math.min(above, left);
        if (above !== left) union(above, left);
      } else {
        labels[y * w + x] = above || left;
      }
    }
  }

  // Pass 2: resolve labels and compact
  const remap = new Int32Array(nextLabel);
  let compactId = 0;
  for (let i = 1; i < nextLabel; i++) {
    const root = find(i);
    if (remap[root] === 0) remap[root] = ++compactId;
    remap[i] = remap[root];
  }
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] > 0) labels[i] = remap[labels[i]];
  }

  return { labels, count: compactId };
}

export function extractContours(bin: GrayImage): Contour[] {
  const { labels, count } = labelConnectedComponents(bin);
  const { width: w, height: h } = bin;
  const contours: Contour[] = [];

  for (let id = 1; id <= count; id++) {
    const pts: { x: number; y: number }[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (labels[y * w + x] !== id) continue;
        // Check if border pixel (has a background neighbor)
        const isBorder =
          x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
          labels[(y - 1) * w + x] !== id ||
          labels[(y + 1) * w + x] !== id ||
          labels[y * w + x - 1] !== id ||
          labels[y * w + x + 1] !== id;
        if (isBorder) pts.push({ x, y });
      }
    }
    if (pts.length > 0) contours.push({ points: pts });
  }
  return contours;
}

// ─── Region properties ───

export function boundingRect(contour: Contour): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of contour.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function contourArea(contour: Contour): number {
  // Use the label-based pixel count for filled area
  const pts = contour.points;
  if (pts.length < 3) return pts.length;
  // Shoelace formula on border points gives perimeter-based area; for filled blobs,
  // compute from bbox scan instead. We estimate using bbox pixel membership.
  const rect = boundingRect(contour);
  // For our use case, we compute filled area from the binary image in regionStats
  return pts.length;
}

export function contourAreaFromBinary(bin: GrayImage, labels: Int32Array, labelId: number): number {
  let count = 0;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === labelId) count++;
  }
  return count;
}

export function convexHullArea(pts: { x: number; y: number }[]): number {
  if (pts.length < 3) return 0;
  // Graham scan
  const anchor = pts.reduce((a, b) => (b.y < a.y || (b.y === a.y && b.x < a.x) ? b : a));
  const sorted = pts
    .filter((p) => p !== anchor)
    .sort((a, b) => {
      const aa = Math.atan2(a.y - anchor.y, a.x - anchor.x);
      const bb = Math.atan2(b.y - anchor.y, b.x - anchor.x);
      return aa - bb || (a.x - anchor.x) ** 2 + (a.y - anchor.y) ** 2 - ((b.x - anchor.x) ** 2 + (b.y - anchor.y) ** 2);
    });

  const hull = [anchor];
  for (const p of sorted) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2], b = hull[hull.length - 1];
      if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) > 0) break;
      hull.pop();
    }
    hull.push(p);
  }

  // Shoelace for hull area
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    area += hull[i].x * hull[j].y - hull[j].x * hull[i].y;
  }
  return Math.abs(area) / 2;
}

export function computeRegionStats(bin: GrayImage, labels: Int32Array, labelId: number): RegionStats {
  const { width: w } = bin;
  let area = 0, sumX = 0, sumY = 0;
  const borderPts: { x: number; y: number }[] = [];

  for (let i = 0; i < labels.length; i++) {
    if (labels[i] !== labelId) continue;
    area++;
    const x = i % w, y = (i / w) | 0;
    sumX += x;
    sumY += y;
  }

  if (area === 0)
    return { bbox: { x: 0, y: 0, w: 0, h: 0 }, area: 0, solidity: 0, extent: 0, eccentricity: 0, orientation: 0, majorAxisLength: 0, minorAxisLength: 0 };

  const cx = sumX / area, cy = sumY / area;
  let mu20 = 0, mu02 = 0, mu11 = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < labels.length; i++) {
    if (labels[i] !== labelId) continue;
    const x = i % w, y = (i / w) | 0;
    const dx = x - cx, dy = y - cy;
    mu20 += dx * dx;
    mu02 += dy * dy;
    mu11 += dx * dy;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;

    const h = bin.height;
    const isBorder =
      x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
      labels[i - 1] !== labelId || labels[i + 1] !== labelId ||
      labels[i - w] !== labelId || labels[i + w] !== labelId;
    if (isBorder) borderPts.push({ x, y });
  }

  mu20 /= area; mu02 /= area; mu11 /= area;

  const diff = mu20 - mu02;
  const sq = Math.sqrt(diff * diff + 4 * mu11 * mu11);
  const l1 = (mu20 + mu02 + sq) / 2;
  const l2 = (mu20 + mu02 - sq) / 2;
  const major = 4 * Math.sqrt(Math.max(l1, 0));
  const minor = 4 * Math.sqrt(Math.max(l2, 0));

  const bbox: Rect = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  const bboxArea = bbox.w * bbox.h;
  const hullArea = convexHullArea(borderPts);

  return {
    bbox,
    area,
    solidity: hullArea > 0 ? area / hullArea : 0,
    extent: bboxArea > 0 ? area / bboxArea : 0,
    eccentricity: major > 0 ? Math.sqrt(Math.max(0, 1 - (minor * minor) / (major * major))) : 0,
    orientation: (0.5 * Math.atan2(2 * mu11, diff) * 180) / Math.PI,
    majorAxisLength: major,
    minorAxisLength: minor,
  };
}

// ─── Image manipulation ───

export function cropGray(src: GrayImage, r: Rect): GrayImage {
  const out = new Uint8Array(r.w * r.h);
  for (let y = 0; y < r.h; y++) {
    const srcOff = (r.y + y) * src.width + r.x;
    out.set(src.data.subarray(srcOff, srcOff + r.w), y * r.w);
  }
  return { data: out, width: r.w, height: r.h };
}

export function cropRGBA(src: RGBAImage, r: Rect): RGBAImage {
  const out = new Uint8ClampedArray(r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) {
    const srcOff = ((r.y + y) * src.width + r.x) * 4;
    out.set(src.data.subarray(srcOff, srcOff + r.w * 4), y * r.w * 4);
  }
  return { data: out, width: r.w, height: r.h };
}

export function resizeGray(src: GrayImage, tw: number, th: number): GrayImage {
  const out = new Uint8Array(tw * th);
  const xr = src.width / tw, yr = src.height / th;
  for (let y = 0; y < th; y++) {
    const sy = y * yr;
    const y0 = Math.min(Math.floor(sy), src.height - 1);
    const y1 = Math.min(y0 + 1, src.height - 1);
    const fy = sy - y0;
    for (let x = 0; x < tw; x++) {
      const sx = x * xr;
      const x0 = Math.min(Math.floor(sx), src.width - 1);
      const x1 = Math.min(x0 + 1, src.width - 1);
      const fx = sx - x0;
      out[y * tw + x] = Math.round(
        src.data[y0 * src.width + x0] * (1 - fx) * (1 - fy) +
        src.data[y0 * src.width + x1] * fx * (1 - fy) +
        src.data[y1 * src.width + x0] * (1 - fx) * fy +
        src.data[y1 * src.width + x1] * fx * fy
      );
    }
  }
  return { data: out, width: tw, height: th };
}

// ─── Template matching (normalized cross-correlation) ───

export function matchTemplateNCC(src: GrayImage, tmpl: GrayImage): number {
  if (src.width !== tmpl.width || src.height !== tmpl.height) return -1;
  const n = src.data.length;
  let sumS = 0, sumT = 0;
  for (let i = 0; i < n; i++) { sumS += src.data[i]; sumT += tmpl.data[i]; }
  const meanS = sumS / n, meanT = sumT / n;
  let num = 0, denS = 0, denT = 0;
  for (let i = 0; i < n; i++) {
    const ds = src.data[i] - meanS, dt = tmpl.data[i] - meanT;
    num += ds * dt;
    denS += ds * ds;
    denT += dt * dt;
  }
  const den = Math.sqrt(denS * denT);
  return den > 0 ? num / den : 0;
}

// ─── Drawing ───

export function drawRectRGBA(img: RGBAImage, r: Rect, color: [number, number, number], thickness: number): void {
  const { data: d, width: w, height: h } = img;
  for (let t = 0; t < thickness; t++) {
    for (let x = r.x - t; x < r.x + r.w + t; x++) {
      for (const y of [r.y - t, r.y + r.h - 1 + t]) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const o = (y * w + x) * 4;
          d[o] = color[0]; d[o + 1] = color[1]; d[o + 2] = color[2]; d[o + 3] = 255;
        }
      }
    }
    for (let y = r.y - t; y < r.y + r.h + t; y++) {
      for (const x of [r.x - t, r.x + r.w - 1 + t]) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const o = (y * w + x) * 4;
          d[o] = color[0]; d[o + 1] = color[1]; d[o + 2] = color[2]; d[o + 3] = 255;
        }
      }
    }
  }
}
