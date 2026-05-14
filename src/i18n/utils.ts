import { ui, defaultLang } from './ui';

export type Lang = keyof typeof ui;

/**
 * Validate an arbitrary string (e.g. `document.documentElement.lang`) and
 * return a `Lang` known to the `ui` dictionary, falling back to `defaultLang`
 * for unknown / missing input. Shared by Astro components and any browser
 * scripts that need to relabel UI from the current page locale.
 */
export function pickLang(raw: string | null | undefined): Lang {
  if (raw && raw in ui) return raw as Lang;
  return defaultLang;
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

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
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
  if (parts.length > 1 && parts[1] in ui) {
    parts.splice(1, 1);
  }
  return parts.join('/') || '/';
}
