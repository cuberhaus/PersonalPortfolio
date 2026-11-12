import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Official release assets, used when no PDFs were fetched into public/cv. */
const RELEASE_ASSET_BASE = 'https://github.com/cuberhaus/cv/releases/latest/download';

export interface CvAssets {
  /** Where `cv_<lang>_<preset>_<photo-mode>.pdf` files are served from. */
  assetBase: string;
  /** Content hash of the local PDFs for cache busting; empty for release assets. */
  assetVersion: string;
}

const cache = new Map<string, CvAssets>();

/**
 * Resolve where the CV PDFs live for this build. Server-only (reads
 * `public/cv`), shared by the hero action and the About downloader so both
 * always point at the same file and version.
 *
 * @param base BASE_URL without a trailing slash ('' for the site root).
 */
export function resolveCvAssets(base: string): CvAssets {
  const cached = cache.get(base);
  if (cached) return cached;

  const dir = resolve('./public/cv');
  const hasLocalPdfs = existsSync(resolve(dir, 'cv_english_standard_photo.pdf'));

  let assets: CvAssets;
  if (hasLocalPdfs) {
    const hash = createHash('sha1');
    for (const file of readdirSync(dir)
      .filter((name) => name.endsWith('.pdf'))
      .sort()) {
      hash.update(file).update(readFileSync(resolve(dir, file)));
    }
    assets = { assetBase: `${base}/cv`, assetVersion: hash.digest('hex').slice(0, 8) };
  } else {
    assets = { assetBase: RELEASE_ASSET_BASE, assetVersion: '' };
  }

  cache.set(base, assets);
  return assets;
}
