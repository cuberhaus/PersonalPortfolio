import { describe, expect, it } from 'vitest';
import {
  initializeLiveAppFallbackRegions,
  LIVE_APP_STATUS_EVENT,
  LIVE_APP_STATUSES,
  shouldHideLiveAppFallback,
} from '../lib/live-app-fallback';

class FakeElement {
  readonly dataset: Record<string, string> = {};
  hidden = false;
  private readonly listeners = new Map<string, (event: unknown) => void>();

  constructor(private readonly children: Record<string, FakeElement> = {}) {}

  querySelector<T extends FakeElement>(selector: string): T | null {
    return (this.children[selector] as T | undefined) ?? null;
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    this.listeners.set(type, listener);
  }

  dispatchEvent(event: { type: string; detail?: unknown }) {
    this.listeners.get(event.type)?.(event);
  }
}

class FakeScope {
  constructor(private readonly regions: FakeElement[]) {}

  querySelectorAll<T extends FakeElement>(selector: string): T[] {
    return selector === '[data-live-app-region]' ? (this.regions as T[]) : [];
  }
}

describe('live-app fallback visibility', () => {
  it('keeps the route-specific fallback visible while checking or offline', () => {
    expect(shouldHideLiveAppFallback('checking')).toBe(false);
    expect(shouldHideLiveAppFallback('offline')).toBe(false);
  });

  it('hides the fallback only after the live app is online', () => {
    expect(shouldHideLiveAppFallback('online')).toBe(true);
  });

  it('keeps the fallback visible through every hosted phase before the live app is online', () => {
    for (const status of ['idle', 'waking', 'unavailable'] as const) {
      expect(shouldHideLiveAppFallback(status), status).toBe(false);
    }
  });

  it('recognises exactly the statuses the live app embed can report', () => {
    expect(LIVE_APP_STATUSES).toEqual([
      'checking',
      'online',
      'offline',
      'idle',
      'waking',
      'unavailable',
    ]);
  });

  it('follows a hosted wake through the region and ignores unknown statuses', () => {
    const fallback = new FakeElement();
    const region = new FakeElement({ '[data-live-app-fallback]': fallback });
    initializeLiveAppFallbackRegions(new FakeScope([region]) as unknown as ParentNode);

    const send = (status: unknown) =>
      region.dispatchEvent({ type: LIVE_APP_STATUS_EVENT, detail: { status, slug: 'sbc-ia' } });

    for (const [status, hidden] of [
      ['idle', false],
      ['waking', false],
      ['unavailable', false],
      ['waking', false],
      ['online', true],
      ['waking', false],
      ['online', true],
    ] as const) {
      send(status);
      expect(fallback.hidden, `after ${status}`).toBe(hidden);
    }

    send('exploded');
    expect(fallback.hidden).toBe(true);
  });

  it('honours a hosted status already rendered before hydration', () => {
    const status = new FakeElement();
    status.dataset.liveStatus = 'online';
    const fallback = new FakeElement();
    fallback.hidden = false;
    const region = new FakeElement({
      '[data-live-app-fallback]': fallback,
      '[data-live-status]': status,
    });

    initializeLiveAppFallbackRegions(new FakeScope([region]) as unknown as ParentNode);

    expect(fallback.hidden).toBe(true);
  });

  it('coordinates the real region transition without document-wide selectors', () => {
    const status = new FakeElement();
    status.dataset.liveStatus = 'checking';
    const fallback = new FakeElement();
    const region = new FakeElement({
      '[data-live-app-fallback]': fallback,
      '[data-live-status]': status,
    });

    initializeLiveAppFallbackRegions(new FakeScope([region]) as unknown as ParentNode);
    expect(fallback.hidden).toBe(false);

    region.dispatchEvent({
      type: LIVE_APP_STATUS_EVENT,
      detail: { status: 'offline', slug: 'tenda' },
    });
    expect(fallback.hidden).toBe(false);

    region.dispatchEvent({
      type: LIVE_APP_STATUS_EVENT,
      detail: { status: 'online', slug: 'tenda' },
    });
    expect(fallback.hidden).toBe(true);

    region.dispatchEvent({
      type: LIVE_APP_STATUS_EVENT,
      detail: { status: 'checking', slug: 'tenda' },
    });
    expect(fallback.hidden).toBe(false);
  });
});
