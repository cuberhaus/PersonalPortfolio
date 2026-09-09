export interface DebugLifecycleAdapters {
  installNetworkTap: () => void | (() => void);
  installIframeForwarder: () => void;
  uninstallIframeForwarder: () => void;
  installSentryForwarder: () => Promise<void>;
  uninstallSentryForwarder: () => void;
  subscribeAllVisible: () => void | (() => void);
  unsubscribeAll: () => void;
}

export interface DebugLifecycle {
  enable: () => Promise<void>;
  disable: () => void;
}

function normalizeCleanup(cleanup: void | (() => void)): (() => void) | null {
  return typeof cleanup === 'function' ? cleanup : null;
}

interface SentryInstallation {
  installed: boolean;
  cleanupRequested: boolean;
  cleanupCalled: boolean;
}

export function createDebugLifecycle(adapters: DebugLifecycleAdapters): DebugLifecycle {
  let enabled = false;
  let generation = 0;
  let networkCleanup: (() => void) | null = null;
  let dockerCleanup: (() => void) | null = null;
  let iframeInstalled = false;
  let sentryInstallation: SentryInstallation | null = null;
  let pendingSentryInstall: Promise<void> | null = null;
  let pendingEnable: Promise<void> | null = null;

  const cleanupSentry = (installation: SentryInstallation) => {
    installation.cleanupRequested = true;
    if (!installation.installed || installation.cleanupCalled) return;
    installation.cleanupCalled = true;
    adapters.uninstallSentryForwarder();
  };

  const disable = () => {
    if (!enabled) return;
    enabled = false;
    generation += 1;
    networkCleanup?.();
    dockerCleanup?.();
    networkCleanup = null;
    dockerCleanup = null;
    if (iframeInstalled) {
      adapters.uninstallIframeForwarder();
      iframeInstalled = false;
    }
    adapters.unsubscribeAll();
    if (sentryInstallation) cleanupSentry(sentryInstallation);
  };

  const enable = async () => {
    if (enabled) return pendingEnable ?? Promise.resolve();
    enabled = true;
    const currentGeneration = ++generation;
    const installation: SentryInstallation = {
      installed: false,
      cleanupRequested: false,
      cleanupCalled: false,
    };
    sentryInstallation = installation;

    const run = (async () => {
      // A disabled generation may still be waiting for the dynamic Sentry
      // import. Let it finish and clean itself up before a new generation
      // installs the shared adapter.
      if (pendingSentryInstall) {
        try {
          await pendingSentryInstall;
        } catch {
          // The previous generation owns its installation error.
        }
      }
      if (!enabled || currentGeneration !== generation) return;

      networkCleanup = normalizeCleanup(adapters.installNetworkTap());
      dockerCleanup = normalizeCleanup(adapters.subscribeAllVisible());
      adapters.installIframeForwarder();
      iframeInstalled = true;

      const sentryInstall = adapters.installSentryForwarder();
      pendingSentryInstall = sentryInstall;
      try {
        await sentryInstall;
        installation.installed = true;
      } catch (error) {
        // An adapter can set up global state before its async import rejects.
        // Treat the attempted install as active so teardown is still paired.
        installation.installed = true;
        cleanupSentry(installation);
        if (enabled && currentGeneration === generation) disable();
        throw error;
      } finally {
        if (pendingSentryInstall === sentryInstall) pendingSentryInstall = null;
      }

      if (!enabled || currentGeneration !== generation) {
        cleanupSentry(installation);
      }
    })();

    pendingEnable = run;
    try {
      await run;
    } finally {
      if (pendingEnable === run) pendingEnable = null;
    }
  };

  return { enable, disable };
}
