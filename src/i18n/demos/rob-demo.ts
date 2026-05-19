import en from '../../../locales/en/rob-demo.json';
import es from '../../../locales/es/rob-demo.json';
import ca from '../../../locales/ca/rob-demo.json';

export const T = { en, es, ca } as const;

export type DemoTranslations = typeof en;
