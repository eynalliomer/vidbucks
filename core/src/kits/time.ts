// Shared timing core for the kits: one source of truth = the narration's lines and word times.
// A "time expression" lets data files (board.json, layers.json) say WHEN in words, not seconds:
//   12.4                          absolute seconds
//   {"line": 7, "dt": 0.2}        start of line 7 (+dt)
//   {"end": 7}                    end of line 7
//   {"word": [7, "ceylan"], "dt": -0.1, "nth": 0}   when that word is spoken (Unicode-aware, any language)
//   {"beat": 12}                  beat 12 of the film's grid (needs bpm)
// Word times come from Whisper (tools/kit_timing.py writes timing.json); without word times a word's time is
// estimated by its share of the line's letters (all Unicode letters count, so Turkish ı ş ğ ü ö ç İ are fine).

export type Word = [string, number, number];                 // text, start, end (absolute seconds)
export type Line = { id: number; text: string; start: number; end: number; words?: Word[] };
export type KitTiming = { duration: number; lead?: number; bpm?: number; lang?: string; lines: Line[] };
export type TimeExpr = number | { line: number; dt?: number } | { end: number; dt?: number } | { word: [number, string]; nth?: number; dt?: number } | { beat: number; dt?: number };

const letters = (s: string) => Array.from(s.toLocaleLowerCase()).filter((c) => /\p{L}|\p{N}/u.test(c));
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFC");

export class Clock {
  constructor(public timing: KitTiming) {}
  line(i: number) { const l = this.timing.lines.find((x) => x.id === i); if (!l) throw new Error(`line ${i} not in timing`); return l; }
  L = (i: number) => this.line(i).start;
  E = (i: number) => this.line(i).end;
  get beat() { return 60 / (this.timing.bpm ?? 120); }
  /** when `word` is spoken in line i: Whisper word times when present, else the letter share of the line */
  W = (i: number, word: string, nth = 0): number => {
    const l = this.line(i), w = fold(word);
    if (l.words?.length) {
      let n = 0;
      for (const [txt, a] of l.words) if (letters(fold(txt)).join("").startsWith(letters(w).join("")) && n++ === nth) return a;
    }
    const low = fold(l.text); let idx = -1, from = 0;
    for (let k = 0; k <= nth; k++) { idx = low.indexOf(w, from); if (idx < 0) break; from = idx + 1; }
    if (idx < 0) throw new Error(`word "${word}" is not in line ${i}: "${l.text}"`);
    const before = letters(low.slice(0, idx)).length, all = Math.max(1, letters(low).length);
    return l.start + (l.end - l.start) * before / all + 0.04;
  };
  at = (e: TimeExpr | undefined, fallback = 0): number => {
    if (e === undefined) return fallback;
    if (typeof e === "number") return e;
    const dt = (e as { dt?: number }).dt ?? 0;
    if ("line" in e) return this.L(e.line) + dt;
    if ("end" in e) return this.E(e.end) + dt;
    if ("word" in e) return this.W(e.word[0], e.word[1], e.nth ?? 0) + dt;
    if ("beat" in e) return e.beat * this.beat + dt;
    return fallback;
  };
  /** snap a time to the nearest beat (visual onsets on the music grid) */
  onBeat = (t: number) => Math.round(t / this.beat) * this.beat;
}

// ---------------------------------------------------------------- easing shared by every kit
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ramp = (t: number, t0: number, dur: number) => (dur <= 0 ? (t >= t0 ? 1 : 0) : clamp((t - t0) / dur));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = (x: number) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOutBack = (x: number, s = 1.4) => { x = clamp(x); const c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
export const smooth = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u, sy = (u: number) => ((ay * u + by) * u + cy) * u, dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (x: number) => { if (x <= 0) return 0; if (x >= 1) return 1; let u = x; for (let i = 0; i < 6; i++) { const e = sx(u) - x, d = dx(u); if (Math.abs(e) < 1e-5 || !d) break; u -= e / d; } return sy(u); };
}
/** the "press" ease: precise, no overshoot (Swiss snaps, layout moves) */
export const PRESS = bezier(0.7, 0, 0.2, 1);
/** a snap that LANDS on `arrive` (starts `dur` earlier) */
export const snapTo = (t: number, arrive: number, dur: number) => PRESS(clamp((t - (arrive - dur)) / dur));

// ---------------------------------------------------------------- seeded randomness (deterministic frames)
export function mulberry(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hashStr = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// ---------------------------------------------------------------- sound cues: items announce their own hits
export type Cue = { kind: string; t: number; gain: number; dur?: number; pan?: number };
