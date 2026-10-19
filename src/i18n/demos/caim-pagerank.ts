import { fromLocaleGlob } from '../locale-bundle';

export const T = fromLocaleGlob(
  import.meta.glob<Record<string, unknown>>('../../../locales/*/caim-pagerank.json', {
    eager: true,
    import: 'default',
  })
);

export type DemoTranslations = Record<string, unknown>;
