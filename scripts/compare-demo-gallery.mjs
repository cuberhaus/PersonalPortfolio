import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const galleryDir = resolve(rootDir, 'docs', 'assets', 'demo-gallery');
const galleryIndex = resolve(rootDir, 'docs', 'demo-gallery.md');
const channelTolerance = 8;
const maxSignificantPixels = 500;

export function countSignificantPixels(expected, actual, tolerance = channelTolerance) {
  if (expected.length !== actual.length) return Number.POSITIVE_INFINITY;
  let significantPixels = 0;
  for (let offset = 0; offset < expected.length; offset += 4) {
    const maxDelta = Math.max(
      Math.abs(expected[offset] - actual[offset]),
      Math.abs(expected[offset + 1] - actual[offset + 1]),
      Math.abs(expected[offset + 2] - actual[offset + 2])
    );
    if (maxDelta > tolerance) significantPixels++;
  }
  return significantPixels;
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

export function compareJpegs(expectedBuffer, actualBuffer) {
  const expected = jpeg.decode(expectedBuffer, { useTArray: true });
  const actual = jpeg.decode(actualBuffer, { useTArray: true });
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return { dimensionsMatch: false, significantPixels: Number.POSITIVE_INFINITY };
  }
  return {
    dimensionsMatch: true,
    significantPixels: countSignificantPixels(expected.data, actual.data),
  };
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
    if (!comparison.dimensionsMatch) failures.push(`${name}: dimensions changed`);
    else if (comparison.significantPixels > maxSignificantPixels) {
      failures.push(`${name}: ${comparison.significantPixels} materially changed pixels`);
    } else if (comparison.significantPixels > 0) {
      console.info(`${name}: tolerated ${comparison.significantPixels} rasterized pixels`);
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
