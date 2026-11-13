// ShotFilm: a film built from a VISUAL TREATMENT (visuals.json). Every line has its own idea and a scene chosen for what
// that line says; every act has a DIRECTION (camera · enter · frame · caption · fonts · treat · texture · ornament) chosen
// for what that part of the story is. Scenes: the classic 14 (layouts.tsx) + information graphics and set-ups (info.tsx).
// A style id only gives the palette and a default direction; the treatment may override any dimension per act or per line.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Clock, KitTiming, PRESS, clamp, easeOutCubic, hashStr } from "../time";
import { TYPE_PRESETS } from "../type/presets";
import type { MapData } from "../board/BoardFilm";
import { Camera, CaptionMode, Ctx, Direction, Enter, FONT, FontKey, Frame, ShotLine, Skin, Treat, easeOutBack, ramp } from "./prims";
import { classic } from "./layouts";
import { EXTENDED, extended } from "./info";

export type { Direction, ShotLine, Skin, Treat } from "./prims";
export const SKIN_PHOTO: Record<string, Treat> = {
  "swiss-motion": "bw", "bauhaus-shapes": "duotone", "art-deco": "sepia", "spy-titles": "duotone", "pop-art": "halftone", risograph: "riso", "halftone-dossier": "halftone",
  "silkscreen-poster": "riso", woodcut: "bw", engraving: "sepia", "ascii-crt": "night", "one-bit-dither": "bw", "silent-film": "bw", newsreel: "bw", "caption-news": "natural",
  "news-package": "natural", "dark-keynote": "natural", "hologram-hud": "night", "circuit-board": "night", "neon-tubes": "night", "oscilloscope-math": "night", chalkboard: "bw",
  whiteboard: "natural", blueprint: "duotone", "kino-montage": "duotone", "text-flash-cuts": "bw", spreadsheet: "natural", dataviz: "natural", "transit-map": "natural", "flat-space-explainer": "duotone",
};
type D4 = [Camera, Enter, Frame, CaptionMode, FontKey?, FontKey?];
/** what a style does when the treatment says nothing: each style moves, frames and speaks in its own way */
export const STYLE_DIRECTION: Record<string, D4> = {
  engraving: ["rostrum", "unfold", "print", "lower", "playfair", "serif"], woodcut: ["locked", "tear", "torn", "lower", "abril", "serif"], "art-deco": ["drift", "mask", "arch", "lower", "deco", "cormorant"],
  "silent-film": ["locked", "projector", "bleed", "subtitle", "deco", "serif"], newsreel: ["handheld", "projector", "strip", "lower", "anton", "courier"], "kino-montage": ["punch", "cut", "bleed", "kinetic", "anton", "oswald"],
  "halftone-dossier": ["locked", "drop", "polaroid", "typewriter", "elite", "courier"], "spy-titles": ["whip", "slide", "bleed", "kinetic", "bebas", "oswald"], "pop-art": ["punch", "drop", "torn", "kinetic", "bangers", "archivo"],
  "silkscreen-poster": ["punch", "tear", "torn", "kinetic", "staat", "oswald"], risograph: ["kenburns", "blinds", "print", "margin", "syne", "grotesk"], "swiss-motion": ["locked", "slide", "bleed", "margin", "archivo", "inter"],
  "bauhaus-shapes": ["drift", "mask", "circle", "margin", "unbounded", "grotesk"], "pictogram-motion": ["locked", "cut", "circle", "karaoke", "rubik", "rubik"], "caption-news": ["punch", "slide", "window", "lower", "archivo", "inter"],
  "news-package": ["handheld", "slide", "window", "lower", "oswald", "inter"], dataviz: ["locked", "mask", "window", "subtitle", "grotesk", "inter"], spreadsheet: ["locked", "scan", "window", "typewriter", "mono", "mono"],
  whiteboard: ["handheld", "slide", "print", "lower", "hand", "hand"], chalkboard: ["handheld", "develop", "print", "lower", "hand", "hand"], blueprint: ["rostrum", "scan", "window", "typewriter", "mono", "mono"],
  "flat-space-explainer": ["drift", "mask", "arch", "karaoke", "rubik", "grotesk"], "dark-keynote": ["drift", "develop", "window", "kinetic", "inter", "inter"], "hologram-hud": ["drift", "scan", "crt", "typewriter", "unbounded", "mono"],
  "circuit-board": ["locked", "scan", "window", "typewriter", "mono", "mono"], "oscilloscope-math": ["locked", "glitch", "crt", "typewriter", "mono", "mono"], "neon-tubes": ["drift", "projector", "window", "kinetic", "righteous", "grotesk"],
  "ascii-crt": ["locked", "glitch", "crt", "typewriter", "pixel", "pixel"], "one-bit-dither": ["punch", "scan", "bleed", "typewriter", "pixel", "pixel"], "text-flash-cuts": ["punch", "cut", "bleed", "kinetic", "anton", "archivo"],
  "transit-map": ["drift", "slide", "circle", "margin", "inter", "inter"],
};
const CAMS: Camera[] = ["kenburns", "locked", "punch", "handheld", "drift", "whip", "rostrum"], ENTERS: Enter[] = ["slide", "drop", "develop", "mask", "tear", "scan", "unfold"], FRAMES: Frame[] = ["bleed", "print", "window", "polaroid", "torn"], CAPS: CaptionMode[] = ["lower", "kinetic", "subtitle", "karaoke", "margin"];

export type Act = { id: string; lines: number[]; style: string; why?: string; direction?: Direction; transition?: { kind: "cut" | "fade" | "wipe" | "knife" | "flash" | "iris" | "push" | "zoom" | "dip"; dur?: number } };
export type Visuals = { public_dir: string; acts: Act[]; lines: ShotLine[]; maps?: Record<string, MapData>; audio?: { src: string; gain?: number };
  /** the channel's own mark: a corner bug and the colours of tags and bumpers (never another channel's) */ brand?: { name: string; color?: string; tag?: string; pop?: string; bug?: boolean } };

/** overlays that belong to the film, not to one scene: chapter pill, word pops, the bumper card and the corner bug */
const Overlays: React.FC<{ visuals: Visuals; i: number; t: number; W: number; H: number; clock: Clock; startOf: (q: number) => number; nextStart: number; skin: Skin }> = ({ visuals, i, t, W, H, clock, startOf, nextStart, skin }) => {
  const s = W / 1920, L = visuals.lines[i], b = visuals.brand, tagCol = b?.tag ?? "#C8202C", popCol = b?.pop ?? skin.accent;
  let ti = -1; for (let q = i; q >= 0; q--) if (visuals.lines[q].tag !== undefined) { ti = q; break; }
  const tag = ti >= 0 ? visuals.lines[ti].tag : "", tIn = ti >= 0 ? ramp(t, startOf(ti) + 0.25, 0.35) : 0;
  const ln = clock.line(L.line), words = ln.words ?? [], after = L.after, afterK = after ? ramp(t, ln.end + 0.15, 0.35) * (1 - ramp(t, nextStart - 0.35, 0.3)) : 0;
  return (<>
    {tag && afterK < 0.5 && <div style={{ position: "absolute", left: 64 * s, bottom: 70 * s, background: tagCol, color: "#fff", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 30 * s, letterSpacing: 1.5 * s, padding: `${8 * s}px ${18 * s}px`, borderRadius: 6 * s,
      transform: `translateX(${(1 - PRESS(tIn)) * -420 * s}px)`, boxShadow: "0 6px 18px rgba(0,0,0,.35)" }}>{tag.toUpperCase()}</div>}
    {(L.pops ?? []).map((p, k) => { const nw = Math.max(1, ln.text.split(/\s+/).filter(Boolean).length), hw = words[Math.min(words.length - 1, Math.floor((p.word * words.length) / nw))];   // script word -> heard word
      const at = hw?.[1] ?? ln.start, u = ramp(t, at - 0.05, 0.32), out = 1 - ramp(t, nextStart - 0.25, 0.2);
      if (u <= 0) return null; const [x, y] = p.pos ?? [0.5, 0.74];
      return <div key={k} style={{ position: "absolute", left: W * x, top: H * y, transform: `translate(-50%,-50%) scale(${0.4 + 0.6 * easeOutBack(u, 1.8)})`, opacity: Math.min(1, u * 3) * out, fontFamily: FONT.rubik, fontWeight: 800, fontSize: (p.size ?? 130) * s, color: p.color ?? popCol,
        WebkitTextStroke: `${6 * s}px rgba(10,20,10,.85)`, paintOrder: "stroke fill", textShadow: `0 ${8 * s}px ${24 * s}px rgba(0,0,0,.5)`, whiteSpace: "nowrap" } as React.CSSProperties}>{p.text}</div>; })}
    {after && afterK > 0 && <AbsoluteFill style={{ opacity: afterK, background: "radial-gradient(ellipse at 50% 45%, #2a2622 0%, #0b0a09 75%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT.playfair, fontWeight: 900, fontSize: 132 * s, color: "#f1e9da", letterSpacing: 6 * s, transform: `scale(${0.94 + 0.06 * afterK + 0.035 * ramp(t, ln.end, nextStart - ln.end)})`, textShadow: "0 0 40px rgba(255,220,170,.25)" }}>{after.title.toUpperCase()}</div>
      {after.sub && <div style={{ fontFamily: FONT.cormorant, fontStyle: "italic", fontSize: 54 * s, color: "#cdbfa8", marginTop: 6 * s, opacity: ramp(t, ln.end + 0.6, 0.5) }}>{after.sub}</div>}
    </AbsoluteFill>}
    {b?.bug !== false && b && <div style={{ position: "absolute", right: 46 * s, top: 38 * s, width: 74 * s, height: 74 * s, borderRadius: "50%", background: b.color ?? tagCol, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15 * s, lineHeight: 1.05, opacity: 0.85 * (1 - afterK) }}>{b.name.toUpperCase()}</div>}
  </>);
};

/** palette + type from the style, every other dimension from the direction (line > act > the style's default) */
export function resolveSkin(act: Act, line?: ShotLine): Skin {
  const base = TYPE_PRESETS[act.style] ?? TYPE_PRESETS["swiss-motion"], h = hashStr(act.style), dd = STYLE_DIRECTION[act.style] ?? [CAMS[h % CAMS.length], ENTERS[(h >> 3) % ENTERS.length], FRAMES[(h >> 6) % FRAMES.length], CAPS[(h >> 9) % CAPS.length]];
  const d: Direction = { ...(act.direction ?? {}), ...(line?.direction ?? {}), fonts: { ...(act.direction?.fonts ?? {}), ...(line?.direction?.fonts ?? {}) }, palette: { ...(act.direction?.palette ?? {}), ...(line?.direction?.palette ?? {}) } };
  const fkey = (k?: string) => (k && k in FONT ? (k as FontKey) : undefined);
  return { ...base, ...d.palette, texture: d.texture ?? base.texture, ornament: d.ornament ?? base.ornament, upper: d.upper ?? base.upper, photo: d.treat ?? SKIN_PHOTO[act.style] ?? "natural",
    dir: { camera: d.camera ?? dd[0], enter: d.enter ?? dd[1], frame: d.frame ?? dd[2], caption: d.caption ?? dd[3] }, display: fkey(d.fonts?.display) ?? dd[4] ?? base.font, text: fkey(d.fonts?.text) ?? dd[5] ?? base.font };
}

// On-screen words are always the SCRIPT's words (Whisper mishears names and writes years as digits); Whisper only
// lends its times. Equal counts map one to one; otherwise each script word takes the time at its relative position.
function scriptWords(text: string, heard: [string, number, number][], a: number, b: number): [string, number, number][] {
  const toks = text.split(/\s+/).filter(Boolean), n = toks.length, m = heard.length;
  return toks.map((w, j) => {
    if (m === n) return [w, heard[j][1], heard[j][2]];
    if (m) { const q = Math.min(m - 1, Math.floor((j / n) * m)); return [w, heard[q][1], heard[q][2]]; }
    const x = a + ((b - a) * j) / n; return [w, x, x + (b - a) / n];
  });
}

export const ShotFilm: React.FC<{ visuals: Visuals; timing: KitTiming; durationSec?: number }> = ({ visuals, timing, durationSec }) => {
  const frame = useCurrentFrame(), { fps, width: W, height: H, durationInFrames } = useVideoConfig(), t = frame / fps;
  const clock = React.useMemo(() => new Clock(timing), [timing]), up = (x: string) => x.toLocaleUpperCase(timing.lang ?? "en");
  const order = visuals.lines.map((l) => l.line), end = durationSec ?? durationInFrames / fps;
  const startOf = (i: number) => (i === 0 ? 0 : clock.L(order[i]) - 0.2), endOf = (i: number) => (i + 1 < order.length ? clock.L(order[i + 1]) - 0.2 : end);
  let i = 0; for (let q = 0; q < order.length; q++) if (t >= startOf(q)) i = q;
  const actOf = (q: number) => visuals.acts.find((a) => a.lines.includes(visuals.lines[q].line)) ?? visuals.acts[0];
  const render = (q: number, tt: number) => {
    const L = visuals.lines[q], skin = resolveSkin(actOf(q), L), ln = clock.line(L.line), words = scriptWords(ln.text, ln.words ?? [], ln.start, ln.end);
    const c: Ctx = { t: tt, t0: q === 0 ? 0 : Math.max(startOf(q), ln.start - 0.2), t1: endOf(q), W, H, skin, L, words, up, maps: visuals.maps ?? {}, seed: hashStr(`${visuals.public_dir}:${L.line}`) % 9973 };
    return EXTENDED.includes(L.shot) ? extended(c) : classic(c);
  };
  // act change -> its transition over the first moments of the new act
  const act = actOf(i), first = act.lines[0] === visuals.lines[i].line && i > 0, tr = first ? act.transition : undefined, raw = tr ? clamp((t - startOf(i)) / (tr.dur ?? 0.45)) : 1, tk = PRESS(raw);
  const live = tr && raw < 1 && tr.kind !== "cut";
  const style: React.CSSProperties = !live ? {} : tr!.kind === "fade" ? { opacity: tk } : tr!.kind === "wipe" ? { clipPath: `inset(0 ${100 - tk * 100}% 0 0)` } : tr!.kind === "iris" ? { clipPath: `circle(${tk * 75}% at 50% 50%)` } :
    tr!.kind === "knife" ? { clipPath: `inset(${50 - tk * 50}% 0 ${50 - tk * 50}% 0)` } : tr!.kind === "push" ? { transform: `translateX(${(1 - tk) * 100}%)` } : tr!.kind === "zoom" ? { transform: `scale(${2.2 - 1.2 * tk})`, opacity: Math.min(1, tk * 2) } : tr!.kind === "dip" ? { opacity: raw < 0.5 ? 0 : (raw - 0.5) * 2 } : {};
  const prevStyle: React.CSSProperties = !live ? {} : tr!.kind === "push" ? { transform: `translateX(${-tk * 100}%)` } : tr!.kind === "zoom" ? { transform: `scale(${1 + tk * 0.8})`, opacity: 1 - tk } : tr!.kind === "dip" ? { opacity: raw < 0.5 ? 1 - raw * 2 : 0 } : {};
  const skin = resolveSkin(act), tex = skin.texture;
  return (
    <AbsoluteFill style={{ background: tr?.kind === "dip" && live ? "#000" : skin.bg }}>
      {live && tr!.kind !== "flash" && <AbsoluteFill style={prevStyle}>{render(i - 1, t)}</AbsoluteFill>}
      <AbsoluteFill style={{ ...style, transform: style.transform ?? (i === 0 ? `scale(${1 + 0.22 * (1 - easeOutCubic(clamp(t / 2.2)))})` : undefined) }}>{render(i, t)}</AbsoluteFill>
      {tr?.kind === "flash" && raw < 1 && <AbsoluteFill style={{ background: "#fff", opacity: 1 - tk }} />}
      {tex === "scanlines" && <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0 2px, transparent 2px 4px)" }} />}
      {(tex === "paper" || tex === "grain" || tex === "riso") && <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: tex === "paper" ? 0.35 : 0.25 }}><svg width={W} height={H}><filter id="sf-grain"><feTurbulence type="fractalNoise" baseFrequency={tex === "paper" ? 0.9 : 1.4} numOctaves={2} seed={tex === "grain" ? Math.floor(frame / 2) : 3} /><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .4  0 0 0 0 .32  0 0 0 .55 0" /></filter><rect width={W} height={H} filter="url(#sf-grain)" /></svg></AbsoluteFill>}
      {(tex === "halftone" || tex === "dither") && <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(0,0,0,.18) 1px, transparent 1.6px)", backgroundSize: tex === "dither" ? "4px 4px" : "6px 6px", mixBlendMode: "multiply" }} />}
      {tex === "film" && <><AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.6) 100%)", opacity: 0.9 + 0.1 * Math.sin(frame * 1.7) }} />
        {frame % 11 < 2 && <AbsoluteFill><div style={{ position: "absolute", left: `${(hashStr(String(frame)) % 90) + 5}%`, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,.18)" }} /></AbsoluteFill>}</>}
      <Overlays visuals={visuals} i={i} t={t} W={W} H={H} clock={clock} startOf={startOf} nextStart={i + 1 < order.length ? startOf(i + 1) : end} skin={resolveSkin(act, visuals.lines[i])} />
      {visuals.audio && <Audio src={staticFile(visuals.audio.src)} volume={visuals.audio.gain ?? 1} />}
    </AbsoluteFill>
  );
};
