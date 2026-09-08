import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNetworkTap } from '../lib/debug-network';

class FakeXhr {
  status = 200;
  private listeners = new Map<string, Set<() => void>>();

  open(_method: string, _url: string): void {}

  send(): void {}

  setRequestHeader(_name: string, _value: string): void {}

  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

describe('debug network tap lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores the original fetch when the tap is uninstalled', () => {
    const originalFetch = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('window', {
      __DEBUG_ENABLED: true,
      fetch: originalFetch,
    });

    const uninstall = installNetworkTap();
    expect(window.fetch).not.toBe(originalFetch);

    uninstall();

    expect(window.fetch).toBe(originalFetch);
  });

  it('does not stack patches when installed repeatedly', () => {
    const originalFetch = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('window', {
      __DEBUG_ENABLED: true,
      fetch: originalFetch,
    });

    const firstUninstall = installNetworkTap();
    const secondUninstall = installNetworkTap();

    expect(secondUninstall).toBe(firstUninstall);
    firstUninstall();
    expect(window.fetch).toBe(originalFetch);
  });

  it('removes listeners from in-flight XHRs when uninstalled', () => {
    const originalFetch = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('window', {
      __DEBUG_ENABLED: true,
      fetch: originalFetch,
    });
    vi.stubGlobal('XMLHttpRequest', FakeXhr);

    const uninstall = installNetworkTap();
    const xhr = new FakeXhr();
    xhr.open('GET', 'http://localhost:8888');
    xhr.send();

    expect(xhr.listenerCount('load')).toBe(1);
    expect(xhr.listenerCount('error')).toBe(1);
    expect(xhr.listenerCount('abort')).toBe(1);

    uninstall();

    expect(xhr.listenerCount('load')).toBe(0);
    expect(xhr.listenerCount('error')).toBe(0);
    expect(xhr.listenerCount('abort')).toBe(0);
  });
});
