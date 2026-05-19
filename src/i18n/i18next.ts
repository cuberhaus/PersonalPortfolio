import i18next from 'i18next';
import type { Locale } from '../config/locales';
import { LOCALES, DEFAULT_LOCALE } from '../config/locales';

import enUi from '../../locales/en/ui.json';
import esUi from '../../locales/es/ui.json';
import caUi from '../../locales/ca/ui.json';

const resources = {
  en: { ui: enUi },
  es: { ui: esUi },
  ca: { ui: caUi },
} as const;

i18next.init({
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...LOCALES],
  defaultNS: 'ui',
  ns: ['ui'],
  keySeparator: false, // keys are flat dotted strings like "nav.about"
  interpolation: { escapeValue: false }, // Astro handles escaping
  resources,
});

export { i18next };

export function getFixedT(lang: Locale) {
  return i18next.getFixedT(lang, 'ui');
}
