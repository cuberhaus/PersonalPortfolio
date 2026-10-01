import { getHostedApp, getIframeUrl, getRunHints } from '../data/demo-services';
import type { DemoHostedApp } from '../data/demo-services';
import type { LiveAppPresentationStatus } from './live-app-fallback';

export type LiveAppStatus = 'online' | 'offline';

/**
 * How one demo's live app is reached from the current page.
 *
 * - `local`: the local demo service, probed on page load (the original behaviour).
 * - `hosted` + `enabled: false`: a hosted demo service exists in the registry but
 *   is switched off or not provisioned yet, so the page shows the fallback demo.
 * - `hosted` + `enabled: true`: a hosted demo service that is sleeping until the
 *   visitor asks for it; `healthUrl` is what the page polls while it wakes.
 */
export type LiveAppHosting =
  | { mode: 'local' }
  | { mode: 'hosted'; enabled: false }
  | { mode: 'hosted'; enabled: true; url: string; healthUrl: string };

export interface DecideLiveAppHostingInput {
  hostname: string;
  explicitUrl?: string;
  hosted: DemoHostedApp | null;
}

export interface ResolveLiveAppHostingInput {
  slug?: string;
  explicitUrl?: string;
  hostname: string;
}

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

/**
 * True when the page itself is served from the visitor's own machine. A local
 * demo service is reachable only from there, so this is what separates the
 * owner's development environment from the deployed portfolio.
 */
export function isLoopbackHost(hostname: string): boolean {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, '$1');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') return true;

  const octets = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!octets) return false;
  const [first, ...rest] = octets.slice(1).map(Number);
  return first === 127 && rest.every((octet) => octet <= 255);
}

const HOSTED_HEALTH_PATH = '/health';

function getHostedHealthUrl(url: string): string | null {
  try {
    return new URL(HOSTED_HEALTH_PATH, url).toString();
  } catch {
    return null;
  }
}

/**
 * Pure decision behind hosted mode. Only a demo that declares a hosted live
 * app, viewed from a public page, with no explicit URL override, leaves the
 * local behaviour; every other demo keeps probing its local service.
 */
export function decideLiveAppHosting({
  hostname,
  explicitUrl,
  hosted,
}: DecideLiveAppHostingInput): LiveAppHosting {
  if (explicitUrl || !hosted || isLoopbackHost(hostname)) return { mode: 'local' };
  if (!hosted.enabled || !hosted.url) return { mode: 'hosted', enabled: false };

  const healthUrl = getHostedHealthUrl(hosted.url);
  if (!healthUrl) return { mode: 'hosted', enabled: false };
  return { mode: 'hosted', enabled: true, url: hosted.url, healthUrl };
}

export type HostedAnnouncementKey = 'hostedWakingTitle' | 'hostedUnavailableTitle' | 'hostedLive';

/**
 * Which copy key the hosted live region should speak for a status, or null to
 * stay silent. Silent on load and while idle, and for a switched-off hosted app,
 * whose explanation is static text rather than news.
 */
export function getHostedAnnouncementKey(
  status: LiveAppPresentationStatus,
  enabled: boolean
): HostedAnnouncementKey | null {
  switch (status) {
    case 'waking':
      return 'hostedWakingTitle';
    case 'online':
      return 'hostedLive';
    case 'unavailable':
      return enabled ? 'hostedUnavailableTitle' : null;
    default:
      return null;
  }
}

/** Registry-backed wrapper over {@link decideLiveAppHosting}. */
export function resolveLiveAppHosting({
  slug,
  explicitUrl,
  hostname,
}: ResolveLiveAppHostingInput): LiveAppHosting {
  return decideLiveAppHosting({
    hostname,
    explicitUrl,
    hosted: slug ? getHostedApp(slug) : null,
  });
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

/**
 * A sleeping hosted demo service takes about a minute to wake; allow twice that
 * before giving up, and never poll faster than the service can answer.
 */
export const HOSTED_WAKE_TIMEOUT_MS = 120_000;
export const HOSTED_POLL_INTERVAL_MS = 3_000;
export const HOSTED_REQUEST_TIMEOUT_MS = 8_000;

export type HostedWakeResult = 'ready' | 'timeout' | 'cancelled';

export interface HostedWakeEvent {
  type: 'attempt' | 'retry' | HostedWakeResult;
  url: string;
  slug?: string;
  /** 1-based number of the last poll started. */
  attempt: number;
  /** Why a poll did not succeed (`HTTP 503`, `TypeError`, `AbortError`, …). */
  detail?: string;
}

export interface HostedWakeOptions {
  healthUrl: string;
  slug?: string;
  fetchImpl?: typeof fetch;
  wakeTimeoutMs?: number;
  pollIntervalMs?: number;
  requestTimeoutMs?: number;
  onEvent?: (event: HostedWakeEvent) => void;
}

export interface HostedWake {
  promise: Promise<HostedWakeResult>;
  cancel: () => void;
}

/**
 * Poll a hosted demo service's `/health` endpoint until it answers, the wake
 * deadline passes, or the caller cancels.
 *
 * The request is deliberately a simple CORS GET: no custom headers, no
 * credentials. Anything else would make the browser preflight a service that is
 * still starting up. Failures of any kind (network error, CORS block while the
 * host shows its wake interstitial, non-2xx answers, per-request timeout) just
 * schedule the next poll; only `response.ok` counts as awake.
 */
export function startHostedWake({
  healthUrl,
  slug,
  fetchImpl = fetch,
  wakeTimeoutMs = HOSTED_WAKE_TIMEOUT_MS,
  pollIntervalMs = HOSTED_POLL_INTERVAL_MS,
  requestTimeoutMs = HOSTED_REQUEST_TIMEOUT_MS,
  onEvent,
}: HostedWakeOptions): HostedWake {
  let settled = false;
  let attempt = 0;
  let controller: AbortController | undefined;
  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveResult: (result: HostedWakeResult) => void = () => {};
  const promise = new Promise<HostedWakeResult>((resolve) => {
    resolveResult = resolve;
  });

  const emit = (type: HostedWakeEvent['type'], detail?: string) =>
    onEvent?.({ type, url: healthUrl, slug, attempt, detail });

  const deadlineTimer = setTimeout(() => finish('timeout'), wakeTimeoutMs);

  function finish(result: HostedWakeResult): void {
    if (settled) return;
    settled = true;
    clearTimeout(deadlineTimer);
    clearTimeout(requestTimer);
    clearTimeout(pollTimer);
    controller?.abort();
    emit(result);
    resolveResult(result);
  }

  function retryLater(detail: string): void {
    if (settled) return;
    emit('retry', detail);
    pollTimer = setTimeout(poll, pollIntervalMs);
  }

  function poll(): void {
    if (settled) return;
    attempt += 1;
    const current = new AbortController();
    controller = current;
    requestTimer = setTimeout(() => current.abort(), requestTimeoutMs);
    emit('attempt');

    let request: Promise<Response>;
    try {
      request = fetchImpl(healthUrl, {
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        signal: current.signal,
      });
    } catch (error) {
      request = Promise.reject(error);
    }

    request
      .then((response) => {
        clearTimeout(requestTimer);
        if (settled) return;
        if (response.ok) finish('ready');
        else retryLater(`HTTP ${response.status}`);
      })
      .catch((error: unknown) => {
        clearTimeout(requestTimer);
        retryLater(error instanceof Error ? error.name : 'error');
      });
  }

  poll();

  return { promise, cancel: () => finish('cancelled') };
}
