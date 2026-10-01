export const LIVE_APP_STATUS_EVENT = 'live-app:status';

/**
 * Every state the live app embed can report to its region.
 *
 * - `checking` / `online` / `offline`: probing a local demo service.
 * - `idle` / `waking` / `unavailable`: a hosted demo service, before the visitor
 *   starts it, while it wakes, and when it will not start (or is switched off).
 *   A woken hosted service reports `online`.
 */
export const LIVE_APP_STATUSES = [
  'checking',
  'online',
  'offline',
  'idle',
  'waking',
  'unavailable',
] as const;

export type LiveAppPresentationStatus = (typeof LIVE_APP_STATUSES)[number];

export interface LiveAppStatusEventDetail {
  status: LiveAppPresentationStatus;
  slug?: string;
}

export function createLiveAppStatusEvent(
  detail: LiveAppStatusEventDetail
): CustomEvent<LiveAppStatusEventDetail> {
  return new CustomEvent(LIVE_APP_STATUS_EVENT, { bubbles: true, detail });
}

export function dispatchLiveAppStatus(target: EventTarget, detail: LiveAppStatusEventDetail): void {
  target.dispatchEvent(createLiveAppStatusEvent(detail));
}

export function shouldHideLiveAppFallback(status: LiveAppPresentationStatus): boolean {
  return status === 'online';
}

function isLiveAppStatus(value: unknown): value is LiveAppPresentationStatus {
  return typeof value === 'string' && (LIVE_APP_STATUSES as readonly string[]).includes(value);
}

function isStatusEventDetail(value: unknown): value is LiveAppStatusEventDetail {
  if (typeof value !== 'object' || value === null) return false;
  return isLiveAppStatus((value as Record<string, unknown>).status);
}

function getStatusEventDetail(event: Event): LiveAppStatusEventDetail | null {
  if (typeof event !== 'object' || event === null || !('detail' in event)) return null;
  const detail = (event as Event & { detail?: unknown }).detail;
  return isStatusEventDetail(detail) ? detail : null;
}

function setFallbackVisibility(
  fallback: Pick<HTMLElement, 'hidden'>,
  status: LiveAppPresentationStatus
): void {
  fallback.hidden = shouldHideLiveAppFallback(status);
}

export function initializeLiveAppFallbackRegions(root: ParentNode = document): void {
  for (const region of root.querySelectorAll<HTMLElement>('[data-live-app-region]')) {
    if (region.dataset.liveAppFallbackInitialized) continue;
    const fallback = region.querySelector<HTMLElement>('[data-live-app-fallback]');
    if (!fallback) continue;

    region.dataset.liveAppFallbackInitialized = 'true';
    const renderedStatus =
      region.querySelector<HTMLElement>('[data-live-status]')?.dataset.liveStatus;
    if (isLiveAppStatus(renderedStatus)) setFallbackVisibility(fallback, renderedStatus);
    region.addEventListener(LIVE_APP_STATUS_EVENT, (event) => {
      const detail = getStatusEventDetail(event);
      if (!detail) return;
      setFallbackVisibility(fallback, detail.status);
    });
  }
}
