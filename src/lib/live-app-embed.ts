import { getIframeUrl, getRunHints } from '../data/demo-services';

export type LiveAppStatus = 'online' | 'offline';

export interface LiveAppDefinition {
  slug?: string;
  url: string;
  dockerCmd: string;
  devCmd?: string;
}

export interface ResolveLiveAppOptions {
  slug?: string;
  explicitUrl?: string;
  dockerCmd?: string;
  devCmd?: string;
  onMissingSlug?: (slug: string) => void;
}

export interface LiveAppProbeEvent {
  type: 'online' | 'offline' | 'aborted';
  url: string;
  slug?: string;
}

export interface LiveAppProbeOptions {
  url: string;
  slug?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  onEvent?: (event: LiveAppProbeEvent) => void;
}

export interface LiveAppProbe {
  promise: Promise<LiveAppStatus>;
  cancel: () => void;
}

export function resolveLiveApp({
  slug,
  explicitUrl,
  dockerCmd: dockerCmdOverride,
  devCmd: devCmdOverride,
  onMissingSlug,
}: ResolveLiveAppOptions): LiveAppDefinition {
  const registryUrl = slug ? getIframeUrl(slug) : null;
  const hints = slug ? getRunHints(slug) : {};
  const url = explicitUrl || registryUrl || '';

  if (slug && !explicitUrl && !registryUrl) onMissingSlug?.(slug);

  return {
    slug,
    url,
    dockerCmd: dockerCmdOverride ?? hints.dockerCmd ?? '',
    devCmd: devCmdOverride ?? hints.devCmd,
  };
}

export function getLiveAppOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function startLiveAppProbe({
  url,
  slug,
  fetchImpl = fetch,
  timeoutMs = 2000,
  onEvent,
}: LiveAppProbeOptions): LiveAppProbe {
  const controller = new AbortController();

  if (!url) {
    const promise = Promise.resolve<LiveAppStatus>('offline');
    return { promise, cancel: () => controller.abort() };
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const promise = fetchImpl(url, { mode: 'no-cors', signal: controller.signal })
    .then(() => {
      onEvent?.({ type: 'online', url, slug });
      return 'online' as const;
    })
    .catch((error: unknown) => {
      const type =
        error instanceof DOMException && error.name === 'AbortError' ? 'aborted' : 'offline';
      onEvent?.({ type, url, slug });
      return 'offline' as const;
    })
    .finally(() => clearTimeout(timer));

  return { promise, cancel: () => controller.abort() };
}
