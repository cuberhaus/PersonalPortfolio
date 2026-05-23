import { LOCALES, DEFAULT_LOCALE, type Locale } from '../config/locales';
import { getFixedT } from './i18next';

export type Lang = Locale;

const supportedSet = new Set<string>(LOCALES);

/**
 * Validate an arbitrary string (e.g. `document.documentElement.lang`) and
 * return a `Lang` known to the `ui` dictionary, falling back to `defaultLang`
 * for unknown / missing input. Shared by Astro components and any browser
 * scripts that need to relabel UI from the current page locale.
 */
export function pickLang(raw: string | null | undefined): Lang {
  if (raw && supportedSet.has(raw)) return raw as Lang;
  return DEFAULT_LOCALE;
}

export function getLangFromUrl(url: URL): Lang {
  const basePath = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL;
  let path = url.pathname;
  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  if (!path.startsWith('/')) path = '/' + path;
  // Only check the first path segment (e.g. "/es/..." → "es")
  const firstSegment = path.split('/')[1];
  return pickLang(firstSegment);
}

export function useTranslations(lang: Lang) {
  const t = getFixedT(lang);
  return function (key: string) {
    return t(key);
  };
}

export function getRouteFromUrl(url: URL): string {
  const path = url.pathname;
  const basePath = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL;
  let cleanPath = path;
  if (basePath && basePath !== '/' && path.startsWith(basePath)) {
    cleanPath = path.slice(basePath.length);
  }
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

  const parts = cleanPath.split('/');
  if (parts.length > 1 && supportedSet.has(parts[1])) {
    parts.splice(1, 1);
  }
  return parts.join('/') || '/';
}
