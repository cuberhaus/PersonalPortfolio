import en from '../../../locales/en/par-demo.json';
import es from '../../../locales/es/par-demo.json';
import ca from '../../../locales/ca/par-demo.json';

export const T = { en, es, ca } as const;

export type DemoTranslations = typeof en;
