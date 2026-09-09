export const LIVE_APP_STATUS_EVENT = 'live-app:status';

export type LiveAppPresentationStatus = 'checking' | 'online' | 'offline';

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

function isStatusEventDetail(value: unknown): value is LiveAppStatusEventDetail {
  if (typeof value !== 'object' || value === null) return false;
  const detail = value as Record<string, unknown>;
  return detail.status === 'checking' || detail.status === 'online' || detail.status === 'offline';
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

function isLiveAppStatus(value: string | undefined): value is LiveAppPresentationStatus {
  return value === 'checking' || value === 'online' || value === 'offline';
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
