import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CV_PRESETS, getCvAssetPath, getCvPresetDescription } from '../components/CvDownloader';
import CvDownloader from '../components/CvDownloader';

const labels = {
  title: 'Download CV',
  preset: 'CV version',
  presets: {
    standard: 'Standard',
    technical: 'Technical',
    complete: 'Complete',
    concise: 'Concise',
  },
  presetDescriptions: {
    standard: 'Balanced overview',
    technical: 'Projects and skills',
    complete: 'All available sections',
    concise: 'Core experience and skills',
  },
  includePhoto: 'Include portrait',
  download: 'Download PDF',
};

describe('CV downloader assets', () => {
  it('renders presets as an accessible segmented control', () => {
    const markup = renderToStaticMarkup(
      createElement(CvDownloader, { lang: 'en', assetVersion: 'abc123', labels })
    );

    expect(markup).toContain('role="radiogroup"');
    expect(markup.match(/type="radio"/g)).toHaveLength(CV_PRESETS.length);
    expect(markup).not.toContain('<select');
  });

  it('cache-busts the selected asset and preserves its variant in the filename', () => {
    expect(getCvAssetPath('english', 'standard', true, 'abc123')).toEqual({
      href: '/cv/cv_english_standard_photo.pdf?v=abc123',
      filename: 'cv_english_standard_photo.pdf',
    });
  });

  it('changes content path independently for each preset and photo mode', () => {
    expect(CV_PRESETS.map((preset) => preset.id)).toEqual([
      'standard',
      'technical',
      'complete',
      'concise',
    ]);
    expect(getCvAssetPath('catalan', 'technical', false, 'def456')).toEqual({
      href: '/cv/cv_catalan_technical_no-photo.pdf?v=def456',
      filename: 'cv_catalan_technical_no-photo.pdf',
    });
  });

  it('falls back to the official release assets when local PDFs are unavailable', () => {
    expect(
      getCvAssetPath(
        'spanish',
        'concise',
        false,
        '',
        'https://github.com/cuberhaus/cv/releases/latest/download'
      )
    ).toEqual({
      href: 'https://github.com/cuberhaus/cv/releases/latest/download/cv_spanish_concise_no-photo.pdf',
      filename: 'cv_spanish_concise_no-photo.pdf',
    });
  });

  it('explains the selected preset using localized copy', () => {
    const descriptions = {
      standard: 'Balanced overview',
      technical: 'Projects and skills',
      complete: 'All available sections',
      concise: 'Core experience and skills',
    };

    expect(getCvPresetDescription(descriptions, 'technical')).toBe('Projects and skills');
    expect(getCvPresetDescription(descriptions, 'complete')).toBe('All available sections');
  });
});
