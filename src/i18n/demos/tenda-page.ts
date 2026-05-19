import en from '../../../locales/en/tenda-page.json';
import es from '../../../locales/es/tenda-page.json';
import ca from '../../../locales/ca/tenda-page.json';

export type TendaCopy = typeof en;

export const TENDA_COPY: Record<string, TendaCopy> = { en, es, ca };

export function getTendaCopy(lang: string): TendaCopy {
  return TENDA_COPY[lang in TENDA_COPY ? lang : 'en'];
}
