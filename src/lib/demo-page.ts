import { getDemo, type Demo, type DemoLang } from '../i18n/demo';
import { getLangFromUrl, useTranslations } from '../i18n/utils';

export interface DemoPageContext {
  lang: DemoLang;
  demo: Demo;
  t: (key: string) => string;
}

export function getDemoPageContext(url: URL, slug: string): DemoPageContext {
  const lang = getLangFromUrl(url);
  return {
    lang,
    demo: getDemo(slug, lang),
    t: useTranslations(lang),
  };
}
