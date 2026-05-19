import en from '../../../locales/en/caim-pagerank.json';
import es from '../../../locales/es/caim-pagerank.json';
import ca from '../../../locales/ca/caim-pagerank.json';

export const T = { en, es, ca } as const;

export type DemoTranslations = typeof en;
