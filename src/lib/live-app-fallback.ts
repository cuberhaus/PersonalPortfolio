export const LIVE_APP_STATUS_EVENT = 'live-app:status';

export type LiveAppPresentationStatus = 'checking' | 'online' | 'offline';

export interface LiveAppStatusEventDetail {
  status: LiveAppPresentationStatus;
  slug?: string;
}

export function shouldHideLiveAppFallback(status: LiveAppPresentationStatus): boolean {
  return status === 'online';
}

function isStatusEventDetail(value: unknown): value is LiveAppStatusEventDetail {
  if (typeof value !== 'object' || value === null) return false;
  const detail = value as Record<string, unknown>;
  return detail.status === 'checking' || detail.status === 'online' || detail.status === 'offline';
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
    fallback.hidden = isLiveAppStatus(renderedStatus)
      ? shouldHideLiveAppFallback(renderedStatus)
      : false;
    region.addEventListener(LIVE_APP_STATUS_EVENT, (event) => {
      if (!(event instanceof CustomEvent) || !isStatusEventDetail(event.detail)) return;
      fallback.hidden = shouldHideLiveAppFallback(event.detail.status);
    });
  }
}
