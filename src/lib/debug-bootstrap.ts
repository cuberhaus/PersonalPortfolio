import {
  createDebugLifecycle,
  type DebugLifecycle,
  type DebugLifecycleAdapters,
} from './debug-lifecycle';

type DebugAdapterModules = {
  network: Pick<typeof import('./debug-network'), 'installNetworkTap'>;
  sentry: Pick<
    typeof import('./debug-sentry'),
    'installSentryForwarder' | 'uninstallSentryForwarder'
  >;
  docker: Pick<typeof import('./debug-docker'), 'subscribeAllVisible' | 'unsubscribeAll'>;
  iframe: Pick<
    typeof import('./debug-iframe'),
    'installIframeForwarder' | 'uninstallIframeForwarder'
  >;
};

export function createDebugLifecycleFromAdapters(modules: DebugAdapterModules): DebugLifecycle {
  const adapters: DebugLifecycleAdapters = {
    installNetworkTap: modules.network.installNetworkTap,
    installIframeForwarder: modules.iframe.installIframeForwarder,
    uninstallIframeForwarder: modules.iframe.uninstallIframeForwarder,
    installSentryForwarder: modules.sentry.installSentryForwarder,
    uninstallSentryForwarder: modules.sentry.uninstallSentryForwarder,
    subscribeAllVisible: modules.docker.subscribeAllVisible,
    unsubscribeAll: modules.docker.unsubscribeAll,
  };
  return createDebugLifecycle(adapters);
}

export async function loadDebugLifecycle(): Promise<DebugLifecycle> {
  const [network, sentry, docker, iframe] = await Promise.all([
    import('./debug-network'),
    import('./debug-sentry'),
    import('./debug-docker'),
    import('./debug-iframe'),
  ]);
  return createDebugLifecycleFromAdapters({ network, sentry, docker, iframe });
}
