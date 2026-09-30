/**
 * DOM binding for the analytics consent banner (issue #13).
 *
 * `Analytics.astro` renders the markup; this module wires it to the consent
 * controller. It is safe to call `initAnalyticsConsentUi()` repeatedly — on
 * first load and again on every `astro:page-load` after a client-side
 * navigation swaps in a fresh copy of the banner. Interaction is handled by
 * two delegated listeners on `document`, so nothing needs re-binding when the
 * DOM is replaced.
 *
 * Behaviour:
 * - Undecided visitors see the panel with two equal choices (accept / reject).
 * - Decided visitors see nothing until they press a "Privacy settings"
 *   button (`[data-analytics-settings]`); the panel then shows the current
 *   state and Escape or "Close" dismisses it without changing anything.
 * - The result of a choice is announced through a polite live region and
 *   focus returns to the button that opened the panel.
 */
import {
  createAnalyticsConsent,
  type AnalyticsConsent,
  type AnalyticsDocument,
  type AnalyticsWindow,
  type ConsentDecision,
} from './analytics-consent';

const ROOT_SELECTOR = '[data-analytics-consent]';
const SETTINGS_SELECTOR = '[data-analytics-settings]';
const ACTION_SELECTOR = '[data-consent-action]';

/** `undefined` until first created; `null` when the site has no valid measurement ID. */
let consent: AnalyticsConsent | null | undefined;
let settingsOpen = false;
let settingsOpener: HTMLElement | null = null;
let documentListenersBound = false;
/** The banner element the UI state above belongs to; a different one means a new page was swapped in. */
let activeRoot: HTMLElement | null = null;

function getRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(ROOT_SELECTOR);
}

/** Touching `localStorage` can itself throw (blocked cookies / sandboxed frames). */
function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getConsent(root: HTMLElement): AnalyticsConsent | null {
  if (consent === undefined) {
    consent = createAnalyticsConsent({
      measurementId: root.dataset.measurementId,
      storage: getBrowserStorage(),
      win: window as unknown as AnalyticsWindow,
      doc: document as unknown as AnalyticsDocument,
    });
    consent?.subscribe(render);
  }
  return consent;
}

/** Reflect the current decision and settings state in whichever banner copy is on the page. */
function render(): void {
  const root = getRoot();
  if (!root || !consent) return;

  const decision = consent.getDecision();
  const showingSettings = settingsOpen && decision !== null;
  const panelVisible = decision === null || showingSettings;

  const panel = root.querySelector<HTMLElement>('[data-consent-panel]');
  const status = root.querySelector<HTMLElement>('[data-consent-status]');
  const close = root.querySelector<HTMLElement>('[data-consent-action="close"]');
  if (!panel || !status || !close) return;

  // Absent from the server-rendered markup, so its presence also means "this script has run".
  root.dataset.consentState = decision ?? 'undecided';

  panel.hidden = !panelVisible;
  close.hidden = !showingSettings;
  status.hidden = !showingSettings;
  if (decision === null) status.textContent = '';
  else
    status.textContent =
      (decision === 'granted' ? root.dataset.statusGranted : root.dataset.statusDenied) ?? '';

  for (const trigger of document.querySelectorAll(SETTINGS_SELECTOR)) {
    trigger.setAttribute('aria-expanded', String(panelVisible));
  }
}

function announce(decision: ConsentDecision): void {
  const root = getRoot();
  const live = root?.querySelector<HTMLElement>('[data-consent-live]');
  if (!root || !live) return;
  const message = decision === 'granted' ? root.dataset.savedGranted : root.dataset.savedDenied;
  // Clear first so repeating the same choice is still announced.
  live.textContent = '';
  window.setTimeout(() => {
    live.textContent = message ?? '';
  }, 50);
}

function closeSettings(): void {
  settingsOpen = false;
  render();
  const opener = settingsOpener;
  settingsOpener = null;
  if (opener?.isConnected) opener.focus();
}

function decide(next: ConsentDecision): void {
  if (!consent) return;
  if (next === 'granted') consent.grant();
  else consent.deny();
  announce(next);
  closeSettings();
}

function openSettings(trigger: HTMLElement): void {
  const root = getRoot();
  if (!root || !consent) return;
  settingsOpener = trigger;
  // While undecided the panel is already open; there is nothing to reveal.
  settingsOpen = consent.getDecision() !== null;
  render();
  root.querySelector<HTMLElement>('[data-consent-panel]')?.focus();
}

function handleClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const trigger = target.closest<HTMLElement>(SETTINGS_SELECTOR);
  if (trigger) {
    openSettings(trigger);
    return;
  }

  const root = getRoot();
  const action = target.closest<HTMLElement>(ACTION_SELECTOR);
  if (!root || !action || !root.contains(action)) return;
  if (action.dataset.consentAction === 'accept') decide('granted');
  else if (action.dataset.consentAction === 'reject') decide('denied');
  else if (action.dataset.consentAction === 'close') closeSettings();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !settingsOpen) return;
  const root = getRoot();
  // Only when focus is inside the panel, so Escape still belongs to other
  // overlays (e.g. the theme modal) when they are the active layer.
  if (!root?.contains(document.activeElement)) return;
  event.preventDefault();
  closeSettings();
}

export function initAnalyticsConsentUi(): void {
  const root = getRoot();
  if (!root || !getConsent(root)) return;

  if (!documentListenersBound) {
    documentListenersBound = true;
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
  }

  // A newly swapped-in page starts with the settings view closed. Repeat
  // calls on the same banner (first load fires both this and astro:page-load)
  // must not undo what the visitor has already done.
  if (root !== activeRoot) {
    activeRoot = root;
    settingsOpen = false;
    settingsOpener = null;
  }
  render();
}
