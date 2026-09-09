import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetBusForTesting, subscribe, type DebugLogEntry } from '../lib/debug';
import {
  __resetIframeForwarderForTesting,
  installIframeForwarder,
  uninstallIframeForwarder,
} from '../lib/debug-iframe';

const messageTarget = new EventTarget();
const fakeWindow = {
  addEventListener: messageTarget.addEventListener.bind(messageTarget),
  removeEventListener: messageTarget.removeEventListener.bind(messageTarget),
};

function sendMessage(origin: string, data: unknown) {
  messageTarget.dispatchEvent(new MessageEvent('message', { origin, data }));
}

describe('iframe debug forwarder', () => {
  let entries: DebugLogEntry[];
  let unsubscribe: () => void;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: fakeWindow,
    });
    __resetBusForTesting();
    __resetIframeForwarderForTesting();
    entries = [];
    unsubscribe = subscribe('log', (detail) => {
      if (detail.type === 'log') entries.push(detail.entry);
    });
  });

  afterEach(() => {
    unsubscribe();
    __resetIframeForwarderForTesting();
    delete (globalThis as { window?: unknown }).window;
  });

  it('forwards only valid messages from allowed origins', () => {
    installIframeForwarder({ allowedOrigins: ['http://localhost:8888'] });

    sendMessage('http://localhost:8888', {
      type: 'debug:log',
      level: 'warn',
      ns: 'worker',
      msg: 'started',
      args: [{ id: 1 }],
    });
    sendMessage('http://localhost:9999', {
      type: 'debug:log',
      level: 'error',
      ns: 'worker',
      msg: 'blocked',
    });
    sendMessage('http://localhost:8888', { type: 'debug:log', level: 'warn' });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      source: 'iframe',
      origin: 'http://localhost:8888',
      level: 'warn',
      ns: 'iframe:worker',
      msg: 'started',
      args: [{ id: 1 }],
    });
  });

  it('removes the message listener on uninstall', () => {
    installIframeForwarder({ allowedOrigins: ['http://localhost:8888'] });
    uninstallIframeForwarder();

    sendMessage('http://localhost:8888', {
      type: 'debug:log',
      level: 'info',
      ns: 'worker',
      msg: 'ignored after uninstall',
    });

    expect(entries).toHaveLength(0);
  });
});
