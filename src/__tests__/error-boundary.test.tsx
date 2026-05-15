/**
 * Smoke check for DemoErrorBoundary's static error-derivation contract.
 * The full DOM-level assertion (fallback renders, button is clickable) is
 * exercised by Playwright in e2e/keyboard.spec.ts via a deliberately-broken
 * demo route — this test pins the React-side state-machine without dragging
 * @testing-library/react into the dependency tree.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DemoErrorBoundary } from '../components/DemoErrorBoundary';

describe('DemoErrorBoundary', () => {
  it('exposes getDerivedStateFromError that captures the thrown error', () => {
    const err = new Error('boom');
    const next = DemoErrorBoundary.getDerivedStateFromError(err);
    expect(next).toEqual({ error: err });
  });

  it('renders children unchanged when no error has been thrown', () => {
    const html = renderToStaticMarkup(
      <DemoErrorBoundary demoName="test">
        <p>child content</p>
      </DemoErrorBoundary>
    );
    expect(html).toContain('child content');
    expect(html).not.toContain("This demo couldn't load");
  });

  it('renders the localized fallback when overrides are supplied', () => {
    // Force the boundary into the error state via its public class shape so
    // we can assert against the rendered fallback markup without needing a
    // browser test. Equivalent to React calling getDerivedStateFromError.
    class TestBoundary extends DemoErrorBoundary {
      override state = { error: new Error('boom') };
    }
    const html = renderToStaticMarkup(
      <TestBoundary
        demoName="test"
        fallbackTitle="Custom title"
        fallbackMessage="Custom body"
        reloadLabel="Try again"
      >
        <span>unused</span>
      </TestBoundary>
    );
    expect(html).toContain('Custom title');
    expect(html).toContain('Custom body');
    expect(html).toContain('Try again');
    expect(html).toContain('role="alert"');
  });
});
