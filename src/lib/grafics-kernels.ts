/**
 * Lightweight WebGL2 helpers for the GraficsDemo fallback panels.
 * Self-contained — no external deps beyond React refs.
 */
import { debug } from './debug';

const log = debug('demo:grafics');

// ── Shader compilation ──

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const infoLog = gl.getShaderInfoLog(s);
    const typeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    const err = new Error('shader compile failed');
    log.error('shader-compile-failed', { type: typeName, log: infoLog }, err);
    gl.deleteShader(s);
    throw err;
  }
  return s;
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
  return prog;
}

// ── Simple sphere geometry ──

function createSphereBuffers(gl: WebGL2RenderingContext, slices = 32, stacks = 16) {
  const pos: number[] = [], norm: number[] = [], idx: number[] = [];
  for (let j = 0; j <= stacks; j++) {
    const t = (j / stacks) * Math.PI;
    const st = Math.sin(t), ct = Math.cos(t);
    for (let i = 0; i <= slices; i++) {
      const p = (i / slices) * 2 * Math.PI;
      const sp = Math.sin(p), cp = Math.cos(p);
      const x = cp * st, y = ct, z = sp * st;
      pos.push(x, y, z);
      norm.push(x, y, z);
    }
  }
  for (let j = 0; j < stacks; j++) {
    for (let i = 0; i < slices; i++) {
      const a = j * (slices + 1) + i, b = a + slices + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const pb = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, pb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const nb = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, nb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norm), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: idx.length };
}

// ── Matrix math (minimal) ──

function perspective(fov: number, asp: number, n: number, f: number) {
  const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
  return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
}

function lookAt(ex: number, ey: number, ez: number) {
  const len = Math.hypot(ex, ey, ez);
  const zx = ex / len, zy = ey / len, zz = ez / len;
  const ux = 0, uy = 1, uz = 0;
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
  const xl = Math.hypot(xx, xy, xz); xx /= xl; xy /= xl; xz /= xl;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
    -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1]);
}

function mul(a: Float32Array, b: Float32Array) {
  const r = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      r[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
  return r;
}

function normalMat3(mv: Float32Array): Float32Array {
  const [a, b, c, , d, e, f, , g, h, i] = mv;
  let det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!det) det = 1; det = 1 / det;
  return new Float32Array([
    (e * i - f * h) * det, (f * g - d * i) * det, (d * h - e * g) * det,
    (c * h - b * i) * det, (a * i - c * g) * det, (g * b - a * h) * det,
    (b * f - c * e) * det, (d * c - a * f) * det, (a * e - b * d) * det,
  ]);
}

// ── Exported drawing functions (one per panel) ──

/** Render the Wave shader effect (vertex deformation) on a sphere */
export function drawWave(canvas: HTMLCanvasElement, time: number) {
  const gl = canvas.getContext('webgl2')!;
  if (!gl) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.06, 0.07, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const prog = link(gl,
    `#version 300 es
    precision highp float;
    layout(location=0) in vec3 vertex;
    layout(location=1) in vec3 normal;
    out vec4 fc;
    uniform mat4 mvp;
    uniform mat3 nm;
    uniform float time;
    const float PI=3.14159;
    void main(){
      float a=0.5*sin(0.25*time*PI*2.0+vertex.y);
      mat3 r=mat3(1,0,0,0,cos(a),sin(a),0,-sin(a),cos(a));
      vec3 N=normalize(nm*normal);
      fc=vec4(0.4,0.7,1.0,1)*max(N.z,0.15);
      gl_Position=mvp*vec4(r*vertex,1);
    }`,
    `#version 300 es
    precision highp float;
    in vec4 fc; out vec4 o;
    void main(){o=fc;}`
  );
  const { vao, count } = createSphereBuffers(gl);
  const asp = canvas.width / canvas.height;
  const v = lookAt(2, 2, 3);
  const p = perspective(Math.PI / 4, asp, 0.1, 50);
  const mvp = mul(p, v);
  const nm = normalMat3(v);

  gl.useProgram(prog);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'mvp'), false, mvp);
  gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'nm'), false, nm);
  gl.uniform1f(gl.getUniformLocation(prog, 'time'), time);
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
}

/** Render Phong lighting on a sphere */
export function drawPhong(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2')!;
  if (!gl) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.06, 0.07, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const prog = link(gl,
    `#version 300 es
    precision highp float;
    layout(location=0) in vec3 vertex;
    layout(location=1) in vec3 normal;
    out vec3 vN,vP;
    uniform mat4 mvp,mv;
    uniform mat3 nm;
    void main(){
      vN=normalize(nm*normal);
      vP=(mv*vec4(vertex,1)).xyz;
      gl_Position=mvp*vec4(vertex,1);
    }`,
    `#version 300 es
    precision highp float;
    in vec3 vN,vP; out vec4 o;
    void main(){
      vec3 N=normalize(vN),L=normalize(vec3(2,3,2)-vP),V=normalize(-vP),R=reflect(-L,N);
      float d=max(dot(N,L),0.0),s=pow(max(dot(R,V),0.0),32.0);
      o=vec4(vec3(0.1)+vec3(0.7,0.3,0.3)*d+vec3(s),1);
    }`
  );
  const { vao, count } = createSphereBuffers(gl);
  const asp = canvas.width / canvas.height;
  const v = lookAt(2, 2, 3);
  const p = perspective(Math.PI / 4, asp, 0.1, 50);
  gl.useProgram(prog);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'mvp'), false, mul(p, v));
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'mv'), false, v);
  gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'nm'), false, normalMat3(v));
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
}

/** Render checkerboard pattern on a sphere */
export function drawCheckerboard(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2')!;
  if (!gl) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.06, 0.07, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Need texcoords for checkerboard
  const slices = 32, stacks = 16;
  const pos: number[] = [], norm: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= stacks; j++) {
    const t = (j / stacks) * Math.PI;
    const st = Math.sin(t), ct = Math.cos(t);
    for (let i = 0; i <= slices; i++) {
      const ph = (i / slices) * 2 * Math.PI;
      const x = Math.cos(ph) * st, y = ct, z = Math.sin(ph) * st;
      pos.push(x, y, z); norm.push(x, y, z); uv.push(i / slices, j / stacks);
    }
  }
  for (let j = 0; j < stacks; j++)
    for (let i = 0; i < slices; i++) {
      const a = j * (slices + 1) + i, b = a + slices + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const mkBuf = (data: Float32Array, loc: number, size: number) => {
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  mkBuf(new Float32Array(pos), 0, 3);
  mkBuf(new Float32Array(norm), 1, 3);
  mkBuf(new Float32Array(uv), 2, 2);
  const ib = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  const prog = link(gl,
    `#version 300 es
    precision highp float;
    layout(location=0)in vec3 v;layout(location=1)in vec3 n;layout(location=2)in vec2 t;
    out vec2 vt;out vec3 vn;
    uniform mat4 mvp;uniform mat3 nm;
    void main(){vt=t;vn=normalize(nm*n);gl_Position=mvp*vec4(v,1);}`,
    `#version 300 es
    precision highp float;
    in vec2 vt;in vec3 vn;out vec4 o;
    void main(){
      float sq=1./8.;
      int x=int(mod(vt.x/sq,2.0)),y=int(mod(vt.y/sq,2.0));
      vec3 c=x==y?vec3(0.85):vec3(0.1);
      o=vec4(c*max(vn.z,0.15),1);
    }`
  );
  const asp = canvas.width / canvas.height;
  const v2 = lookAt(2, 2, 3);
  const p2 = perspective(Math.PI / 4, asp, 0.1, 50);
  gl.useProgram(prog);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'mvp'), false, mul(p2, v2));
  gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'nm'), false, normalMat3(v2));
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
}

/** Render explode effect (flat-shaded displaced triangles) */
export function drawExplode(canvas: HTMLCanvasElement, time: number) {
  const gl = canvas.getContext('webgl2')!;
  if (!gl) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.06, 0.07, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const prog = link(gl,
    `#version 300 es
    precision highp float;
    layout(location=0)in vec3 vertex;layout(location=1)in vec3 normal;
    flat out vec4 fc;
    uniform mat4 mvp;uniform float time;
    void main(){
      fc=vec4(0.8,0.5,0.2,1);
      vec3 d=vertex+normal*1.2*time;
      gl_Position=mvp*vec4(d,1);
    }`,
    `#version 300 es
    precision highp float;
    flat in vec4 fc;out vec4 o;
    void main(){o=fc;}`
  );
  const { vao, count } = createSphereBuffers(gl);
  const asp = canvas.width / canvas.height;
  const v = lookAt(2, 2, 3);
  const p = perspective(Math.PI / 4, asp, 0.1, 50);
  gl.useProgram(prog);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'mvp'), false, mul(p, v));
  // Use a frozen time value for a static "partially exploded" look
  gl.uniform1f(gl.getUniformLocation(prog, 'time'), 0.2 + 0.15 * Math.sin(time * 0.5));
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
}
