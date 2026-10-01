import { demoPanel, gradientButton } from './_styles';

export type HostedLiveAppPhase = 'idle' | 'waking' | 'unavailable';

export interface HostedLiveAppLabels {
  hostedIdleTitle: string;
  hostedIdleDesc: string;
  hostedStart: string;
  hostedWakingTitle: string;
  hostedWakingDesc: string;
  hostedUnavailableTitle: string;
  hostedUnavailableDesc: string;
  hostedDisabledDesc: string;
  hostedRetry: string;
}

export interface HostedLiveAppPanelProps {
  phase: HostedLiveAppPhase;
  /** False when the registry switch is off: there is nothing to start or retry. */
  canStart: boolean;
  labels: HostedLiveAppLabels;
  onStart: () => void;
}

function getCopy(
  phase: HostedLiveAppPhase,
  canStart: boolean,
  labels: HostedLiveAppLabels
): { title: string; description: string } {
  if (phase === 'idle') {
    return { title: labels.hostedIdleTitle, description: labels.hostedIdleDesc };
  }
  if (phase === 'waking') {
    return { title: labels.hostedWakingTitle, description: labels.hostedWakingDesc };
  }
  return {
    title: labels.hostedUnavailableTitle,
    description: canStart ? labels.hostedUnavailableDesc : labels.hostedDisabledDesc,
  };
}

/**
 * The hosted live app before it is running: asleep, waking, or unavailable.
 *
 * Purely presentational. The embed owns the state and the single persistent
 * live region that announces changes, so this panel can be swapped for the live
 * iframe without losing the announcement. The action is one `<button>` for every
 * phase and is marked `aria-disabled` (not `disabled`) while waking, so keyboard
 * focus survives the whole wake.
 */
export default function HostedLiveAppPanel({
  phase,
  canStart,
  labels,
  onStart,
}: HostedLiveAppPanelProps) {
  const { title, description } = getCopy(phase, canStart, labels);
  const waking = phase === 'waking';

  return (
    <div
      data-hosted-panel
      style={{
        ...demoPanel,
        marginBottom: '1.25rem',
        padding: '1rem 1.25rem',
        fontSize: '0.82rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span aria-hidden="true" style={{ fontSize: '1rem', opacity: 0.6 }}>
          &#9898;
        </span>
        <strong style={{ color: 'var(--text-secondary)' }}>{title}</strong>
      </div>
      <p
        style={{
          margin: canStart ? '0 0 0.75rem' : 0,
          color: 'var(--text-muted)',
          fontSize: '0.78rem',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {canStart && (
        <button
          type="button"
          aria-disabled={waking ? 'true' : undefined}
          onClick={waking ? undefined : onStart}
          style={{
            ...gradientButton(),
            padding: '0.45rem 0.9rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            opacity: waking ? 0.7 : 1,
            cursor: waking ? 'progress' : 'pointer',
          }}
        >
          {phase === 'unavailable' ? labels.hostedRetry : labels.hostedStart}
        </button>
      )}
    </div>
  );
}
