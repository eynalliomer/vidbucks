// LayerScene: declarative, agent-authored vector scenes (shots of layered shapes with bounded local keyframes),
// semantic one-line captions and an optional analog-TV finish. The data format matches the "layers.json" manifest
// (version 1): shots [{start, end, layers}], captions [{start, end, text}], voice/ambience/sfx tracks for the mixer.
// Layer types: rect, ellipse, path (M/L/Q/C/Z numeric commands), group (children, pivotX/Y), line (points, progress),
// arrow (w, progress), underline (w), text, image. Keys: [{t, x, y, w, angle (rad), alpha, progress, scaleX, scaleY}]
// interpolated with smoothstep, times relative to the shot. from/to limit a layer's visibility (shot-relative).
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSans";
import { smooth } from "../time";

const NOTO = loadFont("normal", { weights: ["500", "600"], subsets: ["latin", "latin-ext"] }).fontFamily;

type Key = { t: number; x?: number; y?: number; w?: number; angle?: number; alpha?: number; progress?: number; scaleX?: number; scaleY?: number };
export type Layer = {
  type: "rect" | "ellipse" | "path" | "group" | "line" | "arrow" | "underline" | "text" | "image";
  id?: string; x?: number; y?: number; w?: number; h?: number; radius?: number; fill?: string; stroke?: string; lineWidth?: number; color?: string;
  alpha?: number; angle?: number; progress?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number;
  commands?: (string | number)[][]; points?: [number, number][]; children?: Layer[]; text?: string; size?: number; bold?: boolean; path?: string;
  from?: number; to?: number; keys?: Key[]; motion?: { role: string; reason: string };
};
export type LayerShot = { start: number; end: number; layers: Layer[] };
export type LayerCfg = {
  version: 1; style: string; width: number; height: number; fps: number;
  shots: LayerShot[]; captions: { start: number; end: number; text: string }[];
  television?: { enabled?: boolean; intensity?: number }; look?: "tv" | "grid" | "paper";
  audio?: { src: string; gain?: number }; captionSize?: number; uppercase?: boolean; lang?: string;
};

const LOOK = {
  tv: { bg: "#111316", fg: "#dedfdf", cap: "#e9eaea", line: "#d0d2d4" },
  grid: { bg: "#fbfbf8", fg: "#191916", cap: "#191916", line: "#191916" },
  paper: { bg: "#f3ecdc", fg: "#2a2520", cap: "#2a2520", line: "#2a2520" },
};

function keyState(l: Layer, t: number): Layer {
  const ks = l.keys; if (!ks?.length) return l;
  const out: Layer = { ...l };
  for (const p of ["x", "y", "w", "angle", "alpha", "progress", "scaleX", "scaleY"] as const) {
    const pk = ks.filter((k) => k[p] !== undefined); if (!pk.length) continue;
    let v = pk[0][p]!;
    if (t >= pk[pk.length - 1].t) v = pk[pk.length - 1][p]!;
    else for (let i = 0; i < pk.length - 1; i++) if (t >= pk[i].t && t < pk[i + 1].t) { const u = smooth((t - pk[i].t) / (pk[i + 1].t - pk[i].t)); v = pk[i][p]! + (pk[i + 1][p]! - pk[i][p]!) * u; break; }
    (out as Record<string, unknown>)[p] = v;
  }
  return out;
}
const pathD = (cmds: (string | number)[][]) => cmds.map(([op, ...v]) => `${op}${(v as number[]).join(" ")}`).join(" ");
const polyD = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

const Draw: React.FC<{ layers: Layer[]; t: number; look: (typeof LOOK)["tv"] }> = ({ layers, t, look }) => (
  <>
    {layers.map((layer, i) => {
      if (t < (layer.from ?? 0) || t >= (layer.to ?? Infinity)) return null;
      const l = keyState(layer, t), x = l.x ?? 0, y = l.y ?? 0, px = l.pivotX ?? 0, py = l.pivotY ?? 0;
      const tf = `translate(${x} ${y}) translate(${px} ${py}) rotate(${((l.angle ?? 0) * 180) / Math.PI}) scale(${l.scaleX ?? 1} ${l.scaleY ?? 1}) translate(${-px} ${-py})`;
      const st = { fill: l.fill === "none" ? "none" : l.fill ?? "#dedfdf", stroke: l.stroke && l.stroke !== "none" ? l.stroke : undefined, strokeWidth: l.lineWidth ?? 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
      let el: React.ReactNode = null;
      if (l.type === "group") el = <Draw layers={l.children ?? []} t={t} look={look} />;
      else if (l.type === "rect") el = <rect width={l.w} height={l.h} rx={Math.min(l.radius ?? 0, (l.w ?? 0) / 2, (l.h ?? 0) / 2)} {...st} />;
      else if (l.type === "ellipse") el = <ellipse cx={(l.w ?? 0) / 2} cy={(l.h ?? 0) / 2} rx={(l.w ?? 0) / 2} ry={(l.h ?? 0) / 2} {...st} />;
      else if (l.type === "path") el = <path d={pathD(l.commands ?? [])} {...st} />;
      else if (l.type === "text") el = <text y={l.size ?? 52} fontFamily={NOTO} fontWeight={l.bold ? 700 : 500} fontSize={l.size ?? 52} fill={l.color ?? look.fg}>{l.text}</text>;
      else if (l.type === "image") el = <image href={staticFile(l.path!)} width={l.w ?? 200} height={l.h ?? l.w ?? 200} preserveAspectRatio="xMidYMid meet" />;
      else {
        const w = l.w ?? 200;
        const pts: [number, number][] = l.type === "underline" ? [[0, 1], [w * 0.25, -1], [w * 0.55, 2], [w, -2]] : l.type === "arrow" ? Array.from({ length: 30 }, (_, k) => [(w * k) / 29, -26 * Math.sin((k / 29) * Math.PI)] as [number, number]) : l.points ?? [];
        const p = l.progress ?? 1, col = l.color ?? look.line, lw = l.lineWidth ?? (l.type === "underline" ? 6 : 3);
        el = (<>
          <path d={polyD(pts)} pathLength={1} strokeDasharray={`${p} 1`} fill="none" stroke={col} strokeWidth={lw} strokeLinecap="round" strokeLinejoin="round" />
          {l.type === "arrow" && p > 0.95 && <path d={`M${w - 17} -12 L${w} 0 L${w - 19} 12`} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" />}
        </>);
      }
      return <g key={layer.id ?? i} transform={tf} opacity={l.alpha ?? 1}>{el}</g>;
    })}
  </>
);

export const LayerScene: React.FC<{ cfg: LayerCfg }> = ({ cfg }) => {
  const frame = useCurrentFrame(), { fps, width: W, height: H } = useVideoConfig(), t = frame / fps;
  const look = LOOK[cfg.look ?? (cfg.style === "B3" ? "tv" : cfg.style === "B2" ? "paper" : "grid")];
  const plane = 1280, ph = (plane * H) / W, k = W / plane;
  const shot = cfg.shots.find((s) => t >= s.start && t < s.end) ?? cfg.shots[cfg.shots.length - 1];
  const cap = cfg.captions.find((c) => t >= c.start && t < c.end);
  const tv = cfg.television?.enabled !== false && look === LOOK.tv, ti = cfg.television?.intensity ?? 0.45;
  const scene = (
    <svg width={W} height={H} viewBox={`0 0 ${plane} ${ph}`} style={{ position: "absolute" }}>
      {look === LOOK.grid && Array.from({ length: Math.ceil(ph / 64) }).map((_, i) => <line key={i} x1={0} x2={plane} y1={16.5 + i * 64} y2={16.5 + i * 64} stroke="rgba(76,90,105,.036)" strokeWidth={0.8} />)}
      {shot && <Draw layers={shot.layers} t={t - shot.start} look={look} />}
    </svg>
  );
  return (
    <AbsoluteFill style={{ background: look.bg }}>
      {scene}
      {tv && <>
        <AbsoluteFill style={{ filter: `blur(${6 * k}px)`, opacity: 0.35 * ti, mixBlendMode: "screen" }}>{scene}</AbsoluteFill>
        <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,${0.18 * ti}) 0px, rgba(0,0,0,${0.18 * ti}) ${k}px, transparent ${k}px, transparent ${3 * k}px)` }} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,${0.55 * ti}) 100%)` }} />
      </>}
      {cap && (
        <div lang={cfg.lang ?? "en"} style={{ position: "absolute", left: 0, right: 0, top: (ph - 60 - (cfg.captionSize ?? 34) * 0.9) * k, textAlign: "center", fontFamily: NOTO, fontWeight: 600, fontSize: (cfg.captionSize ?? 34) * k, color: look.cap, whiteSpace: "nowrap", textTransform: cfg.uppercase === false || look !== LOOK.tv ? "none" : "uppercase", letterSpacing: 0.3 * k }}>{cap.text}</div>
      )}
      {cfg.audio && <Audio src={staticFile(cfg.audio.src)} volume={cfg.audio.gain ?? 1} />}
      <div style={{ display: "none" }}>{cfg.shots.flatMap((s) => s.layers).filter((l) => l.type === "image").map((l, i) => <Img key={i} src={staticFile(l.path!)} />)}</div>
    </AbsoluteFill>
  );
};
export const layerDuration = (cfg: LayerCfg) => Math.max(...cfg.shots.map((s) => s.end));
