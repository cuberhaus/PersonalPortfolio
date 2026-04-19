import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const basePath = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL;
  let path = url.pathname;
  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  if (!path.startsWith('/')) path = '/' + path;
  // Only check the first path segment (e.g. "/es/..." → "es")
  const firstSegment = path.split('/')[1];
  if (firstSegment && firstSegment in ui) {
    return firstSegment as keyof typeof ui;
  }
  return defaultLang;
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
