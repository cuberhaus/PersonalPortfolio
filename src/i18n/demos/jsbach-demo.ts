import en from '../../../locales/en/jsbach-demo.json';
import es from '../../../locales/es/jsbach-demo.json';
import ca from '../../../locales/ca/jsbach-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
