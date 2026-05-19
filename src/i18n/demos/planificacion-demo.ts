import en from '../../../locales/en/planificacion-demo.json';
import es from '../../../locales/es/planificacion-demo.json';
import ca from '../../../locales/ca/planificacion-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
