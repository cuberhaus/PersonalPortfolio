import { useState, useRef, useCallback, useEffect } from 'react';
import {
  computeOdometryPath,
  wallFollowingStep,
  forwardKinematicsPositions,
} from '../../lib/rob-kernels';

type Lang = 'en' | 'es' | 'ca';

const T = {
  en: {
    mobileTitle: 'Mobile Robot',
    mobileDesc: 'Differential-drive odometry — path from encoder data',
    wallTitle: 'Wall Following',
    wallDesc: 'Reactive controller with k1/k2/k3 gains',
    armTitle: 'Robot Arm FK',
    armDesc: '3-Link forward kinematics — drag sliders to move joints',
  },
  es: {
    mobileTitle: 'Robot Móvil',
    mobileDesc: 'Odometría diferencial — trayectoria desde encoders',
    wallTitle: 'Seguimiento de Paredes',
    wallDesc: 'Controlador reactivo con ganancias k1/k2/k3',
    armTitle: 'Cinemática Directa',
    armDesc: '3-Link FK — arrastra los sliders para mover articulaciones',
  },
  ca: {
    mobileTitle: 'Robot Mòbil',
    mobileDesc: 'Odometria diferencial — trajectòria des d\'encoders',
    wallTitle: 'Seguiment de Parets',
    wallDesc: 'Controlador reactiu amb guanys k1/k2/k3',
    armTitle: 'Cinemàtica Directa',
    armDesc: '3-Link FK — arrossega els sliders per moure articulacions',
  },
};

// ─── Mini Mobile Robot Panel ─────────────────────────────────────────────────

function MobilePanel({ t }: { t: (typeof T)['en'] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const W = 280, H = 180;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Generate a demo trajectory
    const path = computeOdometryPath(200);

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Auto-scale
    const xs = path.map(p => p.x);
    const ys = path.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min((W - 40) / rangeX, (H - 40) / rangeY);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Trail
    ctx.strokeStyle = '#4dabf7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const px = W / 2 + (path[i].x - cx) * scale;
      const py = H / 2 - (path[i].y - cy) * scale;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Robot at end
    const last = path[path.length - 1];
    const rpx = W / 2 + (last.x - cx) * scale;
    const rpy = H / 2 - (last.y - cy) * scale;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(rpx, rpy, 4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  return (
    <div style={panelStyle}>
      <h4 style={titleStyle}>{t.mobileTitle}</h4>
      <p style={descStyle}>{t.mobileDesc}</p>
      <canvas ref={ref} style={{ borderRadius: '6px' }} />
    </div>
  );
}

// ─── Mini Wall Following Panel ───────────────────────────────────────────────

function WallPanel({ t }: { t: (typeof T)['en'] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const W = 280, H = 180;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Walls
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    const walls = [
      [20, 20, 260, 20], [260, 20, 260, 160], [260, 160, 20, 160],
      [20, 160, 20, 20], [80, 60, 200, 60], [200, 60, 200, 110],
    ];
    for (const [x1, y1, x2, y2] of walls) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // Simulated path
    const trail = wallFollowingStep(150);
    ctx.strokeStyle = 'rgba(77,171,247,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      i === 0 ? ctx.moveTo(trail[i].x, trail[i].y) : ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.stroke();

    // Robot
    const last = trail[trail.length - 1];
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Gains display
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#69db7c';
    ctx.fillText('k1=0.3  k2=0.1  k3=0.7', 30, H - 8);
  }, []);

  return (
    <div style={panelStyle}>
      <h4 style={titleStyle}>{t.wallTitle}</h4>
      <p style={descStyle}>{t.wallDesc}</p>
      <canvas ref={ref} style={{ borderRadius: '6px' }} />
    </div>
  );
}

// ─── Mini Robot Arm Panel ────────────────────────────────────────────────────

function ArmPanel({ t }: { t: (typeof T)['en'] }) {
  const [q1, setQ1] = useState(0);
  const [q2, setQ2] = useState(45);
  const [q3, setQ3] = useState(-30);
  const ref = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const W = 280, H = 180;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    const joints = forwardKinematicsPositions(
      (q1 * Math.PI) / 180,
      (q2 * Math.PI) / 180,
      (q3 * Math.PI) / 180,
    );

    // Scale and center
    const baseX = W / 2, baseY = H - 20;
    const s = 25;

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    for (const j of joints) {
      ctx.lineTo(baseX + j.x * s, baseY - j.y * s);
    }
    ctx.stroke();

    // Joints
    ctx.fillStyle = '#4dabf7';
    ctx.beginPath();
    ctx.arc(baseX, baseY, 5, 0, Math.PI * 2);
    ctx.fill();
    for (const j of joints) {
      ctx.beginPath();
      ctx.arc(baseX + j.x * s, baseY - j.y * s, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // End effector
    const ee = joints[joints.length - 1];
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(baseX + ee.x * s, baseY - ee.y * s, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [q1, q2, q3]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div style={panelStyle}>
      <h4 style={titleStyle}>{t.armTitle}</h4>
      <p style={descStyle}>{t.armDesc}</p>
      <canvas ref={ref} style={{ borderRadius: '6px' }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
        <label style={{ color: '#8b8fa3' }}>q1
          <input type="range" min={-180} max={180} value={q1}
            onChange={e => setQ1(+e.target.value)} style={{ width: 60 }} />
        </label>
        <label style={{ color: '#8b8fa3' }}>q2
          <input type="range" min={-180} max={180} value={q2}
            onChange={e => setQ2(+e.target.value)} style={{ width: 60 }} />
        </label>
        <label style={{ color: '#8b8fa3' }}>q3
          <input type="range" min={-180} max={180} value={q3}
            onChange={e => setQ3(+e.target.value)} style={{ width: 60 }} />
        </label>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function RobDemo({ lang = 'en' }: { lang?: Lang }) {
  const t = T[lang] || T.en;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
      <MobilePanel t={t} />
      <WallPanel t={t} />
      <ArmPanel t={t} />
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#161b22',
  borderRadius: '10px',
  padding: '1rem',
  border: '1px solid #30363d',
};
const titleStyle: React.CSSProperties = {
  color: '#4dabf7',
  fontSize: '1rem',
  marginBottom: '0.25rem',
};
const descStyle: React.CSSProperties = {
  color: '#8b949e',
  fontSize: '0.8rem',
  marginBottom: '0.75rem',
};
