/**
 * Canvas text is rasterised once, with whichever face the browser has at that moment. A webfont
 * that is still downloading, or whose stylesheet has not been applied yet, is silently replaced by
 * the fallback face and the canvas does not repaint when the real one arrives. The pixels then
 * depend on network timing, which is what made the README gallery capture of the ROB demo flaky.
 */

type FontEvents = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

/**
 * Calls `redraw` every time the browser finishes loading fonts, until the returned cleanup runs.
 * The caller still draws once itself: subscribing never repaints on its own.
 */
export function redrawOnFontLoad(
  redraw: () => void,
  fonts: FontEvents | undefined = typeof document === 'undefined' ? undefined : document.fonts
): () => void {
  if (!fonts) return () => undefined;
  const onLoaded = () => redraw();
  fonts.addEventListener('loadingdone', onLoaded);
  return () => fonts.removeEventListener('loadingdone', onLoaded);
}
