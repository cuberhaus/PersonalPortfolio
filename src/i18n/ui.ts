import { DEFAULT_LOCALE, type Locale } from '../config/locales';
import { flattenDottedKeys, fromLocaleGlob } from './locale-bundle';

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
 * Uses a scoped glob so client scripts (404/500) only bundle `ui.json`
 * rather than every demo namespace.
 */
const nestedUi = fromLocaleGlob<Record<string, unknown>>(
  import.meta.glob<Record<string, unknown>>('../../locales/*/ui.json', {
    eager: true,
    import: 'default',
  })
);

export const ui = Object.fromEntries(
  Object.entries(nestedUi).map(([locale, messages]) => [
    locale,
    flattenDottedKeys(messages) as Record<string, string>,
  ])
) as Record<Locale, Record<string, string>>;
