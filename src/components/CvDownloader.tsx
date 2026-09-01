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

export function getCvAssetPath(cvLang: string, preset: CvPreset, includePhoto: boolean) {
  const photoMode = includePhoto ? 'photo' : 'no-photo';
  return {
    href: `/cv/cv_${cvLang}_${preset}_${photoMode}.pdf`,
    filename: `cv_${cvLang}.pdf`,
  };
}

export function getCvPresetDescription(descriptions: Record<CvPreset, string>, preset: CvPreset) {
  return descriptions[preset];
}

export default function CvDownloader({ lang, labels }: Props) {
  const [preset, setPreset] = useState<CvPreset>('standard');
  const [includePhoto, setIncludePhoto] = useState(true);

  const cvLang = CV_LANG_BY_LOCALE[lang];
  const asset = getCvAssetPath(cvLang, preset, includePhoto);
  const href = `${baseStem}${asset.href}`;

  const formId = useId();

  return (
    <div className="cv-dl">
      <style>{CV_DL_STYLES}</style>
      <h3 className="cv-dl-title">
        <DownloadIcon />
        <span>{labels.title}</span>
      </h3>

      <div className="cv-dl-options">
        <label className="cv-dl-field" htmlFor={`${formId}-preset`}>
          <span>{labels.preset}</span>
          <select
            id={`${formId}-preset`}
            aria-describedby={`${formId}-preset-description`}
            value={preset}
            onChange={(event) => setPreset(event.target.value as CvPreset)}
          >
            {CV_PRESETS.map(({ id }) => (
              <option key={id} value={id}>
                {labels.presets[id]}
              </option>
            ))}
          </select>
          <span
            id={`${formId}-preset-description`}
            className="cv-dl-description"
            aria-live="polite"
          >
            {getCvPresetDescription(labels.presetDescriptions, preset)}
          </span>
        </label>
        <Toggle
          id={`${formId}-photo`}
          label={labels.includePhoto}
          checked={includePhoto}
          onChange={setIncludePhoto}
        />
      </div>

      <a
        className="cv-dl-btn"
        href={href}
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
    gap: 1.25rem;
    padding: 1.25rem 1.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    max-width: 28rem;
    transition: border-color var(--transition-base);
  }
  .cv-dl:focus-within {
    border-color: var(--border-color-hover);
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
  }
  .cv-dl-title svg {
    color: var(--accent-text);
    flex: 0 0 auto;
    width: 1.1rem;
    height: 1.1rem;
  }

  .cv-dl-options { display: grid; gap: 0.9rem; }
  .cv-dl-field { display: grid; gap: 0.35rem; color: var(--text-secondary); font-size: 0.9rem; }
  .cv-dl-field select {
    min-height: 2.5rem;
    padding: 0.45rem 0.65rem;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font: inherit;
  }
  .cv-dl-field select:focus-visible { outline: 2px solid var(--accent-start); outline-offset: 2px; }
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
    width: 1.05rem;
    height: 1.05rem;
    border-radius: var(--radius-full, 9999px);
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
    left: 50%;
    top: 50%;
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: #fff;
    transform: translate(-50%, -50%) translateX(-0.25rem);
    transition: transform var(--transition-fast);
  }
  .cv-dl-input:checked + .cv-dl-box::after {
    transform: translate(-50%, -50%) translateX(0.25rem);
  }
  .cv-dl-input:checked ~ .cv-dl-label {
    color: var(--text-primary);
  }

  .cv-dl-label { line-height: 1.3; }

  .cv-dl-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.4rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
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
    color: var(--accent-text);
    border-color: var(--accent-text);
    background: rgba(129, 140, 248, 0.08);
  }
  .cv-dl-btn:active { transform: translateY(1px); }
`;
