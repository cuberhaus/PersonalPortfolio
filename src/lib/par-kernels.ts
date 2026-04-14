/**
 * Lightweight TypeScript implementations of PAR lab kernels.
 * Used in the portfolio demo component (no WASM dependency).
 */

/**
 * Compute Mandelbrot set iteration counts for a rectangular region.
 * Returns a Uint32Array of width*height iteration counts (row-major).
 */
export function computeMandelbrot(
  width: number,
  height: number,
  maxIter: number,
  cx: number,
  cy: number,
  size: number,
): Uint32Array {
  const pixels = new Uint32Array(width * height);
  const realMin = cx - size;
  const imagMin = cy - size;
  const scaleReal = (2 * size) / width;
  const scaleImag = (2 * size) / height;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let zr = 0;
      let zi = 0;
      const cr = realMin + col * scaleReal;
      const ci = imagMin + (height - 1 - row) * scaleImag;

      let k = 0;
      while (zr * zr + zi * zi < 4 && k < maxIter) {
        const temp = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = temp;
        k++;
      }
      pixels[row * width + col] = k;
    }
  }
  return pixels;
}

/**
 * One Jacobi relaxation step on a 2D grid.
 * u: flat Float64Array of sizex*sizey (row-major), with boundary conditions.
 * Returns { unew, residual } where unew is the updated grid.
 */
export function jacobiStep(
  u: Float64Array,
  sizex: number,
  sizey: number,
): { unew: Float64Array; residual: number } {
  const unew = new Float64Array(u);
  let sum = 0;

  for (let i = 1; i < sizex - 1; i++) {
    for (let j = 1; j < sizey - 1; j++) {
      const tmp =
        0.25 *
        (u[i * sizey + (j - 1)] +
          u[i * sizey + (j + 1)] +
          u[(i - 1) * sizey + j] +
          u[(i + 1) * sizey + j]);
      const diff = tmp - u[i * sizey + j];
      sum += diff * diff;
      unew[i * sizey + j] = tmp;
    }
  }

  return { unew, residual: sum };
}

/**
 * Initialize a heat grid: top boundary = 1.0, rest = 0.0.
 */
export function initHeatGrid(sizex: number, sizey: number): Float64Array {
  const u = new Float64Array(sizex * sizey);
  for (let j = 0; j < sizey; j++) {
    u[j] = 1.0; // top row
  }
  return u;
}

/**
 * Compute pi via numerical integration of 4/(1+x²) over [0,1].
 */
export function computePi(numSteps: number): number {
  const step = 1.0 / numSteps;
  let sum = 0;
  for (let i = 0; i < numSteps; i++) {
    const x = (i + 0.5) * step;
    sum += 4.0 / (1.0 + x * x);
  }
  return step * sum;
}
