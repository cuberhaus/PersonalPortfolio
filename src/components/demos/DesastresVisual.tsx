import type { Assignment, Board, ToyLayout } from "../../lib/desastresSearch";

const HELI_COLORS = ["#6366f1", "#22c55e", "#f59e0b"];

function project(
  x: number,
  y: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  w: number,
  h: number,
  pad: number,
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
}: {
  layout: ToyLayout;
  assignment: Assignment;
  board: Board;
  title: string;
}) {
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
      <figcaption style={{ color: "#a1a1aa", fontSize: "0.78rem", marginBottom: "0.5rem", lineHeight: 1.45 }}>
        {title}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", maxWidth: W, display: "block", background: "#0c0c12", borderRadius: "0.5rem", border: "1px solid #27272a" }}
        aria-hidden
      >
        {assignment.map((queue, h) => {
          const c = heliToCentro[h] ?? 0;
          const cp = cProj[c];
          if (queue.length === 0) return null;
          const pts = [cp, ...queue.map((gid) => gProj[gid])];
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join(" ");
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
                fill="#1e1e2e"
                stroke="#a78bfa"
                strokeWidth={2}
              />
              <text x={p.px} y={p.py + 5} textAnchor="middle" fill="#e4e4e7" fontSize="11" fontWeight={700}>
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
              <circle cx={p.px} cy={p.py} r={16} fill={col} fillOpacity={0.35} stroke={col} strokeWidth={2} />
              <text x={p.px} y={p.py + 4} textAnchor="middle" fill="#fafafa" fontSize="10" fontWeight={700}>
                {gid}
              </text>
              <text x={p.px} y={p.py + 26} textAnchor="middle" fill="#71717a" fontSize="8">
                {g.nPersonas}p{pri ? "·P" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "0.5rem", fontSize: "0.72rem", color: "#71717a" }}>
        <span>
          <strong style={{ color: "#e4e4e7" }}>Squares</strong> bases (C0: H0,H1 · C1: H2)
        </span>
        <span>
          <strong style={{ color: "#e4e4e7" }}>Circles</strong> groups (id, people, P=priority)
        </span>
        <span>
          <strong style={{ color: "#e4e4e7" }}>Dashed lines</strong> planned visit order per helicopter (queue)
        </span>
      </div>
    </figure>
  );
}

export function QueueStrips({ assignment, board }: { assignment: Assignment; board: Board }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem", marginTop: "0.75rem" }}>
      {assignment.map((q, h) => {
        const c = board.heliToCentro[h] ?? 0;
        const col = HELI_COLORS[h % HELI_COLORS.length];
        return (
          <div
            key={h}
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap" as const,
              gap: "0.35rem",
              padding: "0.5rem 0.65rem",
              background: "#12121a",
              borderRadius: "0.4rem",
              borderLeft: `4px solid ${col}`,
              fontSize: "0.8rem",
            }}
          >
            <span style={{ color: "#e4e4e7", fontWeight: 600, minWidth: "5.5rem" }}>
              H{h} @ C{c}
            </span>
            {q.length === 0 ? (
              <span style={{ color: "#71717a" }}>(no groups)</span>
            ) : (
              q.map((gid, i) => (
                <span key={`${h}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <span style={{ color: "#52525b" }}>→</span>}
                  <span
                    style={{
                      background: `${col}33`,
                      color: "#e4e4e7",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "0.25rem",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "0.76rem",
                    }}
                  >
                    G{gid} ({board.groups[gid].nPersonas}p
                    {board.groups[gid].prioridad === 1 ? ", pri" : ""})
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

export function PerHeliBreakdown({ times, total }: { times: number[]; total: number }) {
  return (
    <div
      style={{
        marginTop: "0.75rem",
        padding: "0.65rem 0.85rem",
        background: "#12121a",
        borderRadius: "0.45rem",
        fontSize: "0.78rem",
        color: "#a1a1aa",
      }}
    >
      <strong style={{ color: "#c4b5fd" }}>Heuristic H2</strong> — sum of per-helicopter completion times
      (batches of ≤15 people, ≤3 groups per sortie, 10&nbsp;min base cooldown between sorties, travel ÷1.67,
      priority doubles per-person pickup time):
      <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }}>
        {times.map((t, h) => (
          <li key={h}>
            <span style={{ color: HELI_COLORS[h % HELI_COLORS.length] }}>H{h}</span> →{" "}
            <strong style={{ color: "#e4e4e7" }}>{t.toFixed(1)}</strong> min (simulated)
          </li>
        ))}
      </ul>
      <p style={{ margin: "0.5rem 0 0", color: "#7dd3fc" }}>
        Sum = <strong>{total.toFixed(2)}</strong> (what HC / SA try to minimize)
      </p>
    </div>
  );
}

export function RunExplainer() {
  return (
    <div
      style={{
        padding: "0.85rem 1rem",
        background: "rgba(99, 102, 241, 0.08)",
        border: "1px solid rgba(129, 140, 248, 0.25)",
        borderRadius: "0.5rem",
        marginBottom: "1rem",
        fontSize: "0.8rem",
        lineHeight: 1.55,
        color: "#c7d2fe",
      }}
    >
      <strong style={{ color: "#e0e7ff" }}>How this demo works</strong>
      <ol style={{ margin: "0.45rem 0 0", paddingLeft: "1.15rem", color: "#a5b4fc" }}>
        <li style={{ marginBottom: "0.35rem" }}>
          <strong style={{ color: "#e4e4e7" }}>Map</strong> — Random 2D layout (seed-fixed): two bases and seven
          groups. Colors show which helicopter owns each group after assignment.
        </li>
        <li style={{ marginBottom: "0.35rem" }}>
          <strong style={{ color: "#e4e4e7" }}>Queues</strong> — Each helicopter has an ordered list: rescue G2,
          then G5, … Swapping two groups anywhere changes the state.
        </li>
        <li>
          <strong style={{ color: "#e4e4e7" }}>HC</strong> picks the best SWAP neighbor until stuck;{" "}
          <strong style={{ color: "#e4e4e7" }}>SA</strong> sometimes accepts worse moves to escape local minima.
        </li>
      </ol>
    </div>
  );
}
