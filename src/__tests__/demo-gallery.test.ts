import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import jpeg from 'jpeg-js';
import { describe, expect, it } from 'vitest';
import { compareJpegs, comparisonPolicy } from '../../scripts/compare-demo-gallery.mjs';
import { renderGalleryIndex } from '../../scripts/demo-gallery.mjs';

interface DemoService {
  slug: string;
  page: string | null;
}

interface DemoServicesRegistry {
  services: DemoService[];
}

const rootDir = resolve(import.meta.dirname, '..', '..');
const registry = JSON.parse(
  readFileSync(resolve(rootDir, 'src', 'data', 'demo-services.json'), 'utf8')
) as DemoServicesRegistry;
const galleryDir = resolve(rootDir, 'docs', 'assets', 'demo-gallery');
const galleryIndexPath = resolve(rootDir, 'docs', 'demo-gallery.md');
const demoSlugs = registry.services
  .filter((service) => service.page !== null)
  .map((service) => service.slug)
  .sort();

function readJpegDimensions(image: Buffer) {
  let offset = 2;
  while (offset < image.length) {
    if (image[offset] !== 0xff) throw new Error('Invalid JPEG marker');
    const marker = image[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const segmentLength = image.readUInt16BE(offset);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: image.readUInt16BE(offset + 3), width: image.readUInt16BE(offset + 5) };
    }
    offset += segmentLength;
  }
  throw new Error('JPEG dimensions not found');
}

// Synthetic renderings for the comparison policy. The gallery is dark-theme text on a near-black
// page, so the model is light vertical stems (a glyph stem) on that background.
const BACKGROUND = 11;
// 40 stems x 12 rows x 2 edges: the same order of magnitude as the CI anomaly of 2026-10-01
// (778 and 1,000 changed pixels, max channel delta 62), which failed the old limit of 500
// pixels over a delta of 8.
const STEMS = 40;
const ROWS = 12;

interface StemStyle {
  /** Stem width in pixels. */
  width: number;
  /** Distance between the left edges of neighbouring stems. */
  pitch: number;
  /** Grey level at full coverage, against `BACKGROUND`. */
  ink: number;
}

const DEFAULT_STYLE: StemStyle = { width: 3, pitch: 9, ink: 255 };

// The grid the limits were calibrated on: 24 combinations of stem width, spacing and contrast.
// Quarter-pixel noise never exceeded a delta of 86 on any of them after JPEG quality 82.
const STEM_STYLES: StemStyle[] = [1.5, 2, 3, 4].flatMap((width) =>
  [7, 9, 12].flatMap((pitch) => [255, 220].map((ink) => ({ width, pitch, ink })))
);

interface Raster {
  width: number;
  height: number;
  data: Uint8Array;
}

function blankRaster(width: number, height: number): Raster {
  const data = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data.fill(BACKGROUND, offset, offset + 3);
    data[offset + 3] = 255;
  }
  return { width, height, data };
}

function setGray(raster: Raster, x: number, y: number, value: number) {
  const offset = (y * raster.width + x) * 4;
  raster.data.fill(Math.max(0, Math.min(255, Math.round(value))), offset, offset + 3);
}

/**
 * A row of vertical stems with exact area-coverage anti-aliasing at a fractional x `offset`.
 * This is how a glyph stem lands on the pixel grid at different sub-pixel phases.
 */
function stemRaster(style: StemStyle, offset: number): Raster {
  const raster = blankRaster(STEMS * style.pitch + 16, ROWS + 8);
  for (let stem = 0; stem < STEMS; stem++) {
    const start = 8 + stem * style.pitch + offset;
    const end = start + style.width;
    for (let column = Math.floor(start); column < Math.ceil(end); column++) {
      const coverage = Math.max(0, Math.min(end, column + 1) - Math.max(start, column));
      for (let row = 4; row < 4 + ROWS; row++) {
        setGray(raster, column, row, BACKGROUND + (style.ink - BACKGROUND) * coverage);
      }
    }
  }
  return raster;
}

function fillRect(
  raster: Raster,
  x: number,
  y: number,
  width: number,
  height: number,
  level: number
) {
  for (let row = y; row < y + height; row++) {
    for (let column = x; column < x + width; column++) setGray(raster, column, row, level);
  }
}

function encode(raster: Raster) {
  return jpeg.encode({ data: raster.data, width: raster.width, height: raster.height }, 82).data;
}

function compare(expected: Raster, actual: Raster) {
  return compareJpegs(encode(expected), encode(actual));
}

describe('demo screenshot gallery', () => {
  it('has exactly one stable image for every registered demo', () => {
    const imageSlugs = existsSync(galleryDir)
      ? readdirSync(galleryDir)
          .filter((name) => name.endsWith('.jpg'))
          .map((name) => name.slice(0, -'.jpg'.length))
          .sort()
      : [];

    expect(imageSlugs).toEqual(demoSlugs);

    for (const slug of imageSlugs) {
      const imagePath = resolve(galleryDir, `${slug}.jpg`);
      const image = readFileSync(imagePath);
      expect(statSync(imagePath).size, `${slug}.jpg is unexpectedly small`).toBeGreaterThan(10_000);
      expect(image.subarray(0, 2), `${slug}.jpg is not a JPEG`).toEqual(Buffer.from([0xff, 0xd8]));
      expect(readJpegDimensions(image), `${slug}.jpg has the wrong viewport`).toEqual({
        width: 1440,
        height: 900,
      });
    }
  });

  describe('comparison policy', () => {
    it.each(STEM_STYLES)(
      'tolerates a quarter-pixel step in stems $width px wide every $pitch px at level $ink',
      (style) => {
        const comparison = compare(stemRaster(style, 0), stemRaster(style, 0.25));

        // Each sample must be noisy enough to have tripped the old rule, or it proves nothing.
        expect(comparison.broadPixels).toBeGreaterThan(500);
        // Not merely under the limit: the noise class stays clear of it by a wide margin.
        expect(comparison.structuralPixels).toBeLessThanOrEqual(
          comparisonPolicy.maxStructuralPixels / 2
        );
        expect(comparison.failures).toEqual([]);
      }
    );

    it.each(STEM_STYLES)(
      'flags a half-pixel shift in stems $width px wide every $pitch px at level $ink',
      (style) => {
        const comparison = compare(stemRaster(style, 0), stemRaster(style, 0.5));

        expect(comparison.structuralPixels).toBeGreaterThan(comparisonPolicy.maxStructuralPixels);
        expect(comparison.failures[0]).toContain(
          `more than ${comparisonPolicy.structuralTolerance}`
        );
      }
    );

    it('flags glyphs shifted by a whole pixel', () => {
      const comparison = compare(stemRaster(DEFAULT_STYLE, 0), stemRaster(DEFAULT_STYLE, 1));

      expect(comparison.structuralPixels).toBeGreaterThan(comparisonPolicy.maxStructuralPixels);
      expect(comparison.failures).toHaveLength(1);
      expect(comparison.failures[0]).toContain(`more than ${comparisonPolicy.structuralTolerance}`);
    });

    it('flags a small high-contrast change such as a different icon or letter', () => {
      const expected = blankRaster(64, 32);
      const actual = blankRaster(64, 32);
      fillRect(actual, 16, 8, 8, 8, 211);

      const comparison = compare(expected, actual);

      expect(comparison.structuralPixels).toBeGreaterThan(comparisonPolicy.maxStructuralPixels);
      expect(comparison.failures).toHaveLength(1);
    });

    it('flags a broad low-contrast change such as a shifted background shade', () => {
      const expected = blankRaster(160, 80);
      const actual = blankRaster(160, 80);
      fillRect(actual, 20, 10, 100, 50, BACKGROUND + 12);

      const comparison = compare(expected, actual);

      expect(comparison.structuralPixels).toBe(0);
      expect(comparison.broadPixels).toBeGreaterThan(comparisonPolicy.maxBroadPixels);
      expect(comparison.failures).toHaveLength(1);
      expect(comparison.failures[0]).toContain(`more than ${comparisonPolicy.broadTolerance}`);
    });

    it('tolerates a small low-contrast change', () => {
      const expected = blankRaster(160, 80);
      const actual = blankRaster(160, 80);
      fillRect(actual, 20, 10, 30, 30, BACKGROUND + 12);

      expect(compare(expected, actual).failures).toEqual([]);
    });

    it('locates the changed region so a failure can be triaged from the log', () => {
      const expected = blankRaster(128, 64);
      const actual = blankRaster(128, 64);
      fillRect(actual, 40, 16, 16, 8, 211);

      const { structuralBounds } = compare(expected, actual);

      expect(structuralBounds).not.toBeNull();
      // JPEG ringing may extend the box a few pixels past the 16x8 rectangle, never inside it.
      expect(structuralBounds?.x0).toBeLessThanOrEqual(40);
      expect(structuralBounds?.x1).toBeGreaterThanOrEqual(55);
      expect(structuralBounds?.y0).toBeLessThanOrEqual(16);
      expect(structuralBounds?.y1).toBeGreaterThanOrEqual(23);
    });

    it('reports identical renderings as exactly equal', () => {
      const comparison = compare(stemRaster(DEFAULT_STYLE, 0), stemRaster(DEFAULT_STYLE, 0));

      expect(comparison).toMatchObject({
        dimensionsMatch: true,
        broadPixels: 0,
        structuralPixels: 0,
        maxDelta: 0,
        broadBounds: null,
        structuralBounds: null,
        failures: [],
      });
    });

    it('fails when the dimensions change', () => {
      const comparison = compare(blankRaster(64, 32), blankRaster(64, 33));

      expect(comparison.dimensionsMatch).toBe(false);
      expect(comparison.failures).toEqual(['dimensions changed']);
    });
  });

  it('has exactly one generated index entry for every registered demo', () => {
    const index = existsSync(galleryIndexPath) ? readFileSync(galleryIndexPath, 'utf8') : '';
    const indexedSlugs = Array.from(
      index.matchAll(/<!-- demo:([^ ]+) -->/g),
      (match) => match[1]
    ).sort();

    expect(indexedSlugs).toEqual(demoSlugs);
    expect(index).toBe(renderGalleryIndex());
  });
});
