import { useId, useState } from 'react';

type Lang = 'en' | 'es' | 'ca';
export type CvPreset = 'standard' | 'technical' | 'complete' | 'concise';

export const CV_PRESETS: ReadonlyArray<{ id: CvPreset }> = [
  { id: 'standard' },
  { id: 'technical' },
  { id: 'complete' },
  { id: 'concise' },
];

interface Props {
  lang: Lang;
  assetBase?: string;
  assetVersion: string;
  labels: {
    title: string;
    preset: string;
    presets: Record<CvPreset, string>;
    presetDescriptions: Record<CvPreset, string>;
    includePhoto: string;
    download: string;
  };
}

// Portfolio locale code -> cv repo filename slug. The cv repo uses full
// language names; the portfolio uses ISO-639-1 short codes. Keep this
// mapping aligned with .github/workflows/deploy.yml's fetch loop.
const CV_LANG_BY_LOCALE: Record<Lang, string> = {
  en: 'english',
  es: 'spanish',
  ca: 'catalan',
};

const basePath =
  typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL != null
    ? import.meta.env.BASE_URL
    : '/';

// Strip trailing slash so we can interpolate without doubling: `${basePath}/x`
// becomes `/x` when basePath is '/' and `/portfolio/x` when basePath is
// `/portfolio/`.
const baseStem = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

export function getCvAssetPath(
  cvLang: string,
  preset: CvPreset,
  includePhoto: boolean,
  assetVersion: string,
  assetBase = '/cv'
) {
  const photoMode = includePhoto ? 'photo' : 'no-photo';
  const assetName = `cv_${cvLang}_${preset}_${photoMode}.pdf`;
  const normalizedBase = assetBase.replace(/\/$/, '');
  const version = assetVersion ? `?v=${encodeURIComponent(assetVersion)}` : '';
  return {
    href: `${normalizedBase}/${assetName}${version}`,
    filename: assetName,
  };
}

export function getCvPresetDescription(descriptions: Record<CvPreset, string>, preset: CvPreset) {
  return descriptions[preset];
}

export default function CvDownloader({ lang, assetBase, assetVersion, labels }: Props) {
  const [preset, setPreset] = useState<CvPreset>('standard');
  const [includePhoto, setIncludePhoto] = useState(true);

  const cvLang = CV_LANG_BY_LOCALE[lang];
  const asset = getCvAssetPath(
    cvLang,
    preset,
    includePhoto,
    assetVersion,
    assetBase ?? `${baseStem}/cv`
  );

  const formId = useId();

  return (
    <div className="cv-dl">
      <style>{CV_DL_STYLES}</style>
      <h3 className="cv-dl-title">
        <DownloadIcon />
        <span>{labels.title}</span>
      </h3>

      <div className="cv-dl-options">
        <div className="cv-dl-field">
          <span id={`${formId}-preset-label`} className="cv-dl-field-label">
            {labels.preset}
          </span>
          <div
            className="cv-dl-segments"
            role="radiogroup"
            aria-labelledby={`${formId}-preset-label`}
            aria-describedby={`${formId}-preset-description`}
          >
            {CV_PRESETS.map(({ id }) => (
              <label key={id} className="cv-dl-segment">
                <input
                  type="radio"
                  name={`${formId}-preset`}
                  value={id}
                  checked={preset === id}
                  onChange={() => setPreset(id)}
                />
                <span>{labels.presets[id]}</span>
              </label>
            ))}
          </div>
          <span
            id={`${formId}-preset-description`}
            className="cv-dl-description"
            aria-live="polite"
          >
            {getCvPresetDescription(labels.presetDescriptions, preset)}
          </span>
        </div>
        <Toggle
          id={`${formId}-photo`}
          label={labels.includePhoto}
          checked={includePhoto}
          onChange={setIncludePhoto}
        />
      </div>

      <a
        className="cv-dl-btn"
        href={asset.href}
        download={asset.filename}
        target="_blank"
        rel="noopener noreferrer"
      >
        <DownloadIcon />
        <span>{labels.download}</span>
      </a>
    </div>
  );
}

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <label htmlFor={id} className="cv-dl-opt">
      <input
        id={id}
        type="checkbox"
        className="cv-dl-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="cv-dl-box" aria-hidden="true" />
      <span className="cv-dl-label">{label}</span>
    </label>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

const CV_DL_STYLES = `
  .cv-dl {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: min(100%, 42rem);
    max-width: 42rem;
    padding: 0;
    background: color-mix(in srgb, var(--bg-card) 72%, transparent);
    border-top: 2px solid var(--accent-text);
    border-bottom: 1px solid var(--border-color);
    border-radius: 0;
    box-shadow: none;
    transition:
      border-color var(--transition-base),
      background var(--transition-base);
  }
  .cv-dl:focus-within {
    border-color: var(--accent-text);
  }

  .cv-dl-title {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
    padding: 0.9rem 0;
    border-bottom: 1px solid var(--border-color);
  }
  .cv-dl-title svg {
    color: var(--accent-text);
    flex: 0 0 auto;
    width: 1.1rem;
    height: 1.1rem;
  }

  .cv-dl-options {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(9rem, auto);
    gap: 1rem;
    align-items: start;
    padding: 1rem 0;
  }
  .cv-dl-field { display: grid; gap: 0.4rem; color: var(--text-secondary); font-size: 0.82rem; }
  .cv-dl-field-label {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  .cv-dl-segments {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    padding: 1px;
    background: var(--border-color);
    border: 1px solid var(--border-color);
  }
  .cv-dl-segment {
    position: relative;
    min-width: 0;
    cursor: pointer;
  }
  .cv-dl-segment input {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .cv-dl-segment span {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.35rem;
    padding: 0.45rem 0.6rem;
    color: var(--text-secondary);
    background: var(--bg-secondary);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    text-align: center;
    transition:
      color var(--transition-fast),
      background var(--transition-fast),
      box-shadow var(--transition-fast);
  }
  .cv-dl-segment:hover span {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--accent-start) 8%, var(--bg-secondary));
  }
  .cv-dl-segment input:checked + span {
    color: var(--accent-text);
    background: color-mix(in srgb, var(--accent-start) 14%, var(--bg-secondary));
    box-shadow: inset 0 -2px 0 var(--accent-text);
  }
  .cv-dl-segment input:focus-visible + span {
    outline: 2px solid var(--accent-start);
    outline-offset: -2px;
  }
  .cv-dl-description {
    color: var(--text-muted, var(--text-secondary));
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .cv-dl-opt {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    cursor: pointer;
    user-select: none;
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-top: 1.55rem;
    transition: color var(--transition-fast);
  }
  .cv-dl-opt:hover { color: var(--text-primary); }

  .cv-dl-input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
  .cv-dl-box {
    flex: 0 0 auto;
    width: 2.1rem;
    height: 1.15rem;
    border-radius: 999px;
    border: 1.5px solid var(--border-color-hover);
    background: transparent;
    position: relative;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
  }
  .cv-dl-opt:hover .cv-dl-box {
    border-color: var(--accent-text);
  }
  .cv-dl-input:focus-visible + .cv-dl-box {
    outline: 2px solid var(--accent-start);
    outline-offset: 2px;
  }
  .cv-dl-input:checked + .cv-dl-box {
    background: var(--accent-gradient);
    border-color: transparent;
  }
  .cv-dl-box::after {
    content: '';
    position: absolute;
    left: 0.18rem;
    top: 50%;
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
    background: var(--text-secondary);
    transform: translateY(-50%);
    transition:
      background var(--transition-fast),
      transform var(--transition-fast);
  }
  .cv-dl-input:checked + .cv-dl-box::after {
    background: #fff;
    transform: translate(0.9rem, -50%);
  }
  .cv-dl-input:checked ~ .cv-dl-label {
    color: var(--text-primary);
  }

  .cv-dl-label { line-height: 1.3; }

  .cv-dl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    margin-bottom: 1rem;
    padding: 0.7rem 1.15rem;
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 0.78rem;
    color: var(--demo-action-color);
    background: var(--demo-action-bg);
    border: 1px solid var(--accent-text);
    border-radius: 0;
    text-decoration: none;
    align-self: flex-start;
    cursor: pointer;
    transition:
      color var(--transition-base),
      border-color var(--transition-base),
      background var(--transition-base),
      transform var(--transition-fast);
  }
  .cv-dl-btn:hover {
    color: var(--demo-action-color);
    filter: brightness(1.12);
    transform: translateY(-1px);
  }
  .cv-dl-btn:active { transform: translateY(1px); }
  .cv-dl-btn:focus-visible {
    outline: 2px solid var(--accent-text);
    outline-offset: 3px;
  }

  @media (max-width: 560px) {
    .cv-dl-options { grid-template-columns: 1fr; }
    .cv-dl-opt { margin-top: 0; }
    .cv-dl-btn { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .cv-dl,
    .cv-dl-box,
    .cv-dl-btn { transition: none; }
  }
`;
