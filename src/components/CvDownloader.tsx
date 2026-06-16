// CV download with section toggles.
//
// Renders 4 checkboxes (skills, projects, extracurricular, certifications)
// and a download button. The button's href is computed live from the toggle
// state and points at one of the 48 pre-built variants in public/cv/
// (cv_<lang>_<cepsbits>.pdf, where each bit toggles certifications /
// extracurricular / projects / skills, left-to-right). summary, education
// and experience are always-on (not toggleable; baked into every variant).
//
// Variants are fetched in .github/workflows/deploy.yml from the
// cuberhaus/cv release. See cv repo AGENTS.md for the build mechanism.
//
// Default toggles ('0111' = skills+projects+extracurricular, no
// certifications) match the canonical CV behaviour pre-toggle.
import { useId, useState } from 'react';

type Lang = 'en' | 'es' | 'ca';

interface Props {
  lang: Lang;
  labels: {
    title: string;
    sectionsTitle: string;
    sectionsHint: string;
    skills: string;
    projects: string;
    extracurricular: string;
    certifications: string;
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

export default function CvDownloader({ lang, labels }: Props) {
  const [skills, setSkills] = useState(true);
  const [projects, setProjects] = useState(true);
  const [extracurricular, setExtracurricular] = useState(true);
  const [certifications, setCertifications] = useState(false);

  const cvLang = CV_LANG_BY_LOCALE[lang];
  // Bit order: c, e, p, s (matches cv repo's filename convention).
  const toggles =
    (certifications ? '1' : '0') +
    (extracurricular ? '1' : '0') +
    (projects ? '1' : '0') +
    (skills ? '1' : '0');
  const href = `${baseStem}/cv/cv_${cvLang}_${toggles}.pdf`;

  const formId = useId();

  return (
    <div className="cv-dl">
      <style>{CV_DL_STYLES}</style>
      <div className="cv-dl-head">
        <h3 className="cv-dl-title">
          <DownloadIcon />
          <span>{labels.title}</span>
        </h3>
        <p className="cv-dl-hint">{labels.sectionsHint}</p>
      </div>

      <fieldset className="cv-dl-options" aria-label={labels.sectionsTitle}>
        <Toggle
          id={`${formId}-skills`}
          label={labels.skills}
          checked={skills}
          onChange={setSkills}
        />
        <Toggle
          id={`${formId}-projects`}
          label={labels.projects}
          checked={projects}
          onChange={setProjects}
        />
        <Toggle
          id={`${formId}-extracurricular`}
          label={labels.extracurricular}
          checked={extracurricular}
          onChange={setExtracurricular}
        />
        <Toggle
          id={`${formId}-certifications`}
          label={labels.certifications}
          checked={certifications}
          onChange={setCertifications}
        />
      </fieldset>

      <a
        className="cv-dl-btn"
        href={href}
        download={`cv_${cvLang}_${toggles}.pdf`}
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

  .cv-dl-head {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
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
  .cv-dl-hint {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .cv-dl-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem 1.25rem;
    border: none;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  @media (max-width: 480px) {
    .cv-dl-options { grid-template-columns: 1fr; }
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
    border-radius: 4px;
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
    top: 45%;
    width: 0.32rem;
    height: 0.6rem;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: translate(-50%, -50%) rotate(45deg) scale(0);
    transition: transform var(--transition-fast);
  }
  .cv-dl-input:checked + .cv-dl-box::after {
    transform: translate(-50%, -50%) rotate(45deg) scale(1);
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
