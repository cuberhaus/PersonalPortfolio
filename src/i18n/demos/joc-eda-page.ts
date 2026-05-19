import en from '../../../locales/en/joc-eda-page.json';
import es from '../../../locales/es/joc-eda-page.json';
import ca from '../../../locales/ca/joc-eda-page.json';

export type JocEdaCopy = typeof en;

export const JOC_EDA_COPY: Record<string, JocEdaCopy> = { en, es, ca };

export function getJocEdaCopy(lang: string): JocEdaCopy {
  return JOC_EDA_COPY[lang in JOC_EDA_COPY ? lang : 'en'];
}
