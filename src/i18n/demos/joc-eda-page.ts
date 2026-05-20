import { getDemoT, getDemoTranslations } from '../locale-glob';

export type JocEdaCopy = Record<string, unknown>;

export const JOC_EDA_COPY = getDemoTranslations('joc-eda-page');

export function getJocEdaCopy(lang: string): JocEdaCopy {
  return getDemoT('joc-eda-page', lang);
}
