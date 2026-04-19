import { useState, useCallback, useMemo } from "react";
import LiveAppEmbed from "./LiveAppEmbed";
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

import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/pro2demo";

type Lang = "en" | "es" | "ca";

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
    background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
    color: "var(--text-primary)",
  },
  secondaryBtn: {
    background: "var(--border-color)",
    color: "var(--text-secondary)",
  },
  dangerBtn: {
    background: "rgba(239, 68, 68, 0.1)",
    color: "#ef4444",
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
    borderLeft: "3px solid var(--accent-start)",
  },
} as const;

export default function Pro2Demo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
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
      <LiveAppEmbed
        url="http://localhost:8000"
        title="PRO2 Phylogenetic Tree Web App"
        dockerCmd="cd pracpro2 && make docker-run"
        devCmd="cd pracpro2 && make dev"
        lang={lang}
      />

      {/* How it works */}
      <div style={{
        ...styles.card,
        borderLeft: "3px solid var(--accent-start)",
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-start) 5%, transparent), color-mix(in srgb, var(--accent-end) 3%, transparent))",
      }}>
        <h3 style={{ ...styles.h3, marginBottom: "0.75rem" }}>{t.howItWorks}</h3>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>{t.step1}</strong>{t.step1Desc1}<strong style={{ color: "var(--accent-end)" }}>{t.step1Desc2}</strong>{t.step1Desc3}<strong style={{ color: "var(--accent-end)" }}>{t.step1Desc4}</strong>{t.step1Desc5}
          </p>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>{t.step2}</strong>{t.step2Desc1}<strong style={{ color: "var(--accent-end)" }}>{t.step2Desc2}</strong>{t.step2Desc3}<em>{t.step2Desc4}</em>{t.step2Desc5}
          </p>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>{t.step3}</strong>{t.step3Desc1}<em>{t.step3Desc2}</em>{t.step3Desc3}<em>{t.step3Desc4}</em>{t.step3Desc5}
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong style={{ color: "var(--text-primary)" }}>{t.step4}</strong>{t.step4Desc}
          </p>
        </div>
      </div>

      {/* Species input */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ ...styles.h3, marginBottom: 0 }}>{t.speciesTitle}</h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {species.length} {t.speciesLoaded}
          </span>
        </div>

        {species.length > 0 && (
          <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
            <table style={{ ...styles.table, fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: "60px" }}>ID</th>
                  <th style={styles.th}>{t.geneSequence}</th>
                  <th style={{ ...styles.th, width: "50px" }}></th>
                </tr>
              </thead>
              <tbody>
                {species.map((s) => (
                  <tr key={s.id}>
                    <td style={{ ...styles.td, fontWeight: 600, color: "var(--accent-end)" }}>{s.id}</td>
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
            {t.noSpecies}
          </div>
        )}

        <div style={{
          background: "var(--bg-secondary)",
          borderRadius: "0.5rem",
          padding: "1rem",
        }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.65rem" }}>
            {t.addInstruction}
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
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} title={t.kmerTooltip}>k=</label>
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
              {t.addBtn}
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.65rem" }}>
            <button
              style={{ ...styles.button, ...styles.secondaryBtn, fontSize: "0.75rem", padding: "0.35rem 0.85rem" }}
              onClick={loadSample}
            >
              {t.loadSample}
            </button>
            {species.length > 0 && (
              <button
                style={{ ...styles.button, ...styles.dangerBtn, fontSize: "0.75rem", padding: "0.35rem 0.85rem" }}
                onClick={() => { setSpecies([]); setClusterState(null); setHistory([]); setTree(null); }}
              >
                {t.clearAll}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Distance table */}
      {currentDistArray && (
        <div style={styles.card}>
          <h3 style={styles.h3}>{t.distanceTable}</h3>
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
          <h3 style={styles.h3}>{t.wpgmaClustering}</h3>

          {history.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              {history.map((step, i) => (
                <div key={i} style={styles.stepInfo}>
                  <strong>{t.stepWord} {i + 1}:</strong> {t.merged}{" "}
                  <span style={{ color: "var(--accent-end)" }}>{step.merged.id1}</span>{" "}
                  +{" "}
                  <span style={{ color: "var(--accent-end)" }}>{step.merged.id2}</span>{" "}
                  → <span style={{ color: "var(--accent-start)" }}>{step.merged.newId}</span>{" "}
                  ({t.distanceWord} {step.merged.distance.toFixed(2)})
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
                {t.initClusters}
              </button>
            )}
            {clusterState && clusterState.clusters.size > 1 && (
              <>
                <button
                  style={{ ...styles.button, ...styles.primaryBtn }}
                  onClick={doStep}
                >
                  {t.nextStep}
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryBtn }}
                  onClick={runAll}
                >
                  {t.runAll}
                </button>
              </>
            )}
            {clusterState && (
              <button
                style={{ ...styles.button, ...styles.dangerBtn }}
                onClick={reset}
              >
                {t.reset}
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
                {clusterState.clusters.size} {clusterState.clusters.size !== 1 ? t.clusterPlural : t.clusterSingular}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dendrogram */}
      {tree && (
        <div style={styles.card}>
          <h3 style={styles.h3}>{t.phyloTree}</h3>
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
          stroke="var(--accent-start)"
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
