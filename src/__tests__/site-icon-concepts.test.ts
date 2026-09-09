import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const conceptsRoot = resolve(process.cwd(), 'docs/design/site-icon-concepts');
const productionIconPath = resolve(process.cwd(), 'public/favicon.svg');
const publicRoot = resolve(process.cwd(), 'public');
const siteIconsPath = resolve(process.cwd(), 'src/components/SiteIcons.astro');
const manifestPath = resolve(publicRoot, 'site.webmanifest');
const concepts = ['organic', 'signal', 'monogram', 'aperture'] as const;
const treatments = ['contained', 'transparent'] as const;

const pngDimensions = (fileName: string) => {
  const png = readFileSync(resolve(publicRoot, fileName));
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
};

const icoDimensions = () => {
  const ico = readFileSync(resolve(publicRoot, 'favicon.ico'));
  expect(ico.readUInt16LE(0)).toBe(0);
  expect(ico.readUInt16LE(2)).toBe(1);
  const imageCount = ico.readUInt16LE(4);
  return Array.from({ length: imageCount }, (_, index) => {
    const offset = 6 + index * 16;
    return {
      width: ico[offset] || 256,
      height: ico[offset + 1] || 256,
    };
  });
};

describe('site icon concept set', () => {
  it('contains exactly four concepts with both square SVG treatments', () => {
    expect(existsSync(conceptsRoot)).toBe(true);

    const svgFiles = readdirSync(conceptsRoot)
      .filter((file) => file.endsWith('.svg'))
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

  it('uses the selected contained signal treatment as the production source', () => {
    const canonicalIcon = readFileSync(resolve(conceptsRoot, 'signal-contained.svg'), 'utf8');

    expect(readFileSync(productionIconPath, 'utf8').trimEnd()).toBe(canonicalIcon.trimEnd());
  });

  it('keeps every browser and PWA export in the canonical icon contract', () => {
    expect(pngDimensions('favicon-32x32.png')).toEqual({ width: 32, height: 32 });
    expect(pngDimensions('apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
    expect(pngDimensions('icon-192.png')).toEqual({ width: 192, height: 192 });
    expect(pngDimensions('icon-512.png')).toEqual({ width: 512, height: 512 });
    expect(icoDimensions()).toEqual([
      { width: 16, height: 16 },
      { width: 24, height: 24 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);

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
