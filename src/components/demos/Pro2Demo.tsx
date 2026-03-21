import { useState, useCallback, useMemo } from "react";
import {
  type Species,
  type ClusterState,
  type TreeNode,
  type WpgmaStep,
  buildDistanceTable,
  initClusters,
  wpgmaStep,
  distanceTableToArray,
  SAMPLE_SPECIES,
  DEFAULT_K,
} from "../../lib/wpgma";

const styles = {
  wrapper: {
    fontFamily: "var(--font-sans, 'Inter', sans-serif)",
    color: "var(--text-primary)",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  h3: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: "var(--text-primary)",
  },
  inputGroup: {
    display: "flex" as const,
    gap: "0.5rem",
    marginBottom: "0.75rem",
    flexWrap: "wrap" as const,
  },
  input: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    fontFamily: "monospace",
    outline: "none",
  },
  button: {
    padding: "0.5rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "var(--text-primary)",
  },
  secondaryBtn: {
    background: "var(--border-color)",
    color: "var(--text-secondary)",
  },
  dangerBtn: {
    background: "#371520",
    color: "#f87171",
  },
  tag: {
    display: "inline-block",
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    background: "var(--bg-secondary)",
    padding: "0.2rem 0.6rem",
    borderRadius: "0.5rem",
    marginRight: "0.35rem",
    marginBottom: "0.35rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.8rem",
    fontFamily: "monospace",
  },
  th: {
    padding: "0.5rem",
    borderBottom: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    fontWeight: 500,
    textAlign: "left" as const,
  },
  td: {
    padding: "0.5rem",
    borderBottom: "1px solid var(--bg-card-hover)",
    color: "var(--text-primary)",
  },
  tdMuted: {
    padding: "0.5rem",
    borderBottom: "1px solid var(--bg-card-hover)",
    color: "var(--text-muted)",
  },
  stepInfo: {
    background: "var(--bg-secondary)",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    marginBottom: "1rem",
    borderLeft: "3px solid #6366f1",
  },
} as const;

export default function Pro2Demo() {
  const [species, setSpecies] = useState<Species[]>([...SAMPLE_SPECIES]);
  const [k, setK] = useState(DEFAULT_K);
  const [newId, setNewId] = useState("");
  const [newGene, setNewGene] = useState("");
  const [clusterState, setClusterState] = useState<ClusterState | null>(null);
  const [history, setHistory] = useState<WpgmaStep[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);

  const distTable = useMemo(
    () => (species.length >= 2 ? buildDistanceTable(species, k) : null),
    [species, k]
  );

  const currentDistArray = useMemo(() => {
    const d = clusterState?.distances ?? distTable?.distances;
    return d ? distanceTableToArray(d) : null;
  }, [clusterState, distTable]);

  const addSpecies = useCallback(() => {
    const trimId = newId.trim().toUpperCase();
    const trimGene = newGene.trim().toUpperCase();
    if (!trimId || !trimGene) return;
    if (species.some((s) => s.id === trimId)) return;
    if (!/^[ACGT]+$/.test(trimGene)) return;
    setSpecies((prev) => [...prev, { id: trimId, gene: trimGene }]);
    setNewId("");
    setNewGene("");
    setClusterState(null);
    setHistory([]);
    setTree(null);
  }, [newId, newGene, species]);

  const removeSpecies = useCallback(
    (id: string) => {
      setSpecies((prev) => prev.filter((s) => s.id !== id));
      setClusterState(null);
      setHistory([]);
      setTree(null);
    },
    []
  );

  const loadSample = useCallback(() => {
    setSpecies([...SAMPLE_SPECIES]);
    setK(DEFAULT_K);
    setClusterState(null);
    setHistory([]);
    setTree(null);
  }, []);

  const startClustering = useCallback(() => {
    if (!distTable) return;
    setClusterState(initClusters(distTable));
    setHistory([]);
    setTree(null);
  }, [distTable]);

  const doStep = useCallback(() => {
    if (!clusterState) return;
    const step = wpgmaStep(clusterState);
    if (!step) return;
    setClusterState(step.state);
    setHistory((prev) => [...prev, step]);
    if (step.state.clusters.size === 1) {
      setTree([...step.state.clusters.values()][0]);
    }
  }, [clusterState]);

  const runAll = useCallback(() => {
    if (!distTable) return;
    let state = clusterState ?? initClusters(distTable);
    const steps: WpgmaStep[] = [...history];
    while (state.clusters.size > 1) {
      const step = wpgmaStep(state);
      if (!step) break;
      state = step.state;
      steps.push(step);
    }
    setClusterState(state);
    setHistory(steps);
    if (state.clusters.size === 1) {
      setTree([...state.clusters.values()][0]);
    }
  }, [distTable, clusterState, history]);

  const reset = useCallback(() => {
    setClusterState(null);
    setHistory([]);
    setTree(null);
  }, []);

  return (
    <div style={styles.wrapper}>
      {/* How it works */}
      <div style={{
        ...styles.card,
        borderLeft: "3px solid #6366f1",
        background: "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(168,85,247,0.03))",
      }}>
        <h3 style={{ ...styles.h3, marginBottom: "0.75rem" }}>How it works</h3>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>1. Add species</strong> — each species has an <strong style={{ color: "#a855f7" }}>ID</strong> (a short name) and a <strong style={{ color: "#a855f7" }}>gene sequence</strong> made of nucleotides (A, C, G, T).
          </p>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>2. Distance table</strong> — distances between species are computed using <strong style={{ color: "#a855f7" }}>k-mer analysis</strong>: the gene is split into overlapping subsequences of length <em>k</em>, and species are compared by how many k-mers they share.
          </p>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>3. WPGMA clustering</strong> — the algorithm repeatedly merges the two closest clusters, averaging their distances to all other clusters. Click <em>Next Step</em> to watch it happen, or <em>Run All</em> to jump to the final tree.
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong style={{ color: "var(--text-primary)" }}>4. Dendrogram</strong> — the resulting phylogenetic tree shows how species are related. Closer branches = more similar genes.
          </p>
        </div>
      </div>

      {/* Species input */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ ...styles.h3, marginBottom: 0 }}>Species</h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {species.length} species loaded
          </span>
        </div>

        {species.length > 0 && (
          <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
            <table style={{ ...styles.table, fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: "60px" }}>ID</th>
                  <th style={styles.th}>Gene Sequence</th>
                  <th style={{ ...styles.th, width: "50px" }}></th>
                </tr>
              </thead>
              <tbody>
                {species.map((s) => (
                  <tr key={s.id}>
                    <td style={{ ...styles.td, fontWeight: 600, color: "#a855f7" }}>{s.id}</td>
                    <td style={{
                      ...styles.td,
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      letterSpacing: "0.05em",
                      wordBreak: "break-all" as const,
                    }}>
                      {s.gene.split("").map((c, i) => (
                        <span key={i} style={{
                          color: c === "A" ? "#4ade80" : c === "C" ? "#60a5fa" : c === "G" ? "#facc15" : "#f87171",
                        }}>{c}</span>
                      ))}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => removeSpecies(s.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "0.2rem 0.4rem",
                          fontSize: "0.85rem",
                          borderRadius: "0.25rem",
                          transition: "color 0.15s",
                        }}
                        title="Remove species"
                        onMouseOver={(e) => (e.currentTarget.style.color = "#f87171")}
                        onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {species.length === 0 && (
          <div style={{
            padding: "2rem",
            textAlign: "center" as const,
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}>
            No species added yet. Add some below or load the sample dataset.
          </div>
        )}

        <div style={{
          background: "var(--bg-secondary)",
          borderRadius: "0.5rem",
          padding: "1rem",
        }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.65rem" }}>
            Add a new species — ID is a short name, Gene is a sequence of A, C, G, T nucleotides
          </div>
          <div style={styles.inputGroup}>
            <input
              style={{ ...styles.input, width: "80px" }}
              placeholder="e.g. F"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              maxLength={8}
            />
            <input
              style={{ ...styles.input, flex: 1, minWidth: "150px" }}
              placeholder="e.g. AACTGCTTGA"
              value={newGene}
              onChange={(e) => setNewGene(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSpecies()}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} title="k-mer length: longer k means more precise distance but needs longer genes">k=</label>
              <input
                type="number"
                style={{ ...styles.input, width: "55px" }}
                value={k}
                min={1}
                max={10}
                onChange={(e) => {
                  setK(Number(e.target.value));
                  setClusterState(null);
                  setHistory([]);
                  setTree(null);
                }}
              />
            </div>
            <button
              style={{ ...styles.button, ...styles.primaryBtn }}
              onClick={addSpecies}
            >
              Add
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.65rem" }}>
            <button
              style={{ ...styles.button, ...styles.secondaryBtn, fontSize: "0.75rem", padding: "0.35rem 0.85rem" }}
              onClick={loadSample}
            >
              Load Sample (5 species)
            </button>
            {species.length > 0 && (
              <button
                style={{ ...styles.button, ...styles.dangerBtn, fontSize: "0.75rem", padding: "0.35rem 0.85rem" }}
                onClick={() => { setSpecies([]); setClusterState(null); setHistory([]); setTree(null); }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Distance table */}
      {currentDistArray && (
        <div style={styles.card}>
          <h3 style={styles.h3}>Distance Table</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}></th>
                  {currentDistArray.ids.map((id) => (
                    <th key={id} style={styles.th}>
                      {id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentDistArray.ids.map((rowId, i) => (
                  <tr key={rowId}>
                    <td style={{ ...styles.th, fontWeight: 600 }}>{rowId}</td>
                    {currentDistArray.ids.map((colId, j) => {
                      const val = currentDistArray.matrix[i][j];
                      if (i === j)
                        return (
                          <td key={colId} style={styles.tdMuted}>
                            —
                          </td>
                        );
                      if (val === null)
                        return (
                          <td key={colId} style={styles.tdMuted}>
                            —
                          </td>
                        );
                      return (
                        <td key={colId} style={styles.td}>
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Controls */}
      {species.length >= 2 && (
        <div style={styles.card}>
          <h3 style={styles.h3}>WPGMA Clustering</h3>

          {history.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              {history.map((step, i) => (
                <div key={i} style={styles.stepInfo}>
                  <strong>Step {i + 1}:</strong> Merged{" "}
                  <span style={{ color: "#a855f7" }}>{step.merged.id1}</span>{" "}
                  +{" "}
                  <span style={{ color: "#a855f7" }}>{step.merged.id2}</span>{" "}
                  → <span style={{ color: "#6366f1" }}>{step.merged.newId}</span>{" "}
                  (distance: {step.merged.distance.toFixed(2)})
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {!clusterState && (
              <button
                style={{ ...styles.button, ...styles.primaryBtn }}
                onClick={startClustering}
              >
                Initialize Clusters
              </button>
            )}
            {clusterState && clusterState.clusters.size > 1 && (
              <>
                <button
                  style={{ ...styles.button, ...styles.primaryBtn }}
                  onClick={doStep}
                >
                  Next Step
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryBtn }}
                  onClick={runAll}
                >
                  Run All
                </button>
              </>
            )}
            {clusterState && (
              <button
                style={{ ...styles.button, ...styles.dangerBtn }}
                onClick={reset}
              >
                Reset
              </button>
            )}
            {clusterState && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  alignSelf: "center",
                }}
              >
                {clusterState.clusters.size} cluster
                {clusterState.clusters.size !== 1 ? "s" : ""} remaining
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dendrogram */}
      {tree && (
        <div style={styles.card}>
          <h3 style={styles.h3}>Phylogenetic Tree</h3>
          <div style={{ overflowX: "auto" }}>
            <Dendrogram tree={tree} />
          </div>
        </div>
      )}
    </div>
  );
}

function getLeaves(node: TreeNode): string[] {
  if (!node.left && !node.right) return [node.id];
  return [
    ...(node.left ? getLeaves(node.left) : []),
    ...(node.right ? getLeaves(node.right) : []),
  ];
}

function getMaxDepth(node: TreeNode): number {
  if (!node.left && !node.right) return 0;
  return Math.max(
    node.left ? getMaxDepth(node.left) + 1 : 0,
    node.right ? getMaxDepth(node.right) + 1 : 0
  );
}

function Dendrogram({ tree }: { tree: TreeNode }) {
  const leaves = getLeaves(tree);
  const leafCount = leaves.length;
  const leafSpacing = 60;
  const width = Math.max(leafCount * leafSpacing + 80, 300);
  const height = 300;
  const margin = { top: 40, bottom: 40, left: 20, right: 20 };
  const plotH = height - margin.top - margin.bottom;

  const maxDist =
    tree.distance > 0 ? tree.distance : getMaxDepth(tree) * 10 + 10;

  const leafX = new Map<string, number>();
  leaves.forEach((id, i) => {
    leafX.set(id, margin.left + 40 + i * leafSpacing);
  });

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const labels: { x: number; y: number; text: string }[] = [];
  const distLabels: { x: number; y: number; text: string }[] = [];

  function layout(node: TreeNode): { x: number; y: number } {
    if (!node.left && !node.right) {
      const x = leafX.get(node.id) ?? 0;
      const y = margin.top + plotH;
      labels.push({ x, y: y + 16, text: node.id });
      return { x, y };
    }

    const leftPos = node.left ? layout(node.left) : { x: 0, y: 0 };
    const rightPos = node.right ? layout(node.right) : { x: 0, y: 0 };

    const x = (leftPos.x + rightPos.x) / 2;
    const y = margin.top + plotH * (1 - node.distance / maxDist);

    lines.push({ x1: leftPos.x, y1: leftPos.y, x2: leftPos.x, y2: y });
    lines.push({ x1: rightPos.x, y1: rightPos.y, x2: rightPos.x, y2: y });
    lines.push({ x1: leftPos.x, y1: y, x2: rightPos.x, y2: y });

    distLabels.push({
      x,
      y: y - 6,
      text: node.distance.toFixed(1),
    });

    return { x, y };
  }

  layout(tree);

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", margin: "0 auto" }}
    >
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="#6366f1"
          strokeWidth={2}
        />
      ))}
      {labels.map((l, i) => (
        <text
          key={`label-${i}`}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize={13}
          fontWeight={600}
          fontFamily="'Inter', sans-serif"
        >
          {l.text}
        </text>
      ))}
      {distLabels.map((l, i) => (
        <text
          key={`dist-${i}`}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize={10}
          fontFamily="monospace"
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}
