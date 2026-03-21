import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const path = url.pathname;
  for (const lang of Object.keys(ui)) {
    if (path.includes(`/${lang}/`) || path.endsWith(`/${lang}`)) {
      return lang as keyof typeof ui;
    }
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
  const basePath = import.meta.env.BASE_URL;
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