import en from '../../../locales/en/live-app-embed.json';
import es from '../../../locales/es/live-app-embed.json';
import ca from '../../../locales/ca/live-app-embed.json';

export const TRANSLATIONS = { en, es, ca } as const;

export type DemoTranslations = typeof en;
