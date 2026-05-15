/**
 * Validated loaders for the localized content JSON files. Each import here
 * parses its file against the Zod schema in src/i18n/content-schemas.ts at
 * module-load time — a malformed entry fails the build (and the dev server)
 * instead of surfacing later as a runtime crash or silent UI miss.
 *
 * Components should import from here rather than directly from
 * `../data/<file>.json`.
 */
import skillsRaw from './skills.json' with { type: 'json' };
import workProjectsRaw from './work_projects.json' with { type: 'json' };
import educationRaw from './education.json' with { type: 'json' };
import certificationsRaw from './certifications.json' with { type: 'json' };

import {
  SkillsFileSchema,
  WorkProjectsFileSchema,
  EducationFileSchema,
  CertificationsFileSchema,
} from '../i18n/content-schemas';
import type { AnyLocalized } from '../i18n/load';

// Parsing here once at module load; the result is the runtime-validated data
// that downstream components and tests should consume. The cast back to
// `AnyLocalized[]` keeps existing callers (`flattenForLocale`, etc.) compiling
// without a follow-up refactor.
export const skills: AnyLocalized[] = SkillsFileSchema.parse(skillsRaw) as AnyLocalized[];
export const workProjects: AnyLocalized[] = WorkProjectsFileSchema.parse(
  workProjectsRaw
) as AnyLocalized[];
export const education: AnyLocalized[] = EducationFileSchema.parse(educationRaw) as AnyLocalized[];
export const certifications: AnyLocalized[] = CertificationsFileSchema.parse(
  certificationsRaw
) as AnyLocalized[];
