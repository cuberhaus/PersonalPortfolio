import { fromLocaleGlob, pickLocaleFromMap } from '../locale-bundle';

export type PropCopy = Record<string, any>;

export const PROP_COPY = fromLocaleGlob<PropCopy>(
  import.meta.glob<Record<string, unknown>>('../../../locales/*/prop-page.json', {
    eager: true,
    import: 'default',
  })
);

export function getPropCopy(lang: string): PropCopy {
  return pickLocaleFromMap(PROP_COPY, lang);
}
