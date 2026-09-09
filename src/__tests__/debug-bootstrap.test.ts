import { describe, expect, it, vi } from 'vitest';
import { createDebugLifecycleFromAdapters } from '../lib/debug-bootstrap';

describe('debug bootstrap', () => {
  it('maps every runtime adapter into the lifecycle boundary', async () => {
    const adapters = {
      network: { installNetworkTap: vi.fn() },
      iframe: {
        installIframeForwarder: vi.fn(),
        uninstallIframeForwarder: vi.fn(),
      },
      sentry: {
        installSentryForwarder: vi.fn().mockResolvedValue(undefined),
        uninstallSentryForwarder: vi.fn(),
      },
      docker: {
        subscribeAllVisible: vi.fn(),
        unsubscribeAll: vi.fn(),
      },
    };

    const lifecycle = createDebugLifecycleFromAdapters(adapters);
    await lifecycle.enable();
    lifecycle.disable();

    expect(adapters.network.installNetworkTap).toHaveBeenCalledOnce();
    expect(adapters.iframe.installIframeForwarder).toHaveBeenCalledOnce();
    expect(adapters.iframe.uninstallIframeForwarder).toHaveBeenCalledOnce();
    expect(adapters.sentry.installSentryForwarder).toHaveBeenCalledOnce();
    expect(adapters.sentry.uninstallSentryForwarder).toHaveBeenCalledOnce();
    expect(adapters.docker.subscribeAllVisible).toHaveBeenCalledOnce();
    expect(adapters.docker.unsubscribeAll).toHaveBeenCalledOnce();
  });
});
