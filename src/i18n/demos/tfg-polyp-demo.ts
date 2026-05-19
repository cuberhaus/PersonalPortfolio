import en from '../../../locales/en/tfg-polyp-demo.json';
import es from '../../../locales/es/tfg-polyp-demo.json';
import ca from '../../../locales/ca/tfg-polyp-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
