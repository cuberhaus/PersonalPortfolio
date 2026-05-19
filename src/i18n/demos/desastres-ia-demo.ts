import en from '../../../locales/en/desastres-ia-demo.json';
import es from '../../../locales/es/desastres-ia-demo.json';
import ca from '../../../locales/ca/desastres-ia-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
