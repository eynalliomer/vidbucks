// TEMPLATE "HoloPromo": abstract 3D-looking motion-design promo. Near-black ground, thin white wireframe outlines, surfaces filled with a
// glowing holographic gradient, one glowing white ball travelling through every scene, a radial ray burst, then a glowing wordmark card.
// Typical reference: a 10-12 s vertical music-only brand Short. Scenes are fixed devices; words, colours, times and audio come from the config.
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { AudioCfg, AudioLayer, CL, EASE, GrainVignette, useTime } from "./kit";

const { fontFamily: SORA } = loadSora("normal", { weights: ["500", "600"], subsets: ["latin", "latin-ext"] });
const { fontFamily: MAN } = loadManrope("normal", { weights: ["400", "500"], subsets: ["latin", "latin-ext"] });

export type SceneKind = "cone" | "discs" | "slab" | "tunnel" | "tower" | "bars" | "burst";
export type HoloScene = { kind: SceneKind; from: number; to: number; word?: string };
export type HoloPromoConfig = {
  width: number; height: number; fps: number; durationSec: number;
  bg: string; holo: string[];          // holographic gradient stops (3-5 colours)
  scenes: HoloScene[];
  logo: { text: string; sub?: string; at: number; dot?: string };
  audio?: AudioCfg;
};

export const HoloPromo: React.FC<{ cfg: HoloPromoConfig }> = ({ cfg }) => {
  const f = useCurrentFrame(); const { width: W, height: H, fps } = cfg; const { sec, R } = useTime(fps); const t = f / fps;
  const u = Math.min(W, H) / 1080; const cx = W / 2; const hs = cfg.holo;
  const spin = t * 40;   // slow rotation of every holographic fill

  const Holo: React.FC<{ id: string; rot?: number }> = ({ id, rot = 0 }) => (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" gradientTransform={`rotate(${spin + rot} 0.5 0.5)`}>
      {[...hs, hs[0]].map((c, i, a) => <stop key={i} offset={i / (a.length - 1)} stopColor={c} />)}
    </linearGradient>
  );
  const glow = <filter id="hp-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={14 * u} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>;
  const Ball: React.FC<{ x: number; y: number; r?: number; op?: number }> = ({ x, y, r = 22, op = 1 }) => (
    <g opacity={op}><circle cx={x} cy={y} r={r * 2.6 * u} fill="white" opacity={0.12} /><circle cx={x} cy={y} r={r * u} fill="white" filter="url(#hp-glow)" /></g>
  );
  const S = { stroke: "rgba(255,255,255,0.85)", strokeWidth: 2.2 * u, fill: "none" } as const;

  const sc = cfg.scenes.find((s) => t >= s.from && t < s.to);
  const lt = sc ? t - sc.from : 0, dur = sc ? sc.to - sc.from : 1, p = lt / dur;
  const punch = sc ? interpolate(lt, [0, 0.35], [1.07, 1], { ...CL, easing: EASE.out }) : 1;

  const scene = (() => {
    if (!sc) return null;
    switch (sc.kind) {
      case "cone": {
        const fall = interpolate(lt, [0, dur], [H * 0.18, H * 0.78], { ...CL, easing: EASE.in });
        const top = 70 * u, bot = 300 * u;
        return (<g>
          <defs><linearGradient id="hp-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2f5f3" stopOpacity="0.95" /><stop offset="1" stopColor="#9fa8a4" stopOpacity="0.75" /></linearGradient></defs>
          <polygon points={`${cx - top},0 ${cx + top},0 ${cx + bot},${H} ${cx - bot},${H}`} fill="url(#hp-cone)" opacity={R(f, sc.from, sc.from + 0.25, 0.65, 1, EASE.out)} />
          <rect x={cx - 36 * u} y={fall - 36 * u} width={72 * u} height={72 * u} fill="#06100c" transform={`rotate(${20 + lt * 160} ${cx} ${fall})`} />
          <Ball x={cx} y={H * 0.05 + fall * 0.2} r={10} op={R(f, sc.from + 0.4, sc.from + 0.7, 0, 1)} />
        </g>);
      }
      case "discs": {
        const discs = [[-330, -200, 120], [330, -200, 120], [-420, -60, 170], [420, -60, 170], [-150, -330, 80], [150, -330, 80], [0, 140, 380]];
        const gy = H * 0.6, push = interpolate(lt, [0, dur], [1.22, 1.36], { ...CL, easing: EASE.sine });
        const hops = [[-420, -60], [0, 140], [420, -60]]; const k = Math.min(1.999, p * 2); const i = Math.floor(k), q = k - i;
        const [x0, y0] = hops[i], [x1, y1] = hops[i + 1];
        const bx = cx + (x0 + (x1 - x0) * q) * u, by = gy + (y0 + (y1 - y0) * q) * u - 22 * u - Math.sin(q * Math.PI) * 330 * u;
        const ring = (hx: number, hy: number, at: number) => { const rp = interpolate(lt, [at, at + 0.55], [0, 1], { ...CL, easing: EASE.out }); return rp > 0 && rp < 1 && <ellipse cx={cx + hx * u} cy={gy + hy * u} rx={(150 + 260 * rp) * u} ry={(38 + 64 * rp) * u} fill="none" stroke={hs[0]} strokeWidth={5 * u} opacity={1 - rp} filter="url(#hp-glow)" />; };
        return (<g transform={`translate(${cx} ${gy}) scale(${push}) translate(${-cx} ${-gy})`}>
          <defs><Holo id="hp-d" /></defs>
          <rect x={cx - 9 * u} y={gy - 1050 * u} width={18 * u} height={1050 * u} {...S} />
          <circle cx={cx} cy={gy - 1060 * u} r={9 * u} fill="white" filter="url(#hp-glow)" />
          {discs.sort((a, b) => a[1] - b[1]).map(([x, y, r], j) => (
            <g key={j} opacity={R(f, sc.from + j * 0.04, sc.from + 0.25 + j * 0.04, 0, 1, EASE.out)}>
              <path d={`M ${cx + (x - r) * u} ${gy + y * u} L ${cx + (x - r) * u} ${H} M ${cx + (x + r) * u} ${gy + y * u} L ${cx + (x + r) * u} ${H}`} {...S} strokeWidth={1.6 * u} />
              <ellipse cx={cx + x * u} cy={gy + y * u} rx={r * u} ry={r * 0.24 * u} fill="url(#hp-d)" filter="url(#hp-glow)" />
              <ellipse cx={cx + x * u} cy={gy + y * u} rx={r * u} ry={r * 0.24 * u} {...S} />
            </g>
          ))}
          {[-1, 1].map((s) => { const a = s * (38 - lt * 55); const px = cx + s * 470 * u, py = gy + 260 * u; return (
            <g key={s} transform={`rotate(${a} ${px} ${py})`}><rect x={px - 7 * u} y={py - 520 * u} width={14 * u} height={520 * u} {...S} fill="#05100b" /><rect x={px - 17 * u} y={py - 545 * u} width={34 * u} height={34 * u} fill="white" filter="url(#hp-glow)" /></g>); })}
          {ring(0, 140, dur / 2)}{ring(420, -60, dur * 0.98)}
          <Ball x={bx} y={by} />
        </g>);
      }
      case "slab": {
        const fill = interpolate(lt, [0.1, dur - 0.1], [0, 1], { ...CL, easing: EASE.sine });
        const x0 = cx - 150 * u, x1 = cx + 150 * u, yT = H * 0.3, yB = H * 0.74, ex = 46 * u;
        const bx = interpolate(lt, [0, dur], [-60 * u, x1 + ex * 0.6], { ...CL, easing: EASE.io });
        return (<g transform={`rotate(${interpolate(lt, [0, dur], [-1.5, 1.5], CL)} ${cx} ${yB})`}>
          <defs><Holo id="hp-s" rot={90} /></defs>
          <line x1={0} y1={yB} x2={W} y2={yB} {...S} />
          <polygon points={`${x0},${yT} ${x1},${yT - 14 * u} ${x1},${yB} ${x0},${yB}`} {...S} fill="#03100b" />
          <polygon points={`${x1},${yB - (yB - yT) * fill} ${x1 + ex},${yB - (yB - yT) * fill + 6 * u} ${x1 + ex},${yB} ${x1},${yB}`} fill="url(#hp-s)" filter="url(#hp-glow)" />
          <polygon points={`${x1},${yT - 14 * u} ${x1 + ex},${yT - 8 * u} ${x1 + ex},${yB} ${x1},${yB}`} {...S} />
          <rect x={cx - 30 * u} y={yT - 100 * u} width={60 * u} height={50 * u} {...S} /><line x1={cx} y1={yT - 50 * u} x2={cx} y2={yT - 12 * u} {...S} />
          <circle cx={cx} cy={yT - 75 * u} r={6 * u} fill={hs[1]} filter="url(#hp-glow)" />
          <Ball x={bx} y={yB - 22 * u} />
        </g>);
      }
      case "tunnel": {
        const z = interpolate(lt, [0, dur], [0.7, 1.25], { ...CL, easing: EASE.sine }), tilt = interpolate(lt, [dur * 0.6, dur], [0, 1], { ...CL, easing: EASE.io });
        const cy = H * 0.5; const sizes = [620, 470, 330, 200];
        return (<g transform={`translate(${cx} ${cy}) scale(${z} ${z * (1 - tilt * 0.42)}) rotate(${tilt * -8}) translate(${-cx} ${-cy})`}>
          <defs><Holo id="hp-t" rot={45} /><Holo id="hp-t2" rot={225} /></defs>
          {sizes.map((s, j) => { const op = R(f, sc.from + j * 0.08, sc.from + 0.3 + j * 0.08, 0, 1, EASE.out); const hs2 = (s * u) / 2;
            return <g key={j} opacity={op}><rect x={cx - hs2} y={cy - hs2} width={hs2 * 2} height={hs2 * 2} fill={j % 2 ? "#03100b" : `url(#${j ? "hp-t2" : "hp-t"})`} filter={j % 2 ? undefined : "url(#hp-glow)"} /><rect x={cx - hs2} y={cy - hs2} width={hs2 * 2} height={hs2 * 2} {...S} /></g>; })}
          <circle cx={cx} cy={cy} r={62 * u} {...S} fill="#03100b" />
          <Ball x={cx} y={cy} r={34} />
        </g>);
      }
      case "tower": {
        const segs = 4, x0 = cx - 75 * u, w = 150 * u, yTop = H * 0.28, sh = 200 * u;
        const pan = interpolate(lt, [0, dur], [160 * u, -60 * u], { ...CL, easing: EASE.sine });
        return (<g transform={`translate(0 ${pan})`}>
          <defs><Holo id="hp-w" rot={90} /></defs>
          {Array.from({ length: segs }).map((_, j) => {
            const sp = interpolate(lt, [0.05 + (segs - 1 - j) * 0.09, 0.4 + (segs - 1 - j) * 0.09], [0, 1], { ...CL, easing: EASE.out }); const y = yTop + j * sh + (1 - sp) * 180 * u;
            const stripes = [[0.05, 0.22], [0.42, 0.5], [0.78, 0.95]].map(([a, b], m) => ({ a, b, show: random(`tw${j}${m}`) > 0.3 }));
            return <g key={j} opacity={sp}>{stripes.filter((s) => s.show).map((s, m) => <rect key={m} x={x0 + s.a * w} y={y} width={(s.b - s.a) * w} height={sh} fill="url(#hp-w)" filter="url(#hp-glow)" />)}<rect x={x0} y={y} width={w} height={sh} {...S} /><line x1={x0 + w * 0.33} y1={y} x2={x0 + w * 0.33} y2={y + sh} {...S} strokeWidth={1.2 * u} /><line x1={x0 + w * 0.66} y1={y} x2={x0 + w * 0.66} y2={y + sh} {...S} strokeWidth={1.2 * u} /></g>;
          })}
          <Ball x={cx} y={yTop - 60 * u - Math.abs(Math.sin(lt * Math.PI * 2)) * 70 * u} />
        </g>);
      }
      case "bars": {
        const split = interpolate(lt, [dur * 0.45, dur * 0.85], [0, 1], { ...CL, easing: EASE.io }); const yb = H * 0.42, bw = 840 * u, gap = split * 240 * u;
        const drop = interpolate(lt, [0, dur * 0.5], [0, 1], { ...CL, easing: EASE.out });
        return (<g>
          <defs><Holo id="hp-b" /></defs>
          <line x1={cx} y1={0} x2={cx} y2={yb * drop} {...S} />
          <rect x={cx - bw / 2 - gap} y={yb} width={bw / 2} height={30 * u} fill="white" filter="url(#hp-glow)" />
          <rect x={cx + gap} y={yb} width={bw / 2} height={30 * u} fill="white" filter="url(#hp-glow)" />
          <rect x={cx - bw / 2} y={yb + 30 * u} width={bw} height={420 * u} {...S} opacity={1 - split} />
          <line x1={cx - bw / 2} y1={yb + 300 * u} x2={cx + bw / 2} y2={yb + 300 * u} {...S} opacity={1 - split} />
          <rect x={cx - 3 * u} y={yb + 30 * u} width={6 * u} height={split * 900 * u} fill="url(#hp-b)" filter="url(#hp-glow)" />
          <Ball x={cx} y={yb + 30 * u + split * 900 * u} r={16} op={split} />
        </g>);
      }
      case "burst": {
        const n = 64, cy = H * 0.5; const grow = interpolate(lt, [0, 0.45], [0, 1], { ...CL, easing: EASE.out }); const fade = interpolate(lt, [dur - 0.3, dur], [1, 0], CL);
        return (<g opacity={fade}>
          <defs>{hs.map((c, j) => <radialGradient key={j} id={`hp-r${j}`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={1100 * u}><stop offset="0.15" stopColor="white" /><stop offset="0.6" stopColor={c} /><stop offset="1" stopColor={hs[(j + 1) % hs.length]} stopOpacity="0.4" /></radialGradient>)}</defs>
          {Array.from({ length: n }).map((_, j) => {
            const a = (j / n) * Math.PI * 2 + lt * 0.35 + random(`ra${j}`) * 0.08; const r0 = (150 + random(`r0${j}`) * 140) * u * (0.6 + grow * 0.4); const len = (420 + random(`rl${j}`) * 700) * u * interpolate(lt, [j * 0.006, 0.4 + j * 0.006], [0, 1], { ...CL, easing: EASE.out });
            return <line key={j} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * (r0 + len)} y2={cy + Math.sin(a) * (r0 + len)} stroke={`url(#hp-r${j % hs.length})`} strokeWidth={(3 + random(`rw${j}`) * 4) * u} strokeLinecap="round" filter={j % 2 ? undefined : "url(#hp-glow)"} />;
          })}
          <Ball x={cx} y={cy + interpolate(lt, [0, dur], [-40, 60], { ...CL, easing: EASE.sine }) * u} r={26} />
        </g>);
      }
    }
  })();

  const word = sc?.word && (() => {
    const onLight = sc.kind === "cone";
    const inP = interpolate(lt, [0.12, 0.42], [0, 1], { ...CL, easing: EASE.out }), outP = interpolate(lt, [dur - 0.2, dur - 0.05], [0, 1], { ...CL, easing: EASE.in });
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.83, textAlign: "center", fontFamily: SORA, fontSize: 52 * u, letterSpacing: 1 * u,
        opacity: inP * (1 - outP), transform: `translateY(${(1 - inP) * 26 - outP * 20}px)`, filter: `blur(${(1 - inP) * 8}px)`, textShadow: onLight ? undefined : `0 0 ${24 * u}px rgba(255,255,255,0.45)`, color: onLight ? "#06120d" : "white", fontWeight: onLight ? 600 : 500 }}>
        {!onLight && <div style={{ position: "absolute", left: "15%", right: "15%", top: -40 * u, bottom: -40 * u, zIndex: -1, background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${cfg.bg}f0, ${cfg.bg}00)` }} />}
        {sc.word}</div>
    );
  })();

  const L = cfg.logo; const lp = interpolate(t, [L.at + 0.15, L.at + 0.9], [0, 1], { ...CL, easing: EASE.out }); const sp = interpolate(t, [L.at + 0.7, L.at + 1.3], [0, 1], { ...CL, easing: EASE.out });
  const dotIn = interpolate(t, [L.at, L.at + 0.6], [0, 1], { ...CL, easing: EASE.io });
  const logo = t >= L.at && (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 45% 18% at 50% 50%, rgba(255,255,255,${0.07 * lp}), transparent)` }} />
      <div style={{ display: "flex", alignItems: "baseline", fontFamily: SORA, fontWeight: 600, fontSize: 168 * u, letterSpacing: -4 * u, color: "white", opacity: lp, transform: `scale(${1.12 - 0.12 * lp})`, filter: `blur(${(1 - lp) * 14}px)`, textShadow: `0 0 ${40 * u}px rgba(255,255,255,0.5)` }}>
        {L.text}<span style={{ display: "inline-block", width: 30 * u, height: 30 * u, borderRadius: "50%", marginLeft: 10 * u, background: L.dot ?? "white", boxShadow: `0 0 ${30 * u}px ${L.dot ?? "white"}` }} />
      </div>
      {L.sub && <div style={{ position: "absolute", top: H * 0.5 + 120 * u, fontFamily: MAN, fontWeight: 500, fontSize: 40 * u, letterSpacing: 2 * u, color: "rgba(235,245,240,0.82)", opacity: sp, transform: `translateY(${(1 - sp) * 18}px)` }}>{L.sub}</div>}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}><defs>{glow}</defs><Ball x={cx} y={H * 0.5} r={26 * (1 - dotIn)} op={1 - dotIn} /></svg>
    </AbsoluteFill>
  );

  const shake = cfg.scenes.some((s) => t >= s.from && t < s.from + 0.08) ? (random(`hp${f}`) - 0.5) * 10 : 0;
  return (
    <AbsoluteFill style={{ background: cfg.bg }}>
      <AudioLayer cfg={cfg.audio} fps={fps} duration={sec(cfg.durationSec)} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at 50% 50%, ${hs[1]}14, transparent 70%)` }} />
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.5}px) scale(${punch})` }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}><defs>{glow}</defs>{scene}</svg>
        {word}
      </AbsoluteFill>
      {logo}
      <GrainVignette frame={f} w={W} h={H} grain={0.08} vignette={0.45} />
    </AbsoluteFill>
  );
};
