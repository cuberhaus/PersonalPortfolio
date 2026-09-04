import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countSignificantPixels } from '../../scripts/compare-demo-gallery.mjs';
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

  it('tolerates sparse subpixel rasterization noise', () => {
    const expected = Buffer.alloc(1_000 * 4, 100);
    const actual = Buffer.from(expected);
    for (let pixel = 0; pixel < 100; pixel++) actual[pixel * 4] += 4;

    expect(countSignificantPixels(expected, actual, 8)).toBe(0);
  });

  it('detects a materially changed image region', () => {
    const expected = Buffer.alloc(1_000 * 4, 100);
    const actual = Buffer.from(expected);
    for (let pixel = 0; pixel < 600; pixel++) actual[pixel * 4] += 40;

    expect(countSignificantPixels(expected, actual, 8)).toBe(600);
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
