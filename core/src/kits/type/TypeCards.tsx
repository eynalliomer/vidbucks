// TypeCards: one card per narration line in a graphic style's skin (presets.ts). Content comes straight from the timing:
// the spoken words build the statement on their own times; an optional "big" (a number, year or keyword) lands as the
// card's hero; an optional "kicker" sits above. Works alone or as one segment of a MultiStyle film.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadSerif } from "@remotion/google-fonts/LibreBaskerville";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadDeco } from "@remotion/google-fonts/Limelight";
import { loadFont as loadHand } from "@remotion/google-fonts/Caveat";
import { loadFont as loadPixel } from "@remotion/google-fonts/VT323";
import { Clock, KitTiming, PRESS, clamp, easeOutBack, hashStr, mulberry, ramp } from "../time";
import { TYPE_PRESETS, TypePreset } from "./presets";

const LX = ["latin", "latin-ext"] as ("latin" | "latin-ext")[];
const FONT: Record<TypePreset["font"], string> = {
  archivo: loadArchivo("normal", { weights: ["600", "700", "800"], subsets: LX }).fontFamily,
  oswald: loadOswald("normal", { weights: ["500", "700"], subsets: LX }).fontFamily,
  serif: loadSerif("normal", { weights: ["400", "700"], subsets: LX }).fontFamily,
  mono: loadMono("normal", { weights: ["400", "500", "700"], subsets: LX }).fontFamily,
  deco: loadDeco("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily,
  hand: loadHand("normal", { weights: ["400", "700"], subsets: LX }).fontFamily,
  pixel: loadPixel("normal", { weights: ["400"], subsets: LX }).fontFamily,
};

export type TypeCard = { line: number; big?: string; kicker?: string };
export type TypeCardsCfg = { preset: string; cards: TypeCard[]; overrides?: Partial<TypePreset> };

const Texture: React.FC<{ p: TypePreset; t: number; W: number; H: number }> = ({ p, t, W, H }) => {
  const f = Math.floor(t * 24);
  if (p.texture === "scanlines") return <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 2px, transparent 2px 4px)` }} />;
  if (p.texture === "halftone") return <AbsoluteFill style={{ backgroundImage: `radial-gradient(${p.fg}22 1.6px, transparent 1.8px)`, backgroundSize: "9px 9px" }} />;
  if (p.texture === "dither") return <AbsoluteFill style={{ backgroundImage: `repeating-conic-gradient(${p.fg}14 0 25%, transparent 0 50%)`, backgroundSize: "4px 4px" }} />;
  if (p.texture === "film") {
    const r = mulberry(f * 97 + 3);
    return (<>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.65) 100%)`, opacity: 0.9 + 0.1 * r() }} />
      <svg width={W} height={H} style={{ position: "absolute" }}>{Array.from({ length: 3 }).map((_, i) => <line key={i} x1={r() * W} x2={r() * W + 4} y1={0} y2={H} stroke="rgba(255,255,255,.12)" strokeWidth={1 + r()} />)}</svg>
    </>);
  }
  if (p.texture === "none") return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", opacity: p.texture === "paper" ? 0.22 : 0.12, mixBlendMode: "multiply" }}>
      <filter id="tc-noise"><feTurbulence type="fractalNoise" baseFrequency={p.texture === "paper" ? 0.03 : 0.9} numOctaves={3} seed={p.texture === "grain" ? f % 9 : 4} /></filter>
      <rect width={W} height={H} filter="url(#tc-noise)" />
    </svg>
  );
};

const Ornament: React.FC<{ p: TypePreset; k: number; W: number; H: number; seed: number }> = ({ p, k, W, H, seed }) => {
  const r = mulberry(seed), e = PRESS(clamp(k));
  switch (p.ornament) {
    case "grid": return <svg width={W} height={H} style={{ position: "absolute" }}>{Array.from({ length: 13 }).map((_, i) => <rect key={i} x={96 + i * 144} y={H / 2 - (H * e) / 2} width={1} height={H * e} fill={p.dim} opacity={0.25} />)}</svg>;
    case "rules": return <svg width={W} height={H} style={{ position: "absolute" }}><rect x={96} y={H * 0.2} width={(W - 192) * e} height={3} fill={p.fg} /><rect x={96} y={H * 0.8} width={(W - 192) * e} height={1} fill={p.dim} /></svg>;
    case "bauhaus": return (<svg width={W} height={H} style={{ position: "absolute" }}>
      <circle cx={W * 0.78} cy={H * 0.32} r={H * 0.2 * e} fill={p.accent} /><rect x={W * 0.66} y={H * 0.55} width={H * 0.28 * e} height={H * 0.28 * e} fill={p.dim} />
      <path d={`M${W * 0.86} ${H * 0.9} L${W * 0.86 + H * 0.22 * e} ${H * 0.9} L${W * 0.86} ${H * 0.9 - H * 0.3 * e} Z`} fill={p.fg} /></svg>);
    case "deco": return (<svg width={W} height={H} style={{ position: "absolute" }}>
      <rect x={60} y={60} width={W - 120} height={H - 120} fill="none" stroke={p.accent} strokeWidth={3} opacity={e} /><rect x={78} y={78} width={W - 156} height={H - 156} fill="none" stroke={p.accent} strokeWidth={1} opacity={e} />
      {Array.from({ length: 9 }).map((_, i) => { const a = Math.PI + (i / 8) * Math.PI; return <line key={i} x1={W / 2} y1={H - 80} x2={W / 2 + Math.cos(a) * 260 * e} y2={H - 80 + Math.sin(a) * 260 * e} stroke={p.accent} strokeWidth={2} opacity={0.6} />; })}</svg>);
    case "frame": return <svg width={W} height={H} style={{ position: "absolute" }}><rect x={50} y={50} width={W - 100} height={H - 100} fill="none" stroke={p.fg} strokeWidth={6} opacity={0.8 * e} /><rect x={66} y={66} width={W - 132} height={H - 132} fill="none" stroke={p.fg} strokeWidth={2} opacity={0.6 * e} /></svg>;
    case "burst": return <svg width={W} height={H} style={{ position: "absolute" }}>{Array.from({ length: 24 }).map((_, i) => { const a = (i / 24) * Math.PI * 2, b = a + Math.PI / 24; return i % 2 ? null : <path key={i} d={`M${W / 2} ${H / 2} L${W / 2 + Math.cos(a) * W * e} ${H / 2 + Math.sin(a) * W * e} L${W / 2 + Math.cos(b) * W * e} ${H / 2 + Math.sin(b) * W * e} Z`} fill={p.dim} opacity={0.35} />; })}</svg>;
    case "bars": return <svg width={W} height={H} style={{ position: "absolute" }}>{Array.from({ length: 5 }).map((_, i) => <rect key={i} x={-W + (W * 1.4) * e + i * 90} y={H * (0.1 + 0.17 * i)} width={W * (0.3 + r() * 0.4)} height={H * 0.05} fill={i === 2 ? p.accent : p.dim} opacity={0.8} />)}</svg>;
    case "hud": return (<svg width={W} height={H} style={{ position: "absolute" }} stroke={p.fg} strokeWidth={3} fill="none" opacity={0.8 * e}>
      <path d={`M80 160 V80 H160 M${W - 160} 80 H${W - 80} V160 M80 ${H - 160} V${H - 80} H160 M${W - 160} ${H - 80} H${W - 80} V${H - 160}`} />
      {Array.from({ length: 30 }).map((_, i) => <line key={i} x1={W - 120} x2={W - 120 + (i % 5 ? 12 : 28)} y1={200 + i * 22} y2={200 + i * 22} strokeWidth={1.5} />)}</svg>);
    case "circuit": return (<svg width={W} height={H} style={{ position: "absolute" }} stroke={p.dim} strokeWidth={4} fill="none">
      {Array.from({ length: 8 }).map((_, i) => { const y = 120 + i * 110, x = 1300 + r() * 300; return <g key={i}><path d={`M${W} ${y} H${x} l-60 60 H${x - 300 * e}`} pathLength={1} strokeDasharray={`${e} 1`} /><circle cx={x - 300 * e} cy={y + 60} r={9} fill={p.accent} stroke="none" opacity={e} /></g>; })}</svg>);
    case "band": return <svg width={W} height={H} style={{ position: "absolute" }}><rect x={0} y={H * 0.74} width={W * e} height={H * 0.12} fill={p.accent} /><rect x={0} y={H * 0.86} width={W * e} height={H * 0.05} fill={p.fg} opacity={0.9} /></svg>;
    default: return null;
  }
};

export const TypeCards: React.FC<{ cfg: TypeCardsCfg; timing: KitTiming; durationSec?: number }> = ({ cfg, timing, durationSec }) => {
  const frame = useCurrentFrame(), { fps, width: W, height: H, durationInFrames } = useVideoConfig(), t = frame / fps;
  const clock = React.useMemo(() => new Clock(timing), [timing]), up = (x: string) => x.toLocaleUpperCase(timing.lang ?? "en");
  const p = { ...(TYPE_PRESETS[cfg.preset] ?? TYPE_PRESETS["swiss-motion"]), ...(cfg.overrides ?? {}) }, font = FONT[p.font];
  const end = durationSec ?? durationInFrames / fps;
  const cards = cfg.cards.filter((c) => timing.lines.some((l) => l.id === c.line));
  const idx = cards.reduce((acc, c, i) => (clock.L(c.line) - 0.25 <= t ? i : acc), 0), card = cards[idx];
  if (!card) return <AbsoluteFill style={{ background: p.bg }} />;
  const L = clock.line(card.line), t0 = L.start, tEnd = idx + 1 < cards.length ? clock.L(cards[idx + 1].line) - 0.25 : end;
  const out = 1 - ramp(t, tEnd - 0.2, 0.2), sc = W / 1920;
  const center = p.align === "center", x0 = center ? W / 2 : 140 * sc;
  const words = (L.words?.length ? L.words : L.text.split(" ").map((w) => [w, t0, t0] as [string, number, number]));
  const reveal = (a: number) => {
    const k = ramp(t, a - 0.04, p.motion === "type" || p.motion === "scroll" ? 0.06 : 0.18);
    return Math.min(k, out);
  };
  const glow = p.glow ? `0 0 ${12 * p.glow * sc}px ${p.fg}, 0 0 ${40 * p.glow * sc}px ${p.fg}` : undefined;
  const flick = p.motion === "flicker" ? (t - t0 < 0.35 ? (Math.floor((t - t0) * 30) % 3 === 1 ? 0.15 : 1) : 0.94 + 0.06 * Math.sin(t * 50)) : 1;
  const bigK = card.big ? ramp(t, t0 + 0.05, p.motion === "slam" ? 0.22 : 0.35) : 0;
  const bigScale = p.motion === "slam" ? 1.6 - 0.6 * easeOutBack(bigK, 1.2) : 1, bigRise = p.motion === "snap" ? (1 - PRESS(bigK)) * 120 * sc : 0;
  const iris = p.motion === "iris" ? clamp(ramp(t, t0 - 0.2, 0.6)) * Math.min(1, out + 0.0001) : 1;
  const fs = (card.big ? 64 : 92) * sc * (p.font === "hand" ? 1.25 : p.font === "pixel" ? 1.3 : 1);
  return (
    <AbsoluteFill style={{ background: p.bg, overflow: "hidden" }}>
      <Ornament p={p} k={ramp(t, t0 - 0.2, 0.5) * out} W={W} H={H} seed={hashStr(cfg.preset) + card.line} />
      <AbsoluteFill style={{ clipPath: p.motion === "iris" ? `circle(${iris * 75}% at 50% 50%)` : undefined, opacity: flick,
        transform: `scale(${1 + 0.045 * clamp((t - t0 + 0.25) / Math.max(1, tEnd - t0 + 0.25))}) translateX(${(center ? 0 : -14) * clamp((t - t0) / Math.max(1, tEnd - t0)) * sc}px)`, transformOrigin: center ? "50% 50%" : "20% 50%" }}>
        {card.kicker && <div style={{ position: "absolute", left: center ? 0 : x0, right: center ? 0 : undefined, top: H * 0.16, textAlign: center ? "center" : "left", fontFamily: FONT.mono, fontSize: 26 * sc, letterSpacing: 4 * sc, color: p.dim, opacity: ramp(t, t0 - 0.2, 0.3) * out }}>{up(card.kicker)}</div>}
        {card.big && (
          <div style={{ position: "absolute", left: center ? 0 : x0 - 10 * sc, right: center ? 0 : undefined, top: H * 0.2, textAlign: center ? "center" : "left", fontFamily: font, fontWeight: p.weight, fontSize: 300 * sc * (card.big.length > 6 ? 6 / card.big.length : 1), lineHeight: 1, color: p.motion === "stamp" ? p.accent : p.fg, opacity: Math.min(1, bigK * 3) * out, textShadow: glow,
            transform: `translateY(${bigRise}px) scale(${bigScale}) rotate(${p.motion === "stamp" ? -6 : 0}deg)`, transformOrigin: center ? "center" : "left center", letterSpacing: -0.03 * 300 * sc }}>{p.upper ? up(card.big) : card.big}</div>
        )}
        <div style={{ position: "absolute", left: center ? W * 0.1 : x0, right: center ? W * 0.1 : W * 0.32, top: card.big ? H * 0.6 : H * 0.36, textAlign: center ? "center" : "left", fontFamily: font, fontWeight: p.font === "deco" || p.font === "pixel" ? 400 : Math.min(p.weight, 800), fontSize: fs, lineHeight: 1.12, color: p.fg, textShadow: glow, letterSpacing: p.font === "mono" ? 0 : -0.01 * fs }}>
          {words.map(([w, a], i) => { const k = reveal(a); const rise = p.motion === "snap" ? (1 - PRESS(k)) * fs * 0.6 : 0;
            return <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: p.motion === "snap" ? Math.min(1, k * 4) : k > 0 ? 1 : 0, transform: `translateY(${rise}px)`, clipPath: p.motion === "snap" ? "inset(-20% -5% 0 -5%)" : undefined }}>{(p.upper ? up(w) : w) + (i < words.length - 1 ? " " : "")}</span>; })}
          {(p.motion === "type" || p.motion === "scroll") && <span style={{ opacity: Math.floor(t * 2) % 2 ? 1 : 0, color: p.accent }}>▌</span>}
        </div>
      </AbsoluteFill>
      <Texture p={p} t={t} W={W} H={H} />
    </AbsoluteFill>
  );
};
