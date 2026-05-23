/**
 * Unit tests for the cross-service session id helper.
 *
 * Covers:
 *  - first call mints a stable UUID
 *  - subsequent calls return the same id (cached)
 *  - localStorage is consulted before minting
 *  - localStorage failures (e.g. private mode) fall back to in-memory id
 *  - non-browser context returns a process-local id without persistence
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetSessionForTesting, getSessionId } from '../lib/debug-session';

interface MockStorage extends Storage {
  store: Map<string, string>;
}

function createLocalStorageMock(): MockStorage {
  const store = new Map<string, string>();
  return {
    store,
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => {
      store.delete(k);
    },
    setItem: (k, v) => {
      store.set(k, v);
    },
  } as MockStorage;
}

const originalWindow = (globalThis as { window?: unknown }).window;

afterEach(() => {
  __resetSessionForTesting();
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe('debug-session: server-side context', () => {
  beforeEach(() => {
    delete (globalThis as { window?: unknown }).window;
    __resetSessionForTesting();
  });

  it('returns a stable id within the same process', () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
    expect(a).toMatch(/[0-9a-f-]{8,}/i);
  });
});

describe('debug-session: browser context', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = createLocalStorageMock();
    (globalThis as { window?: unknown }).window = { localStorage: storage };
    __resetSessionForTesting();
  });

  it('mints a UUID and persists it on first call', () => {
    expect(storage.store.size).toBe(0);
    const id = getSessionId();
    expect(id).toMatch(/[0-9a-f-]{8,}/i);
    expect(storage.store.get('debug.session_id')).toBe(id);
  });

  it('returns the cached id on subsequent calls without re-reading storage', () => {
    const id1 = getSessionId();
    const spy = vi.spyOn(storage, 'getItem');
    const id2 = getSessionId();
    expect(id2).toBe(id1);
    expect(spy).not.toHaveBeenCalled();
  });

  it('reuses an existing id from localStorage across resets', () => {
    storage.store.set('debug.session_id', 'pre-existing-id');
    expect(getSessionId()).toBe('pre-existing-id');
  });

  it('falls back to an in-memory id when localStorage throws', () => {
    storage.getItem = () => {
      throw new Error('blocked');
    };
    storage.setItem = () => {
      throw new Error('blocked');
    };
    const id = getSessionId();
    expect(id).toMatch(/[0-9a-f-]{8,}/i);
    // Subsequent calls still return the same in-memory id.
    expect(getSessionId()).toBe(id);
  });
});
