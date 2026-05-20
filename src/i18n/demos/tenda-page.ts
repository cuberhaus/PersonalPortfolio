import { getDemoT, getDemoTranslations } from '../locale-glob';

export type TendaCopy = Record<string, unknown>;

export const TENDA_COPY = getDemoTranslations('tenda-page');

export function getTendaCopy(lang: string): TendaCopy {
  return getDemoT('tenda-page', lang);
}
