import { describe, it, expect, vi } from 'vitest';
import { redrawOnFontLoad } from '../lib/canvas-fonts';

describe('redrawOnFontLoad', () => {
  it('redraws every time the browser finishes loading fonts', () => {
    const fonts = new EventTarget();
    const redraw = vi.fn();
    redrawOnFontLoad(redraw, fonts);

    // The first paint is the caller's job; subscribing must not repaint on its own.
    expect(redraw).not.toHaveBeenCalled();

    fonts.dispatchEvent(new Event('loadingdone'));
    fonts.dispatchEvent(new Event('loadingdone'));
    expect(redraw).toHaveBeenCalledTimes(2);
  });

  it('ignores font events that do not mean a face became usable', () => {
    const fonts = new EventTarget();
    const redraw = vi.fn();
    redrawOnFontLoad(redraw, fonts);

    fonts.dispatchEvent(new Event('loading'));
    fonts.dispatchEvent(new Event('loadingerror'));
    expect(redraw).not.toHaveBeenCalled();
  });

  it('stops redrawing once the returned cleanup has run', () => {
    const fonts = new EventTarget();
    const redraw = vi.fn();
    const stop = redrawOnFontLoad(redraw, fonts);

    stop();
    fonts.dispatchEvent(new Event('loadingdone'));
    expect(redraw).not.toHaveBeenCalled();
  });

  it('is a harmless no-op where there is no FontFaceSet (SSR, old engines)', () => {
    const redraw = vi.fn();
    const stop = redrawOnFontLoad(redraw, undefined);

    expect(() => stop()).not.toThrow();
    expect(redraw).not.toHaveBeenCalled();
  });
});
