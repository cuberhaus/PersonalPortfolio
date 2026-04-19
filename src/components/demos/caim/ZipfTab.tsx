import { useState, useRef, useEffect, useCallback } from 'react';
import { scaleLinear, scaleLog } from 'd3-scale';
import { select } from 'd3-selection';
import { line } from 'd3-shape';
import { getCorpusData, CORPUS_LABELS, type CorpusId, type WordFreq } from '../../../lib/caim/zipf-data';
import { fitZipf, countWords, type ZipfFitResult } from '../../../lib/caim/zipf-fit';
import { T } from '../../../i18n/demos/caim-zipf';

type Lang = 'en' | 'es' | 'ca';

const CORPUS_IDS: CorpusId[] = ['novels', 'news', 'abstracts'];

interface AnalysisResult {
  words: WordFreq[];
  fit: ZipfFitResult;
}

interface Props {
  lang: Lang;
}

export default function ZipfTab({ lang }: Props) {
  const t = T[lang] || T.en;
  const [activeCorpus, setActiveCorpus] = useState<CorpusId | 'custom'>('novels');
  const [customText, setCustomText] = useState('');
  const [isLog, setIsLog] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const analyzeCorpus = useCallback((corpusId: CorpusId) => {
    setActiveCorpus(corpusId);
    setError(null);
    const data = getCorpusData(corpusId);
    const freqs = data.map((d) => d.frequency);
    const fit = fitZipf(freqs);
    setAnalysisResult({ words: data, fit });
  }, []);

  const analyzeCustom = useCallback(() => {
    setActiveCorpus('custom');
    setError(null);
    const counted = countWords(customText);
    if (counted.length < 5) {
      setError(t.notEnoughWords);
      setAnalysisResult(null);
      return;
    }
    const freqs = counted.map((d) => d.frequency);
    const fit = fitZipf(freqs);
    setAnalysisResult({ words: counted, fit });
  }, [customText, t.notEnoughWords]);

  // Initial analysis
  useEffect(() => { analyzeCorpus('novels'); }, []);

  // Draw chart
  useEffect(() => {
    if (!analysisResult || !chartRef.current) return;
    drawZipfChart(chartRef.current, analysisResult, isLog);
  }, [analysisResult, isLog]);

  return (
    <div>
      {/* Corpus selector */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>{t.corpus}</label>
          <div style={styles.btnGroup}>
            {CORPUS_IDS.map((id) => (
              <button
                key={id}
                onClick={() => analyzeCorpus(id)}
                style={{
                  ...styles.corpusBtn,
                  ...(activeCorpus === id ? styles.corpusBtnActive : {}),
                }}
              >
                {CORPUS_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ ...styles.controlGroup, flex: 1, minWidth: 200 }}>
          <label style={styles.label}>{t.customText}</label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={t.customPlaceholder}
              rows={2}
              style={styles.textarea}
            />
            <button onClick={analyzeCustom} style={styles.analyzeBtn}>{t.analyze}</button>
          </div>
        </div>
        <div style={styles.controlGroup}>
          <button
            onClick={() => setIsLog(!isLog)}
            style={styles.toggleBtn}
          >
            {isLog ? t.linearScale : t.logScale}
          </button>
        </div>
      </div>

      {error && <p style={styles.errorMsg}>{error}</p>}

      {/* Chart */}
      <div ref={chartRef} style={styles.chartContainer} />

      {analysisResult && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {/* Fitted parameters */}
          <div style={{ ...styles.card, minWidth: 180 }}>
            <h4 style={styles.cardTitle}>{t.parameters}</h4>
            <div style={styles.paramGrid}>
              <span style={styles.paramLabel}>a</span>
              <span style={styles.paramValue}>{analysisResult.fit.a}</span>
              <span style={styles.paramLabel}>b</span>
              <span style={styles.paramValue}>{analysisResult.fit.b}</span>
              <span style={styles.paramLabel}>c</span>
              <span style={styles.paramValue}>{analysisResult.fit.c.toFixed(1)}</span>
              <span style={styles.paramLabel}>R²</span>
              <span style={styles.paramValue}>{analysisResult.fit.rSquared.toFixed(4)}</span>
            </div>
            <p style={styles.formula}>f(rank) = c / (rank + b)<sup>a</sup></p>
          </div>

          {/* Word table */}
          <div style={{ ...styles.card, flex: 1, minWidth: 250 }}>
            <h4 style={styles.cardTitle}>{t.words}</h4>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t.rank}</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>{t.word}</th>
                    <th style={styles.th}>{t.frequency}</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult.words.slice(0, 50).map((w, i) => (
                    <tr key={w.word}>
                      <td style={styles.td}>{i + 1}</td>
                      <td style={{ ...styles.td, textAlign: 'left', fontFamily: 'var(--font-mono, monospace)' }}>{w.word}</td>
                      <td style={styles.td}>{w.frequency.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- D3 Chart ---

function drawZipfChart(container: HTMLElement, data: AnalysisResult, isLog: boolean) {
  container.innerHTML = '';
  const W = 600, H = 280;
  const margin = { top: 15, right: 15, bottom: 35, left: 55 };
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top - margin.bottom;

  const svg = select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%');
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const freqs = data.words.map((w) => w.frequency);
  const fitted = data.fit.fitted;
  const n = freqs.length;

  const xDomain: [number, number] = [1, n];
  const yMax = Math.max(freqs[0], 1);
  const yMin = Math.max(freqs[n - 1] || 1, 1);

  const xScale = isLog
    ? scaleLog().domain(xDomain).range([0, iw])
    : scaleLinear().domain(xDomain).range([0, iw]);
  const yScale = isLog
    ? scaleLog().domain([yMin, yMax]).range([ih, 0])
    : scaleLinear().domain([0, yMax]).range([ih, 0]);

  const xTicks = isLog ? logNiceTicks(1, n) : (xScale as any).ticks(6) as number[];
  const yTicks = isLog ? logNiceTicks(yMin, yMax) : (yScale as any).ticks(6) as number[];

  for (const tick of yTicks) {
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yScale(tick)).attr('y2', yScale(tick))
      .attr('stroke', '#1a1a2e').attr('stroke-width', 0.5);
    g.append('text').attr('x', -6).attr('y', yScale(tick) + 3)
      .attr('fill', '#64748b').attr('font-size', '8px').attr('text-anchor', 'end')
      .text(formatSI(tick));
  }
  for (const tick of xTicks) {
    g.append('line').attr('x1', xScale(tick)).attr('x2', xScale(tick)).attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#1a1a2e').attr('stroke-width', 0.5);
    g.append('text').attr('x', xScale(tick)).attr('y', ih + 12)
      .attr('fill', '#64748b').attr('font-size', '8px').attr('text-anchor', 'middle')
      .text(formatSI(tick));
  }

  // Data points
  const step = Math.max(1, Math.floor(n / 400));
  for (let i = 0; i < n; i += step) {
    const cx = xScale(i + 1);
    const cy = yScale(Math.max(freqs[i], isLog ? 1 : 0));
    if (isFinite(cx) && isFinite(cy)) {
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 1.5)
        .attr('fill', '#3b82f6').attr('fill-opacity', 0.6);
    }
  }

  // Fitted curve
  const fittedLine = line<number>()
    .x((_, i) => xScale(i + 1))
    .y((d) => yScale(Math.max(d, isLog ? 1 : 0)))
    .defined((d, i) => {
      const x = xScale(i + 1);
      const y = yScale(Math.max(d, isLog ? 1 : 0));
      return isFinite(x) && isFinite(y);
    });

  g.append('path')
    .datum(fitted)
    .attr('d', fittedLine as any)
    .attr('fill', 'none')
    .attr('stroke', '#ef4444')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,2');

  // Axis labels
  g.append('text').attr('x', iw / 2).attr('y', ih + 28)
    .attr('fill', '#64748b').attr('font-size', '9px').attr('text-anchor', 'middle')
    .text('Rank');
  g.append('text').attr('x', -ih / 2).attr('y', -40)
    .attr('fill', '#64748b').attr('font-size', '9px').attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .text('Frequency');

  // Legend
  g.append('circle').attr('cx', iw - 100).attr('cy', 8).attr('r', 3).attr('fill', '#3b82f6');
  g.append('text').attr('x', iw - 94).attr('y', 11).attr('fill', '#cbd5e1').attr('font-size', '8px').text('Actual');
  g.append('line').attr('x1', iw - 46).attr('x2', iw - 32).attr('y1', 8).attr('y2', 8)
    .attr('stroke', '#ef4444').attr('stroke-width', 1.5).attr('stroke-dasharray', '3,1');
  g.append('text').attr('x', iw - 28).attr('y', 11).attr('fill', '#cbd5e1').attr('font-size', '8px').text('Fitted');
}

function logNiceTicks(lo: number, hi: number): number[] {
  const ticks: number[] = [];
  const minExp = Math.floor(Math.log10(Math.max(1, lo)));
  const maxExp = Math.ceil(Math.log10(Math.max(1, hi)));
  for (let exp = minExp; exp <= maxExp; exp++) {
    const base = Math.pow(10, exp);
    ticks.push(base);
    if (maxExp - minExp <= 3) {
      for (const m of [2, 5]) {
        const v = base * m;
        if (v >= lo && v <= hi) ticks.push(v);
      }
    }
  }
  return ticks.filter((tick) => tick >= lo * 0.9 && tick <= hi * 1.1);
}

function formatSI(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return n >= 100 ? String(Math.round(n)) : n.toPrecision(2);
}

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  controls: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1rem',
    padding: '1rem', marginBottom: '1rem',
    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem',
  },
  controlGroup: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.78rem', color: 'var(--text-muted)' },
  btnGroup: { display: 'flex', gap: '0.3rem' },
  corpusBtn: {
    padding: '0.35rem 0.65rem', borderRadius: '0.35rem', fontSize: '0.72rem', fontWeight: 600,
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
  },
  corpusBtnActive: {
    background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
    color: '#fff', borderColor: 'transparent',
  },
  textarea: {
    flex: 1, minHeight: 40, padding: '0.4rem', borderRadius: '0.35rem',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    color: 'var(--text-primary)', fontSize: '0.72rem', fontFamily: 'var(--font-mono, monospace)',
    resize: 'vertical',
  },
  analyzeBtn: {
    padding: '0.35rem 0.7rem', borderRadius: '0.35rem', border: 'none',
    background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
    color: '#fff', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', alignSelf: 'flex-end',
  },
  toggleBtn: {
    padding: '0.35rem 0.65rem', borderRadius: '0.35rem', fontSize: '0.72rem', fontWeight: 600,
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)', cursor: 'pointer',
  },
  errorMsg: {
    padding: '0.5rem 0.75rem', marginBottom: '0.75rem', borderRadius: '0.4rem',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444', fontSize: '0.78rem',
  },
  chartContainer: {
    width: '100%', minHeight: 200, borderRadius: '0.5rem', overflow: 'hidden',
    background: '#0a0a15', padding: '0.5rem',
  },
  card: {
    padding: '1rem', background: 'var(--bg-card)',
    border: '1px solid var(--border-color)', borderRadius: '0.75rem',
  },
  cardTitle: { margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' },
  paramGrid: {
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.75rem',
    fontSize: '0.82rem',
  },
  paramLabel: { color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontStyle: 'italic' },
  paramValue: { color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 },
  formula: {
    marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono, monospace)', fontStyle: 'italic',
  },
  tableWrap: { maxHeight: 360, overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
  th: {
    padding: '0.4rem 0.6rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase',
  },
  td: {
    padding: '0.35rem 0.6rem', textAlign: 'center',
    borderBottom: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)',
    color: 'var(--text-secondary)',
  },
};
