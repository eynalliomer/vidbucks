// Swiss kit: International-Typographic-Style motion on a 12-column grid. Flat paper, ink, greys and ONE signal colour;
// every move is a snap that lands on a beat (PRESS ease, no bounce); entrances are clip-reveals, deletions are knife cuts;
// statements are built word by word on their spoken times (the subtitles ARE the layout). Primitives + a demo film.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Archivo";
import { Clock, KitTiming, PRESS, clamp, lerp, ramp, snapTo } from "../time";

const ARCHIVO = loadFont("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "latin-ext"] }).fontFamily;
export type Palette = { page: string; paper: string; ink: string; g1: string; g2: string; g3: string; signal: string };
export const SWISS_ORANGE: Palette = { page: "#F2F0EA", paper: "#FFFFFF", ink: "#141414", g1: "#D9D6CE", g2: "#B9B5AB", g3: "#8A867D", signal: "#FF5A00" };

export const grid = (W = 1920, margin = 96, gut = 24, cols = 12) => { const colW = (W - 2 * margin - (cols - 1) * gut) / cols; return { colW, x: (i: number) => margin + i * (colW + gut), right: (i: number) => margin + i * (colW + gut) + colW }; };

/** a word rising out of a clip rect from below its baseline (k 0..1) */
export const ClipText: React.FC<{ text: string; x: number; y: number; size: number; weight?: number; color: string; k: number; track?: number; id: string }> = ({ text, x, y, size, weight = 700, color, k, track = -0.02, id }) => {
  if (k <= 0) return null;
  const asc = size * 0.95, desc = size * 0.25, w = text.length * size * 0.62 + 8;
  return (<g>
    <clipPath id={id}><rect x={x - 4} y={y - asc} width={w} height={asc + desc} /></clipPath>
    <text x={x} y={y + (1 - PRESS(clamp(k))) * (asc + desc)} fontFamily={ARCHIVO} fontWeight={weight} fontSize={size} letterSpacing={track * size} fill={color} clipPath={`url(#${id})`}>{text}</text>
  </g>);
};

/** knife cut: returns the remaining vertical scale; draws the signal line crossing first */
export const knife = (t: number, tc: number, beat: number) => ({ line: ramp(t, tc, beat / 2), keep: 1 - PRESS(ramp(t, tc + beat / 2, beat / 2)) });

/** statement: small grey lead-in + a bold sentence whose words appear on their spoken times, flush left, ragged right */
export const Statement: React.FC<{ clock: Clock; line: number; until: number; lead: string; t: number; pal: Palette; x0: number; x1: number; y: number; size?: number }> = ({ clock, line, until, lead, t, pal, x0, x1, y, size = 50 }) => {
  const L = clock.line(line), t0 = L.start; if (t < t0 - 0.3 || t > until) return null;
  const out = 1 - ramp(t, until - clock.beat / 2, clock.beat / 2), words = L.words ?? L.text.split(" ").map((w) => [w, t0, t0] as [string, number, number]);
  // wrap by an estimate, but let the browser space the words (one <text> per line, a <tspan> per word)
  const rows: { w: string; a: number }[][] = [[]]; let x = x0;
  for (const [w, a] of words) { const wd = (w.length + 1) * size * 0.56; if (x + wd > x1 + 30 && rows[rows.length - 1].length) { rows.push([]); x = x0; } rows[rows.length - 1].push({ w, a }); x += wd; }
  const asc = size * 0.95, desc = size * 0.25;
  return (<g>
    <rect x={x0} y={y - 104} width={(x1 - x0) * snapTo(t, t0, clock.beat / 2)} height={1} fill={pal.g2} />
    <ClipText id={`ld-${line}`} text={lead} x={x0} y={y - 78} size={19} weight={500} color={pal.g3} k={ramp(t, t0 - 0.3, clock.beat / 2)} track={0} />
    {rows.map((row, r) => {
      const yy = y + r * size * 1.12; let prev = 0;
      return (<g key={r}>
        <clipPath id={`stc-${line}-${r}`}><rect x={x0 - 4} y={yy - asc} width={x1 - x0 + 120} height={asc + desc} /></clipPath>
        <text x={x0} y={yy} fontFamily={ARCHIVO} fontWeight={700} fontSize={size} letterSpacing={-0.02 * size} fill={pal.ink} clipPath={`url(#stc-${line}-${r})`} xmlSpace="preserve">
          {row.map((o, i) => { const k = out < 1 ? out : ramp(t, o.a - 0.05, 0.18), off = (1 - PRESS(clamp(k))) * (asc + desc), dy = off - prev; prev = off;
            return <tspan key={i} dy={dy}>{(i ? " " : "") + o.w}</tspan>; })}
        </text>
      </g>);
    })}
  </g>);
};

// ---------------------------------------------------------------- demo: "The Dance" (how a honeybee tells the hive where flowers are)
export const SwissDance: React.FC<{ timing: KitTiming; audio?: string }> = ({ timing, audio }) => {
  const frame = useCurrentFrame(), { fps, durationInFrames } = useVideoConfig(), t = frame / fps, DUR = durationInFrames / fps;
  const c = React.useMemo(() => new Clock(timing), [timing]), B = c.beat, P = SWISS_ORANGE, G = grid();
  const L = c.L, Wd = c.W, beat = c.onBeat;
  const CB = { x: G.x(6), y: 96, w: G.right(11) - G.x(6), h: 744 }, CC = { x: CB.x + CB.w / 2, y: CB.y + CB.h * 0.6 };
  const angle = lerp(lerp(0, 40, snapTo(t, beat(Wd(7, "40") + 0.2), 2 * B)), -12, ramp(t, L(10) + 0.4, 3.4));
  const len = lerp(300, 470, ramp(t, Wd(9, "longer") - 0.1, 1.4)), sunX = lerp(CC.x, CC.x + 420, ramp(t, L(10) + 0.4, 3.4));
  const gk = ramp(t, 0.9, 2.7), combIn = snapTo(t, beat(Wd(2, "dark")), 2 * B);
  const ux = Math.sin((angle * Math.PI) / 180), uy = -Math.cos((angle * Math.PI) / 180);
  const sx = CC.x - (ux * len) / 2, sy = CC.y - (uy * len) / 2, ex = CC.x + (ux * len) / 2, ey = CC.y + (uy * len) / 2;
  const runK = t < L(4) ? 0 : ramp(t, Wd(4, "straight") - 0.1, 1.3), wig = 14 * (1 - ramp(t, L(5), 2)) * (t > Wd(4, "shaking") - 0.2 ? 1 : 0.25);
  const runPts = Array.from({ length: Math.floor(60 * runK) + 1 }, (_, i) => { const u = i / 60, off = Math.sin(u * 44) * wig; return `${sx + (ex - sx) * u - uy * off},${sy + (ey - sy) * u + ux * off}`; });
  const map = knife(t, beat(Wd(3, "map")), B), endK = ramp(t, DUR - 3, B);
  const next = (i: number) => (i < timing.lines.length ? L(i + 1) - 0.15 : DUR);
  const leads = ["THE TRIP", "THE PROBLEM", "THE ANSWER", "THE FIGURE", "RULE 1", "RULE 1 · ZERO", "RULE 1 · ANY ANGLE", "RULE 2", "RULE 2 · SCALE", "THE EXCEPTION", "THE DECODER", "THE SYSTEM"];
  const big = (txt: string, show: number, hide: number, k: number, y = 560, size = 300) => (t > show - 0.2 && t < hide ? <ClipText id={`big-${txt}`} text={txt} x={G.x(0) - 12} y={y} size={size} weight={800} color={P.ink} k={k * (1 - ramp(t, hide - B / 2, B / 2))} track={-0.04} /> : null);
  return (
    <AbsoluteFill style={{ background: P.page }}>
      <svg width={1920} height={1080}>
        {Array.from({ length: 12 }).map((_, i) => { const k = clamp(gk * 1.6 - Math.abs(i - 8.5) * 0.08), h = 1080 * k; return <g key={i}><rect x={G.x(i)} y={540 - h / 2} width={1} height={h} fill={P.g1} /><rect x={G.right(i)} y={540 - h / 2} width={1} height={h} fill={P.g1} /></g>; })}
        {Array.from({ length: 45 }).map((_, r) => { const k = clamp(gk * 1.4 - Math.abs(24 * r - 540) / 1400); return <rect key={r} x={960 - 960 * k} y={24 * r} width={1920 * k} height={1} fill={P.g1} />; })}
        <text x={G.x(0)} y={60} fontFamily={ARCHIVO} fontWeight={500} fontSize={15} fill={P.g3}>{`GRID 12 × ${G.colW.toFixed(0)} PX · ${timing.bpm ?? 112} BPM · BAR ${String(Math.floor(t / (4 * B)) + 1).padStart(2, "0")}`}</text>
        <text x={G.x(6)} y={60} fontFamily={ARCHIVO} fontWeight={500} fontSize={15} fill={P.g3}>VERTICAL AXIS = SUN</text>
        {t < L(2) + 2 && (<g>
          <rect x={G.x(6)} y={520 - 40 * snapTo(t, beat(L(1)), B)} width={80} height={80 * snapTo(t, beat(L(1)), B)} fill={P.ink} />
          <circle cx={G.right(11) - 40} cy={520} r={44 * snapTo(t, beat(Wd(1, "flowers")), B)} fill="none" stroke={P.g3} strokeWidth={6} />
          <rect x={G.x(6) + 80} y={520} width={(G.right(11) - G.x(6) - 124) * ramp(t, Wd(1, "finds"), 1.2)} height={2} fill={P.g2} />
        </g>)}
        {big("2 km", L(1), L(2) + 1, snapTo(t, beat(Wd(1, "2")), B), 520, 330)}
        {combIn > 0 && <g><rect x={CB.x} y={CB.y} width={CB.w * combIn} height={CB.h} fill={P.ink} />{Array.from({ length: 7 }).map((_, r) => <rect key={r} x={CB.x} y={CB.y + ((r + 1) * CB.h) / 8} width={CB.w * combIn} height={1} fill="#2a2a2a" />)}</g>}
        {t > L(3) - 0.3 && t < Wd(3, "map") + 2 * B && (<g transform={`translate(0 530) scale(1 ${map.keep * snapTo(t, beat(L(3) + 0.2), B)}) translate(0 -530)`}>
          <rect x={G.x(0)} y={380} width={G.right(4) - G.x(0)} height={300} fill={P.paper} />
          {Array.from({ length: 7 }).map((_, i) => <rect key={i} x={G.x(0)} y={380 + (i + 1) * 37} width={G.right(4) - G.x(0)} height={1} fill={P.g1} />)}
          <text x={G.x(0) + 20} y={420} fontFamily={ARCHIVO} fontWeight={700} fontSize={26} fill={P.g3}>MAP</text>
        </g>)}
        {map.line > 0 && map.line < 1 && <rect x={G.x(0) - 20} y={529} width={(G.right(4) - G.x(0) + 40) * map.line} height={2} fill={P.signal} />}
        {t >= Wd(3, "dances") && (runK <= 0
          ? <circle cx={sx + Math.sin(t * 31) * 6 * ramp(t, Wd(3, "dances"), 0.8)} cy={sy} r={14} fill={P.signal} />
          : <g><polyline points={runPts.join(" ")} fill="none" stroke={P.signal} strokeWidth={9} /><circle cx={sx + (ex - sx) * runK} cy={sy + (ey - sy) * runK} r={16} fill={P.signal} /></g>)}
        {t > L(5) - 0.2 && t < L(11) && <line x1={CC.x} y1={CC.y + 330} x2={CC.x} y2={CC.y + 330 - 700 * ramp(t, beat(Wd(5, "angle")), B)} stroke="#EDEBE5" strokeWidth={2} strokeDasharray="10 10" />}
        {t > Wd(7, "40") && t < L(11) && Math.abs(angle) > 0.5 && <path d={`M${CC.x} ${CC.y - 120} A120 120 0 0 ${angle > 0 ? 1 : 0} ${CC.x + 120 * Math.sin((angle * Math.PI) / 180)} ${CC.y - 120 * Math.cos((angle * Math.PI) / 180)}`} fill="none" stroke={P.signal} strokeWidth={3} />}
        {t > Wd(6, "sun") - 0.4 && t < L(11) + B && <circle cx={sunX} cy={CB.y + 70} r={40 * snapTo(t, beat(Wd(6, "sun")), B) * (1 - PRESS(ramp(t, beat(L(11)) + B / 2, B / 2)))} fill="#F7F5EF" />}
        {t > L(5) && t < L(11) && <g fontFamily={ARCHIVO} fontWeight={500} fontSize={17}>
          <text x={CB.x + 24} y={CB.y + CB.h - 56} fill="#CFCBC2">{`RUN ${angle >= 0 ? "+" : ""}${angle.toFixed(0)}° FROM VERTICAL`}</text>
          <text x={CB.x + 24} y={CB.y + CB.h - 30} fill="#CFCBC2">{`LENGTH ${len.toFixed(0)} PX`}</text>
          <text x={CB.x + CB.w - 300} y={CB.y + CB.h - 30} fill={t > L(10) ? P.signal : "#CFCBC2"}>{t > L(10) ? "OFF GRID · FOLLOWING THE SUN" : "ON GRID"}</text>
        </g>}
        {big("angle", L(5), L(7), snapTo(t, beat(Wd(5, "angle")), B), 560, 250)}
        {big("40°", L(7), L(8), snapTo(t, beat(Wd(7, "40")), B), 560, 330)}
        {big("length", L(8), L(10), snapTo(t, beat(Wd(8, "length")), B), 520, 230)}
        {t > L(9) - 0.3 && t < L(10) && <g>
          <rect x={G.x(0)} y={600} width={(G.right(4) - G.x(0)) * (0.45 + 0.35 * ramp(t, Wd(9, "longer") - 0.1, 1.4))} height={24} fill={P.signal} />
          <rect x={G.x(0)} y={648} width={(G.right(4) - G.x(0)) * (0.45 + 0.55 * PRESS(ramp(t, Wd(9, "longer") - 0.1, 1.4)))} height={24} fill={P.ink} />
        </g>}
        {big("1973", L(11), L(12), snapTo(t, beat(Wd(11, "1973") - 0.2), B), 560, 300)}
        {t > L(11) && t < L(12) && <g><rect x={G.x(0)} y={610} width={(G.right(4) - G.x(0)) * snapTo(t, beat(Wd(11, "Karl")), B)} height={1} fill={P.ink} /><text x={G.x(0)} y={640} fontFamily={ARCHIVO} fontWeight={600} fontSize={19} fill={P.ink} opacity={snapTo(t, beat(Wd(11, "Karl")), B)}>KARL VON FRISCH · NOBEL PRIZE IN PHYSIOLOGY OR MEDICINE</text></g>}
        {timing.lines.map((l, i) => <Statement key={l.id} clock={c} line={l.id} until={next(l.id)} lead={leads[i] ?? ""} t={t} pal={P} x0={G.x(0)} x1={G.right(5)} y={900} />)}
        {t < L(1) && <circle cx={CC.x} cy={CC.y} r={14 * snapTo(t, beat(0.6), B / 2)} fill={P.signal} />}
        {endK > 0 && <g><rect x={0} y={0} width={CB.x - 2} height={1080} fill={P.page} /><rect x={CB.x + CB.w + 2} y={0} width={1920} height={1080} fill={P.page} /></g>}
      </svg>
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};
