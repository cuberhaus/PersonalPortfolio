import en from '../../../locales/en/mpids-demo.json';
import es from '../../../locales/es/mpids-demo.json';
import ca from '../../../locales/ca/mpids-demo.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
