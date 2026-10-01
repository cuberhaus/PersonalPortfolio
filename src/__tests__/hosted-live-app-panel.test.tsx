/**
 * Copy and markup contract for the hosted live app states (idle, waking,
 * unavailable). Rendered with `renderToStaticMarkup` in the same spirit as the
 * other component tests: no DOM library, just the static markup a visitor and
 * a screen reader receive. The interactive transitions are exercised against a
 * production build in e2e/hosted-demos.spec.ts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HostedLiveAppPanel, {
  type HostedLiveAppLabels,
  type HostedLiveAppPanelProps,
  type HostedLiveAppPhase,
} from '../components/demos/HostedLiveAppPanel';
import { DEFAULT_LOCALE, LOCALES } from '../config/locales';

const HOSTED_COPY_KEYS = [
  'hostedIdleTitle',
  'hostedIdleDesc',
  'hostedStart',
  'hostedWakingTitle',
  'hostedWakingDesc',
  'hostedUnavailableTitle',
  'hostedUnavailableDesc',
  'hostedDisabledDesc',
  'hostedRetry',
  'hostedLive',
] as const;

function readCopy(locale: string): Record<string, unknown> {
  const file = resolve(process.cwd(), 'locales', locale, 'live-app-embed.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

const english = readCopy(DEFAULT_LOCALE) as unknown as HostedLiveAppLabels;

describe('live app embed copy', () => {
  it.each(LOCALES)('%s carries every hosted-state string', (locale) => {
    const copy = readCopy(locale);
    for (const key of HOSTED_COPY_KEYS) {
      expect(typeof copy[key], `${locale}.${key}`).toBe('string');
      expect((copy[key] as string).trim().length, `${locale}.${key}`).toBeGreaterThan(0);
    }
  });

  it('keeps identical keys in identical order across locales', () => {
    const reference = Object.keys(readCopy(DEFAULT_LOCALE));
    for (const locale of LOCALES) {
      expect(Object.keys(readCopy(locale)), locale).toEqual(reference);
    }
  });

  it('translates the hosted copy instead of repeating the English text', () => {
    const english = readCopy(DEFAULT_LOCALE);
    for (const locale of LOCALES.filter((candidate) => candidate !== DEFAULT_LOCALE)) {
      const copy = readCopy(locale);
      for (const key of HOSTED_COPY_KEYS) {
        expect(copy[key], `${locale}.${key}`).not.toBe(english[key]);
      }
    }
  });
});

/** What a visitor reads: tags removed and the entities React escapes decoded. */
function visibleText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('HostedLiveAppPanel', () => {
  const render = (
    props: Partial<HostedLiveAppPanelProps> & Pick<HostedLiveAppPanelProps, 'phase'>
  ) =>
    renderToStaticMarkup(
      createElement(HostedLiveAppPanel, {
        labels: english,
        canStart: true,
        onStart: () => {},
        ...props,
      })
    );

  it('explains the sleeping live app and offers to start it', () => {
    const markup = render({ phase: 'idle' });

    expect(markup).toContain(english.hostedIdleTitle);
    expect(markup).toContain(english.hostedIdleDesc);
    expect(markup).toContain(`>${english.hostedStart}</button>`);
    expect(markup).not.toContain('aria-disabled');
  });

  it('keeps the same focusable button while waking, marked busy instead of disabled', () => {
    const markup = render({ phase: 'waking' });

    expect(markup).toContain(english.hostedWakingTitle);
    expect(markup).toContain(english.hostedWakingDesc);
    expect(markup).toMatch(/<button[^>]*aria-disabled="true"/);
    // A disabled button would drop keyboard focus in the middle of the wake.
    expect(markup).not.toMatch(/<button[^>]*\sdisabled/);
  });

  it('offers a retry after the live app failed to start in time', () => {
    const markup = render({ phase: 'unavailable' });

    expect(markup).toContain(english.hostedUnavailableTitle);
    expect(markup).toContain(english.hostedUnavailableDesc);
    expect(markup).toContain(`>${english.hostedRetry}</button>`);
  });

  it('shows the switched-off copy without any action when the registry switch is off', () => {
    const markup = render({ phase: 'unavailable', canStart: false });

    expect(markup).toContain(english.hostedUnavailableTitle);
    expect(markup).toContain(english.hostedDisabledDesc);
    expect(markup).not.toContain('<button');
  });

  it.each(LOCALES)('renders every phase in %s', (locale) => {
    const labels = readCopy(locale) as unknown as HostedLiveAppLabels;
    const text = (props: Partial<HostedLiveAppPanelProps> & { phase: HostedLiveAppPhase }) =>
      visibleText(render({ labels, ...props }));

    expect(text({ phase: 'idle' })).toContain(labels.hostedIdleTitle);
    expect(text({ phase: 'idle' })).toContain(labels.hostedStart);
    expect(text({ phase: 'waking' })).toContain(labels.hostedWakingTitle);
    expect(text({ phase: 'waking' })).toContain(labels.hostedWakingDesc);
    expect(text({ phase: 'unavailable' })).toContain(labels.hostedUnavailableDesc);
    expect(text({ phase: 'unavailable' })).toContain(labels.hostedRetry);
    expect(text({ phase: 'unavailable', canStart: false })).toContain(labels.hostedDisabledDesc);
  });

  it('hides the decorative glyph, hard-codes no colours and runs no animation', () => {
    const markup = render({ phase: 'waking' });
    // The action's look comes from the shared gradientButton() recipe, whose
    // fallbacks are the one sanctioned place for literal colours.
    const ownStyles = markup.replace(/(<button[^>]*?)\sstyle="[^"]*"/, '$1');

    expect(markup).toContain('aria-hidden="true"');
    expect(ownStyles).not.toMatch(/(?<!&)#[0-9a-f]{3,8}\b/i);
    expect(ownStyles).not.toMatch(/rgba?\(|hsla?\(/);
    expect(markup).not.toMatch(/animation|transition/);
  });

  it('leaves announcing to the embed, so the panel is not a second live region', () => {
    expect(render({ phase: 'waking' })).not.toMatch(/role="status"|aria-live/);
  });
});
