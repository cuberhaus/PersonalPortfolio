import { describe, it, expect } from 'vitest';
import { getLangFromUrl, getRouteFromUrl, useTranslations } from '../i18n/utils';
import { ui, defaultLang, languages } from '../i18n/ui';

describe('getLangFromUrl', () => {
  it('returns "es" for Spanish URL', () => {
    expect(getLangFromUrl(new URL('https://example.com/es/demos/tfg-polyps'))).toBe('es');
  });

  it('returns "ca" for Catalan URL', () => {
    expect(getLangFromUrl(new URL('https://example.com/ca/'))).toBe('ca');
  });

  it('returns "ca" for path ending with /ca', () => {
    expect(getLangFromUrl(new URL('https://example.com/ca'))).toBe('ca');
  });

  it('returns defaultLang for English / root URL', () => {
    expect(getLangFromUrl(new URL('https://example.com/'))).toBe(defaultLang);
    expect(getLangFromUrl(new URL('https://example.com/demos/tfg-polyps'))).toBe(defaultLang);
  });

  it('returns defaultLang for unknown language codes', () => {
    expect(getLangFromUrl(new URL('https://example.com/fr/page'))).toBe(defaultLang);
  });

  it('handles all configured languages', () => {
    for (const lang of Object.keys(languages)) {
      const url = new URL(`https://example.com/${lang}/test`);
      expect(getLangFromUrl(url)).toBe(lang);
    }
  });
});

describe('getRouteFromUrl', () => {
  it('returns root for the homepage', () => {
    expect(getRouteFromUrl(new URL('https://example.com/'))).toBe('/');
  });

  it('removes supported locale prefixes from homepage routes', () => {
    expect(getRouteFromUrl(new URL('https://example.com/es/'))).toBe('/');
    expect(getRouteFromUrl(new URL('https://example.com/ca/'))).toBe('/');
  });

  it('removes supported locale prefixes from nested routes', () => {
    expect(getRouteFromUrl(new URL('https://example.com/es/demos/tenda'))).toBe('/demos/tenda');
    expect(getRouteFromUrl(new URL('https://example.com/ca/demos/tfg-polyps'))).toBe('/demos/tfg-polyps');
  });

  it('keeps non-localized routes unchanged', () => {
    expect(getRouteFromUrl(new URL('https://example.com/demos/tenda'))).toBe('/demos/tenda');
  });

  it('treats unsupported language-like prefixes as normal path segments', () => {
    expect(getRouteFromUrl(new URL('https://example.com/fr/demos/tenda'))).toBe('/fr/demos/tenda');
  });
});

describe('useTranslations', () => {
  it('returns English value for "en"', () => {
    const t = useTranslations('en');
    expect(t('nav.about')).toBe(ui.en['nav.about']);
  });

  it('returns Spanish value for "es"', () => {
    const t = useTranslations('es');
    expect(t('nav.about')).toBe(ui.es['nav.about']);
  });

  it('returns Catalan value for "ca"', () => {
    const t = useTranslations('ca');
    expect(t('nav.about')).toBe(ui.ca['nav.about']);
  });

  it('falls back to defaultLang if key is empty in target language', () => {
    const t = useTranslations(defaultLang);
    const enKeys = Object.keys(ui.en) as (keyof typeof ui.en)[];
    for (const key of enKeys) {
      const val = t(key);
      expect(val, `key "${key}" returned falsy`).toBeTruthy();
    }
  });
});

describe('defaultLang', () => {
  it('is "en"', () => {
    expect(defaultLang).toBe('en');
  });
});

describe('languages map', () => {
  it('contains at least en, es, ca', () => {
    expect(languages).toHaveProperty('en');
    expect(languages).toHaveProperty('es');
    expect(languages).toHaveProperty('ca');
  });

  it('every language in the map has a corresponding ui entry', () => {
    for (const lang of Object.keys(languages)) {
      expect(ui).toHaveProperty(lang);
    }
  });
});
