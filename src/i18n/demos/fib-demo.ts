import en from '../../../locales/en/fib-demo.json';
import es from '../../../locales/es/fib-demo.json';
import ca from '../../../locales/ca/fib-demo.json';

export const T = { en, es, ca } as const;

export type DemoTranslations = typeof en;
