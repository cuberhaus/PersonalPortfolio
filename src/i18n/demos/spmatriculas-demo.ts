import en from '../../../locales/en/spmatriculas-demo.json';
import es from '../../../locales/es/spmatriculas-demo.json';
import ca from '../../../locales/ca/spmatriculas-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
