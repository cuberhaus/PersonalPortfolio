/**
 * Validated loaders for the localized content JSON files. Data files now
 * contain identity-only arrays; translations live in locales/{locale}/.
 *
 * Components should import from here rather than directly from
 * `../data/<file>.json`.
 */
import skillsRaw from './skills.json' with { type: 'json' };
import workProjectsRaw from './work_projects.json' with { type: 'json' };
import educationRaw from './education.json' with { type: 'json' };
import certificationsRaw from './certifications.json' with { type: 'json' };
import experienceRaw from './experience.json' with { type: 'json' };

// Locale translation files
import skillsEn from '../../locales/en/skills.json';
import skillsEs from '../../locales/es/skills.json';
import skillsCa from '../../locales/ca/skills.json';
import workProjectsEn from '../../locales/en/work_projects.json';
import workProjectsEs from '../../locales/es/work_projects.json';
import workProjectsCa from '../../locales/ca/work_projects.json';
import educationEn from '../../locales/en/education.json';
import educationEs from '../../locales/es/education.json';
import educationCa from '../../locales/ca/education.json';
import certificationsEn from '../../locales/en/certifications.json';
import certificationsEs from '../../locales/es/certifications.json';
import certificationsCa from '../../locales/ca/certifications.json';
import experienceEn from '../../locales/en/experience.json';
import experienceEs from '../../locales/es/experience.json';
import experienceCa from '../../locales/ca/experience.json';

import type { Locale } from '../config/locales';

type TranslationMap = Record<string, Record<string, unknown>>;

export const skills = skillsRaw as Record<string, unknown>[];
export const workProjects = workProjectsRaw as Record<string, unknown>[];
export const education = educationRaw as Record<string, unknown>[];
export const certifications = certificationsRaw as Record<string, unknown>[];
export const experience = experienceRaw as Record<string, unknown>[];

const translationsByFile: Record<string, Record<Locale, TranslationMap>> = {
  skills: { en: skillsEn, es: skillsEs, ca: skillsCa },
  workProjects: { en: workProjectsEn, es: workProjectsEs, ca: workProjectsCa },
  education: { en: educationEn, es: educationEs, ca: educationCa },
  certifications: { en: certificationsEn, es: certificationsEs, ca: certificationsCa },
  experience: { en: experienceEn, es: experienceEs, ca: experienceCa },
};

export function getTranslations(file: string, locale: Locale): TranslationMap {
  return translationsByFile[file]?.[locale] ?? translationsByFile[file]?.en ?? {};
}
