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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem',
        border: '1px solid var(--border, rgba(127,127,127,0.3))',
        borderRadius: '0.5rem',
        background: 'var(--surface, transparent)',
        maxWidth: '28rem',
      }}
    >
      <div>
        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
          {labels.sectionsTitle}
        </strong>
        <small style={{ opacity: 0.75 }}>{labels.sectionsHint}</small>
      </div>

      <fieldset
        style={{
          border: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '0.4rem 1rem',
        }}
      >
        <legend className="sr-only">{labels.sectionsTitle}</legend>
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
        href={href}
        download={`cv_${cvLang}_${toggles}.pdf`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), linear-gradient(135deg, var(--accent-start), var(--accent-end))`,
          color: '#fff',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: 600,
          textDecoration: 'none',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        <DownloadIcon />
        {labels.download}
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
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: 'pointer' }}
      />
      <span>{label}</span>
    </label>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
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
