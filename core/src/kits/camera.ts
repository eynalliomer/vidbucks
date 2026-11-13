// Virtual camera over one world (world units = 4K pixels at zoom 1, like a 3840-wide plate).
// Keys are cubic-Hermite interpolated (monotone tangents: no overshoot between holds); zoom is interpolated in log space
// so pushes feel even. A spotlight follows its own keys (or the camera's, via shot()).
import { clamp } from "./time";

export type CamKey = { t: number; x: number; y: number; zoom: number; rot?: number };
export type FocusKey = { t: number; x: number; y: number; radius: number; strength?: number };

class Spline {
  private m: number[] = [];
  constructor(private T: number[], private v: number[]) {
    const n = T.length, d: number[] = [];
    for (let i = 0; i < n - 1; i++) d.push((v[i + 1] - v[i]) / Math.max(1e-6, T[i + 1] - T[i]));
    for (let i = 0; i < n; i++) {
      if (i === 0) this.m.push(n > 1 ? d[0] * 0 : 0);
      else if (i === n - 1) this.m.push(0);
      else this.m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);   // monotone: hold when direction flips
    }
  }
  at(t: number) {
    const T = this.T, v = this.v;
    if (t <= T[0]) return v[0];
    if (t >= T[T.length - 1]) return v[v.length - 1];
    let i = 0; while (i < T.length - 2 && t >= T[i + 1]) i++;
    const h = T[i + 1] - T[i], u = (t - T[i]) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    return h00 * v[i] + h10 * h * this.m[i] + h01 * v[i + 1] + h11 * h * this.m[i + 1];
  }
}

export class Camera {
  private sx: Spline; private sy: Spline; private sz: Spline; private sr: Spline;
  private fx?: Spline; private fy?: Spline; private fr?: Spline; private fs?: Spline;
  constructor(keys: CamKey[], focus: FocusKey[] = [], public handheld = 1) {
    const k = [...keys].sort((a, b) => a.t - b.t); if (!k.length) k.push({ t: 0, x: 0, y: 0, zoom: 0.25 });
    for (let i = 1; i < k.length; i++) if (k[i].t <= k[i - 1].t) k[i] = { ...k[i], t: k[i - 1].t + 0.05 };   // equal times would divide by zero
    const T = k.map((q) => q.t);
    this.sx = new Spline(T, k.map((q) => q.x)); this.sy = new Spline(T, k.map((q) => q.y));
    this.sz = new Spline(T, k.map((q) => Math.log(q.zoom))); this.sr = new Spline(T, k.map((q) => q.rot ?? 0));
    const f = [...focus].sort((a, b) => a.t - b.t);
    for (let i = 1; i < f.length; i++) if (f[i].t <= f[i - 1].t) f[i] = { ...f[i], t: f[i - 1].t + 0.05 };
    if (f.length) { const F = f.map((q) => q.t); this.fx = new Spline(F, f.map((q) => q.x)); this.fy = new Spline(F, f.map((q) => q.y)); this.fr = new Spline(F, f.map((q) => q.radius)); this.fs = new Spline(F, f.map((q) => q.strength ?? 0.55)); }
  }
  /** x, y (world), zoom, rot (degrees), with a slow incommensurate handheld wobble */
  at(t: number) {
    const z = Math.exp(this.sz.at(t)), hh = this.handheld;
    const hx = hh * (7 * Math.sin(t * 0.83 + 1.3) + 4 * Math.sin(t * 1.71 + 0.2)) / z, hy = hh * (6 * Math.sin(t * 0.67 + 2.1) + 3.5 * Math.sin(t * 1.93 + 1.1)) / z;
    return { x: this.sx.at(t) + hx, y: this.sy.at(t) + hy, zoom: z, rot: this.sr.at(t) + hh * 0.12 * Math.sin(t * 0.51 + 0.4) };
  }
  focus(t: number) { return this.fx ? { x: this.fx.at(t), y: this.fy!.at(t), radius: this.fr!.at(t), strength: clamp(this.fs!.at(t)) } : null; }
}

/** world -> screen transform for a W x H frame (world units are 4K px: zoom 1 shows 3840 x 2160) */
export const worldTransform = (cam: { x: number; y: number; zoom: number; rot: number }, W: number, H: number) => {
  const s = cam.zoom * (Math.max(W, H) / 3840);     // a portrait frame keeps the same world scale on its long side
  return { scale: s, svg: `translate(${W / 2} ${H / 2}) rotate(${cam.rot}) scale(${s}) translate(${-cam.x} ${-cam.y})` };
};
/** world point -> screen point (for screen-space effects that follow a subject) */
export const toScreen = (cam: { x: number; y: number; zoom: number; rot: number }, W: number, H: number, x: number, y: number) => {
  const s = cam.zoom * (Math.max(W, H) / 3840), r = (cam.rot * Math.PI) / 180, dx = (x - cam.x) * s, dy = (y - cam.y) * s;
  return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)] as const;
};
