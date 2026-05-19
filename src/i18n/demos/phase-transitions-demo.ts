import en from '../../../locales/en/phase-transitions-demo.json';
import es from '../../../locales/es/phase-transitions-demo.json';
import ca from '../../../locales/ca/phase-transitions-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
