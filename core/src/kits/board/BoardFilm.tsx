// BoardFilm: one continuous camera over one designed world (a cork wall, a slate, a studio table, a blueprint),
// every item landing on the word the narrator says. Data-driven: videos/<name>/board.json + timing.json.
// Items: print, doc, bigtext, counter, stamp, pen, string, card, map, region, route, marker. Looks set the board and finish.
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadCond } from "@remotion/google-fonts/Oswald";
import { loadFont as loadSerif } from "@remotion/google-fonts/LibreBaskerville";
import { loadFont as loadMono } from "@remotion/google-fonts/CourierPrime";
import { loadFont as loadHand } from "@remotion/google-fonts/HomemadeApple";
import { Camera, worldTransform } from "../camera";
import { Clock, KitTiming, TimeExpr, clamp, easeInOut, easeOutBack, easeOutCubic, hashStr, mulberry, ramp } from "../time";
import { LOOKS, LookName } from "./looks";

const SUB = { subsets: ["latin", "latin-ext"] as ("latin" | "latin-ext")[] };
const COND = loadCond("normal", { weights: ["500", "600", "700"], ...SUB }).fontFamily, SERIF = loadSerif("normal", { weights: ["400"], ...SUB }).fontFamily,
  MONO = loadMono("normal", { weights: ["400"], ...SUB }).fontFamily, HAND = loadHand("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const FONTS: Record<string, string> = { cond: COND, serif: SERIF, mono: MONO, hand: HAND };

type XY = [number, number] | { place: string; map?: string };
type Base = { id?: string; t_in?: TimeExpr; t_out?: TimeExpr; z?: number };
export type BoardItem = Base & (
  | { type: "print"; img: string; x: number; y: number; w: number; aspect: number; rot?: number; label?: string; label_t?: TimeExpr; pin?: boolean; torn?: boolean; dim_after?: TimeExpr }
  | { type: "doc"; x: number; y: number; w: number; h: number; rot?: number; header?: { text: string; size: number; font?: string }[]; rows?: number; sentence?: string; sentence_row?: number; sentence_size?: number; highlights?: { phrase: string; t: TimeExpr }[]; recreation?: boolean }
  | { type: "bigtext"; text: string; x: number; y: number; size: number; color?: string; bar?: string; type_on?: number; font?: string }
  | { type: "counter"; x: number; y: number; size: number; value: number; dur?: number; prefix?: string; suffix?: string; caption?: string; color?: string; decimals?: number }
  | { type: "stamp"; text: string; x: number; y: number; size: number; rot?: number; color?: string }
  | { type: "pen"; kind: "underline" | "ellipse" | "highlight" | "tick" | "cross"; x: number; y: number; w: number; h?: number; dur?: number; width?: number; rot?: number; color?: string; seed?: number }
  | { type: "string"; from: XY; to: XY; dur?: number; sag?: number; width?: number; color?: string }
  | { type: "card"; x: number; y: number; w: number; h: number; title: string; lines?: string[]; accent?: string; rot?: number }
  | { type: "map"; src: string; name?: string; color?: string; ink?: string; water?: string }
  | { type: "region"; map?: string; names: string[]; color: string; to_color?: string; t_change?: TimeExpr; alpha?: number }
  | { type: "route"; from: XY; to: XY; dur?: number; bend?: number; width?: number; color?: string }
  | { type: "marker"; at: XY; label: string; side?: "left" | "right"; size?: number; color?: string }
);
export type CamSpec = { t: TimeExpr; x: number; y: number; zoom: number; rot?: number; radius?: number; strength?: number; focus?: [number, number] };
export type BoardCfg = {
  id?: string; width: number; height: number; fps: number; look: LookName; grade?: "bw" | "sepia" | "natural";
  items: BoardItem[]; camera: CamSpec[]; audio?: { src: string; gain?: number }; fadeIn?: number; fadeOut?: number; handheld?: number;
  maps?: Record<string, MapData>;
};
export type MapData = { regions: Record<string, string>; places: Record<string, [number, number]>; bounds: [number, number, number, number] };

const dropAnim = (t: number, t0: number, dur = 0.5) => { const u = ramp(t, t0, dur); return { s: 1 + 0.16 * (1 - easeOutCubic(u)), a: ramp(t, t0, 0.12), lift: 1 - easeOutCubic(u) }; };
const fadeOut = (t: number, tOut?: number) => (tOut === undefined ? 1 : 1 - ramp(t, tOut, 0.6));

// ---------------------------------------------------------------- items
const Pin: React.FC<{ x: number; y: number; r: number; a: number }> = ({ x, y, r, a }) => (
  <g opacity={a}>
    <circle cx={x + r * 0.35} cy={y + r * 0.55} r={r * 0.95} fill="rgba(0,0,0,.45)" filter="url(#bf-soft)" />
    <circle cx={x} cy={y} r={r} fill="#b01e1a" /><circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="rgba(255,210,200,.55)" />
  </g>
);

const Label: React.FC<{ text: string; x: number; y: number; size: number; rot: number; a: number; reveal: number; color?: string }> = ({ text, x, y, size, rot, a, reveal, color = "#b01814" }) => {
  const w = text.length * size * 0.52 + size * 0.9, h = size * 1.25, u = easeOutCubic(reveal);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={a}>
      <clipPath id={`lb-${hashStr(text)}`}><rect x={-w / 2} y={0} width={w * u} height={h} /></clipPath>
      <rect x={-w / 2 + 8} y={12} width={w * u} height={h} fill="rgba(0,0,0,.45)" filter="url(#bf-soft)" />
      <rect x={-w / 2} y={0} width={w * u} height={h} fill={color} />
      <text x={0} y={h * 0.8} textAnchor="middle" fontFamily={COND} fontWeight={600} fontSize={size} letterSpacing={size * 0.06} fill="#faf6ee" clipPath={`url(#lb-${hashStr(text)})`}>{text.toUpperCase()}</text>
    </g>
  );
};

function tornPath(W: number, H: number, seed: number) {
  const r = mulberry(seed), step = Math.max(W, H) / 70; const pts: string[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.floor(L / step));
    for (let i = 0; i < n; i++) { const u = i / n, d = r() * 0.011 * Math.min(W, H) + (r() < 0.06 ? 0.015 * Math.min(W, H) : 0); pts.push(`${(x0 + (x1 - x0) * u + nx * d).toFixed(1)},${(y0 + (y1 - y0) * u + ny * d).toFixed(1)}`); }
  };
  edge(-W / 2, -H / 2, W / 2, -H / 2, 0, 1); edge(W / 2, -H / 2, W / 2, H / 2, -1, 0); edge(W / 2, H / 2, -W / 2, H / 2, 0, -1); edge(-W / 2, H / 2, -W / 2, -H / 2, 1, 0);
  return "M" + pts.join(" L") + " Z";
}

type Ctx = { t: number; clock: Clock; grade: string; maps: Record<string, MapData>; look: (typeof LOOKS)[LookName] };
const T = (c: Ctx, e: TimeExpr | undefined, f = 0) => c.clock.at(e, f);
const pt = (c: Ctx, p: XY): [number, number] => (Array.isArray(p) ? p : (c.maps[p.map ?? Object.keys(c.maps)[0]]?.places[p.place] ?? [0, 0]));

const PrintItem: React.FC<{ it: Extract<BoardItem, { type: "print" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in), tOut = it.t_out !== undefined ? T(c, it.t_out) : undefined;
  let { s, a, lift } = dropAnim(c.t, t0); let tx = 0, ty = 0, tr = 0;
  if (it.torn) { const u = easeOutBack(ramp(c.t, t0, 0.42), 1.1); s = 1; lift = 1 - easeOutCubic(ramp(c.t, t0, 0.42)); tx = (1 - u) * 260; ty = (1 - u) * 900; tr = (1 - u) * 7; a = ramp(c.t, t0, 0.08); }
  a *= fadeOut(c.t, tOut); if (a <= 0) return null;
  const w = it.w, h = it.w / it.aspect, b = it.torn ? 0 : 0.035 * Math.min(w, h), W = w + 2 * b, H = h + 2 * b, off = 18 + 70 * lift;
  const filt = c.grade === "bw" ? "grayscale(1) contrast(1.08)" : c.grade === "sepia" ? "sepia(.75) contrast(1.05) brightness(.97)" : "none";
  const dim = it.dim_after !== undefined ? 0.45 * ramp(c.t, T(c, it.dim_after), 0.6) : 0;
  const clip = `pc-${hashStr(it.img + it.x)}`;
  const lt = it.label_t !== undefined ? T(c, it.label_t) : t0 + 0.35;
  return (
    <>
      <g transform={`translate(${it.x + tx} ${it.y + ty}) rotate(${(it.rot ?? 0) + 3 * lift + tr}) scale(${s})`} opacity={a}>
        <rect x={-W / 2 + off * 0.4} y={-H / 2 + off} width={W} height={H} fill="rgba(0,0,0,.55)" filter="url(#bf-shadow)" />
        {it.torn ? (<><clipPath id={clip}><path d={tornPath(W, H, hashStr(it.img))} /></clipPath><path d={tornPath(W, H, hashStr(it.img))} fill="none" stroke="rgba(240,237,230,.9)" strokeWidth={10} /></>)
          : (<><clipPath id={clip}><rect x={-W / 2} y={-H / 2} width={W} height={H} /></clipPath><rect x={-W / 2} y={-H / 2} width={W} height={H} fill={c.look.paper} /></>)}
        <image href={staticFile(it.img)} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} style={{ filter: filt }} />
        {dim > 0 && <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={`rgba(0,0,0,${dim})`} />}
        {it.pin !== false && <Pin x={it.torn ? -0.36 * W : 0} y={-H / 2 + Math.max(b * 0.5, 0.03 * H)} r={Math.max(26, 0.02 * W)} a={1} />}
      </g>
      {it.label && c.t >= lt && <Label text={it.label} x={it.x + tx} y={it.y + ty + (H / 2) * s + 30} size={Math.max(120, 0.068 * W)} rot={it.rot ?? 0} a={ramp(c.t, lt, 0.15) * fadeOut(c.t, tOut)} reveal={ramp(c.t, lt, 0.4)} />}
    </>
  );
};

const DocItem: React.FC<{ it: Extract<BoardItem, { type: "doc" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in); const { s, a, lift } = dropAnim(c.t, t0); if (a <= 0) return null;
  const rows = it.rows ?? 14, rowH = (it.h * 0.62) / rows, x0 = -it.w / 2 + it.w * 0.09, top = -it.h / 2 + it.h * 0.3;
  let y = -it.h / 2 + it.w * 0.09;
  const head = (it.header ?? []).map((hd, i) => { y += hd.size * 1.25; return <text key={i} x={0} y={y} textAnchor="middle" fontFamily={FONTS[hd.font ?? "serif"]} fontSize={hd.size} fill="#2a2520" letterSpacing={hd.font === "mono" ? 4 : 0}>{hd.text}</text>; });
  const sr = it.sentence_row ?? 4, ss = it.sentence_size ?? 70, words = (it.sentence ?? "").split(" "), perLine = Math.max(4, Math.floor((it.w * 0.82) / (ss * 0.5)));
  const lines: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > perLine) { lines.push(cur.trim()); cur = w; } else cur += " " + w; }
  if (cur.trim()) lines.push(cur.trim());
  const sy = top + sr * rowH;
  return (
    <g transform={`translate(${it.x} ${it.y}) rotate(${(it.rot ?? 0) + 3 * lift}) scale(${s})`} opacity={a}>
      <rect x={-it.w / 2 + 14} y={-it.h / 2 + 24 + 50 * lift} width={it.w} height={it.h} fill="rgba(0,0,0,.5)" filter="url(#bf-shadow)" />
      <rect x={-it.w / 2} y={-it.h / 2} width={it.w} height={it.h} fill={c.look.paper} />
      {head}
      {Array.from({ length: rows }).map((_, i) => (i >= sr && i < sr + lines.length ? null : <rect key={i} x={x0} y={top + i * rowH} width={it.w * (0.74 + 0.08 * Math.sin(i * 2.3))} height={rowH * 0.28} fill="rgba(60,55,50,.18)" />))}
      {(it.highlights ?? []).map((hl, k) => {
        const li = lines.findIndex((l) => l.includes(hl.phrase.split(" ")[0])); if (li < 0) return null;
        const line = lines[li], start = line.indexOf(hl.phrase.split(" ")[0]), len = Math.min(hl.phrase.length, line.length - start);
        const u = easeOutCubic(ramp(c.t, T(c, hl.t), 0.4));
        return <rect key={k} x={x0 + start * ss * 0.5} y={sy + li * ss * 1.35 - ss * 0.95} width={len * ss * 0.5 * u} height={ss * 1.2} fill="rgba(255,214,10,.55)" />;
      })}
      {lines.map((l, i) => <text key={i} x={x0} y={sy + i * ss * 1.35} fontFamily={SERIF} fontSize={ss} fill="#1e1a16">{l}</text>)}
      {it.recreation !== false && <text x={it.w / 2 - it.w * 0.06} y={it.h / 2 - it.w * 0.05} textAnchor="end" fontFamily={MONO} fontSize={Math.max(26, it.w * 0.022)} fill="rgba(60,55,50,.6)">RECREATION</text>}
    </g>
  );
};

const BigTextItem: React.FC<{ it: Extract<BoardItem, { type: "bigtext" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in), tOut = it.t_out !== undefined ? T(c, it.t_out) : undefined, a = ramp(c.t, t0, 0.1) * fadeOut(c.t, tOut);
  if (a <= 0) return null;
  const n = it.text.length, shown = it.type_on ? Math.ceil(n * ramp(c.t, t0, it.type_on)) : n, s = 1 + 0.08 * (1 - easeOutCubic(ramp(c.t, t0, 0.35)));
  const w = n * it.size * 0.5;
  return (
    <g transform={`translate(${it.x} ${it.y}) scale(${s})`} opacity={a}>
      {it.bar && <rect x={-w / 2 - it.size * 0.25} y={-it.size * 0.92} width={(w + it.size * 0.5) * easeOutCubic(ramp(c.t, t0, 0.3))} height={it.size * 1.15} fill={it.bar} />}
      <text x={0} y={0} textAnchor="middle" fontFamily={FONTS[it.font ?? "cond"]} fontWeight={700} fontSize={it.size} fill={it.color ?? c.look.ink} letterSpacing={it.size * 0.02} filter={it.bar ? undefined : "url(#bf-textshadow)"}>{it.text.slice(0, shown)}</text>
    </g>
  );
};

const CounterItem: React.FC<{ it: Extract<BoardItem, { type: "counter" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in), a = ramp(c.t, t0, 0.15) * fadeOut(c.t, it.t_out !== undefined ? T(c, it.t_out) : undefined); if (a <= 0) return null;
  const u = easeInOut(ramp(c.t, t0, it.dur ?? 1.0)), v = it.value * u, d = it.decimals ?? 0;
  const txt = (it.prefix ?? "") + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) + (it.suffix ?? "");
  return (
    <g transform={`translate(${it.x} ${it.y})`} opacity={a}>
      <text textAnchor="middle" fontFamily={COND} fontWeight={700} fontSize={it.size} fill={it.color ?? c.look.ink} filter="url(#bf-textshadow)">{txt}</text>
      {it.caption && <text y={it.size * 0.42} textAnchor="middle" fontFamily={COND} fontWeight={500} fontSize={it.size * 0.2} letterSpacing={it.size * 0.03} fill={it.color ?? c.look.ink} opacity={0.75}>{it.caption}</text>}
    </g>
  );
};

const StampItem: React.FC<{ it: Extract<BoardItem, { type: "stamp" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in); if (c.t < t0) return null;
  const u = ramp(c.t, t0, 0.18), s = 1.6 - 0.6 * easeOutCubic(u), col = it.color ?? "#c0201c", w = it.text.length * it.size * 0.6 + it.size;
  return (
    <g transform={`translate(${it.x} ${it.y}) rotate(${it.rot ?? -8}) scale(${s})`} opacity={0.85 * ramp(c.t, t0, 0.06) * fadeOut(c.t, it.t_out !== undefined ? T(c, it.t_out) : undefined)} filter="url(#bf-ink)">
      <rect x={-w / 2} y={-it.size * 0.85} width={w} height={it.size * 1.25} fill="none" stroke={col} strokeWidth={it.size * 0.09} />
      <text textAnchor="middle" y={it.size * 0.22} fontFamily={COND} fontWeight={700} fontSize={it.size} letterSpacing={it.size * 0.08} fill={col}>{it.text}</text>
    </g>
  );
};

function penPath(kind: string, w: number, h: number, seed: number) {
  const r = mulberry(seed);
  if (kind === "ellipse") { const pts: string[] = []; for (let i = 0; i <= 60; i++) { const a = -Math.PI * 0.6 + (i / 60) * Math.PI * 2.15, j = 1 + (r() - 0.5) * 0.04; pts.push(`${((w / 2) * Math.cos(a) * j).toFixed(1)},${((h / 2) * Math.sin(a) * j).toFixed(1)}`); } return "M" + pts.join(" L"); }
  if (kind === "tick") return `M${-w / 2},0 L${-w / 6},${w / 3} L${w / 2},${-w / 2}`;
  if (kind === "cross") return `M${-w / 2},${-w / 2} L${w / 2},${w / 2} M${w / 2},${-w / 2} L${-w / 2},${w / 2}`;
  return `M${-w / 2},0 Q${-w / 6},${-6 - r() * 8} ${0},${(r() - 0.5) * 8} T${w / 2},${-4}`;
}
const PenItem: React.FC<{ it: Extract<BoardItem, { type: "pen" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in); if (c.t < t0) return null;
  const u = ramp(c.t, t0, it.dur ?? 0.5), hl = it.kind === "highlight";
  const d = hl ? `M${-it.w / 2},0 L${it.w / 2},0` : penPath(it.kind, it.w, it.h ?? it.w * 0.3, it.seed ?? 1);
  return (
    <g transform={`translate(${it.x} ${it.y}) rotate(${it.rot ?? 0})`} opacity={fadeOut(c.t, it.t_out !== undefined ? T(c, it.t_out) : undefined)}>
      <path d={d} pathLength={1} strokeDasharray={`${u} 1`} fill="none" stroke={it.color ?? (hl ? "rgba(255,214,10,.6)" : "#c0201c")} strokeWidth={it.width ?? (hl ? 110 : 22)} strokeLinecap={hl ? "butt" : "round"} style={hl ? { mixBlendMode: "multiply" } : undefined} />
    </g>
  );
};

const StringItem: React.FC<{ it: Extract<BoardItem, { type: "string" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in); if (c.t < t0) return null;
  const [x0, y0] = pt(c, it.from), [x1, y1] = pt(c, it.to), L = Math.hypot(x1 - x0, y1 - y0), sag = (it.sag ?? 0.04) * L;
  const u = easeOutCubic(ramp(c.t, t0, it.dur ?? 0.8)), a = fadeOut(c.t, it.t_out !== undefined ? T(c, it.t_out) : undefined);
  return (
    <g opacity={a}>
      <path d={`M${x0},${y0} Q${(x0 + x1) / 2},${(y0 + y1) / 2 + sag} ${x1},${y1}`} pathLength={1} strokeDasharray={`${u} 1`} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={(it.width ?? 16) * 1.4} transform="translate(10 18)" filter="url(#bf-soft)" />
      <path d={`M${x0},${y0} Q${(x0 + x1) / 2},${(y0 + y1) / 2 + sag} ${x1},${y1}`} pathLength={1} strokeDasharray={`${u} 1`} fill="none" stroke={it.color ?? "#b8201c"} strokeWidth={it.width ?? 16} strokeLinecap="round" />
    </g>
  );
};

const CardItem: React.FC<{ it: Extract<BoardItem, { type: "card" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in); const { s, a, lift } = dropAnim(c.t, t0); if (a <= 0) return null;
  const pad = it.w * 0.07, acc = it.accent ?? "#c65c2e", ts = it.h * 0.17;
  return (
    <g transform={`translate(${it.x} ${it.y}) rotate(${(it.rot ?? 0) + 2 * lift}) scale(${s})`} opacity={a}>
      <rect x={-it.w / 2 + 12} y={-it.h / 2 + 20 + 40 * lift} width={it.w} height={it.h} rx={it.w * 0.03} fill="rgba(0,0,0,.35)" filter="url(#bf-shadow)" />
      <rect x={-it.w / 2} y={-it.h / 2} width={it.w} height={it.h} rx={it.w * 0.03} fill={c.look.card} />
      <rect x={-it.w / 2} y={-it.h / 2} width={it.w * 0.02} height={it.h} fill={acc} />
      <text x={-it.w / 2 + pad} y={-it.h / 2 + pad + ts} fontFamily={COND} fontWeight={700} fontSize={ts} fill={c.look.cardInk}>{it.title}</text>
      {(it.lines ?? []).map((l, i) => <text key={i} x={-it.w / 2 + pad} y={-it.h / 2 + pad + ts * 1.9 + i * ts * 0.75} fontFamily={SERIF} fontSize={ts * 0.5} fill={c.look.cardInk} opacity={0.8}>{l}</text>)}
    </g>
  );
};

const MapItem: React.FC<{ it: Extract<BoardItem, { type: "map" }>; c: Ctx }> = ({ it, c }) => {
  const m = c.maps[it.name ?? Object.keys(c.maps)[0]]; if (!m) return null;
  const [x0, y0, x1, y1] = m.bounds, a = ramp(c.t, T(c, it.t_in, -1), 0.6);
  return (
    <g opacity={a}>
      <rect x={x0 + 30} y={y0 + 50} width={x1 - x0} height={y1 - y0} fill="rgba(0,0,0,.45)" filter="url(#bf-shadow)" />
      <clipPath id="bf-mapclip"><rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} /></clipPath>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={it.water ?? "#5cb8c6"} />
      <g clipPath="url(#bf-mapclip)">{Object.entries(m.regions).map(([n, d]) => <path key={n} d={d} fill={it.color ?? "#ece6d8"} stroke={it.ink ?? "rgba(60,50,40,.35)"} strokeWidth={6} />)}</g>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="url(#bf-paper)" opacity={0.35} />
    </g>
  );
};

const RegionItem: React.FC<{ it: Extract<BoardItem, { type: "region" }>; c: Ctx }> = ({ it, c }) => {
  const m = c.maps[it.map ?? Object.keys(c.maps)[0]]; const t0 = T(c, it.t_in); if (!m || c.t < t0) return null;
  const k = ramp(c.t, it.t_change !== undefined ? T(c, it.t_change) : 1e9, 0.5), u = easeOutCubic(ramp(c.t, t0, 0.5));
  const col = it.to_color && k > 0 ? (k > 0.5 ? it.to_color : it.color) : it.color;
  return <g clipPath="url(#bf-mapclip)" opacity={(it.alpha ?? 0.9) * u}>{it.names.map((n) => (m.regions[n] ? <path key={n} d={m.regions[n]} fill={col} stroke="rgba(40,30,20,.4)" strokeWidth={6} /> : null))}</g>;
};

const RouteItem: React.FC<{ it: Extract<BoardItem, { type: "route" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in); if (c.t < t0) return null;
  const [x0, y0] = pt(c, it.from), [x1, y1] = pt(c, it.to), b = it.bend ?? 0.2, mx = (x0 + x1) / 2 - (y1 - y0) * b, my = (y0 + y1) / 2 + (x1 - x0) * b;
  const u = easeInOut(ramp(c.t, t0, it.dur ?? 1.4));
  return <path d={`M${x0},${y0} Q${mx},${my} ${x1},${y1}`} pathLength={1} strokeDasharray={`${u} 1`} fill="none" stroke={it.color ?? "#d9472b"} strokeWidth={it.width ?? 50} strokeLinecap="round" />;
};

const MarkerItem: React.FC<{ it: Extract<BoardItem, { type: "marker" }>; c: Ctx }> = ({ it, c }) => {
  const t0 = T(c, it.t_in); if (c.t < t0) return null;
  const [x, y] = pt(c, it.at), k = it.size ?? 2.6, u = easeOutBack(ramp(c.t, t0, 0.35)), side = it.side === "left" ? -1 : 1, fs = 150;
  return (
    <g opacity={ramp(c.t, t0, 0.15)}>
      <g transform={`translate(${x} ${y}) scale(${u * k})`}><path d="M-22,-22 L22,22 M22,-22 L-22,22" stroke={it.color ?? "#b8201c"} strokeWidth={11} strokeLinecap="round" /></g>
      <text x={x + side * 90} y={y + fs * 0.35} textAnchor={side < 0 ? "end" : "start"} fontFamily={COND} fontWeight={700} fontSize={fs} letterSpacing={fs * 0.06} fill={c.look.mapInk} stroke={c.look.mapHalo} strokeWidth={14} paintOrder="stroke">{it.label}</text>
    </g>
  );
};

const RENDER: Record<string, React.FC<{ it: any; c: Ctx }>> = { print: PrintItem, doc: DocItem, bigtext: BigTextItem, counter: CounterItem, stamp: StampItem, pen: PenItem, string: StringItem, card: CardItem, map: MapItem, region: RegionItem, route: RouteItem, marker: MarkerItem };
const ZDEF: Record<string, number> = { map: -50, region: -40, route: -30, marker: 30, print: 10, doc: 10, card: 10, string: 20, pen: 25, stamp: 26, counter: 28, bigtext: 29 };

export const BoardFilm: React.FC<{ cfg: BoardCfg; timing: KitTiming; durationSec?: number }> = ({ cfg, timing, durationSec }) => {
  const frame = useCurrentFrame(), { fps, width: W, height: H, durationInFrames } = useVideoConfig(), t = frame / fps, total = durationSec ?? durationInFrames / fps;
  const clock = React.useMemo(() => new Clock(timing), [timing]);
  const cam = React.useMemo(() => new Camera(cfg.camera.map((k) => ({ t: clock.at(k.t), x: k.x, y: k.y, zoom: k.zoom, rot: k.rot ?? 0 })),
    cfg.camera.map((k) => ({ t: clock.at(k.t), x: k.focus?.[0] ?? k.x, y: k.focus?.[1] ?? k.y, radius: k.radius ?? 1600 / k.zoom, strength: k.strength ?? 0.55 })), cfg.handheld ?? 1), [cfg, clock]);
  const look = LOOKS[cfg.look], c: Ctx = { t, clock, grade: cfg.grade ?? "natural", maps: cfg.maps ?? {}, look };
  const cv = cam.at(t), tr = worldTransform(cv, W, H), f = cam.focus(t);
  const items = cfg.items.map((it, i) => ({ it, i, z: it.z ?? ZDEF[it.type] ?? 0 })).sort((a, b) => a.z - b.z || a.i - b.i);
  const fin = clamp(t / (cfg.fadeIn ?? 0.8)), fout = clamp((total - t) / (cfg.fadeOut ?? 1.8));
  let spot: React.ReactNode = null;
  if (f) {
    const s = tr.scale, r = (cv.rot * Math.PI) / 180, dx = (f.x - cv.x) * s, dy = (f.y - cv.y) * s;
    const sx = W / 2 + dx * Math.cos(r) - dy * Math.sin(r), sy = H / 2 + dx * Math.sin(r) + dy * Math.cos(r), R = f.radius * s;
    spot = <AbsoluteFill style={{ background: `radial-gradient(circle at ${sx}px ${sy}px, rgba(0,0,0,0) ${R * 0.55}px, rgba(0,0,0,${f.strength}) ${R * 1.25}px)`, pointerEvents: "none" }} />;
  }
  return (
    <AbsoluteFill style={{ background: look.bg }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <filter id="bf-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={10} /></filter>
          <filter id="bf-shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={30} /></filter>
          <filter id="bf-textshadow" x="-20%" y="-50%" width="140%" height="200%"><feDropShadow dx={10} dy={16} stdDeviation={10} floodColor="#000" floodOpacity={0.5} /></filter>
          <filter id="bf-ink"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={3} /><feDisplacementMap in="SourceGraphic" scale={18} /></filter>
          <pattern id="bf-paper" width={512} height={512} patternUnits="userSpaceOnUse"><rect width={512} height={512} fill="#fff" opacity={0} /><circle cx={100} cy={80} r={240} fill="#000" opacity={0.03} /></pattern>
          <filter id="bf-board" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency={look.grain} numOctaves={4} seed={7} /><feColorMatrix values={look.grainMatrix} /></filter>
        </defs>
        <g transform={tr.svg}>
          <rect x={-60000} y={-60000} width={120000} height={120000} fill={look.board} />
          <rect x={-60000} y={-60000} width={120000} height={120000} filter="url(#bf-board)" opacity={look.grainAlpha} />
          {items.map(({ it, i }) => { const R = RENDER[it.type]; return R ? <R key={i} it={it} c={c} /> : null; })}
        </g>
      </svg>
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 }}>
        {[...new Set(cfg.items.filter((x) => x.type === "print").map((x) => (x as { img: string }).img))].map((src) => <Img key={src} src={staticFile(src)} style={{ width: 1, height: 1 }} />)}
      </div>
      {spot}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "#000", opacity: 1 - Math.min(fin, fout) }} />
      {cfg.audio && <Audio src={staticFile(cfg.audio.src)} volume={cfg.audio.gain ?? 1} />}
    </AbsoluteFill>
  );
};
