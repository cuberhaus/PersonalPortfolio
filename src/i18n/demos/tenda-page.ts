import { fromLocaleGlob, pickLocaleFromMap } from '../locale-bundle';

export type TendaCopy = Record<string, any>;

export const TENDA_COPY = fromLocaleGlob<TendaCopy>(
  import.meta.glob<Record<string, unknown>>('../../../locales/*/tenda-page.json', {
    eager: true,
    import: 'default',
  })
);

export function getTendaCopy(lang: string): TendaCopy {
  return pickLocaleFromMap(TENDA_COPY, lang);
}
