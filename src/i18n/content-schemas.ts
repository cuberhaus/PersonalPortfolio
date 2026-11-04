import { z } from 'zod';
import { ICON_PATHS } from '../lib/demo-icons';
import { ISSUERS } from '../lib/issuer-icons';

const iconNames = Object.keys(ICON_PATHS) as [string, ...string[]];
const issuerNames = Object.keys(ISSUERS) as [string, ...string[]];

// Empty string is treated as "no link" (matches existing data conventions
// where an unset link is sometimes serialised as `""` rather than omitted).
const httpsUrl = z
  .string()
  .refine((s) => s === '' || /^https:\/\//.test(s), { message: 'Must be an https:// URL' });

const imageUrl = z
  .string()
  .refine(
    (s) => /^https:\/\//.test(s) || /^\/certifications\/[^?#]+\.(png|jpg|jpeg|webp)$/i.test(s),
    { message: 'Must be an https:// URL or a /certifications/*.{png,jpg,jpeg,webp} path' }
  );

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

// ─── videos.json (identity-only) ────────────────────────────────
// A video belongs to a project, so an entry is keyed by the project's demo slug and
// holds only the film itself: the title, stack, links and event stay in the demo
// registry (one source of truth). `video` and `poster` are served from
// `public/videos/` under the demo's slug. `music` is the required CC BY credit: the
// page prints it next to the video, so an entry without one does not parse.

const videoAsset = (extension: string) =>
  z.string().regex(new RegExp(`^/videos/[a-z0-9-]+\\.${extension}$`));

export const VideosFileSchema = z.array(
  z
    .object({
      demo: z.string().regex(/^[a-z0-9-]+$/),
      video: videoAsset('mp4'),
      poster: videoAsset('webp'),
      seconds: z.number().int().positive().max(120),
      music: z.object({
        title: z.string().min(1),
        artist: z.string().min(1),
        artistUrl: z.string().regex(/^https:\/\//),
        license: z.string().min(1),
        licenseUrl: z.string().regex(/^https:\/\//),
      }),
      ...visibility,
    })
    .refine((v) => v.video === `/videos/${v.demo}.mp4` && v.poster === `/videos/${v.demo}.webp`, {
      message: 'video and poster must be /videos/<demo>.mp4 and /videos/<demo>.webp',
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
// Each entry: { name, issuer, link?, fallback?, badgeImage?, badgeImageFallback? }

export const CertificationsFileSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      displayOrder: z.number().int().positive(),
      name: z.string().min(1),
      issuer: z.enum(issuerNames),
      link: credentialUrl.optional(),
      fallback: z.string().optional(),
      badgeImage: imageUrl.optional(),
      badgeImageFallback: imageUrl.optional(),
      ...visibility,
    })
  )
  .superRefine((certifications, context) => {
    const seenIds = new Set<string>();
    const seenDisplayOrders = new Set<number>();
    certifications.forEach((certification, index) => {
      if (seenIds.has(certification.id)) {
        context.addIssue({
          code: 'custom',
          message: `duplicate certification id: ${certification.id}`,
          path: [index, 'id'],
        });
      }
      if (seenDisplayOrders.has(certification.displayOrder)) {
        context.addIssue({
          code: 'custom',
          message: `duplicate certification displayOrder: ${certification.displayOrder}`,
          path: [index, 'displayOrder'],
        });
      }
      seenIds.add(certification.id);
      seenDisplayOrders.add(certification.displayOrder);
    });
  });
