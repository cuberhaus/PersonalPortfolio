/**
 * Pure TypeScript implementations of robotics algorithms for the portfolio mock.
 * Mirrors the Ember dashboard's utils but simplified for the static preview.
 */

/** Differential drive odometry. Axle half-width = 121.5 mm */
export function computeOdometryPath(steps: number) {
  const S = 121.5;
  const path: { x: number; y: number; theta: number }[] = [{ x: 0, y: 0, theta: 0 }];

  // Simulate a gentle curve (like the real encoder data)
  for (let i = 1; i <= steps; i++) {
    const prev = path[i - 1];
    const t = i / steps;
    // Left wheel slightly slower → curves right
    const dL = 30 + 5 * Math.sin(t * Math.PI * 4);
    const dR = 32 + 3 * Math.cos(t * Math.PI * 3);
    const dTheta = (dR - dL) / (2 * S);
    const dist = (dR + dL) / 2;
    const newTheta = prev.theta + dTheta;
    path.push({
      x: prev.x + Math.cos(newTheta) * dist,
      y: prev.y + Math.sin(newTheta) * dist,
      theta: newTheta,
    });
  }
  return path;
}

/** Simplified wall-following simulation path. */
export function wallFollowingStep(steps: number) {
  const trail: { x: number; y: number }[] = [];
  let x = 40, y = 90, theta = 0;

  for (let i = 0; i < steps; i++) {
    trail.push({ x, y });
    // Simple circular motion near walls
    const t = i / steps;
    theta += 0.02 + 0.01 * Math.sin(t * 12);
    x += Math.cos(theta) * 1.5;
    y += Math.sin(theta) * 1.2;
    // Bounce off walls
    if (x < 30) { x = 30; theta = -theta; }
    if (x > 250) { x = 250; theta = Math.PI - theta; }
    if (y < 30) { y = 30; theta = -theta; }
    if (y > 150) { y = 150; theta = Math.PI - theta; }
  }
  return trail;
}

/** 2D 3-Link forward kinematics (simplified for the mock). */
export function forwardKinematicsPositions(q1: number, q2: number, q3: number) {
  const L1 = 2, L2 = 1.5, L3 = 1;
  const joints: { x: number; y: number }[] = [];

  // First joint
  const x1 = L1 * Math.cos(q1);
  const y1 = L1 * Math.sin(q1);
  joints.push({ x: x1, y: y1 });

  // Second joint
  const a2 = q1 + q2;
  const x2 = x1 + L2 * Math.cos(a2);
  const y2 = y1 + L2 * Math.sin(a2);
  joints.push({ x: x2, y: y2 });

  // End effector
  const a3 = a2 + q3;
  const x3 = x2 + L3 * Math.cos(a3);
  const y3 = y2 + L3 * Math.sin(a3);
  joints.push({ x: x3, y: y3 });

  return joints;
}
