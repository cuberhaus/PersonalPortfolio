import en from '../../../locales/en/tenda-demo.json';
import es from '../../../locales/es/tenda-demo.json';
import ca from '../../../locales/ca/tenda-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
