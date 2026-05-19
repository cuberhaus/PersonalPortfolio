import en from '../../../locales/en/sbc-demo.json';
import es from '../../../locales/es/sbc-demo.json';
import ca from '../../../locales/ca/sbc-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
