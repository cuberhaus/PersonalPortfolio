import { describe, expect, it } from 'vitest';
import { CV_PRESETS, getCvAssetPath } from '../components/CvDownloader';

describe('CV downloader assets', () => {
  it('defaults to the standard photo asset and a stable language-only filename', () => {
    expect(getCvAssetPath('english', 'standard', true)).toEqual({
      href: '/cv/cv_english_standard_photo.pdf',
      filename: 'cv_english.pdf',
    });
  });

  it('changes content path independently for each preset and photo mode', () => {
    expect(CV_PRESETS.map((preset) => preset.id)).toEqual([
      'standard',
      'technical',
      'complete',
      'concise',
    ]);
    expect(getCvAssetPath('catalan', 'technical', false)).toEqual({
      href: '/cv/cv_catalan_technical_no-photo.pdf',
      filename: 'cv_catalan.pdf',
    });
  });
});
