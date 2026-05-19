import en from '../../../locales/en/grafics-demo.json';
import es from '../../../locales/es/grafics-demo.json';
import ca from '../../../locales/ca/grafics-demo.json';

export const T = { en, es, ca } as const;

export type DemoTranslations = typeof en;
