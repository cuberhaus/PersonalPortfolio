import en from '../../../locales/en/caim-demo.json';
import es from '../../../locales/es/caim-demo.json';
import ca from '../../../locales/ca/caim-demo.json';

export const T = { en, es, ca } as const;

export type DemoTranslations = typeof en;
