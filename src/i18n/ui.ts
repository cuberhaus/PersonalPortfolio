import { DEFAULT_LOCALE, type Locale } from '../config/locales';
import { getAllLocalesForNamespace } from './locale-glob';

// `Record<Locale, string>` enforces a label for every locale at compile time,
// so adding a 4th locale in `src/config/locales.ts` makes this dictionary fail
// to type-check until the new label is added.
export const languages: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  ca: 'Català',
};

export const defaultLang: Locale = DEFAULT_LOCALE;

/**
 * Flat key-value dictionaries derived from locales/{locale}/ui.json.
 * Kept for backward-compat with client-side scripts (404/500 pages)
 * and tests that reference `ui[lang][key]` directly.
 */
export const ui = getAllLocalesForNamespace<Record<string, string>>('ui');
