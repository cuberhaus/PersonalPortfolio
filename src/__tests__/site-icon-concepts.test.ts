import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const conceptsRoot = resolve(process.cwd(), 'docs/design/site-icon-concepts');
const productionIconPath = resolve(process.cwd(), 'public/favicon.svg');
const publicRoot = resolve(process.cwd(), 'public');
const siteIconsPath = resolve(process.cwd(), 'src/components/SiteIcons.astro');
const manifestPath = resolve(publicRoot, 'site.webmanifest');
const concepts = ['organic', 'signal', 'monogram', 'aperture'] as const;
const treatments = ['contained', 'transparent'] as const;
const comparisonOnlySvgFiles = new Set(['previous.svg']);

const pngDimensions = (fileName: string) => {
  const png = readFileSync(resolve(publicRoot, fileName));
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
};

const decodePngCornerPixels = (png: Buffer) => {
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const bitDepth = png[24];
  const colorType = png[25];
  const interlaceMethod = png[28];

  expect(bitDepth).toBe(8);
  expect([2, 6]).toContain(colorType);
  expect(interlaceMethod).toBe(0);

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const rowLength = width * bytesPerPixel;
  const imageData: Buffer[] = [];
  let chunkOffset = 8;

  while (chunkOffset < png.length) {
    const chunkLength = png.readUInt32BE(chunkOffset);
    const chunkType = png.subarray(chunkOffset + 4, chunkOffset + 8).toString('ascii');
    if (chunkType === 'IDAT') {
      imageData.push(png.subarray(chunkOffset + 8, chunkOffset + 8 + chunkLength));
    }
    chunkOffset += chunkLength + 12;
  }

  const decoded = inflateSync(Buffer.concat(imageData));
  const rows: Buffer[] = [];
  let decodedOffset = 0;
  let previousRow = Buffer.alloc(rowLength);

  const paethPredictor = (left: number, above: number, upperLeft: number) => {
    const predictor = left + above - upperLeft;
    const distanceLeft = Math.abs(predictor - left);
    const distanceAbove = Math.abs(predictor - above);
    const distanceUpperLeft = Math.abs(predictor - upperLeft);
    if (distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft) return left;
    if (distanceAbove <= distanceUpperLeft) return above;
    return upperLeft;
  };

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filterType = decoded[decodedOffset];
    decodedOffset += 1;
    const row = Buffer.from(decoded.subarray(decodedOffset, decodedOffset + rowLength));
    decodedOffset += rowLength;

    for (let byteIndex = 0; byteIndex < row.length; byteIndex += 1) {
      const left = byteIndex >= bytesPerPixel ? row[byteIndex - bytesPerPixel] : 0;
      const above = previousRow[byteIndex];
      const upperLeft = byteIndex >= bytesPerPixel ? previousRow[byteIndex - bytesPerPixel] : 0;
      const filteredByte = row[byteIndex];
      let restoredByte: number;

      switch (filterType) {
        case 0:
          restoredByte = filteredByte;
          break;
        case 1:
          restoredByte = filteredByte + left;
          break;
        case 2:
          restoredByte = filteredByte + above;
          break;
        case 3:
          restoredByte = filteredByte + Math.floor((left + above) / 2);
          break;
        case 4:
          restoredByte = filteredByte + paethPredictor(left, above, upperLeft);
          break;
        default:
          throw new Error(`Unsupported PNG filter type: ${filterType}`);
      }

      row[byteIndex] = restoredByte & 0xff;
    }

    rows.push(row);
    previousRow = row;
  }

  return [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ].map(([xCoordinate, yCoordinate]) => {
    const pixelOffset = xCoordinate * bytesPerPixel;
    const pixel = rows[yCoordinate].subarray(pixelOffset, pixelOffset + bytesPerPixel);
    return colorType === 6 ? Array.from(pixel) : [...Array.from(pixel), 255];
  });
};

const pngCornerPixels = (fileName: string) =>
  decodePngCornerPixels(readFileSync(resolve(publicRoot, fileName)));

const icoEntries = () => {
  const ico = readFileSync(resolve(publicRoot, 'favicon.ico'));
  expect(ico.readUInt16LE(0)).toBe(0);
  expect(ico.readUInt16LE(2)).toBe(1);
  const imageCount = ico.readUInt16LE(4);
  return Array.from({ length: imageCount }, (_, index) => {
    const offset = 6 + index * 16;
    return {
      width: ico[offset] || 256,
      height: ico[offset + 1] || 256,
      png: ico.subarray(
        ico.readUInt32LE(offset + 12),
        ico.readUInt32LE(offset + 12) + ico.readUInt32LE(offset + 8)
      ),
    };
  });
};

const icoDimensions = () => icoEntries().map(({ width, height }) => ({ width, height }));

const icoCornerPixels = () => icoEntries().map(({ png }) => decodePngCornerPixels(png));

describe('site icon concept set', () => {
  it('contains exactly four concepts with both square SVG treatments', () => {
    expect(existsSync(conceptsRoot)).toBe(true);

    const svgFiles = readdirSync(conceptsRoot)
      .filter((file) => file.endsWith('.svg') && !comparisonOnlySvgFiles.has(file))
      .sort();
    expect(svgFiles).toEqual(
      concepts
        .flatMap((concept) => treatments.map((treatment) => `${concept}-${treatment}.svg`))
        .sort()
    );

    for (const concept of concepts) {
      for (const treatment of treatments) {
        const filePath = resolve(conceptsRoot, `${concept}-${treatment}.svg`);
        expect(existsSync(filePath)).toBe(true);

        const svg = readFileSync(filePath, 'utf8');
        expect(svg).toMatch(/<svg[^>]+role="img"/);
        expect(svg).toMatch(/viewBox="0 0 64 64"/);
        expect(svg).toMatch(/<title id="[^"]+">[^<]+<\/title>/);
        expect(svg).toMatch(/<desc id="[^"]+">[^<]+<\/desc>/);
        expect(svg).not.toMatch(/<(text|filter|linearGradient|radialGradient)\b/i);
        expect(svg).not.toMatch(/(brain|robot|polyp|circuit)/i);
      }
    }
  });

  it('uses the selected transparent signal treatment as the browser icon source', () => {
    const canonicalIcon = readFileSync(resolve(conceptsRoot, 'signal-transparent.svg'), 'utf8');

    expect(readFileSync(productionIconPath, 'utf8').trimEnd()).toBe(canonicalIcon.trimEnd());
    expect(canonicalIcon).not.toContain('<rect');
  });

  it('keeps every browser and PWA export in the canonical icon contract', () => {
    expect(pngDimensions('favicon-32x32.png')).toEqual({ width: 32, height: 32 });
    expect(pngDimensions('apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
    expect(pngDimensions('icon-192.png')).toEqual({ width: 192, height: 192 });
    expect(pngDimensions('icon-512.png')).toEqual({ width: 512, height: 512 });
    const expectedOpaqueCorners = Array.from({ length: 4 }, () => [16, 26, 24, 255]);
    expect(pngCornerPixels('favicon-32x32.png').every(([, , , alpha]) => alpha === 0)).toBe(true);
    for (const fileName of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
      expect(pngCornerPixels(fileName)).toEqual(expectedOpaqueCorners);
    }
    expect(icoDimensions()).toEqual([
      { width: 16, height: 16 },
      { width: 24, height: 24 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);
    expect(
      icoCornerPixels().every((corners) => corners.every(([, , , alpha]) => alpha === 0))
    ).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      icons: Array<{ src: string; sizes: string; type: string }>;
    };
    expect(manifest.icons).toEqual([
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    ]);

    const siteIcons = readFileSync(siteIconsPath, 'utf8');
    expect(siteIcons).toContain("asset('favicon.svg')");
    expect(siteIcons).toContain("asset('favicon-32x32.png')");
    expect(siteIcons).toContain("asset('favicon.ico')");
    expect(siteIcons).toContain("asset('apple-touch-icon.png')");
    expect(siteIcons).toContain("asset('site.webmanifest')");
  });
});
