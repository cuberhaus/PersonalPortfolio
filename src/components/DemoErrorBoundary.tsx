import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react';

/**
 * Catches runtime errors thrown inside a demo island so a single broken
 * component degrades to a friendly fallback card instead of taking the rest
 * of the page (or other islands on the same route) down with it.
 *
 * Errors are forwarded to Sentry via a dynamic import so the boundary itself
 * stays test-friendly (no top-level Sentry import) and doesn't pull the SDK
 * into the boundary's first hydration chunk for clean renders.
 */

interface Props {
  /** Slug or short name used to tag the Sentry event and label the fallback. */
  demoName: string;
  children: ReactNode;
  /** Optional override for the fallback heading (defaults to a generic message). */
  fallbackTitle?: string;
  fallbackMessage?: string;
  reloadLabel?: string;
}

interface State {
  error: Error | null;
}

export class DemoErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Forward to Sentry. Dynamic import keeps the boundary test-friendly
    // and avoids dragging the SDK into the demo's first paint chunk.
    void import('@sentry/astro')
      .then((Sentry) => {
        Sentry.captureException(error, {
          tags: { boundary: 'demo', demo: this.props.demoName },
          extra: { componentStack: info.componentStack },
        });
      })
      .catch(() => {
        // Last-ditch fallback if Sentry can't be loaded — at least surface
        // the error in dev consoles. Suppressed in tests via console.error
        // mock.
        console.error(`[DemoErrorBoundary:${this.props.demoName}]`, error);
      });
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      const title = this.props.fallbackTitle ?? "This demo couldn't load";
      const message =
        this.props.fallbackMessage ??
        'An error happened while running this demo. The rest of the site is unaffected — you can reload to try again.';
      const reloadLabel = this.props.reloadLabel ?? 'Reload';
      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            color: 'var(--text-primary)',
            margin: '2rem auto',
            maxWidth: 720,
            textAlign: 'center',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
          <p
            style={{
              margin: '0 0 1.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--accent-start)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {reloadLabel}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DemoErrorBoundary;

/**
 * Wrap a demo component so it's automatically protected by the boundary.
 * Use this at the demo's export site so Astro pages stay untouched and
 * the boundary lives in the same React tree as the component (which is
 * required for componentDidCatch to fire).
 */
export function withDemoErrorBoundary<P extends Record<string, unknown>>(
  Wrapped: ComponentType<P>,
  demoName: string
): ComponentType<P> {
  const Boundary = (props: P) => (
    <DemoErrorBoundary demoName={demoName}>
      <Wrapped {...props} />
    </DemoErrorBoundary>
  );
  Boundary.displayName = `withDemoErrorBoundary(${Wrapped.displayName ?? Wrapped.name ?? demoName})`;
  return Boundary;
}
