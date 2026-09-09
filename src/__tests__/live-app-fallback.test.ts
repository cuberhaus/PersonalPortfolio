import { describe, expect, it } from 'vitest';
import { shouldHideLiveAppFallback } from '../lib/live-app-fallback';

describe('live-app fallback visibility', () => {
  it('keeps the route-specific fallback visible while checking or offline', () => {
    expect(shouldHideLiveAppFallback('checking')).toBe(false);
    expect(shouldHideLiveAppFallback('offline')).toBe(false);
  });

  it('hides the fallback only after the live app is online', () => {
    expect(shouldHideLiveAppFallback('online')).toBe(true);
  });
});
