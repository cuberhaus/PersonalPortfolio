import { fromLocaleGlob } from '../locale-bundle';

export const TRANSLATIONS = fromLocaleGlob(
  import.meta.glob<Record<string, unknown>>('../../../locales/*/tenda-demo.json', {
    eager: true,
    import: 'default',
  })
);

export type DemoTranslations = Record<string, unknown>;
