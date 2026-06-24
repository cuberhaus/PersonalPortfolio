import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Hospital,
  MapPin,
  Brush,
  Brain,
  TrendingUp,
} from 'lucide-react';
import pcaPointsData from '../../data/pca_points.json' with { type: 'json' };
import { clamp, dist2, knnVote, predict, absCoefs, maxCoef } from '../../lib/apa-predictor';
import type { Pt } from '../../lib/apa-predictor';
import { getThemeColors, lighten, withAlpha } from '../../lib/demo-theme';
import { withDemoErrorBoundary } from '../DemoErrorBoundary';

/* ── constants ── */
const CW = 520;
const CH = 340;
const GH = 'https://github.com/cuberhaus/APA_Practica';
const NB = 'https://nbviewer.org/github/cuberhaus/APA_Practica/blob/main';
const MAIN_NB = 'PracticaAPA-Hipotiroidismo-PolCasacubertaMartaGranero.ipynb';
const LINEAR_NB = 'PracticaAPA-Hipotiroidismo-ModelsLineals.ipynb';

import { TRANSLATIONS } from '../../i18n/demos/apa-practica-demo';
import { useDemoLifecycle, useDebug } from '../../lib/useDebug';
import { gradientButton } from './_styles';

type Lang = 'en' | 'es' | 'ca';

type FeatureMeta = { key: string; label: string; unit: string; color: string };

const FALLBACK_FEATURES: FeatureMeta[] = [
  { key: 'age', label: 'Age', unit: 'years', color: '#60a5fa' },
  { key: 'tsh', label: 'TSH', unit: 'mIU/L', color: '#f59e0b' },
  { key: 'tt4', label: 'TT4', unit: 'nmol/L', color: '#a78bfa' },
  { key: 't3', label: 'T3', unit: 'nmol/L', color: '#34d399' },
];

function loadRealPoints(): Pt[] {
  return pcaPointsData.map((p) => ({
    x: 18 + p.x * (CW - 36),
    y: 18 + p.y * (CH - 36),
    cls: p.cls as 0 | 1,
  }));
}

/* ── shared styles ── */
const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '1rem',
  padding: '1.5rem',
} as const;

const accent1 = 'var(--accent-start)';
const accent2 = 'var(--accent-end)';
const negative = 'var(--accent-end)';
const positive = 'var(--accent-start)';

/* ════════════════════════════════════════════════════════════════════════ */
/*  KNN CANVAS                                                            */
/* ════════════════════════════════════════════════════════════════════════ */
function KnnCanvas({ t, log }: { t: typeof TRANSLATIONS.en; log: ReturnType<typeof useDebug> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useMemo(() => loadRealPoints(), []);
  const [k, setK] = useState(5);
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null);

  const redraw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    cvs.width = CW * dpr;
    cvs.height = CH * dpr;
    cvs.style.width = '100%';
    cvs.style.height = 'auto';
    ctx.scale(dpr, dpr);

    // bg
    ctx.clearRect(0, 0, CW, CH);

    // grid
    ctx.strokeStyle = 'rgba(128,128,128,0.2)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= CW; g += 40) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, CH);
      ctx.stroke();
    }
    for (let g = 0; g <= CH; g += 40) {
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(CW, g);
      ctx.stroke();
    }

    // axis labels
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(128,128,128,0.8)';
    ctx.fillText('PC1 →', CW - 50, CH - 8);
    ctx.save();
    ctx.translate(12, 50);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('PC2 →', 0, 0);
    ctx.restore();

    // neighbor lines
    let neighbors: Pt[] = [];
    if (query) {
      neighbors = knnVote(query.x, query.y, points, k).neighbors;
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (const n of neighbors) {
        ctx.beginPath();
        ctx.moveTo(query.x, query.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // dots
    const tc = getThemeColors();
    for (const p of points) {
      const isNeighbor = neighbors.includes(p);
      ctx.beginPath();
      ctx.arc(p.x, p.y, isNeighbor ? 6.5 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle =
        p.cls === 0
          ? isNeighbor
            ? lighten(tc.accentEnd, 0.3)
            : withAlpha(tc.accentEnd, 0.5)
          : isNeighbor
            ? lighten(tc.accentStart, 0.3)
            : withAlpha(tc.accentStart, 0.5);
      ctx.fill();
      if (isNeighbor) {
        ctx.strokeStyle = p.cls === 0 ? tc.accentEnd : tc.accentStart;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // query point
    if (query) {
      const { cls } = knnVote(query.x, query.y, points, k);
      // glow
      const grd = ctx.createRadialGradient(query.x, query.y, 0, query.x, query.y, 22);
      grd.addColorStop(0, withAlpha(cls === 0 ? tc.accentEnd : tc.accentStart, 0.25));
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(query.x, query.y, 22, 0, Math.PI * 2);
      ctx.fill();
      // crosshair
      ctx.strokeStyle = 'rgba(128,128,128,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(query.x, query.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(query.x - 12, query.y);
      ctx.lineTo(query.x + 12, query.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(query.x, query.y - 12);
      ctx.lineTo(query.x, query.y + 12);
      ctx.stroke();
    }
  }, [points, query, k]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * CW, 10, CW - 10);
    const y = clamp(((e.clientY - rect.top) / rect.height) * CH, 10, CH - 10);
    setQuery({ x, y });
  };

  const pred = query ? knnVote(query.x, query.y, points, k).cls : null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>k =</span>
        {[3, 5, 7, 11].map((kv) => (
          <button
            key={kv}
            type="button"
            onClick={() => {
              log.info('knn-k', { k: kv });
              setK(kv);
            }}
            style={
              k === kv
                ? {
                    ...gradientButton({ accent1, accent2 }),
                    padding: '0.3rem 0.65rem',
                    borderRadius: '0.4rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    transition: 'all 0.15s',
                  }
                : {
                    padding: '0.3rem 0.65rem',
                    borderRadius: '0.4rem',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }
            }
          >
            {kv}
          </button>
        ))}
        {query && (
          <button
            type="button"
            onClick={() => setQuery(null)}
            style={{
              marginLeft: 'auto',
              padding: '0.3rem 0.65rem',
              borderRadius: '0.4rem',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {t.clear}
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onClick={onCanvasClick}
        width={CW}
        height={CH}
        style={{
          display: 'block',
          borderRadius: '0.75rem',
          border: '1px solid var(--border-color)',
          cursor: 'crosshair',
          width: '100%',
          aspectRatio: `${CW}/${CH}`,
          background: 'var(--bg-secondary)',
        }}
        aria-label="k-NN PCA demo"
      />
      <div style={{ marginTop: '0.75rem', minHeight: '1.3rem', fontSize: '0.85rem' }}>
        {pred !== null ? (
          <span>
            {t.prediction}{' '}
            <strong style={{ color: pred === 0 ? negative : positive }}>
              {pred === 0 ? t.negative : t.positive}
            </strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              · {k} {t.nn}
            </span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>{t.clickToPlot}</span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  PREDICTOR                                                             */
/* ════════════════════════════════════════════════════════════════════════ */
function Predictor({ t, featMeta }: { t: typeof TRANSLATIONS.en; featMeta: FeatureMeta[] }) {
  const [age, setAge] = useState(50);
  const [tsh, setTsh] = useState(2.0);
  const [tt4, setTt4] = useState(109);
  const [t3, setT3] = useState(2.0);

  const { isHypo, probability } = predict(age, tsh, tt4, t3);
  const conf = isHypo ? (1 - probability) * 100 : probability * 100;

  return (
    <div>
      <FeatureSlider
        label={featMeta[0].label}
        value={age}
        set={setAge}
        min={1}
        max={100}
        step={1}
        unit={featMeta[0].unit}
        color={featMeta[0].color}
      />
      <FeatureSlider
        label={featMeta[1].label}
        value={tsh}
        set={setTsh}
        min={0}
        max={200}
        step={0.1}
        unit={featMeta[1].unit}
        color={featMeta[1].color}
      />
      <FeatureSlider
        label={featMeta[2].label}
        value={tt4}
        set={setTt4}
        min={0}
        max={300}
        step={1}
        unit={featMeta[2].unit}
        color={featMeta[2].color}
      />
      <FeatureSlider
        label={featMeta[3].label}
        value={t3}
        set={setT3}
        min={0}
        max={10}
        step={0.1}
        unit={featMeta[3].unit}
        color={featMeta[3].color}
      />

      {/* result */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1.25rem',
          borderRadius: '0.75rem',
          background: isHypo
            ? 'linear-gradient(135deg, rgba(251,113,133,0.08), rgba(251,113,133,0.03))'
            : 'linear-gradient(135deg, rgba(45,212,191,0.08), rgba(45,212,191,0.03))',
          border: `1px solid ${isHypo ? 'rgba(251,113,133,0.25)' : 'rgba(45,212,191,0.25)'}`,
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              background: isHypo ? 'rgba(251,113,133,0.15)' : 'rgba(45,212,191,0.15)',
            }}
          >
            {isHypo ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </div>
          <div>
            <div
              style={{ fontSize: '1.1rem', fontWeight: 700, color: isHypo ? positive : negative }}
            >
              {isHypo ? t.likelyHypo : t.likelyNeg}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {t.confidence.replace('{0}', conf.toFixed(1))}
            </div>
          </div>
        </div>
        {/* confidence bar */}
        <div
          style={{
            marginTop: '0.85rem',
            height: 6,
            borderRadius: 3,
            background: 'var(--bg-card-hover)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${conf}%`,
              height: '100%',
              borderRadius: 3,
              background: isHypo
                ? 'var(--accent-gradient)'
                : 'linear-gradient(90deg, var(--accent-end), var(--accent-start))',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureSlider({
  label,
  value,
  set,
  min,
  max,
  step,
  unit,
  color,
}: {
  label: string;
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: '0.82rem',
            fontFamily: 'ui-monospace, monospace',
            color: 'var(--text-primary)',
          }}
        >
          {value} <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{unit}</span>
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => set(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        aria-label={`${label} (${unit})`}
        style={{ width: '100%', accentColor: color, height: '6px' }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  FEATURE IMPORTANCE                                                    */
/* ════════════════════════════════════════════════════════════════════════ */
function FeatureImportance({
  t,
  featMeta,
}: {
  t: typeof TRANSLATIONS.en;
  featMeta: FeatureMeta[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {featMeta.map((f, i: number) => (
        <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              width: 36,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textAlign: 'right',
            }}
          >
            {f.label}
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: 'var(--bg-card-hover)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(absCoefs[i] / maxCoef) * 100}%`,
                height: '100%',
                borderRadius: 4,
                background: `linear-gradient(90deg, ${f.color}80, ${f.color})`,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <span
            style={{
              width: 45,
              fontSize: '0.7rem',
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--text-muted)',
              textAlign: 'right',
            }}
          >
            {absCoefs[i].toFixed(2)}
          </span>
        </div>
      ))}
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
        {t.featNote}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
function ApaPracticaDemo({ lang = 'en' }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const pipelineSteps =
    Array.isArray((t as Record<string, unknown>).pipelineSteps) &&
    ((t as Record<string, unknown>).pipelineSteps as unknown[]).length > 0
      ? ((t as Record<string, unknown>).pipelineSteps as Array<{
          icon?: string;
          title?: string;
          desc?: string;
        }>)
      : [
          {
            icon: (t as Record<string, string>).icon ?? <CheckCircle size={16} />,
            title: (t as Record<string, string>).title ?? 'Evaluate',
            desc: (t as Record<string, string>).desc ?? '',
          },
        ];
  const modelsList = Array.isArray((t as Record<string, unknown>).modelsList)
    ? ((t as Record<string, unknown>).modelsList as string[])
    : [];
  const featMeta =
    Array.isArray((t as Record<string, unknown>).featMeta) &&
    ((t as Record<string, unknown>).featMeta as unknown[]).length >= 4
      ? ((t as Record<string, unknown>).featMeta as FeatureMeta[])
      : FALLBACK_FEATURES;
  useDemoLifecycle('demo:apa', { lang });
  const log = useDebug('demo:apa');
  const [showNb, setShowNb] = useState(false);
  const [nbFile, setNbFile] = useState(MAIN_NB);

  return (
    <div
      style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: 'var(--text-primary)' }}
    >
      {/* ── PIPELINE STRIP ── */}
      <div
        style={{
          ...card,
          marginBottom: '1.25rem',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '0.35rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              background: 'var(--accent-gradient)',
              color: 'var(--text-primary)',
            }}
          >
            {t.mlPipeline}
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t.course}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {t.with}{' '}
            <a
              href="https://github.com/martagranero"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-text)', textDecoration: 'none' }}
            >
              Marta Granero
            </a>
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
          }}
        >
          {pipelineSteps.map((step, i: number) => (
            <div
              key={i}
              style={{
                flex: '1 0 auto',
                minWidth: 90,
                padding: '0.65rem 0.75rem',
                background: 'var(--bg-secondary)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '1.15rem',
                  marginBottom: '0.4rem',
                  color: 'var(--text-primary)',
                }}
              >
                {step.icon === '🧹' ? (
                  <Brush size={24} style={{ margin: '0 auto' }} />
                ) : step.icon === '🧠' ? (
                  <Brain size={24} style={{ margin: '0 auto' }} />
                ) : step.icon === '✅' ? (
                  <CheckCircle size={24} style={{ margin: '0 auto' }} />
                ) : step.icon === '📈' ? (
                  <TrendingUp size={24} style={{ margin: '0 auto' }} />
                ) : (
                  step.icon
                )}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {step.title}
              </div>
              <div
                style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}
              >
                {step.desc}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            marginTop: '1rem',
          }}
        >
          {modelsList.map((m: string) => (
            <span
              key={m}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '1rem',
                fontSize: '0.68rem',
                fontWeight: 600,
                background: 'var(--bg-card-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* ── DUAL INTERACTIVE SECTION ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        {/* Predictor */}
        <div style={card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                background: 'linear-gradient(135deg, rgba(129,140,248,0.15), rgba(45,212,191,0.1))',
              }}
            >
              <Hospital size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{t.predictorTitle}</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {t.predictorSub}
              </p>
            </div>
          </div>
          <Predictor t={t} featMeta={featMeta} />
        </div>

        {/* k-NN */}
        <div style={card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(129,140,248,0.1))',
              }}
            >
              <MapPin size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{t.knnTitle}</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {t.knnSub}
              </p>
            </div>
          </div>
          <KnnCanvas t={t} log={log} />
        </div>
      </div>

      {/* ── FEATURE IMPORTANCE + LINKS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={card}>
          <h4
            style={{
              margin: '0 0 0.85rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {t.featImp}
          </h4>
          <FeatureImportance t={t} featMeta={featMeta} />
        </div>
        <div style={card}>
          <h4
            style={{
              margin: '0 0 0.85rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {t.dataSummary}
          </h4>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              <code style={{ color: 'var(--text-muted)' }}>hypothyroid.arff</code> {t.dataP1a}{' '}
              <strong style={{ color: 'var(--text-primary)' }}>binaryClass</strong>
              {t.dataP1b}
            </p>
            <p style={{ margin: '0 0 0.5rem' }}>
              {t.dataP2a} <strong style={{ color: 'var(--text-primary)' }}>{t.nan}</strong>
              {t.dataP2b}
              <strong style={{ color: 'var(--text-primary)' }}>{t.imbalance}</strong>
              {t.dataP2c}
            </p>
          </div>
        </div>
      </div>

      {/* ── NOTEBOOK PREVIEW (collapsible) ── */}
      <div style={card}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            cursor: 'pointer',
          }}
          onClick={() => {
            const next = !showNb;
            log.info('nb-toggle', { open: next });
            setShowNb(next);
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {showNb ? '▾' : '▸'} {t.nbPreview}
          </h4>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {[
              { file: MAIN_NB, label: t.fullPractica },
              { file: LINEAR_NB, label: t.linModels },
            ].map((nb) => (
              <button
                key={nb.file}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  log.info('nb-open', { file: nb.file });
                  setNbFile(nb.file);
                  setShowNb(true);
                }}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.35rem',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background:
                    nbFile === nb.file && showNb
                      ? `linear-gradient(135deg, ${accent1}, ${accent2})`
                      : 'var(--bg-card-hover)',
                  color: nbFile === nb.file && showNb ? '#fff' : 'var(--text-muted)',
                }}
              >
                {nb.label}
              </button>
            ))}
          </div>
          <a
            href={`${NB}/${nbFile}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: 'auto',
              fontSize: '0.75rem',
              color: 'var(--accent-text)',
              textDecoration: 'none',
            }}
          >
            {t.openNbviewer}
          </a>
        </div>
        {showNb && (
          <div
            style={{
              marginTop: '1rem',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
            }}
          >
            <iframe
              key={nbFile}
              title={`Nbviewer: ${nbFile}`}
              src={`${NB}/${nbFile}`}
              style={{
                width: '100%',
                height: 'min(72vh, 760px)',
                border: 'none',
                display: 'block',
              }}
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* ── RUN LOCALLY ── */}
      <details style={{ marginTop: '1.25rem' }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            padding: '0.65rem 1rem',
            background: 'var(--bg-card)',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            listStyle: 'none',
          }}
        >
          {t.runLocal}
        </summary>
        <pre
          tabIndex={0}
          aria-label="Run locally — shell commands"
          style={{
            margin: '0.75rem 0 0',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            fontSize: '0.78rem',
            fontFamily: 'ui-monospace, monospace',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            overflowX: 'auto',
          }}
        >{`git clone ${GH}.git
cd APA_Practica
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
jupyter lab ${MAIN_NB}`}</pre>
      </details>
    </div>
  );
}
// __DEMO_ERROR_BOUNDARY_APPLIED__
export default withDemoErrorBoundary(ApaPracticaDemo, 'apa-practica');
