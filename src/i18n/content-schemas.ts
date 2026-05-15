import { z } from 'zod';
import { localizedFileSchema } from './localized-schema';
import { ICON_PATHS } from '../lib/demo-icons';
import { ISSUER_ICON_PATHS } from '../lib/issuer-icons';

const iconNames = Object.keys(ICON_PATHS) as [string, ...string[]];
const issuerIconNames = Object.keys(ISSUER_ICON_PATHS) as [string, ...string[]];

// Empty string is treated as "no link" (matches existing data conventions
// where an unset link is sometimes serialised as `""` rather than omitted).
const httpsUrl = z
  .string()
  .refine((s) => s === '' || /^https:\/\//.test(s), { message: 'Must be an https:// URL' });

// ─── skills.json ────────────────────────────────────────────────
// `{ identity: { items: string[] }, copy: { <locale>: { category: string } } }`

const SkillIdentity = z.object({
  items: z.array(z.string().min(1)).min(1),
});
const SkillCopy = z.object({
  category: z.string().min(1),
});
export const SkillsFileSchema = localizedFileSchema(SkillIdentity, SkillCopy);

// ─── work_projects.json ─────────────────────────────────────────
// `{ identity: { role, icon, link, fallback }, copy: { <locale>: { title, company, description, tags[] } } }`

const WorkProjectIdentity = z.object({
  role: z.string().min(1),
  icon: z.enum(iconNames),
  link: httpsUrl.optional(),
  fallback: z.string().optional(),
});
const WorkProjectCopy = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
});
export const WorkProjectsFileSchema = localizedFileSchema(WorkProjectIdentity, WorkProjectCopy);

// ─── education.json ─────────────────────────────────────────────
// `{ identity: { institution, link }, copy: { <locale>: { degree, location, period } } }`

const EducationIdentity = z.object({
  institution: z.string().min(1),
  link: httpsUrl.optional(),
});
const EducationCopy = z.object({
  degree: z.string().min(1),
  location: z.string().min(1),
  period: z.string().min(1),
});
export const EducationFileSchema = localizedFileSchema(EducationIdentity, EducationCopy);

// ─── certifications.json ────────────────────────────────────────
// `{ identity: { name, issuer, issuerIcon, link, fallback }, copy: { <locale>: { issued } } }`

const CertificationIdentity = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  issuerIcon: z.enum(issuerIconNames),
  link: httpsUrl.optional(),
  fallback: z.string().optional(),
});
const CertificationCopy = z.object({
  // Empty string is allowed: a few in-progress certs render with no issue
  // date until completed (the UI handles the empty case as a valid state).
  issued: z.string(),
});
export const CertificationsFileSchema = localizedFileSchema(
  CertificationIdentity,
  CertificationCopy
);
