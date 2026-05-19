import en from '../../../locales/en/prop-page.json';
import es from '../../../locales/es/prop-page.json';
import ca from '../../../locales/ca/prop-page.json';

export type PropCopy = typeof en;

export const PROP_COPY: Record<string, PropCopy> = { en, es, ca };

export function getPropCopy(lang: string): PropCopy {
  return PROP_COPY[lang in PROP_COPY ? lang : 'en'];
}
