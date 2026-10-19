import { fromLocaleGlob, pickLocaleFromMap } from '../locale-bundle';

export type JocEdaCopy = Record<string, any>;

export const JOC_EDA_COPY = fromLocaleGlob<JocEdaCopy>(
  import.meta.glob<Record<string, unknown>>('../../../locales/*/joc-eda-page.json', {
    eager: true,
    import: 'default',
  })
);

export function getJocEdaCopy(lang: string): JocEdaCopy {
  return pickLocaleFromMap(JOC_EDA_COPY, lang);
}
