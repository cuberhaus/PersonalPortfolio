import { getDemoT, getDemoTranslations } from '../locale-glob';

export type PropCopy = Record<string, unknown>;

export const PROP_COPY = getDemoTranslations('prop-page');

export function getPropCopy(lang: string): PropCopy {
  return getDemoT('prop-page', lang);
}
