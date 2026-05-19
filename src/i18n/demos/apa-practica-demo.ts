import en from '../../../locales/en/apa-practica-demo.json';
import es from '../../../locales/es/apa-practica-demo.json';
import ca from '../../../locales/ca/apa-practica-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
