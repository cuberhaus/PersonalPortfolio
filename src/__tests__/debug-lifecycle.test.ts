import { describe, expect, it, vi } from 'vitest';
import { createDebugLifecycle, type DebugLifecycleAdapters } from '../lib/debug-lifecycle';

function makeAdapters(overrides: Partial<DebugLifecycleAdapters> = {}) {
  const adapters: DebugLifecycleAdapters = {
    installNetworkTap: vi.fn(() => vi.fn()),
    installSentryForwarder: vi.fn(async () => undefined),
    uninstallSentryForwarder: vi.fn(),
    subscribeAllVisible: vi.fn(() => vi.fn()),
    unsubscribeAll: vi.fn(),
    ...overrides,
  };
  return adapters;
}

describe('debug lifecycle', () => {
  it('enables each adapter once and tears every adapter down', async () => {
    const networkCleanup = vi.fn();
    const dockerCleanup = vi.fn();
    const adapters = makeAdapters({
      installNetworkTap: vi.fn(() => networkCleanup),
      subscribeAllVisible: vi.fn(() => dockerCleanup),
    });
    const lifecycle = createDebugLifecycle(adapters);

    await lifecycle.enable();
    await lifecycle.enable();
    lifecycle.disable();

    expect(adapters.installNetworkTap).toHaveBeenCalledTimes(1);
    expect(adapters.installSentryForwarder).toHaveBeenCalledTimes(1);
    expect(adapters.subscribeAllVisible).toHaveBeenCalledTimes(1);
    expect(networkCleanup).toHaveBeenCalledOnce();
    expect(dockerCleanup).toHaveBeenCalledOnce();
    expect(adapters.unsubscribeAll).toHaveBeenCalledOnce();
    expect(adapters.uninstallSentryForwarder).toHaveBeenCalledOnce();
  });

  it('cleans up a late Sentry install when disabled while it loads', async () => {
    let resolveSentry!: () => void;
    const sentryReady = new Promise<void>((resolve) => {
      resolveSentry = resolve;
    });
    const adapters = makeAdapters({
      installSentryForwarder: vi.fn(() => sentryReady),
    });
    const lifecycle = createDebugLifecycle(adapters);

    const enabling = lifecycle.enable();
    lifecycle.disable();
    resolveSentry();
    await enabling;

    expect(adapters.uninstallSentryForwarder).toHaveBeenCalledOnce();
  });

  it('can be enabled again after disable', async () => {
    const adapters = makeAdapters();
    const lifecycle = createDebugLifecycle(adapters);

    await lifecycle.enable();
    lifecycle.disable();
    await lifecycle.enable();

    expect(adapters.installNetworkTap).toHaveBeenCalledTimes(2);
    expect(adapters.installSentryForwarder).toHaveBeenCalledTimes(2);
    expect(adapters.subscribeAllVisible).toHaveBeenCalledTimes(2);
  });

  it('does not let a late old install tear down a newer generation', async () => {
    let resolveFirstInstall!: () => void;
    const firstInstall = new Promise<void>((resolve) => {
      resolveFirstInstall = resolve;
    });
    let installCount = 0;
    const events: string[] = [];
    const adapters = makeAdapters({
      installSentryForwarder: vi.fn(() => {
        installCount += 1;
        events.push(`install-${installCount}`);
        return installCount === 1 ? firstInstall : Promise.resolve();
      }),
      uninstallSentryForwarder: vi.fn(() => events.push('uninstall')),
    });
    const lifecycle = createDebugLifecycle(adapters);

    const firstEnable = lifecycle.enable();
    lifecycle.disable();
    const secondEnable = lifecycle.enable();
    resolveFirstInstall();

    await Promise.all([firstEnable, secondEnable]);

    expect(adapters.installSentryForwarder).toHaveBeenCalledTimes(2);
    expect(events).toEqual(['install-1', 'uninstall', 'install-2']);

    lifecycle.disable();
    expect(events).toEqual(['install-1', 'uninstall', 'install-2', 'uninstall']);
  });

  it('rolls back the other adapters when Sentry installation fails', async () => {
    let installCount = 0;
    const adapters = makeAdapters({
      installSentryForwarder: vi.fn(() => {
        installCount += 1;
        return installCount === 1
          ? Promise.reject(new Error('Sentry unavailable'))
          : Promise.resolve();
      }),
    });
    const lifecycle = createDebugLifecycle(adapters);

    await expect(lifecycle.enable()).rejects.toThrow('Sentry unavailable');
    expect(adapters.installNetworkTap).toHaveBeenCalledOnce();
    expect(adapters.subscribeAllVisible).toHaveBeenCalledOnce();
    expect(adapters.unsubscribeAll).toHaveBeenCalledOnce();
    expect(adapters.uninstallSentryForwarder).toHaveBeenCalledOnce();

    await lifecycle.enable();
    expect(adapters.installNetworkTap).toHaveBeenCalledTimes(2);
    expect(adapters.subscribeAllVisible).toHaveBeenCalledTimes(2);
  });
});
