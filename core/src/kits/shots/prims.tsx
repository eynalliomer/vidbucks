// ShotFilm primitives: the DIRECTION grammar every act (and any line) chooses, and the pieces that obey it.
// A style is no longer one skin over one motion: an act picks its camera language, how media arrives, how pictures are
// framed, how words appear and which type pair speaks. Each dimension is independent, so two films never have to move alike.
//   camera : kenburns · locked · punch · handheld · drift · whip · rostrum
//   enter  : cut · slide · drop · develop · mask · blinds · tear · projector · scan · glitch · unfold
//   frame  : bleed · print · polaroid · window · arch · circle · strip · crt · torn · hex · inset
//   media  : a Pic may be a still or a video clip (.mp4/.webm; `in` = its in-point in seconds); every treatment applies to both
//   caption: lower · kinetic · subtitle · typewriter · karaoke · margin · none
//   fonts  : any display/text pair from FONT (24 families, all with Turkish glyphs unless noted)
import React from "react";
import { Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as fArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as fOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as fSerif } from "@remotion/google-fonts/LibreBaskerville";
import { loadFont as fMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as fDeco } from "@remotion/google-fonts/Limelight";
import { loadFont as fHand } from "@remotion/google-fonts/Caveat";
import { loadFont as fPixel } from "@remotion/google-fonts/VT323";
import { loadFont as fPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as fBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as fGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as fAnton } from "@remotion/google-fonts/Anton";
import { loadFont as fElite } from "@remotion/google-fonts/SpecialElite";
import { loadFont as fCourier } from "@remotion/google-fonts/CourierPrime";
import { loadFont as fFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as fAbril } from "@remotion/google-fonts/AbrilFatface";
import { loadFont as fDMSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as fInter } from "@remotion/google-fonts/Inter";
import { loadFont as fRighteous } from "@remotion/google-fonts/Righteous";
import { loadFont as fBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as fCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as fUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as fStaat } from "@remotion/google-fonts/Staatliches";
import { loadFont as fSyne } from "@remotion/google-fonts/Syne";
import { loadFont as fRubik } from "@remotion/google-fonts/Rubik";
import { PRESS, clamp, easeInOut, easeOutBack, easeOutCubic, hashStr, mulberry, ramp } from "../time";
import type { TypePreset } from "../type/presets";
import type { MapData } from "../board/BoardFilm";

const LX = ["latin", "latin-ext"] as ("latin" | "latin-ext")[];
export const FONT = {
  archivo: fArchivo("normal", { weights: ["600", "700", "800"], subsets: LX }).fontFamily, oswald: fOswald("normal", { weights: ["500", "700"], subsets: LX }).fontFamily,
  serif: fSerif("normal", { weights: ["400", "700"], subsets: LX }).fontFamily, mono: fMono("normal", { weights: ["400", "500", "700"], subsets: LX }).fontFamily,
  deco: fDeco("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, hand: fHand("normal", { weights: ["400", "700"], subsets: LX }).fontFamily,
  pixel: fPixel("normal", { weights: ["400"], subsets: LX }).fontFamily,
  playfair: fPlayfair("normal", { weights: ["400", "700", "900"], subsets: LX }).fontFamily, bebas: fBebas("normal", { weights: ["400"], subsets: LX }).fontFamily,
  grotesk: fGrotesk("normal", { weights: ["400", "500", "700"], subsets: LX }).fontFamily, anton: fAnton("normal", { weights: ["400"], subsets: LX }).fontFamily,
  elite: fElite("normal", { weights: ["400"], subsets: LX }).fontFamily, courier: fCourier("normal", { weights: ["400", "700"], subsets: LX }).fontFamily,
  fraunces: fFraunces("normal", { weights: ["400", "600", "900"], subsets: LX }).fontFamily, abril: fAbril("normal", { weights: ["400"], subsets: LX }).fontFamily,
  dmserif: fDMSerif("normal", { weights: ["400"], subsets: LX }).fontFamily, inter: fInter("normal", { weights: ["400", "600", "800"], subsets: LX }).fontFamily,
  righteous: fRighteous("normal", { weights: ["400"], subsets: LX }).fontFamily, bangers: fBangers("normal", { weights: ["400"], subsets: LX }).fontFamily,
  cormorant: fCormorant("normal", { weights: ["400", "600", "700"], subsets: LX }).fontFamily, unbounded: fUnbounded("normal", { weights: ["400", "700", "900"], subsets: LX }).fontFamily,
  staat: fStaat("normal", { weights: ["400"], subsets: LX }).fontFamily, syne: fSyne("normal", { weights: ["500", "700", "800"], subsets: LX }).fontFamily,
  rubik: fRubik("normal", { weights: ["400", "600", "800"], subsets: LX }).fontFamily,
};
export type FontKey = keyof typeof FONT;
const ONE_WEIGHT: FontKey[] = ["deco", "pixel", "bebas", "anton", "elite", "abril", "dmserif", "righteous", "bangers", "staat"];
export const fw = (k: FontKey, w: number) => (ONE_WEIGHT.includes(k) ? 400 : w);

export type Treat = "natural" | "bw" | "sepia" | "duotone" | "halftone" | "riso" | "night" | "warm" | "cold" | "faded" | "vhs" | "kodak";
export type Camera = "kenburns" | "locked" | "punch" | "handheld" | "drift" | "whip" | "rostrum";
export type Enter = "cut" | "slide" | "drop" | "develop" | "mask" | "blinds" | "tear" | "projector" | "scan" | "glitch" | "unfold";
export type Frame = "bleed" | "print" | "polaroid" | "window" | "arch" | "circle" | "strip" | "crt" | "torn" | "hex" | "inset";
export type CaptionMode = "lower" | "kinetic" | "subtitle" | "typewriter" | "karaoke" | "margin" | "none";
export type Direction = {
  camera?: Camera; enter?: Enter; frame?: Frame; caption?: CaptionMode; treat?: Treat;
  fonts?: { display?: FontKey; text?: FontKey }; palette?: Partial<Pick<TypePreset, "bg" | "fg" | "accent" | "dim">>;
  texture?: TypePreset["texture"]; ornament?: TypePreset["ornament"]; upper?: boolean; sound?: string;
};
export type Skin = TypePreset & { photo: Treat; dir: Required<Pick<Direction, "camera" | "enter" | "frame" | "caption">>; display: FontKey; text: FontKey };
export type Pic = { src: string; aspect: number; title?: string; creator?: string; license?: string; label?: string; in?: number; rate?: number };
export const isVideo = (src: string) => /\.(mp4|webm|mov)$/i.test(src);
export type Pop = { text: string; word: number; color?: string; pos?: [number, number]; size?: number };
export type ShotLine = { line: number; idea: string; shot: string; data?: Record<string, any>; picked?: Pic; extra?: Pic[]; direction?: Direction;
  /** chapter pill that stays until a later line sets another (or "" to clear) */ tag?: string;
  /** words that pop over the picture on a spoken word (prices, years) */ pops?: Pop[];
  /** a card that fills the silence after this line (channel bumper, chapter title) */ after?: { title: string; sub?: string } };
export type Ctx = { t: number; t0: number; t1: number; W: number; H: number; skin: Skin; L: ShotLine; words: [string, number, number][]; up: (s: string) => string; maps: Record<string, MapData>; seed: number };

export const light = (hex: string) => { const n = parseInt(hex.replace("#", "").slice(0, 6), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) > 128; };
const FILTER: Record<Treat, string> = {
  natural: "saturate(1.05)", bw: "grayscale(1) contrast(1.15)", sepia: "sepia(.8) contrast(1.05)", duotone: "grayscale(1) contrast(1.25)", halftone: "grayscale(1) contrast(1.25)", riso: "grayscale(1) contrast(1.25)",
  night: "grayscale(.6) brightness(.55) contrast(1.2) hue-rotate(160deg) saturate(1.4)", warm: "saturate(1.15) sepia(.25) contrast(1.05)", cold: "saturate(.8) hue-rotate(-12deg) contrast(1.1) brightness(.95)", faded: "saturate(.55) contrast(.9) brightness(1.08)",
  vhs: "saturate(1.3) contrast(1.12) brightness(1.04) blur(.6px)", kodak: "sepia(.28) saturate(1.18) contrast(.94) brightness(1.06) hue-rotate(-6deg)",
};

// ---------------------------------------------------------------- camera: where the picture's window looks, over the shot
/** returns [focusX, focusY, zoom, rotateDeg, blurPx] for a shot at progress k (0..1), absolute t and seconds since entry */
export function cameraAt(cam: Camera, k: number, t: number, since: number, from: number[] = [0.5, 0.5, 1.0], to: number[] = [0.5, 0.5, 1.18], seed = 1): [number, number, number, number, number] {
  const mix = (u: number) => [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u];
  if (cam === "locked") return [from[0], from[1], Math.max(1.02, from[2]), 0, 0];
  if (cam === "punch") { const step = k < 0.38 ? 0 : k < 0.72 ? 0.55 : 1, [x, y, z] = mix(step); return [x, y, z * (1 + 0.012 * (k * 3 - Math.floor(k * 3))), 0, 0]; }   // hard jump-ins, a hair of creep between
  if (cam === "handheld") { const [x, y, z] = mix(0.3 * k + 0.7 * easeInOut(k)), a = seed % 7; return [x + 0.006 * Math.sin(t * 1.7 + a), y + 0.008 * Math.sin(t * 2.3 + a * 2), z + 0.04, 0.5 * Math.sin(t * 1.1 + a), 0]; }
  if (cam === "drift") { const dir = seed % 2 ? 1 : -1; return [clamp(0.5 - dir * 0.22 + dir * 0.44 * k), from[1], Math.max(1.12, from[2]), 0, 0]; }
  if (cam === "whip") { const land = easeOutCubic(clamp(since / 0.38)), dir = seed % 2 ? 1 : -1, [x, y, z] = mix(0.5 * k + 0.5 * easeInOut(k)); return [clamp(x + dir * 0.45 * (1 - land)), y, z + 0.1, 0, 26 * (1 - land)]; }
  if (cam === "rostrum") { const mid = [(from[0] + to[0]) / 2 + 0.12 * (seed % 2 ? 1 : -1), Math.min(1, to[1] + 0.12), (from[2] + to[2]) / 2 + 0.12], u = k < 0.5 ? easeInOut(k / 0.5) : easeInOut((k - 0.5) / 0.5), a = k < 0.5 ? from : mid, b = k < 0.5 ? mid : to;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, 0, 0]; }
  const [x, y, z] = mix(0.35 * k + 0.65 * easeInOut(k)); return [x, y, z, 0, 0];   // kenburns
}

// ---------------------------------------------------------------- entrance: how the picture arrives in its first moments
function enterStyle(enter: Enter, since: number, w: number, h: number, seed: number): React.CSSProperties {
  const dir = seed % 2 ? 1 : -1;
  switch (enter) {
    case "slide": { const u = PRESS(clamp(since / 0.5)); return { transform: `translateX(${(1 - u) * dir * w * 0.6}px)`, opacity: Math.min(1, since / 0.12) }; }
    case "drop": { const u = easeOutBack(clamp(since / 0.45), 1.1); return { transform: `scale(${1.35 - 0.35 * u}) rotate(${(1 - u) * dir * 7}deg)`, opacity: Math.min(1, since / 0.08) }; }
    case "develop": { const u = clamp(since / 1.1); return { filter: `brightness(${2.4 - 1.4 * u}) blur(${(1 - u) * 12}px) saturate(${u})`, opacity: Math.min(1, since / 0.25) }; }
    case "mask": { const u = PRESS(clamp(since / 0.6)); return u >= 1 ? {} : { clipPath: `circle(${u * 150}% at ${seed % 3 === 0 ? 30 : seed % 3 === 1 ? 50 : 70}% 50%)` }; }
    case "blinds": { const u = PRESS(clamp(since / 0.6)), n = 7, m = `repeating-linear-gradient(90deg, #000 0 ${(u * 100) / n}%, transparent ${(u * 100) / n}% ${100 / n}%)`; return u >= 1 ? {} : ({ WebkitMaskImage: m, maskImage: m } as React.CSSProperties); }
    case "tear": { const u = PRESS(clamp(since / 0.55)) * 112; return { clipPath: `polygon(0 0, ${u}% 0, ${u - 4}% 22%, ${u - 1}% 41%, ${u - 6}% 63%, ${u - 2}% 82%, ${u - 7}% 100%, 0 100%)` }; }
    case "projector": { const r = mulberry(seed + Math.floor(since * 30)); return { opacity: since > 0.5 ? 1 : since < 0.04 ? 0 : 0.35 + 0.65 * r(), filter: since > 0.5 ? undefined : `brightness(${1.2 + r()})` }; }
    case "scan": { const u = clamp(since / 0.6); return { clipPath: `inset(0 0 ${(1 - u) * 100}% 0)` }; }
    case "glitch": { const r = mulberry(seed + Math.floor(since * 30)); return since > 0.32 ? {} : { transform: `translateX(${(r() - 0.5) * w * 0.08}px) skewX(${(r() - 0.5) * 14}deg)`, filter: `hue-rotate(${r() * 90}deg) contrast(1.4)`, clipPath: `inset(${r() * 30}% 0 ${r() * 30}% 0)` }; }
    case "unfold": { const u = PRESS(clamp(since / 0.5)); return { transform: `perspective(${h * 3}px) rotateX(${(1 - u) * -82}deg)`, transformOrigin: "50% 0%", opacity: Math.min(1, since / 0.1) }; }
    default: return {};
  }
}

// ---------------------------------------------------------------- photo: treatment + frame + entrance + camera
/** tape look: scanlines, a soft tracking band that drifts down, a chroma fringe and tape noise */
const VhsLayer: React.FC<{ w: number; h: number; t: number; seed: number }> = ({ w, h, t, seed }) => {
  const r = mulberry(seed + Math.floor(t * 24)), band = ((t * 0.09 + (seed % 10) / 10) % 1.2) - 0.1;
  return (<>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 1px, transparent 1px 3px)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: `${band * 100}%`, height: h * 0.05, background: "linear-gradient(180deg, transparent, rgba(255,255,255,.10), transparent)", filter: "blur(2px)", transform: `translateX(${(r() - 0.5) * 8}px)` }} />
    <div style={{ position: "absolute", inset: 0, boxShadow: "inset 3px 0 0 rgba(255,0,60,.10), inset -3px 0 0 rgba(0,200,255,.10)", mixBlendMode: "screen" }} />
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, opacity: 0.16, mixBlendMode: "overlay" }}><filter id={`vhs${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.85 0.35" numOctaves={1} seed={Math.floor(t * 24) % 97} /></filter><rect width={w} height={h} filter={`url(#vhs${seed})`} /></svg>
  </>);
};

/** a still or a clip; a clip starts at its in-point when the shot enters (since = 0) */
const Media: React.FC<{ src: string; since: number; clipIn?: number; rate?: number; style: React.CSSProperties }> = ({ src, since, clipIn = 0, rate = 1, style }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  if (!isVideo(src)) return <Img src={staticFile(src)} style={style} />;
  return <Sequence from={frame - Math.round(Math.max(0, since) * fps)} layout="none"><OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(clipIn * fps)} playbackRate={rate} style={style} /></Sequence>;
};

export const Photo: React.FC<{ src: string; w: number; h: number; skin: Skin; k: number; t?: number; since?: number; from?: number[]; to?: number[]; style?: React.CSSProperties;
  frame?: Frame; enter?: Enter; camera?: Camera; treat?: Treat; seed?: number; label?: string; clipIn?: number; rate?: number }> =
  ({ src, w, h, skin, k, t = 0, since = 9, from, to, style, frame = "bleed", enter = "cut", camera = skin.dir.camera, treat = skin.photo, seed = 1, label, clipIn, rate }) => {
    const [fx, fy, z, rot, blur] = cameraAt(camera, k, t, since, from, to, seed), s = w / 1920;
    const pad = frame === "print" ? 0.022 * w : frame === "polaroid" ? 0.03 * w : 0, padB = frame === "polaroid" ? 0.13 * h : pad;
    const border = frame === "inset" ? Math.max(3, 5 * s) : 0;
    const radius = frame === "window" ? 26 * Math.max(0.5, s * 2) : frame === "crt" ? 40 * Math.max(0.5, s * 2) : frame === "arch" ? `${w / 2}px ${w / 2}px 0 0` : frame === "circle" ? "50%" : 0;
    const shape: React.CSSProperties = frame === "torn" ? { clipPath: "polygon(0 3%, 6% 0, 14% 2%, 27% 0, 41% 3%, 58% 1%, 73% 3%, 88% 0, 100% 2%, 98% 24%, 100% 47%, 97% 71%, 100% 96%, 86% 100%, 70% 97%, 52% 100%, 33% 98%, 17% 100%, 3% 97%, 0 78%, 2% 52%, 0 27%)" } : frame === "hex" ? { clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)" } : {};
    const boxed = frame !== "bleed", shadow = boxed && frame !== "torn" && frame !== "hex" ? "0 24px 70px rgba(0,0,0,.45)" : undefined;
    const tilt = frame === "print" || frame === "polaroid" ? ((seed % 5) - 2) * 1.1 : 0, e = enterStyle(enter, since, w, h, seed);
    return (
      <div style={{ position: "absolute", width: w, height: h, ...style, transform: `${style?.transform ?? ""} rotate(${tilt}deg) ${(e.transform as string) ?? ""}`.trim(), transformOrigin: e.transformOrigin ?? "50% 50%", opacity: (Number(style?.opacity ?? 1)) * Number(e.opacity ?? 1), filter: frame === "torn" || frame === "hex" ? "drop-shadow(0 18px 30px rgba(0,0,0,.45))" : undefined }}>
        <div style={{ position: "absolute", inset: 0, background: frame === "print" || frame === "polaroid" ? "#f6f2e7" : frame === "strip" ? "#0c0c0c" : "transparent", boxShadow: shadow, outline: border ? `${border}px solid #ece7dc` : undefined, borderRadius: radius, clipPath: e.clipPath, WebkitMaskImage: (e as any).WebkitMaskImage, maskImage: (e as any).maskImage, ...shape, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: pad, top: frame === "strip" ? h * 0.1 : pad, right: pad, bottom: frame === "strip" ? h * 0.1 : padB, overflow: "hidden", borderRadius: frame === "crt" ? radius : 0, filter: e.filter as string }}>
            <Media src={src} since={since} clipIn={clipIn} rate={rate} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: `${fx * 100}% ${fy * 100}%`, filter: `${FILTER[treat]}${blur ? ` blur(${blur}px)` : ""}`, transform: `scale(${z}) rotate(${rot}deg)`, transformOrigin: `${fx * 100}% ${fy * 100}%` }} />
            {treat === "vhs" && <VhsLayer w={w} h={h} t={t} seed={seed} />}
            {treat === "kodak" && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, rgba(255,214,150,.10) 0%, rgba(40,20,0,.42) 100%)", mixBlendMode: "multiply" }} />}
            {(treat === "duotone" || treat === "riso") && <div style={{ position: "absolute", inset: 0, background: skin.accent, mixBlendMode: "multiply", opacity: treat === "riso" ? 0.55 : 0.75 }} />}
            {treat === "duotone" && <div style={{ position: "absolute", inset: 0, background: skin.bg, mixBlendMode: "screen", opacity: 0.35 }} />}
            {treat === "riso" && <div style={{ position: "absolute", inset: 0, background: skin.fg, mixBlendMode: "screen", opacity: 0.25, transform: "translate(6px, 4px)" }} />}
            {treat === "halftone" && <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${skin.bg} 1.4px, transparent 1.6px)`, backgroundSize: "7px 7px", mixBlendMode: "screen", opacity: 0.55 }} />}
            {frame === "crt" && <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.35) 0 2px, transparent 2px 5px)", boxShadow: "inset 0 0 90px rgba(0,0,0,.8)" }} />}
            {enter === "scan" && since < 0.6 && <div style={{ position: "absolute", left: 0, right: 0, top: `${(since / 0.6) * 100}%`, height: 4, background: skin.accent, boxShadow: `0 0 24px ${skin.accent}` }} />}
          </div>
          {frame === "strip" && [0, 1].map((r) => <div key={r} style={{ position: "absolute", left: 0, right: 0, [r ? "bottom" : "top"]: h * 0.025, height: h * 0.05, backgroundImage: `repeating-linear-gradient(90deg, #e9e4d6 0 ${h * 0.04}px, transparent ${h * 0.04}px ${h * 0.085}px)`, backgroundPositionX: -k * h * 0.4 } as React.CSSProperties} />)}
          {frame === "polaroid" && label && <div style={{ position: "absolute", left: 0, right: 0, bottom: h * 0.028, textAlign: "center", fontFamily: FONT.hand, fontSize: h * 0.07, color: "#2a2620" }}>{label}</div>}
        </div>
        {frame === "print" && seed % 2 === 0 && <div style={{ position: "absolute", left: "44%", top: -h * 0.035, width: "12%", height: h * 0.07, background: "rgba(232,221,170,.75)", transform: "rotate(-3deg)" }} />}
      </div>
    );
  };

/** Ground: the act's coloured ground with its ornament (grid, rules, frame, hud, bars, band, burst, deco, circuit, bauhaus) */
export const Ground: React.FC<{ c: Ctx; dim?: boolean }> = ({ c, dim }) => {
  const { skin, W, H, t } = c, s = W / 1920, o = skin.ornament, col = skin.dim, a = dim ? 0.35 : 0.7;
  return (<>
    <div style={{ position: "absolute", inset: 0, background: skin.bg }} />
    {o === "grid" && <div style={{ position: "absolute", inset: 0, opacity: a * 0.35, backgroundImage: `linear-gradient(${col} 1px, transparent 1px), linear-gradient(90deg, ${col} 1px, transparent 1px)`, backgroundSize: `${120 * s}px ${120 * s}px`, backgroundPosition: `${-t * 6 * s}px ${-t * 4 * s}px` }} />}
    {o === "rules" && [0.12, 0.88].map((y) => <div key={y} style={{ position: "absolute", left: 100 * s, right: 100 * s, top: H * y, height: 2 * s, background: col, opacity: a }} />)}
    {o === "frame" && <div style={{ position: "absolute", inset: 44 * s, border: `${2 * s}px solid ${col}`, outline: `${1 * s}px solid ${col}`, outlineOffset: 8 * s, opacity: a * 0.8 }} />}
    {o === "hud" && [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => <div key={i} style={{ position: "absolute", [x ? "right" : "left"]: 50 * s, [y ? "bottom" : "top"]: 50 * s, width: 70 * s, height: 70 * s, [`border${y ? "Bottom" : "Top"}`]: `${3 * s}px solid ${skin.accent}`, [`border${x ? "Right" : "Left"}`]: `${3 * s}px solid ${skin.accent}`, opacity: a } as React.CSSProperties} />)}
    {o === "bars" && <><div style={{ position: "absolute", left: 0, top: H * 0.08, width: W * (0.25 + 0.05 * Math.sin(t * 0.6)), height: 22 * s, background: skin.accent, opacity: a }} /><div style={{ position: "absolute", right: 0, bottom: H * 0.08, width: W * (0.4 - 0.05 * Math.sin(t * 0.6)), height: 22 * s, background: skin.fg, opacity: a * 0.6 }} /></>}
    {o === "band" && <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 14 * s, background: skin.accent }} />}
    {o === "burst" && <div style={{ position: "absolute", inset: -H * 0.4, opacity: a * 0.22, background: `repeating-conic-gradient(from ${t * 4}deg at 50% 50%, ${skin.accent} 0 6deg, transparent 6deg 12deg)` }} />}
    {o === "deco" && <div style={{ position: "absolute", inset: 36 * s, border: `${3 * s}px double ${skin.accent}`, borderRadius: `${60 * s}px ${60 * s}px 0 0`, opacity: a }} />}
    {o === "circuit" && <div style={{ position: "absolute", inset: 0, opacity: a * 0.3, backgroundImage: `linear-gradient(90deg, ${skin.accent} 2px, transparent 2px), radial-gradient(${skin.accent} 3px, transparent 4px)`, backgroundSize: `${260 * s}px 100%, ${130 * s}px ${130 * s}px` }} />}
    {o === "bauhaus" && <><div style={{ position: "absolute", right: 90 * s, top: 80 * s, width: 150 * s, height: 150 * s, borderRadius: "50%", background: skin.accent, opacity: a }} /><div style={{ position: "absolute", left: 90 * s, bottom: 80 * s, width: 120 * s, height: 120 * s, background: skin.dim, opacity: a, transform: `rotate(${t * 6}deg)` }} /></>}
  </>);
};

// ---------------------------------------------------------------- words: the line, in the act's caption mode
const wordStyle = (skin: Skin, size: number, font?: string, weight?: number, color?: string): React.CSSProperties => ({ display: "inline-block", whiteSpace: "pre", marginRight: skin.motion === "slam" ? size * 0.12 : 0, fontFamily: font ?? FONT[skin.text], fontWeight: weight ?? fw(skin.text, skin.weight), fontSize: size, color: color ?? skin.fg, textShadow: skin.glow ? `0 0 ${size * 0.15 * skin.glow}px ${color ?? skin.fg}` : undefined });

/** words revealed on their spoken times in the skin's motion grammar (snap · type · flicker · slam · scroll · iris) */
export const Words: React.FC<{ words: [string, number, number][]; t: number; skin: Skin; size: number; color?: string; out?: number; up: (s: string) => string; weight?: number; font?: string; mode?: "reveal" | "karaoke" | "typewriter" }> =
  ({ words, t, skin, size, color, out = 1, up, weight, font, mode = "reveal" }) => {
    if (mode === "typewriter") {
      const full = words.map((w) => w[0]).join(" "), t0 = words[0]?.[1] ?? 0, t1 = words[words.length - 1]?.[2] ?? t0 + 1, n = Math.floor(clamp((t - t0) / Math.max(0.3, t1 - t0)) * full.length);
      return <span style={{ ...wordStyle(skin, size, font, weight, color), whiteSpace: "pre-wrap", opacity: out }}>{(skin.upper ? up(full) : full).slice(0, n)}<span style={{ opacity: Math.floor(t * 4) % 2 ? 1 : 0, color: skin.accent }}>▌</span></span>;
    }
    return (<>{words.map(([w, a, b], i) => {
      if (mode === "karaoke") { const on = t >= a - 0.04, now = on && t < b + 0.12;
        return <span key={i} style={{ ...wordStyle(skin, size, font, weight, on ? color ?? skin.fg : skin.dim), opacity: (on ? 1 : 0.45) * out, color: now ? skin.accent : on ? color ?? skin.fg : skin.dim, transform: now ? `translateY(${-size * 0.06}px)` : undefined }}>{(skin.upper ? up(w) : w) + (i < words.length - 1 ? " " : "")}</span>; }
      const k = Math.min(out, ramp(t, a - 0.04, skin.motion === "type" || skin.motion === "scroll" ? 0.05 : 0.2));
      return <span key={i} style={{ ...wordStyle(skin, size, font, weight, color), opacity: skin.motion === "snap" ? Math.min(1, k * 4) : skin.motion === "flicker" ? (k > 0 ? (k < 1 && Math.floor(t * 30) % 3 === 0 ? 0.3 : 1) : 0) : k > 0 ? 1 : 0,
        transform: skin.motion === "snap" ? `translateY(${(1 - PRESS(k)) * size * 0.5}px)` : skin.motion === "slam" ? `scale(${1 + 0.4 * (1 - easeOutBack(k))})` : skin.motion === "stamp" ? `rotate(${(1 - k) * -6}deg) scale(${1 + 0.25 * (1 - k)})` : undefined }}>{(skin.upper ? up(w) : w) + (i < words.length - 1 ? " " : "")}</span>;
    })}</>);
  };

/** Caption: the narrated line in the act's caption mode. `box` is where a lower/subtitle caption may sit. */
export const Caption: React.FC<{ c: Ctx; size?: number; box?: React.CSSProperties; plate?: boolean; mode?: CaptionMode; onPic?: boolean; side?: boolean }> = ({ c, size = 44, box, plate = true, mode, onPic, side }) => {
  const { t, t1, W, H, skin, words, up } = c, s = W / 1920, m0 = mode ?? skin.dir.caption, m = m0 === "margin" && !side ? "lower" : m0,   // a side column only where the scene keeps room for it
    out = 1 - ramp(t, t1 - 0.18, 0.18), big = skin.text === "hand" ? 1.3 : skin.text === "pixel" ? 1.25 : 1;
  if (m === "none" || !words.length) return null;
  if (m === "kinetic") {   // only the phrase being spoken, huge, in the display face
    const n = 3, idx = Math.max(0, words.reduce((q, w, i) => (t >= w[1] - 0.05 ? i : q), 0)), g = Math.floor(idx / n), chunk = words.slice(g * n, g * n + n), since = t - (chunk[0]?.[1] ?? t);
    return <div style={{ position: "absolute", left: 110 * s, right: 110 * s, bottom: 90 * s, lineHeight: 1.02, transform: `scale(${1 + 0.04 * clamp(since / 1.2)})`, transformOrigin: "0% 100%" }}>
      <Words words={chunk} t={t} skin={{ ...skin, motion: "snap" }} size={128 * s} up={up} out={out} font={FONT[skin.display]} weight={fw(skin.display, 800)} color={onPic ? "#fff" : skin.fg} /></div>;
  }
  if (m === "margin") return <div style={{ position: "absolute", left: 90 * s, top: H * 0.3, width: W * 0.24, borderLeft: `${6 * s}px solid ${skin.accent}`, paddingLeft: 26 * s, lineHeight: 1.25 }}><Words words={words} t={t} skin={skin} size={40 * s * big} up={up} out={out} /></div>;
  if (m === "subtitle") return <div style={{ position: "absolute", left: W * 0.14, right: W * 0.14, bottom: 64 * s, textAlign: "center", lineHeight: 1.25 }}>
    <span style={{ display: "inline-block", background: "rgba(12,12,12,.78)", borderRadius: 10 * s, padding: `${10 * s}px ${26 * s}px` }}><Words words={words} t={t} skin={{ ...skin, upper: false, glow: undefined, motion: "type" }} size={42 * s} up={up} out={out} font={FONT.inter} weight={600} color="#fff" /></span></div>;
  const body = <Words words={words} t={t} skin={skin} size={size * s * big} up={up} out={out} mode={m === "typewriter" ? "typewriter" : m === "karaoke" ? "karaoke" : "reveal"} font={m === "typewriter" ? FONT.courier : undefined} />;
  return <div style={{ position: "absolute", left: 120 * s, right: 120 * s, bottom: 70 * s, lineHeight: 1.2, ...(plate ? { background: `${skin.bg}d9`, padding: `${14 * s}px ${22 * s}px` } : {}), ...box }}>{body}</div>;
};

export { PRESS, clamp, easeInOut, easeOutBack, easeOutCubic, ramp, hashStr, mulberry };
