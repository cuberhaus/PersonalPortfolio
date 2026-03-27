import { describe, it, expect } from 'vitest';
import {
  rgbaToGray,
  grayToRGBA,
  otsuThreshold,
  thresholdBinary,
  bitwiseNot,
  bitwiseOr,
  floodFill,
  clearBorder,
  fillHoles,
  labelConnectedComponents,
  extractContours,
  boundingRect,
  convexHullArea,
  resizeGray,
  cropGray,
  matchTemplateNCC,
  inkIoU,
  type GrayImage,
  type RGBAImage,
} from '../lib/imgproc';

function makeGray(w: number, h: number, values: number[]): GrayImage {
  return { data: new Uint8Array(values), width: w, height: h };
}

function makeRGBA(w: number, h: number, fill: [number, number, number, number]): RGBAImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return { data, width: w, height: h };
}

// ─── Color conversion ───────────────────────────────────────────

describe('rgbaToGray', () => {
  it('converts pure white to ~255', () => {
    const rgba = makeRGBA(1, 1, [255, 255, 255, 255]);
    const gray = rgbaToGray(rgba);
    expect(gray.data[0]).toBeGreaterThanOrEqual(254);
  });

  it('converts pure black to 0', () => {
    const rgba = makeRGBA(1, 1, [0, 0, 0, 255]);
    const gray = rgbaToGray(rgba);
    expect(gray.data[0]).toBe(0);
  });

  it('preserves dimensions', () => {
    const rgba = makeRGBA(3, 5, [128, 128, 128, 255]);
    const gray = rgbaToGray(rgba);
    expect(gray.width).toBe(3);
    expect(gray.height).toBe(5);
    expect(gray.data.length).toBe(15);
  });
});

describe('grayToRGBA', () => {
  it('round-trips uniform gray', () => {
    const gray = makeGray(2, 2, [100, 100, 100, 100]);
    const rgba = grayToRGBA(gray);
    for (let i = 0; i < 4; i++) {
      expect(rgba.data[i * 4]).toBe(100);
      expect(rgba.data[i * 4 + 1]).toBe(100);
      expect(rgba.data[i * 4 + 2]).toBe(100);
      expect(rgba.data[i * 4 + 3]).toBe(255);
    }
  });
});

// ─── Thresholding ───────────────────────────────────────────────

describe('otsuThreshold', () => {
  it('finds threshold between two peaks', () => {
    const values = [
      ...new Array(50).fill(30),
      ...new Array(50).fill(200),
    ];
    const gray = makeGray(100, 1, values);
    const t = otsuThreshold(gray);
    expect(t).toBeGreaterThanOrEqual(30);
    expect(t).toBeLessThan(200);
  });
});

describe('thresholdBinary', () => {
  it('binarizes correctly', () => {
    const gray = makeGray(4, 1, [10, 100, 200, 250]);
    const bin = thresholdBinary(gray, 128, false);
    expect(bin.data[0]).toBe(0);
    expect(bin.data[1]).toBe(0);
    expect(bin.data[2]).toBe(255);
    expect(bin.data[3]).toBe(255);
  });

  it('invert flag inverts result', () => {
    const gray = makeGray(2, 1, [50, 200]);
    const normal = thresholdBinary(gray, 100, false);
    const inverted = thresholdBinary(gray, 100, true);
    expect(normal.data[0]).toBe(0);
    expect(inverted.data[0]).toBe(255);
    expect(normal.data[1]).toBe(255);
    expect(inverted.data[1]).toBe(0);
  });
});

// ─── Bitwise ops ────────────────────────────────────────────────

describe('bitwiseNot', () => {
  it('inverts pixel values', () => {
    const g = makeGray(2, 1, [0, 255]);
    const n = bitwiseNot(g);
    expect(n.data[0]).toBe(255);
    expect(n.data[1]).toBe(0);
  });

  it('double negation is identity', () => {
    const g = makeGray(3, 1, [42, 128, 200]);
    const nn = bitwiseNot(bitwiseNot(g));
    expect(Array.from(nn.data)).toEqual([42, 128, 200]);
  });
});

describe('bitwiseOr', () => {
  it('OR of image with itself is identity', () => {
    const g = makeGray(3, 1, [10, 128, 255]);
    const result = bitwiseOr(g, g);
    expect(Array.from(result.data)).toEqual([10, 128, 255]);
  });

  it('OR with all-zero is identity', () => {
    const g = makeGray(2, 1, [42, 200]);
    const z = makeGray(2, 1, [0, 0]);
    const result = bitwiseOr(g, z);
    expect(Array.from(result.data)).toEqual([42, 200]);
  });
});

// ─── Flood fill ─────────────────────────────────────────────────

describe('floodFill', () => {
  it('fills a connected region', () => {
    // 3x3 grid with a white square in the middle
    const g = makeGray(3, 3, [
      0, 0, 0,
      0, 255, 0,
      0, 0, 0,
    ]);
    floodFill(g, 1, 1, 128);
    expect(g.data[4]).toBe(128);
    expect(g.data[0]).toBe(0); // other pixels unchanged
  });

  it('no-op when newVal equals old val', () => {
    const g = makeGray(2, 2, [100, 100, 100, 100]);
    floodFill(g, 0, 0, 100);
    expect(Array.from(g.data)).toEqual([100, 100, 100, 100]);
  });
});

// ─── Connected components ───────────────────────────────────────

describe('labelConnectedComponents', () => {
  it('finds 2 separate blobs', () => {
    // 5x1 with two separated white pixels
    const g = makeGray(5, 1, [255, 0, 0, 0, 255]);
    const { count } = labelConnectedComponents(g);
    expect(count).toBe(2);
  });

  it('finds 1 blob for adjacent pixels', () => {
    const g = makeGray(3, 1, [255, 255, 255]);
    const { count } = labelConnectedComponents(g);
    expect(count).toBe(1);
  });

  it('returns 0 components for all-black image', () => {
    const g = makeGray(3, 3, new Array(9).fill(0));
    const { count } = labelConnectedComponents(g);
    expect(count).toBe(0);
  });

  it('labels pixels correctly for 2 blobs', () => {
    const g = makeGray(5, 1, [255, 0, 0, 0, 255]);
    const { labels } = labelConnectedComponents(g);
    expect(labels[0]).toBeGreaterThan(0);
    expect(labels[4]).toBeGreaterThan(0);
    expect(labels[0]).not.toBe(labels[4]);
    expect(labels[1]).toBe(0);
  });
});

// ─── Contours & bounding rect ───────────────────────────────────

describe('extractContours', () => {
  it('extracts contours from a binary image', () => {
    // 2 blobs
    const g = makeGray(5, 1, [255, 0, 0, 0, 255]);
    const contours = extractContours(g);
    expect(contours.length).toBe(2);
  });
});

describe('boundingRect', () => {
  it('computes correct bounding box', () => {
    const contour = { points: [{ x: 1, y: 2 }, { x: 4, y: 5 }, { x: 3, y: 3 }] };
    const r = boundingRect(contour);
    expect(r).toEqual({ x: 1, y: 2, w: 4, h: 4 });
  });
});

// ─── Convex hull area ───────────────────────────────────────────

describe('convexHullArea', () => {
  it('computes area of a unit square', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(convexHullArea(pts)).toBeCloseTo(1, 5);
  });

  it('computes area of a right triangle', () => {
    const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }];
    expect(convexHullArea(pts)).toBeCloseTo(6, 5);
  });

  it('returns 0 for fewer than 3 points', () => {
    expect(convexHullArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
    expect(convexHullArea([])).toBe(0);
  });

  it('ignores interior points', () => {
    const pts = [
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 },
      { x: 2, y: 2 }, // interior
    ];
    expect(convexHullArea(pts)).toBeCloseTo(16, 5);
  });
});

// ─── Resize & crop ──────────────────────────────────────────────

describe('resizeGray', () => {
  it('doubles size correctly', () => {
    const g = makeGray(2, 2, [100, 200, 100, 200]);
    const r = resizeGray(g, 4, 4);
    expect(r.width).toBe(4);
    expect(r.height).toBe(4);
    expect(r.data.length).toBe(16);
  });

  it('halves size correctly', () => {
    const g = makeGray(4, 4, new Array(16).fill(128));
    const r = resizeGray(g, 2, 2);
    expect(r.width).toBe(2);
    expect(r.height).toBe(2);
    for (const v of r.data) expect(v).toBe(128);
  });
});

describe('cropGray', () => {
  it('extracts subregion', () => {
    // 3x3, crop center 1x1
    const g = makeGray(3, 3, [
      1, 2, 3,
      4, 5, 6,
      7, 8, 9,
    ]);
    const c = cropGray(g, { x: 1, y: 1, w: 1, h: 1 });
    expect(c.width).toBe(1);
    expect(c.height).toBe(1);
    expect(c.data[0]).toBe(5);
  });
});

// ─── Template matching ──────────────────────────────────────────

describe('matchTemplateNCC', () => {
  it('returns 1.0 for identical images', () => {
    const g = makeGray(3, 3, [10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(matchTemplateNCC(g, g)).toBeCloseTo(1.0, 5);
  });

  it('returns -1.0 for inverted image', () => {
    const g = makeGray(2, 2, [0, 0, 255, 255]);
    const inv = bitwiseNot(g);
    expect(matchTemplateNCC(g, inv)).toBeCloseTo(-1.0, 5);
  });
});

describe('inkIoU', () => {
  it('returns 1.0 for identical binary images', () => {
    const g = makeGray(2, 2, [0, 255, 255, 0]);
    expect(inkIoU(g, g)).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for non-overlapping ink', () => {
    const a = makeGray(4, 1, [255, 0, 0, 0]);
    const b = makeGray(4, 1, [0, 0, 0, 255]);
    expect(inkIoU(a, b)).toBe(0);
  });
});
