/**
 * Single source of truth for certification issuer icon SVG inner content.
 * Keys must match the `issuerIcon` field in certifications.json.
 *
 * Each value is the inner content of a 24×24 SVG. The wrapper is provided by
 * `renderIssuerIconSvg()` and defaults to `fill="none" stroke="currentColor"`,
 * matching the convention in `demo-icons.ts`. Brand marks that need filled
 * shapes override `fill`/`stroke` per element so the icons remain monochrome
 * and theme-friendly across every entry in `designs.css`.
 *
 * Sourcing notes:
 *   - microsoft / nvidia / oracle: optimised single-path marks adapted from
 *     Simple Icons (https://simpleicons.org). Markup is CC0; the brand
 *     trademarks remain owned by their respective companies — used here to
 *     credit the issuer of each certification, which is standard fair use.
 *   - stratio / universal-robots: not on Simple Icons, hand-authored abstract
 *     glyphs that are visually distinct from the other issuers.
 *   - medal: generic fallback for any future cert without a registered logo.
 */
export const ISSUER_ICON_PATHS: Record<string, string> = {
  microsoft:
    '<path d="M11.4 24H0V12.6h11.4zM24 24H12.6V12.6H24zM11.4 11.4H0V0h11.4zm12.6 0H12.6V0H24z" fill="currentColor" stroke="none"/>',
  nvidia:
    '<path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851a3.93 3.93 0 0 1-1.167-.185v-4.346c1.524.185 1.831.857 2.744 2.385l2.034-1.714s-1.485-1.95-3.99-1.95a6.343 6.343 0 0 0-.788.034m0-4.726v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.085 4.964-8.332 4.964c-.379 0-.738-.035-1.075-.097v1.325c.288.035.586.062.901.062 3.954 0 6.811-2.02 9.578-4.408.459.371 2.336 1.264 2.723 1.66-2.63 2.202-8.754 3.978-12.24 3.978-.337 0-.66-.018-.978-.053v1.864H22V4.072zm0 10.314v1.131c-3.658-.652-4.673-4.456-4.673-4.456s1.755-1.945 4.673-2.26v1.24h-.005c-1.532-.185-2.732 1.247-2.732 1.247s.682 2.443 2.737 3.098M2 11.069s2.165-3.197 6.957-3.561v-1.29C3.654 6.642 0 11.069 0 11.069s2.07 5.988 8.948 6.635v-1.371C3.901 16.704 2 11.069 2 11.069z" fill="currentColor" stroke="none"/>',
  oracle:
    '<path d="M16.412 4.412h-8.82A7.588 7.588 0 0 0 0 12a7.588 7.588 0 0 0 7.591 7.588h8.82A7.588 7.588 0 0 0 24 12a7.588 7.588 0 0 0-7.588-7.588zm-.176 12.65H7.764a5.062 5.062 0 1 1 0-10.124h8.473a5.062 5.062 0 1 1 0 10.124z" fill="currentColor" stroke="none"/>',
  stratio:
    '<path d="M3 6h12M5 12h14M7 18h12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  'universal-robots':
    '<path d="M9 4h6a2 2 0 0 1 2 2v2H7V6a2 2 0 0 1 2-2zM7 8h10v6H7zM5 16h14M5 16v4M19 16v4M12 14v2"/><circle cx="12" cy="11" r="1.5" fill="currentColor" stroke="none"/>',
  medal:
    '<circle cx="12" cy="9" r="6"/><path d="M8 14l-2 7 6-3 6 3-2-7"/>',
};

export function renderIssuerIconSvg(icon: string, size: number): string {
  const inner = ISSUER_ICON_PATHS[icon] ?? ISSUER_ICON_PATHS.medal;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
