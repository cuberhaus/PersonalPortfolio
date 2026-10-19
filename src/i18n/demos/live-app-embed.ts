import { fromLocaleGlob } from '../locale-bundle';

export const TRANSLATIONS = fromLocaleGlob(
  import.meta.glob<Record<string, unknown>>('../../../locales/*/live-app-embed.json', {
    eager: true,
    import: 'default',
  })
);

export type DemoTranslations = Record<string, unknown>;
