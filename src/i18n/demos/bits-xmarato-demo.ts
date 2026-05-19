import en from '../../../locales/en/bits-xmarato-demo.json';
import es from '../../../locales/es/bits-xmarato-demo.json';
import ca from '../../../locales/ca/bits-xmarato-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
