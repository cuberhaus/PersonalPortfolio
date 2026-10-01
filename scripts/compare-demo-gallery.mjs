import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const galleryDir = resolve(rootDir, 'docs', 'assets', 'demo-gallery');
const galleryIndex = resolve(rootDir, 'docs', 'demo-gallery.md');

/**
 * When a capture counts as a different picture from the committed one.
 *
 * A pixel's delta is its largest per-channel difference (0-255). Two limits, each tied to the
 * kind of change that produces deltas of that size:
 *
 * - Structural: more than `maxStructuralPixels` pixels over `structuralTolerance`. A glyph that
 *   lands one sub-pixel step (a quarter pixel) off redistributes a quarter of an edge's coverage,
 *   so it moves a pixel by at most a quarter of the text/background contrast: 64 at full
 *   contrast, and the CI anomaly of 2026-10-01 topped out at 62. JPEG quantisation adds a little
 *   on top (86 at worst across a sweep of stem widths, pitches and contrasts), so nothing in that
 *   noise class exceeds 88. Anything above is content, layout or colour that really changed;
 *   a half-pixel glyph shift already puts hundreds of pixels over it.
 * - Broad: more than `maxBroadPixels` pixels over `broadTolerance`. Catches wide, low-contrast
 *   changes (a shifted background shade) that never reach the structural limit. The same noise
 *   class puts up to roughly 1,600 pixels over 8, hence the headroom.
 *
 * Calibrated on CI renders: the two anomalous captures had 778 and 1,000 pixels over 8 and none
 * over 64, while the smallest real change in the gallery's history has 78 pixels over 88 and the
 * ROB canvas label font race had 123. A single "pixels over 8" count cannot separate those two
 * groups, which is why the old limit of 500 failed on noise.
 */
export const comparisonPolicy = Object.freeze({
  broadTolerance: 8,
  maxBroadPixels: 4000,
  structuralTolerance: 88,
  maxStructuralPixels: 40,
});

/** @typedef {{ x0: number, y0: number, x1: number, y1: number }} Bounds */

/**
 * @param {{ width: number, height: number, data: Uint8Array }} expected
 * @param {{ data: Uint8Array }} actual same dimensions as `expected`
 */
export function measureDifference(expected, actual) {
  const { broadTolerance, structuralTolerance } = comparisonPolicy;
  const { width, height } = expected;
  let broadPixels = 0;
  let structuralPixels = 0;
  let maxDelta = 0;
  // Bounding boxes, tracked as plain numbers: a fully changed page is over a million pixels.
  let broadX0 = width;
  let broadY0 = height;
  let broadX1 = -1;
  let broadY1 = -1;
  let structuralX0 = width;
  let structuralY0 = height;
  let structuralX1 = -1;
  let structuralY1 = -1;

  for (let offset = 0, pixel = 0; offset < expected.data.length; offset += 4, pixel++) {
    const delta = Math.max(
      Math.abs(expected.data[offset] - actual.data[offset]),
      Math.abs(expected.data[offset + 1] - actual.data[offset + 1]),
      Math.abs(expected.data[offset + 2] - actual.data[offset + 2])
    );
    if (delta > maxDelta) maxDelta = delta;
    if (delta <= broadTolerance) continue;

    const x = pixel % width;
    const y = (pixel - x) / width;
    broadPixels++;
    if (x < broadX0) broadX0 = x;
    if (y < broadY0) broadY0 = y;
    if (x > broadX1) broadX1 = x;
    if (y > broadY1) broadY1 = y;
    if (delta <= structuralTolerance) continue;

    structuralPixels++;
    if (x < structuralX0) structuralX0 = x;
    if (y < structuralY0) structuralY0 = y;
    if (x > structuralX1) structuralX1 = x;
    if (y > structuralY1) structuralY1 = y;
  }

  return {
    broadPixels,
    structuralPixels,
    maxDelta,
    /** @type {Bounds | null} */
    broadBounds: broadPixels ? { x0: broadX0, y0: broadY0, x1: broadX1, y1: broadY1 } : null,
    /** @type {Bounds | null} */
    structuralBounds: structuralPixels
      ? { x0: structuralX0, y0: structuralY0, x1: structuralX1, y1: structuralY1 }
      : null,
  };
}

/** @param {Bounds | null} bounds */
function describeRegion(bounds) {
  return bounds ? `, in x${bounds.x0}-${bounds.x1} y${bounds.y0}-${bounds.y1}` : '';
}

/** @param {ReturnType<typeof measureDifference>} difference */
function findFailures(difference) {
  const { broadTolerance, maxBroadPixels, structuralTolerance, maxStructuralPixels } =
    comparisonPolicy;
  const failures = [];
  if (difference.structuralPixels > maxStructuralPixels) {
    failures.push(
      `${difference.structuralPixels} pixels changed by more than ${structuralTolerance} ` +
        `(limit ${maxStructuralPixels})${describeRegion(difference.structuralBounds)}`
    );
  }
  if (difference.broadPixels > maxBroadPixels) {
    failures.push(
      `${difference.broadPixels} pixels changed by more than ${broadTolerance} ` +
        `(limit ${maxBroadPixels})${describeRegion(difference.broadBounds)}`
    );
  }
  return failures;
}

function repositoryPath(path) {
  return relative(rootDir, path).split(sep).join('/');
}

function readCommitted(path) {
  const result = spawnSync('git', ['show', `HEAD:${repositoryPath(path)}`], {
    cwd: rootDir,
    encoding: null,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`Unable to read committed ${repositoryPath(path)}`);
  return result.stdout;
}

/**
 * @returns {{
 *   dimensionsMatch: boolean,
 *   broadPixels: number,
 *   structuralPixels: number,
 *   maxDelta: number,
 *   broadBounds: Bounds | null,
 *   structuralBounds: Bounds | null,
 *   failures: string[],
 * }}
 */
export function compareJpegs(expectedBuffer, actualBuffer) {
  const expected = jpeg.decode(expectedBuffer, { useTArray: true });
  const actual = jpeg.decode(actualBuffer, { useTArray: true });
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return {
      dimensionsMatch: false,
      broadPixels: Number.POSITIVE_INFINITY,
      structuralPixels: Number.POSITIVE_INFINITY,
      maxDelta: 255,
      broadBounds: null,
      structuralBounds: null,
      failures: ['dimensions changed'],
    };
  }
  const difference = measureDifference(expected, actual);
  return { dimensionsMatch: true, ...difference, failures: findFailures(difference) };
}

function compareGallery() {
  const failures = [];
  const currentIndex = readFileSync(galleryIndex);
  if (!currentIndex.equals(readCommitted(galleryIndex)))
    failures.push('docs/demo-gallery.md changed');

  for (const name of readdirSync(galleryDir)
    .filter((entry) => entry.endsWith('.jpg'))
    .sort()) {
    const path = resolve(galleryDir, name);
    const comparison = compareJpegs(readCommitted(path), readFileSync(path));
    if (comparison.failures.length) {
      const detail = comparison.dimensionsMatch ? `; max delta ${comparison.maxDelta}` : '';
      failures.push(`${name}: ${comparison.failures.join('; ')}${detail}`);
    } else if (comparison.broadPixels > 0) {
      console.info(
        `${name}: tolerated ${comparison.broadPixels} rasterized pixels ` +
          `(max delta ${comparison.maxDelta})`
      );
    }
  }

  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  } else {
    console.info('Demo gallery matches committed images within rasterization tolerance.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  compareGallery();
