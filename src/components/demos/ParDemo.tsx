import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { computeMandelbrot, jacobiStep, initHeatGrid, computePi } from '../../lib/par-kernels';
import { getThemeColors } from '../../lib/demo-theme';

import { T, type DemoTranslations } from "../../i18n/demos/par-demo";
import { useDemoLifecycle, useDebug } from '../../lib/useDebug';

type Lang = "en" | "es" | "ca";

/* ─── Color helpers ─── */

function mandelColor(iter: number, maxIter: number): [number, number, number] {
  if (iter >= maxIter) return [0, 0, 0];
  const t = iter / maxIter;
  return [
    Math.floor(9 * (1 - t) * t * t * t * 255),
    Math.floor(15 * (1 - t) * (1 - t) * t * t * 255),
    Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255),
  ];
}

function heatColor(v: number): [number, number, number] {
  const r = Math.floor(255 * Math.min(1, 2 * v));
  const g = Math.floor(255 * (1 - Math.abs(2 * v - 1)));
  const b = Math.floor(255 * Math.min(1, 2 * (1 - v)));
  return [r, g, b];
}

/* ─── Mandelbrot mini ─── */

function MandelbrotMini({ lang }: { lang: Lang }) {
  const t = T[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const log = useDebug('demo:par');
  const [maxIter, setMaxIter] = useState(128);
  const [cx, setCx] = useState(-0.5);
  const [cy, setCy] = useState(0);
  const [size, setSize] = useState(1.5);
  const dragRef = useRef<{ sx: number; sy: number; cx0: number; cy0: number } | null>(null);
  const W = 300;
  const H = 300;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = W;
    canvas.height = H;

    const pixels = computeMandelbrot(W, H, maxIter, cx, cy, size);
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const [r, g, b] = mandelColor(pixels[i], maxIter);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [maxIter, cx, cy, size]);

  useEffect(() => {
    render();
  }, [render]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setSize((s) => {
      const ns = s * (e.deltaY > 0 ? 1.2 : 1 / 1.2);
      log.info('mandelbrot-zoom', { size: ns });
      return ns;
    });
  }, [log]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { sx: e.clientX, sy: e.clientY, cx0: cx, cy0: cy };
    },
    [cx, cy],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const scale = (2 * size) / W;
      setCx(dragRef.current.cx0 - (e.clientX - dragRef.current.sx) * scale);
      setCy(dragRef.current.cy0 + (e.clientY - dragRef.current.sy) * scale);
    },
    [size],
  );

  const onMouseUp = useCallback(() => {
    if (dragRef.current) log.info('mandelbrot-pan', { cx, cy });
    dragRef.current = null;
  }, [cx, cy, log]);

  return (
    <div className="par-panel">
      <h3>{t.mandelbrotTitle}</h3>
      <p className="par-desc">{t.mandelbrotDesc}</p>
      <div className="par-controls">
        <label>
          {t.iter}: {maxIter}
          <input
            type="range"
            min={32}
            max={512}
            step={32}
            value={maxIter}
            onChange={(e) => setMaxIter(+e.target.value)}
            onMouseUp={(e) => log.info('mandelbrot-iter', { maxIter: +(e.currentTarget as HTMLInputElement).value })}
          />
        </label>
      </div>
      <canvas
        ref={canvasRef}
        className="par-canvas"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: 'grab' }}
      />
    </div>
  );
}

/* ─── Heat equation mini ─── */

function HeatMini({ lang }: { lang: Lang }) {
  const t = T[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const log = useDebug('demo:par');
  const [grid, setGrid] = useState(() => initHeatGrid(64, 64));
  const [iteration, setIteration] = useState(0);
  const [residual, setResidual] = useState(0);
  const [playing, setPlaying] = useState(false);
  const animRef = useRef(0);
  const G = 64;

  const renderGrid = useCallback(
    (u: Float64Array) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      canvas.width = G;
      canvas.height = G;
      const img = ctx.createImageData(G, G);
      for (let i = 0; i < G * G; i++) {
        const [r, g, b] = heatColor(u[i]);
        img.data[i * 4] = r;
        img.data[i * 4 + 1] = g;
        img.data[i * 4 + 2] = b;
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    },
    [],
  );

  useEffect(() => {
    renderGrid(grid);
  }, [grid, renderGrid]);

  const doStep = useCallback(() => {
    setGrid((prev) => {
      const { unew, residual: res } = jacobiStep(prev, G, G);
      setResidual(res);
      setIteration((i) => {
        const next = i + 1;
        log.trace('heat-step', { t: next, residual: res });
        return next;
      });
      return unew;
    });
  }, [log]);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    const loop = () => {
      doStep();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, doStep]);

  const handleReset = useCallback(() => {
    log.info('heat-reset');
    setPlaying(false);
    setGrid(initHeatGrid(G, G));
    setIteration(0);
    setResidual(0);
  }, [log]);

  return (
    <div className="par-panel">
      <h3>{t.heatTitle}</h3>
      <p className="par-desc">{t.heatDesc}</p>
      <div className="par-controls">
        <button onClick={() => { const next = !playing; setPlaying(next); log.info(next ? 'heat-play' : 'heat-pause'); }}>{playing ? t.pause : t.play}</button>
        <button onClick={() => { log.info('heat-step-click'); doStep(); }} disabled={playing}>{t.step}</button>
        <button onClick={handleReset}>{t.reset}</button>
      </div>
      <canvas ref={canvasRef} className="par-canvas" style={{ imageRendering: 'pixelated' }} />
      <div className="par-stats">
        <span>#{iteration}</span>
        <span>{t.residual}: {residual.toExponential(2)}</span>
      </div>
    </div>
  );
}

/* ─── Pi chart mini ─── */

function PiMini({ lang }: { lang: Lang }) {
  const t = T[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const log = useDebug('demo:par');
  const [steps, setSteps] = useState(100000);

  const data = useMemo(() => {
    const counts = [100, 1000, 10000, 50000, steps].filter((n, i, a) => a.indexOf(n) === i && n <= steps).sort((a, b) => a - b);
    return counts.map((n) => {
      const pi = computePi(n);
      return { steps: n, error: Math.abs(pi - Math.PI) };
    });
  }, [steps]);

  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d')!;
    const w = 300;
    const h = 180;
    canvas.width = w;
    canvas.height = h;
    const pad = { t: 15, r: 10, b: 25, l: 45 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;

    ctx.fillStyle = 'var(--bg-card, #12121a)';
    ctx.fillRect(0, 0, w, h);

    const errors = data.map((d) => d.error).filter((e) => e > 0);
    if (errors.length === 0) return;
    const minX = Math.log10(data[0].steps);
    const maxX = Math.log10(data[data.length - 1].steps);
    const minY = Math.log10(Math.min(...errors) * 0.5);
    const maxY = Math.log10(Math.max(...errors) * 2);

    const toX = (v: number) => pad.l + ((v - minX) / (maxX - minX || 1)) * cw;
    const toY = (v: number) => pad.t + ch - ((v - minY) / (maxY - minY || 1)) * ch;

    const tc = getThemeColors();
    ctx.strokeStyle = tc.accentStart;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      if (d.error === 0) return;
      const x = toX(Math.log10(d.steps));
      const y = toY(Math.log10(d.error));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    data.forEach((d) => {
      if (d.error === 0) return;
      ctx.fillStyle = tc.accentStart;
      ctx.beginPath();
      ctx.arc(toX(Math.log10(d.steps)), toY(Math.log10(d.error)), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = tc.textMuted;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('log₁₀(steps)', w / 2, h - 3);
  }, [data]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  const piVal = useMemo(() => computePi(steps), [steps]);

  return (
    <div className="par-panel">
      <h3>{t.piTitle}</h3>
      <p className="par-desc">{t.piDesc}</p>
      <div className="par-controls">
        <label>
          {t.steps}: {steps.toLocaleString()}
          <input
            type="range"
            min={100}
            max={1000000}
            step={100}
            value={steps}
            onChange={(e) => setSteps(+e.target.value)}
            onMouseUp={(e) => log.info('pi-steps', { steps: +(e.currentTarget as HTMLInputElement).value })}
          />
        </label>
      </div>
      <canvas ref={canvasRef} className="par-canvas" />
      <div className="par-stats">
        <span>π ≈ {piVal.toFixed(10)}</span>
        <span>err: {Math.abs(piVal - Math.PI).toExponential(3)}</span>
      </div>
    </div>
  );
}

/* ─── Main demo component ─── */

interface Props {
  lang?: Lang;
}

export default function ParDemo({ lang = 'en' }: Props) {
  useDemoLifecycle('demo:par', { lang });
  return (
    <div className="par-demo">
      <style>{`
        .par-demo {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .par-panel {
          background: var(--bg-card, #12121a);
          border: 1px solid var(--border-color, #2a2a3e);
          border-radius: var(--radius-lg, 12px);
          padding: 1.25rem;
        }
        .par-panel h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .par-desc {
          font-size: 0.8rem;
          color: var(--text-muted, #8b8b9e);
          margin-bottom: 0.75rem;
        }
        .par-controls {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 0.75rem;
          font-size: 0.8rem;
        }
        .par-controls label {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-muted, #8b8b9e);
        }
        .par-controls button {
          font-size: 0.8rem;
          padding: 0.3rem 0.7rem;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a3e);
          border-radius: 6px;
          color: var(--text-primary, #e4e4e7);
          cursor: pointer;
        }
        .par-controls button:hover {
          border-color: var(--accent-start, #6366f1);
        }
        .par-canvas {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 8px;
          border: 1px solid var(--border-color, #2a2a3e);
        }
        .par-stats {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
          font-size: 0.7rem;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-muted, #8b8b9e);
        }
      `}</style>
      <MandelbrotMini lang={lang} />
      <HeatMini lang={lang} />
      <PiMini lang={lang} />
    </div>
  );
}
