import en from '../../../locales/en/draculin-demo.json';
import es from '../../../locales/es/draculin-demo.json';
import ca from '../../../locales/ca/draculin-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
