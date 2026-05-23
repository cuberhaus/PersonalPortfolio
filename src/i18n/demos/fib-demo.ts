import { getDemoTranslations } from '../locale-glob';

export const T = getDemoTranslations('fib-demo');

export type DemoTranslations = Record<string, unknown>;
