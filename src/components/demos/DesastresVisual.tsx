import type { Assignment, Board, ToyLayout } from '../../lib/desastresSearch';
import { TRANSLATIONS } from '../../i18n/demos/desastres-ia-demo';

type Lang = 'en' | 'es' | 'ca';

function getVisualTranslations(lang: Lang): Record<string, string> {
  const locale = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return (((locale as any).visual ?? (TRANSLATIONS.en as any).visual) || {}) as Record<
    string,
    string
  >;
}

const HELI_COLORS = ['var(--accent-start)', 'var(--accent-end)', 'var(--text-muted)'];

function project(
  x: number,
  y: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  w: number,
  h: number,
  pad: number
): { px: number; py: number } {
  const rw = maxX - minX || 1;
  const rh = maxY - minY || 1;
  return {
    px: pad + ((x - minX) / rw) * (w - 2 * pad),
    py: pad + ((y - minY) / rh) * (h - 2 * pad),
  };
}

/** Who rescues group g (index in assign) */
function groupOwner(assign: Assignment, g: number): number {
  for (let h = 0; h < assign.length; h++) {
    if (assign[h].includes(g)) return h;
  }
  return 0;
}

export function AssignmentMapFigure({
  layout,
  assignment,
  board,
  title,
  lang = 'en',
}: {
  layout: ToyLayout;
  assignment: Assignment;
  board: Board;
  title: string;
  lang?: Lang;
}) {
  const t = getVisualTranslations(lang);
  const { centerPos, groupPos, heliToCentro } = layout;
  const allX = [...centerPos.map((p) => p.x), ...groupPos.map((p) => p.x)];
  const allY = [...centerPos.map((p) => p.y), ...groupPos.map((p) => p.y)];
  const minX = Math.min(...allX) - 3;
  const maxX = Math.max(...allX) + 3;
  const minY = Math.min(...allY) - 3;
  const maxY = Math.max(...allY) + 3;
  const W = 420;
  const H = 280;
  const pad = 36;

  const cProj = centerPos.map((p) => project(p.x, p.y, minX, maxX, minY, maxY, W, H, pad));
  const gProj = groupPos.map((p) => project(p.x, p.y, minX, maxX, minY, maxY, W, H, pad));

  return (
    <figure style={{ margin: 0 }}>
      <figcaption
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.78rem',
          marginBottom: '0.5rem',
          lineHeight: 1.45,
        }}
      >
        {title}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: '100%',
          maxWidth: W,
          display: 'block',
          background: 'var(--bg-secondary)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)',
        }}
        aria-hidden
      >
        {assignment.map((queue, h) => {
          const c = heliToCentro[h] ?? 0;
          const cp = cProj[c];
          if (queue.length === 0) return null;
          const pts = [cp, ...queue.map((gid) => gProj[gid])];
          const d = pts
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px.toFixed(1)} ${p.py.toFixed(1)}`)
            .join(' ');
          return (
            <path
              key={h}
              d={d}
              fill="none"
              stroke={HELI_COLORS[h % HELI_COLORS.length]}
              strokeWidth={2.2}
              strokeDasharray="6 4"
              opacity={0.85}
              strokeLinejoin="round"
            />
          );
        })}
        {centerPos.map((_, c) => {
          const p = cProj[c];
          return (
            <g key={`c${c}`}>
              <rect
                x={p.px - 18}
                y={p.py - 18}
                width={36}
                height={36}
                rx={6}
                fill="var(--bg-card)"
                stroke="var(--accent-start)"
                strokeWidth={2}
              />
              <text
                x={p.px}
                y={p.py + 5}
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="11"
                fontWeight={700}
              >
                C{c}
              </text>
            </g>
          );
        })}
        {groupPos.map((_, gid) => {
          const p = gProj[gid];
          const h = groupOwner(assignment, gid);
          const col = HELI_COLORS[h % HELI_COLORS.length];
          const g = board.groups[gid];
          const pri = g.prioridad === 1;
          return (
            <g key={`g${gid}`}>
              <circle
                cx={p.px}
                cy={p.py}
                r={16}
                fill={col}
                fillOpacity={0.35}
                stroke={col}
                strokeWidth={2}
              />
              <text
                x={p.px}
                y={p.py + 4}
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="10"
                fontWeight={700}
              >
                {gid}
              </text>
              <text
                x={p.px}
                y={p.py + 26}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="8"
              >
                {g.nPersonas}p{pri ? t.pri : ''}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          marginTop: '0.5rem',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>{t.squares}</strong>
          {t.squaresDesc}
        </span>
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>{t.circles}</strong>
          {t.circlesDesc}
        </span>
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>{t.dashed}</strong>
          {t.dashedDesc}
        </span>
      </div>
    </figure>
  );
}

export function QueueStrips({
  assignment,
  board,
  lang = 'en',
}: {
  assignment: Assignment;
  board: Board;
  lang?: Lang;
}) {
  const t = getVisualTranslations(lang);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.5rem',
        marginTop: '0.75rem',
      }}
    >
      {assignment.map((q, h) => {
        const c = board.heliToCentro[h] ?? 0;
        const col = HELI_COLORS[h % HELI_COLORS.length];
        return (
          <div
            key={h}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap' as const,
              gap: '0.35rem',
              padding: '0.5rem 0.65rem',
              background: 'var(--bg-secondary)',
              borderRadius: '0.4rem',
              borderLeft: `4px solid ${col}`,
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '5.5rem' }}>
              H{h} @ C{c}
            </span>
            {q.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>{t.noGroups}</span>
            ) : (
              q.map((gid, i) => (
                <span
                  key={`${h}-${i}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {i > 0 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                  <span
                    style={{
                      background: `${col}33`,
                      color: 'var(--text-primary)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '0.25rem',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.76rem',
                    }}
                  >
                    G{gid} ({board.groups[gid].nPersonas}p
                    {board.groups[gid].prioridad === 1 ? t.pri : ''})
                  </span>
                </span>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PerHeliBreakdown({
  times,
  total,
  lang = 'en',
}: {
  times: number[];
  total: number;
  lang?: Lang;
}) {
  const t = getVisualTranslations(lang);
  return (
    <div
      style={{
        marginTop: '0.75rem',
        padding: '0.65rem 0.85rem',
        background: 'var(--bg-secondary)',
        borderRadius: '0.45rem',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
      }}
    >
      <strong style={{ color: 'var(--text-primary)' }}>{t.heuristicH2}</strong>
      {t.h2Desc}
      <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
        {times.map((time, h) => (
          <li key={h}>
            <span style={{ color: HELI_COLORS[h % HELI_COLORS.length] }}>H{h}</span> →{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{time.toFixed(1)}</strong>
            {t.simulated}
          </li>
        ))}
      </ul>
      <p style={{ margin: '0.5rem 0 0', color: 'var(--text-primary)' }}>
        {t.sum} <strong>{total.toFixed(2)}</strong>
        {t.minimize}
      </p>
    </div>
  );
}

export function RunExplainer({ lang = 'en' }: { lang?: Lang }) {
  const t = getVisualTranslations(lang);
  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        background: 'color-mix(in srgb, var(--accent-start) 8%, transparent)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.8rem',
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
      }}
    >
      <strong style={{ color: 'var(--text-primary)' }}>{t.howItWorks}</strong>
      <ol style={{ margin: '0.45rem 0 0', paddingLeft: '1.15rem', color: 'var(--text-muted)' }}>
        <li style={{ marginBottom: '0.35rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{t.map}</strong>
          {t.mapDesc}
        </li>
        <li style={{ marginBottom: '0.35rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{t.queues}</strong>
          {t.queuesDesc}
        </li>
        <li>
          <strong style={{ color: 'var(--text-primary)' }}>{t.hc}</strong>
          {t.hcDesc}
          <strong style={{ color: 'var(--text-primary)' }}>{t.sa}</strong>
          {t.saDesc}
        </li>
      </ol>
    </div>
  );
}
