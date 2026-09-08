import { describe, expect, it } from 'vitest';
import { getDemoPageContext } from '../lib/demo-page';

describe('demo page context', () => {
  it('resolves locale, translations, and demo metadata together', () => {
    const context = getDemoPageContext(new URL('https://example.test/es/demos/tenda/'), 'tenda');

    expect(context.lang).toBe('es');
    expect(context.demo.slug).toBe('tenda');
    expect(context.t('demo.viewSource')).toBeTruthy();
  });
});
