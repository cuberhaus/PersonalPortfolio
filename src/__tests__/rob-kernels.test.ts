import { describe, it, expect } from 'vitest';
import {
  computeOdometryPath,
  wallFollowingStep,
  forwardKinematicsPositions,
} from '../lib/rob-kernels';

describe('rob-kernels', () => {
  describe('computeOdometryPath', () => {
    it('returns correct number of points', () => {
      const path = computeOdometryPath(100);
      expect(path).toHaveLength(101); // 0..100
    });

    it('starts at origin', () => {
      const path = computeOdometryPath(50);
      expect(path[0].x).toBe(0);
      expect(path[0].y).toBe(0);
      expect(path[0].theta).toBe(0);
    });

    it('moves forward (positive displacement)', () => {
      const path = computeOdometryPath(200);
      const last = path[path.length - 1];
      const dist = Math.sqrt(last.x ** 2 + last.y ** 2);
      expect(dist).toBeGreaterThan(0);
    });

    it('each step has finite coordinates', () => {
      const path = computeOdometryPath(50);
      for (const p of path) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(p.theta)).toBe(true);
      }
    });
  });

  describe('wallFollowingStep', () => {
    it('returns an array of points', () => {
      const trail = wallFollowingStep(100);
      expect(trail).toHaveLength(100);
    });

    it('stays within bounds', () => {
      const trail = wallFollowingStep(200);
      for (const p of trail) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(300);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(200);
      }
    });

    it('points have finite coordinates', () => {
      const trail = wallFollowingStep(50);
      for (const p of trail) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    });
  });

  describe('forwardKinematicsPositions', () => {
    it('returns 3 joint positions', () => {
      const joints = forwardKinematicsPositions(0, 0, 0);
      expect(joints).toHaveLength(3);
    });

    it('zero angles produce stretched arm along x-axis', () => {
      const joints = forwardKinematicsPositions(0, 0, 0);
      // L1=2, L2=1.5, L3=1
      expect(joints[0].x).toBeCloseTo(2, 5);
      expect(joints[0].y).toBeCloseTo(0, 5);
      expect(joints[1].x).toBeCloseTo(3.5, 5);
      expect(joints[1].y).toBeCloseTo(0, 5);
      expect(joints[2].x).toBeCloseTo(4.5, 5);
      expect(joints[2].y).toBeCloseTo(0, 5);
    });

    it('90° first joint rotates arm upward', () => {
      const joints = forwardKinematicsPositions(Math.PI / 2, 0, 0);
      expect(joints[0].x).toBeCloseTo(0, 3);
      expect(joints[0].y).toBeCloseTo(2, 3);
    });

    it('opposite angles fold arm back', () => {
      const joints = forwardKinematicsPositions(0, Math.PI, 0);
      // First joint at (2, 0), second goes back towards (0.5, 0)
      expect(joints[1].x).toBeCloseTo(0.5, 3);
      expect(joints[1].y).toBeCloseTo(0, 2);
    });

    it('all positions are finite', () => {
      for (let q = -Math.PI; q <= Math.PI; q += 0.5) {
        const joints = forwardKinematicsPositions(q, q / 2, -q / 3);
        for (const j of joints) {
          expect(Number.isFinite(j.x)).toBe(true);
          expect(Number.isFinite(j.y)).toBe(true);
        }
      }
    });
  });
});
