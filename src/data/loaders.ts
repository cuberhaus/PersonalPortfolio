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

import type { Locale } from '../config/locales';
import { DEFAULT_LOCALE } from '../config/locales';
import { getDataTranslations } from '../i18n/locale-glob';

type TranslationMap = Record<string, Record<string, unknown>>;

export const skills = skillsRaw as Record<string, unknown>[];
export const workProjects = workProjectsRaw as Record<string, unknown>[];
export const education = educationRaw as Record<string, unknown>[];
export const certifications = certificationsRaw as Record<string, unknown>[];
export const experience = experienceRaw as Record<string, unknown>[];

/** Map from loader name to the JSON filename in locales/ */
const FILE_NAMES: Record<string, string> = {
  skills: 'skills',
  workProjects: 'work_projects',
  education: 'education',
  certifications: 'certifications',
  experience: 'experience',
};

export function getTranslations(file: string, locale: Locale): TranslationMap {
  const ns = FILE_NAMES[file] ?? file;
  return getDataTranslations(ns, locale) ?? getDataTranslations(ns, DEFAULT_LOCALE) ?? {};
}
