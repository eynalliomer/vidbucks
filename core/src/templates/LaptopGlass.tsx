// "LaptopGlass": a glassy device-UI motion graphic on a laptop (16:9). One continuous camera: blurred edge close-up -> floating laptop with
// icons bursting out of the screen in 3D -> push into the screen (desktop, glass notification, now-playing) -> camera app over a photo
// (glass shutter morphs white -> red record -> orange send) -> tilt into a map where the glass bubble is the nav arrow -> zoom out to a logo.
// All UI is vector/CSS; the only photo is a licensed landscape (public/videos/laptop-glass/alps.jpg, CC BY 2.0).
import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { AudioLayer, CL, EASE } from "./kit";

const { fontFamily: SANS } = loadInter("normal", { weights: ["300", "400", "500", "600", "700"], subsets: ["latin"] });
const { fontFamily: SORA } = loadSora("normal", { weights: ["600"], subsets: ["latin"] });

export const LAPTOP_SEC = 15;
export const SW = 1920, SH = 1200, BZ = 30;                       // screen content size, bezel
const BRAND = { text: "Dolar", sub: "Clarity for your money.", dot: "#19F59B" };
export const T = { edge: 0.5, push0: 2.35, push1: 3.25, cam: 5.3, rec: 6.3, send: 7.3, tilt0: 8.15, map: 8.9, tilt1: 9.5, out0: 12.2, out1: 13.2, logo: 12.6 };

type Cam = { s: number; rx: number; ry: number; rz: number; tx: number; ty: number; blur: number };
const K: [number, Cam][] = [
  [0.0, { s: 2.6, rx: 8, ry: -52, rz: -14, tx: 1150, ty: 160, blur: 16 }],
  [T.edge, { s: 0.46, rx: 16, ry: -30, rz: -8, tx: 0, ty: -30, blur: 0 }],
  [T.push0, { s: 0.5, rx: 9, ry: -17, rz: -4, tx: 20, ty: -40, blur: 0 }],
  [T.push1, { s: 1, rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, blur: 0 }],
  [T.tilt0, { s: 1.03, rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, blur: 0 }],
  [T.map, { s: 1.22, rx: 10, ry: -6, rz: -9, tx: 0, ty: 0, blur: 2.5 }],
  [T.tilt1, { s: 1, rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, blur: 0 }],
  [T.out0, { s: 1.02, rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, blur: 0 }],
  [T.out1, { s: 0.5, rx: 12, ry: 24, rz: 5, tx: 0, ty: -50, blur: 0 }],
  [LAPTOP_SEC, { s: 0.47, rx: 14, ry: 15, rz: 3, tx: 0, ty: -40, blur: 0 }],
];
export const camAt = (t: number): Cam => {
  let i = K.findIndex(([k], j) => j < K.length - 1 && t >= k && t < K[j + 1][0]); if (i < 0) i = t < K[0][0] ? 0 : K.length - 2;
  const [a, A] = K[i], [b, B] = K[i + 1]; const long = b - a > 2.5;
  const p = interpolate(t, [a, b], [0, 1], { ...CL, easing: long ? EASE.sine : EASE.io });
  const m = (k: keyof Cam) => A[k] + (B[k] - A[k]) * p;
  return { s: m("s"), rx: m("rx"), ry: m("ry"), rz: m("rz"), tx: m("tx"), ty: m("ty"), blur: m("blur") };
};

// glass bubble keyframes in screen coordinates: [t, cx, cy, w, h, radius]
const BK: [number, number, number, number, number, number][] = [
  [2.9, 1500, 160, 680, 150, 38], [4.1, 1500, 160, 680, 150, 38], [4.5, 960, 890, 860, 160, 42], [5.18, 960, 890, 860, 160, 42],
  [5.55, 960, 990, 150, 150, 75], [7.75, 960, 990, 150, 150, 75], [8.6, 960, 620, 190, 190, 95], [12.0, 960, 640, 170, 170, 85],
];
const bubbleAt = (t: number) => {
  let i = BK.findIndex((k, j) => j < BK.length - 1 && t >= k[0] && t < BK[j + 1][0]); if (i < 0) i = t < BK[0][0] ? 0 : BK.length - 2;
  const a = BK[i], b = BK[i + 1]; const p = interpolate(t, [a[0], b[0]], [0, 1], { ...CL, easing: EASE.io });
  return a.map((v, k) => v + (b[k] - v) * p) as typeof a;
};

// map route (world px) and arc-length lookup
const ROUTE = [[400, 1900], [520, 1500], [700, 1180], [980, 980], [1300, 880], [1560, 640], [1700, 360], [1760, 80]];
const SEG = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1])); const LEN = SEG.reduce((a, b) => a + b, 0);
export const along = (d: number) => { let r = d; for (let i = 0; i < SEG.length; i++) { if (r <= SEG[i] || i === SEG.length - 1) { const q = Math.min(1, r / SEG[i]); const [x0, y0] = ROUTE[i], [x1, y1] = ROUTE[i + 1]; return { x: x0 + (x1 - x0) * q, y: y0 + (y1 - y0) * q, a: Math.atan2(y1 - y0, x1 - x0) }; } r -= SEG[i]; } return { x: 0, y: 0, a: 0 }; };

const ICONS = [["#FF6B4A", "M6 12h12M12 6v12"], ["#4F8CFF", "M5 12l5 5 9-10"], ["#22C08A", "M12 4a8 8 0 1 0 .01 0z"], ["#F5B83D", "M6 18L18 6M8 6h10v10"], ["#9B6BFF", "M6 8h12v10H6zM9 8V6h6v2"], ["#FF4F8B", "M12 19s-7-4.5-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.5-7 9-7 9z"], ["#2CC3E8", "M4 14l4-4 4 4 6-6"], ["#3D3D46", "M7 7h10v10H7z"]];

export const LaptopGlass: React.FC = () => {
  const f = useCurrentFrame(); const fps = 30, W = 1920, H = 1080, t = f / fps;
  const ease = (a: number, b: number, e = EASE.out) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });
  const c = camAt(t);
  const glass: React.CSSProperties = { background: "rgba(255,255,255,0.18)", backdropFilter: "blur(28px) saturate(170%)", WebkitBackdropFilter: "blur(28px) saturate(170%)", border: "1.5px solid rgba(255,255,255,0.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 20px 50px rgba(0,0,0,0.25)" };

  /* ---------- screen content ---------- */
  const explode = interpolate(t, [0.7, 1.35, 1.95, 2.45], [0, 1, 1, 0], { ...CL, easing: EASE.io });
  const desktopOn = t < T.cam + 0.4, camOn = t >= T.cam - 0.3 && t < T.map + 0.5, mapOn = t >= T.map - 0.4 && t < T.out0 + 0.5, endOn = t >= T.out0 + 0.2;
  const wall = (
    <AbsoluteFill style={{ background: "#0B1230", overflow: "hidden" }}>
      <svg width={SW} height={SH} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="lg-a" cx="0.7" cy="0.75" r="0.7"><stop offset="0" stopColor="#E8326A" /><stop offset="0.55" stopColor="#7A1E5C" /><stop offset="1" stopColor="#0B1230" stopOpacity="0" /></radialGradient>
          <radialGradient id="lg-b" cx="0.2" cy="0.2" r="0.8"><stop offset="0" stopColor="#3D5BD9" /><stop offset="1" stopColor="#0B1230" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width={SW} height={SH} fill="url(#lg-b)" />
        <ellipse cx={1500 + Math.sin(t * 0.6) * 30} cy={1150} rx={1300} ry={720} fill="url(#lg-a)" />
        {[0, 1, 2].map((i) => <ellipse key={i} cx={1450} cy={1250} rx={1050 + i * 170} ry={600 + i * 110} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={3 - i * 0.7} />)}
      </svg>
    </AbsoluteFill>
  );
  const clockIn = ease(T.push1 - 0.4, T.push1 + 0.3);
  const desktop = desktopOn && (
    <AbsoluteFill style={{ transformStyle: "preserve-3d" }}>
      {wall}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 44, ...glass, borderRadius: 0, border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", fontFamily: SANS, fontSize: 20, fontWeight: 500, color: "white" }}>
        <span>●&nbsp;&nbsp; Finder &nbsp; File &nbsp; Edit &nbsp; View</span><span>Thu Oct 16 &nbsp; 9:42</span>
      </div>
      <div style={{ position: "absolute", left: 120, top: 150, fontFamily: SANS, color: "white", opacity: clockIn, transform: `translateY(${(1 - clockIn) * 30}px)` }}>
        <div style={{ fontSize: 34, fontWeight: 500, opacity: 0.85 }}>Thursday, October 16</div>
        <div style={{ fontSize: 230, fontWeight: 600, letterSpacing: -8, lineHeight: 1, marginTop: 6, background: "linear-gradient(180deg, #ffffff, rgba(255,255,255,0.65))", WebkitBackgroundClip: "text", color: "transparent" }}>9:42</div>
      </div>
      {ICONS.map(([col, d], i) => { const gx = 1180 + (i % 4) * 170, gy = 330 + Math.floor(i / 4) * 190; const z = explode * (520 + random(`z${i}`) * 620), rr = explode * (random(`r${i}`) - 0.5) * 60;
        return <div key={i} style={{ position: "absolute", left: gx, top: gy, width: 130, height: 130, borderRadius: 32, background: col, boxShadow: `0 ${10 + explode * 40}px ${20 + explode * 50}px rgba(0,0,0,0.35)`, transform: `translateZ(${z}px) rotate(${rr}deg) translate(${explode * (i % 4 - 1.5) * 50}px, ${explode * -60}px)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="64" height="64" viewBox="0 0 24 24"><path d={d} stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>; })}
      <div style={{ position: "absolute", left: SW / 2 - 470, bottom: 26, width: 940, height: 108, borderRadius: 30, ...glass, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 20px", transform: `translateZ(${explode * 160}px)` }}>
        {ICONS.slice(0, 7).map(([col], i) => <div key={i} style={{ width: 78, height: 78, borderRadius: 20, background: col, opacity: 0.95 }} />)}
      </div>
    </AbsoluteFill>
  );
  const kb = ease(T.cam - 0.3, T.map, EASE.sine), recP = ease(T.rec, T.rec + 0.3), sendP = ease(T.send, T.send + 0.35);
  const secs = Math.max(0, Math.floor((t - T.rec) * 1)); const camOp = interpolate(t, [T.cam - 0.3, T.cam + 0.1, T.map - 0.2, T.map + 0.3], [0, 1, 1, 0], CL);
  const camera = camOn && (
    <AbsoluteFill style={{ opacity: camOp, overflow: "hidden" }}>
      <Img src={staticFile("videos/laptop-glass/alps.jpg")} style={{ position: "absolute", width: SW, height: SH, objectFit: "cover", transform: `scale(${1.08 + kb * 0.12}) translateY(${kb * -20}px)`, filter: `blur(${ease(T.send + 0.2, T.map) * 18}px) brightness(${1 + ease(T.send + 0.2, T.map) * 0.35})` }} />
      <div style={{ position: "absolute", left: SW / 2 - 110, top: 30, width: 220, height: 50, borderRadius: 25, background: recP > 0.5 ? "#E5342E" : "rgba(0,0,0,0.55)", color: "white", fontFamily: SANS, fontSize: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 2 }}>00:00:{String(Math.min(secs, 59)).padStart(2, "0")}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 200, background: "linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0))" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, display: "flex", justifyContent: "center", gap: 46, fontFamily: SANS, fontSize: 22, fontWeight: 600, letterSpacing: 2, color: "rgba(255,255,255,0.7)" }}><span>TIME-LAPSE</span><span style={{ color: "#FFD23F" }}>VIDEO</span><span>PHOTO</span><span>PORTRAIT</span></div>
      <div style={{ position: "absolute", left: SW / 2 - 108, top: 990 - 108, width: 216, height: 216, borderRadius: 108, border: "6px solid rgba(255,255,255,0.85)", opacity: 1 - sendP }} />
    </AbsoluteFill>
  );
  const mp = ease(T.map, T.out0 - 0.1, EASE.sine); const pos = along(mp * LEN * 0.92); const mapOp = interpolate(t, [T.map - 0.4, T.map + 0.1, T.out0 + 0.1, T.out0 + 0.5], [0, 1, 1, 0], CL);
  const mapRot = interpolate(t, [T.map, T.out0], [-8, 6], { ...CL, easing: EASE.sine }); const mz = interpolate(t, [T.map - 0.4, T.map + 0.8], [1.6, 1], { ...CL, easing: EASE.out });
  const map = mapOn && (
    <AbsoluteFill style={{ opacity: mapOp, background: "#F3F1EC", overflow: "hidden" }}>
      <svg width={SW} height={SH} style={{ position: "absolute" }}>
        <g transform={`translate(${SW / 2} ${640}) scale(${mz}) rotate(${mapRot}) translate(${-pos.x} ${-pos.y})`}>
          <path d="M -400 300 C 300 200 600 700 200 1300 L -400 1400 Z" fill="#BFE3A5" /><path d="M 1900 900 C 2300 700 2600 1300 2200 1700 L 1800 1600 Z" fill="#BFE3A5" /><path d="M 900 -300 C 1300 -200 1250 300 950 400 L 700 0 Z" fill="#CDEBB6" />
          {[["M -500 1000 L 2600 600", 70], ["M 200 -400 L 1100 2400", 60], ["M -300 200 L 2400 1500", 50], ["M 1500 -400 L 1200 2400", 56], ["M -200 2000 C 600 1500 1500 1700 2600 1000", 60], ["M 0 -200 C 500 600 1400 300 2500 200", 46]].map(([d, w], i) => (
            <g key={i}><path d={d as string} stroke="#D2D0CB" strokeWidth={(w as number) + 10} fill="none" strokeLinecap="round" /><path d={d as string} stroke="#FFFFFF" strokeWidth={w as number} fill="none" strokeLinecap="round" /></g>))}
          <path d={`M ${ROUTE.map((p) => p.join(" ")).join(" L ")}`} stroke="#C9C7C2" strokeWidth={30} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M ${ROUTE.map((p) => p.join(" ")).join(" L ")}`} stroke="#2F7BF6" strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, mp * 0.92 + 0.02)} />
          {[["PATH AVE", 1250, 1180, 14], ["OAK ST", 560, 700, -62], ["RIVER RD", 1700, 1150, -33], ["ELM ST", 300, 1400, 22]].map(([s, x, y, r]) => <text key={s as string} x={x as number} y={y as number} transform={`rotate(${r} ${x} ${y})`} fontFamily={SANS} fontSize={34} fontWeight={600} letterSpacing={4} fill="#8F8C86">{s}</text>)}
        </g>
      </svg>
    </AbsoluteFill>
  );
  const end = endOn && (() => { const lp = ease(T.logo, T.logo + 0.8); return (
    <AbsoluteFill style={{ background: "#050506", opacity: ease(T.out0 + 0.2, T.out0 + 0.6), alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", fontFamily: SORA, fontWeight: 600, fontSize: 200, letterSpacing: -6, color: "white", opacity: lp, transform: `scale(${1.1 - 0.1 * lp})`, filter: `blur(${(1 - lp) * 12}px)` }}>
        {BRAND.text}<span style={{ display: "inline-block", width: 36, height: 36, borderRadius: 18, background: BRAND.dot, marginLeft: 12, boxShadow: `0 0 30px ${BRAND.dot}` }} />
      </div>
      <div style={{ fontFamily: SANS, fontSize: 46, fontWeight: 400, letterSpacing: 6, color: "rgba(255,255,255,0.7)", marginTop: 20, opacity: ease(T.logo + 0.5, T.logo + 1.1) }}>{BRAND.sub}</div>
    </AbsoluteFill>); })();

  /* ---------- the morphing glass bubble ---------- */
  const [, bx, by, bw, bh, br] = bubbleAt(t);
  const bubOn = t >= 2.9 && t < T.out0 + 0.3; const bIn = ease(2.9, 3.3), bOut = ease(T.out0 - 0.1, T.out0 + 0.25, EASE.in);
  const phase = t < 4.1 ? "note" : t < 4.5 ? "morph" : t < 5.18 ? "music" : t < 5.5 ? "morph" : t < T.rec ? "shutter" : t < T.send ? "rec" : t < 8.5 ? "send" : "nav";
  const fadeIn = (a: number) => ease(a, a + 0.25);
  const tint = phase === "morph" && t > 5.18 ? `rgba(255,255,255,${0.18 + 0.7 * ease(5.18, 5.5)})` : phase === "rec" ? "rgba(229,52,46,0.92)" : phase === "send" ? `rgba(244,140,70,${0.55 + 0.35 * sendP})` : phase === "shutter" ? "rgba(255,255,255,0.88)" : phase === "nav" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.18)";
  const bubble = bubOn && (
    <div style={{ position: "absolute", left: bx - bw / 2, top: by - bh / 2 + (1 - bIn) * -60, width: bw, height: bh, borderRadius: br, ...glass, background: tint, opacity: bIn * (1 - bOut), overflow: "hidden", fontFamily: SANS, color: "white" }}>
      {phase === "note" && <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "0 26px", height: "100%", opacity: fadeIn(3.0) * (1 - ease(3.95, 4.1)) }}>
        <div style={{ width: 76, height: 76, borderRadius: 20, background: "#0E1512", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SORA, fontWeight: 600, fontSize: 34, color: BRAND.dot }}>D</div>
        <div><div style={{ fontSize: 31, fontWeight: 700 }}>{BRAND.text} <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 24 }}>· now</span></div><div style={{ fontSize: 27, opacity: 0.9, marginTop: 4 }}>Your weekly report is ready.</div></div></div>}
      {phase === "music" && <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 30px", height: "100%", opacity: fadeIn(4.5) * (1 - ease(5.05, 5.18)) }}>
        <div style={{ width: 96, height: 96, borderRadius: 18, background: "linear-gradient(135deg,#E8326A,#3D5BD9)" }} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 28, fontWeight: 700, whiteSpace: "nowrap" }}>Late Night Drive</div><div style={{ fontSize: 21, opacity: 0.75, marginTop: 2 }}>Now playing</div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.3)", marginTop: 14 }}><div style={{ height: 6, width: `${30 + ease(4.4, 5.3, (x) => x) * 25}%`, borderRadius: 3, background: "white" }} /></div></div>
        <div style={{ fontSize: 40, letterSpacing: 18 }}>◀◀ ❚❚ ▶▶</div></div>}
      {phase === "rec" && <div style={{ position: "absolute", left: "50%", top: "50%", width: 44, height: 44, borderRadius: 8, background: "white", transform: `translate(-50%,-50%) scale(${recP})` }} />}
      {phase === "send" && <svg width={bw} height={bh} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, padding: bw * 0.26, opacity: sendP }}><path d="M2 12 L22 3 L15 21 L11 13 Z" fill="white" /></svg>}
      {phase === "nav" && <svg width={bw} height={bh} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, padding: bw * 0.24, opacity: fadeIn(8.5), transform: `rotate(${(pos.a * 180) / Math.PI + 90 + mapRot}deg)` }}><path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill="#2F7BF6" /></svg>}
    </div>
  );

  /* ---------- laptop model + camera ---------- */
  const keys = Array.from({ length: 5 * 14 });
  const screenScale = 1; const groupW = SW + BZ * 2, groupH = SH + BZ * 2;
  const shadowOp = interpolate(c.s, [0.45, 0.8], [0.5, 0], CL);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 40%, #FAF9F7, #E2E0DC)", overflow: "hidden" }}>
      <AudioLayer fps={fps} duration={LAPTOP_SEC * fps} cfg={{ music: "videos/laptop-glass/pulse.wav", musicVolume: 0.45, sfx: [
        [0.0, "audio-lib/sfx/synth_whoosh/synth-whoosh-06.mp3", 0.5], ...[0.75, 0.9, 1.05, 1.2].map((a, i) => [a, `audio-lib/sfx/synth_ui/synth-pop-0${(i % 3) + 1}.mp3`, 0.4] as [number, string, number]),
        [T.push0, "audio-lib/sfx/synth_whoosh/synth-whoosh-08.mp3", 0.45], [3.0, "audio-lib/sfx/synth_ui/synth-blip-01.mp3", 0.5], [4.25, "audio-lib/sfx/synth_ui/synth-bubble-02.mp3", 0.45],
        [5.4, "audio-lib/sfx/synth_ui/synth-bubble-01.mp3", 0.4], [T.rec, "audio-lib/sfx/synth_camera/synth-shutter-01.mp3", 0.5], [T.send, "audio-lib/sfx/synth_ui/synth-blip-02.mp3", 0.5],
        [T.tilt0, "audio-lib/sfx/synth_whoosh/synth-whoosh-04.mp3", 0.45], [8.6, "audio-lib/sfx/synth_ui/synth-pop-02.mp3", 0.45], [T.out0, "audio-lib/sfx/synth_whoosh/synth-whoosh-03.mp3", 0.45],
        [T.logo, "audio-lib/sfx/synth_chime/synth-sparkle-02.mp3", 0.4]] }} />
      <div style={{ position: "absolute", left: W / 2 - 700 * c.s, top: H / 2 + 520 * c.s + c.ty, width: 1400 * c.s, height: 160 * c.s, borderRadius: "50%", background: "rgba(0,0,0,0.35)", filter: `blur(${40 * c.s}px)`, opacity: shadowOp }} />
      <AbsoluteFill style={{ perspective: 3200, perspectiveOrigin: "50% 45%", filter: c.blur > 0.05 ? `blur(${c.blur}px)` : undefined }}>
        <div style={{ position: "absolute", left: W / 2 - groupW / 2, top: H / 2 - groupH / 2, width: groupW, height: groupH, transformStyle: "preserve-3d",
          transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.s * screenScale}) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg)` }}>
          {/* base, hinged at the bottom of the screen */}
          <div style={{ position: "absolute", left: -90, top: groupH - 6, width: groupW + 180, height: 1250, transformOrigin: "50% 0", transform: "rotateX(82deg)", borderRadius: "0 0 60px 60px", background: "linear-gradient(180deg, #D7D7DA, #BDBDC1)", boxShadow: "inset 0 0 0 4px #CACACE" }}>
            <div style={{ position: "absolute", left: 210, top: 90, right: 210, height: 560, display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 12 }}>{keys.map((_, i) => <div key={i} style={{ borderRadius: 10, background: "#1E1E21" }} />)}</div>
            <div style={{ position: "absolute", left: "50%", top: 720, width: 760, height: 440, marginLeft: -380, borderRadius: 26, background: "#C6C6CA", boxShadow: "inset 0 0 0 2px #B3B3B8" }} />
          </div>
          {/* lid */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 46, background: "#0A0A0B", boxShadow: "0 0 0 5px #C7C7CB", transformStyle: "preserve-3d" }}>
            <div style={{ position: "absolute", left: BZ, top: BZ, width: SW, height: SH, borderRadius: 16, overflow: explode > 0.01 ? "visible" : "hidden", transformStyle: "preserve-3d" }}>
              {desktop}{camera}{map}{end}{bubble}
            </div>
            <div style={{ position: "absolute", left: "50%", top: 10, width: 10, height: 10, marginLeft: -5, borderRadius: 5, background: "#1c1c22" }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
