import en from '../../../locales/en/caim-zipf.json';
import es from '../../../locales/es/caim-zipf.json';
import ca from '../../../locales/ca/caim-zipf.json';

export const T = { en, es, ca } as const;

export type DemoTranslations = typeof en;
