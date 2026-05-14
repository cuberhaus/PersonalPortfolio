/**
 * Single source of truth for personal-identity URLs and handles.
 *
 * Consumed by:
 *   - src/components/Contact.astro (social hrefs)
 *   - src/layouts/Layout.astro (schema.org `sameAs`)
 *   - astro.config.mjs (default `SITE` value — overridable by env var)
 *
 * Per-demo GitHub repos live in `src/data/demos.json` under each entry's
 * `github` field; demo pages should read that, not hard-code the URL.
 */
export const SITE = {
  url: 'https://polcasacubertagil.com',
  githubUser: 'cuberhaus',
  linkedinUser: 'polcasacubertagil',
  email: 'polcg10@gmail.com',
} as const;

export const SITE_URLS = {
  github: `https://github.com/${SITE.githubUser}`,
  linkedin: `https://linkedin.com/in/${SITE.linkedinUser}`,
  mailto: `mailto:${SITE.email}`,
} as const;

/** Helper to build the canonical GitHub URL for a per-project repo. */
export function githubRepoUrl(repo: string): string {
  return `https://github.com/${SITE.githubUser}/${repo}`;
}
