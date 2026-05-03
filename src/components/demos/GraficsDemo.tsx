import { useRef, useEffect } from 'react';
import { drawWave, drawPhong, drawCheckerboard, drawExplode } from '../../lib/grafics-kernels';

import { T, type DemoTranslations } from "../../i18n/demos/grafics-demo";
import { useDemoLifecycle, useDebug } from '../../lib/useDebug';

type Lang = "en" | "es" | "ca";

function WavePanel({ t }: { t: (typeof T)['en'] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const log = useDebug('demo:grafics');

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf: number;
    const start = performance.now();
    let prev = start;
    let frameCount = 0;
    const frame = () => {
      const now = performance.now();
      const dt = now - prev;
      prev = now;
      frameCount++;
      if (dt > 50) log.warn('frame-stall', { panel: 'wave', dt });
      else if (frameCount % 60 === 0) log.trace('raf', { panel: 'wave', dt });
      drawWave(canvas, (now - start) / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [log]);

  return (
    <div style={panelStyle}>
      <h4 style={titleStyle}>{t.waveTitle}</h4>
      <p style={descStyle}>{t.waveDesc}</p>
      <canvas ref={ref} style={{ borderRadius: '6px', width: '100%', height: '160px' }} />
    </div>
  );
}

function PhongPanel({ t }: { t: (typeof T)['en'] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    drawPhong(canvas);
  }, []);

  return (
    <div style={panelStyle}>
      <h4 style={titleStyle}>{t.phongTitle}</h4>
      <p style={descStyle}>{t.phongDesc}</p>
      <canvas ref={ref} style={{ borderRadius: '6px', width: '100%', height: '160px' }} />
    </div>
  );
}

function CheckerPanel({ t }: { t: (typeof T)['en'] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    drawCheckerboard(canvas);
  }, []);

  return (
    <div style={panelStyle}>
      <h4 style={titleStyle}>{t.checkerTitle}</h4>
      <p style={descStyle}>{t.checkerDesc}</p>
      <canvas ref={ref} style={{ borderRadius: '6px', width: '100%', height: '160px' }} />
    </div>
  );
}

function ExplodePanel({ t }: { t: (typeof T)['en'] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const log = useDebug('demo:grafics');

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf: number;
    const start = performance.now();
    let prev = start;
    let frameCount = 0;
    const frame = () => {
      const now = performance.now();
      const dt = now - prev;
      prev = now;
      frameCount++;
      if (dt > 50) log.warn('frame-stall', { panel: 'explode', dt });
      else if (frameCount % 60 === 0) log.trace('raf', { panel: 'explode', dt });
      drawExplode(canvas, (now - start) / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [log]);

  return (
    <div style={panelStyle}>
      <h4 style={titleStyle}>{t.explodeTitle}</h4>
      <p style={descStyle}>{t.explodeDesc}</p>
      <canvas ref={ref} style={{ borderRadius: '6px', width: '100%', height: '160px' }} />
    </div>
  );
}

export default function GraficsDemo({ lang = 'en' }: { lang?: Lang }) {
  const t = T[lang] || T.en;
  useDemoLifecycle('demo:grafics', { lang });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
      <WavePanel t={t} />
      <PhongPanel t={t} />
      <CheckerPanel t={t} />
      <ExplodePanel t={t} />
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '10px',
  padding: '1rem',
  border: '1px solid var(--border-color)',
};
const titleStyle: React.CSSProperties = {
  color: 'var(--accent-start)',
  fontSize: '1rem',
  marginBottom: '0.25rem',
};
const descStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
  marginBottom: '0.75rem',
};
