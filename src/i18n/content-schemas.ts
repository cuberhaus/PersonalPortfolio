import { z } from 'zod';
import { ICON_PATHS } from '../lib/demo-icons';
import { ISSUER_ICON_PATHS } from '../lib/issuer-icons';

const iconNames = Object.keys(ICON_PATHS) as [string, ...string[]];
const issuerIconNames = Object.keys(ISSUER_ICON_PATHS) as [string, ...string[]];

// Empty string is treated as "no link" (matches existing data conventions
// where an unset link is sometimes serialised as `""` rather than omitted).
const httpsUrl = z
  .string()
  .refine((s) => s === '' || /^https:\/\//.test(s), { message: 'Must be an https:// URL' });

const credentialUrl = z
  .string()
  .refine(
    (s) => s === '' || /^https:\/\//.test(s) || /^\/certifications\/[^?#]+\.(?:html|pdf)$/i.test(s),
    { message: 'Must be an https:// URL or a /certifications/*.html|pdf path' }
  );

const visibility = {
  hidden: z.boolean().optional(),
};

const SkillItemSchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    ...visibility,
  }),
]);

// ─── skills.json (identity-only) ────────────────────────────────
// Each entry: { items: string[] }

export const SkillsFileSchema = z.array(
  z.object({
    items: z.array(SkillItemSchema).min(1),
    ...visibility,
  })
);

// ─── work_projects.json (identity-only) ─────────────────────────
// Each entry: { role, icon, link?, fallback? }

export const WorkProjectsFileSchema = z.array(
  z.object({
    role: z.string().min(1),
    icon: z.enum(iconNames),
    link: httpsUrl.optional(),
    fallback: z.string().optional(),
    ...visibility,
  })
);

// ─── education.json (identity-only) ─────────────────────────────
// Each entry: { institution, link? }

export const EducationFileSchema = z.array(
  z.object({
    institution: z.string().min(1),
    link: httpsUrl.optional(),
    ...visibility,
  })
);

// ─── certifications.json (identity-only) ────────────────────────
// Each entry: { name, issuer, issuerIcon, link?, fallback? }

export const CertificationsFileSchema = z.array(
  z.object({
    name: z.string().min(1),
    issuer: z.string().min(1),
    issuerIcon: z.enum(issuerIconNames),
    link: credentialUrl.optional(),
    fallback: z.string().optional(),
    ...visibility,
  })
);
