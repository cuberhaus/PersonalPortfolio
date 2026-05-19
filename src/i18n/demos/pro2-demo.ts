import en from '../../../locales/en/pro2-demo.json';
import es from '../../../locales/es/pro2-demo.json';
import ca from '../../../locales/ca/pro2-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
