// "JericoLaptop": revision of LaptopGlass that tells Jerico's AI-orchestration loop on the same continuous camera:
// agent panels burst out of the screen -> SPEC (spec.md, planner) -> plan-approval bar -> DAG of role-routed todos behind an approval gate
// -> dispatch: the glass bubble becomes a packet that travels across the machines (daemons) and wakes each agent panel -> reviewer gate
// -> JERICO end card. Product facts and brand tokens: knowledge/references/jerico-brand.md (from jerico.appnova.io).
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexMono";
import { AudioLayer, CL, EASE } from "./kit";
import { BZ, LAPTOP_SEC, SH, SW, T, camAt } from "./LaptopGlass";

const { fontFamily: ARCH } = loadArchivo("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
const { fontFamily: MONO } = loadPlex("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

const J = { bg: "#0b0b0b", bg2: "#121212", bg3: "#1a1a19", ink: "#f2f0ec", ink2: "#a5a19a", ghost: "#5b5852", rule: "#232322", rule2: "#34342f", planner: "#7aa2ff", developer: "#b6e85f", reviewer: "#ff7e9c", live: "#6fdca0", hold: "#ffb547" };
type Role = "planner" | "developer" | "reviewer";
const ROLE_C: Record<Role, string> = { planner: J.planner, developer: J.developer, reviewer: J.reviewer };

// bubble keyframes in screen coordinates: [t, cx, cy, w, h, radius]
const BK: [number, number, number, number, number, number][] = [
  [2.9, 1460, 270, 760, 150, 22], [4.1, 1460, 270, 760, 150, 22], [4.5, 960, 1000, 980, 150, 24], [5.18, 960, 1000, 980, 150, 24],
  [5.5, 960, 1000, 150, 150, 75], [7.75, 960, 1000, 150, 150, 75], [8.6, 960, 620, 180, 180, 90], [12.0, 960, 640, 160, 160, 80],
];
const bubbleAt = (t: number) => {
  let i = BK.findIndex((k, j) => j < BK.length - 1 && t >= k[0] && t < BK[j + 1][0]); if (i < 0) i = t < BK[0][0] ? 0 : BK.length - 2;
  const a = BK[i], b = BK[i + 1]; const p = interpolate(t, [a[0], b[0]], [0, 1], { ...CL, easing: EASE.io });
  return a.map((v, k) => v + (b[k] - v) * p) as typeof a;
};

// fleet world: server on top, three machines (one daemon each); the dispatch packet travels this route
const SERVER = { x: 1000, y: 160 };
const MACHINES: { name: string; x: number; y: number; panels: { engine: string; role: Role; todo: string }[] }[] = [
  { name: "macbook-pro", x: 330, y: 720, panels: [{ engine: "claude-code", role: "developer", todo: "t2 · checkout ui" }, { engine: "codex", role: "developer", todo: "t3 · invoice table" }] },
  { name: "mac-mini", x: 1000, y: 980, panels: [{ engine: "qwen", role: "developer", todo: "t4 · webhook handler" }] },
  { name: "box-under-desk", x: 1680, y: 720, panels: [{ engine: "opencode", role: "reviewer", todo: "t5 · review layer 2" }] },
];
const ROUTE = [[SERVER.x, SERVER.y], [SERVER.x, 360], [MACHINES[0].x, 450], [MACHINES[1].x, 700], [MACHINES[2].x, 450], [MACHINES[2].x, 470]];
const SEG = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1])); const LEN = SEG.reduce((a, b) => a + b, 0);
const along = (d: number) => { let r = d; for (let i = 0; i < SEG.length; i++) { if (r <= SEG[i] || i === SEG.length - 1) { const q = Math.min(1, r / SEG[i]); const [x0, y0] = ROUTE[i], [x1, y1] = ROUTE[i + 1]; return { x: x0 + (x1 - x0) * q, y: y0 + (y1 - y0) * q, a: Math.atan2(y1 - y0, x1 - x0) }; } r -= SEG[i]; } return { x: 0, y: 0, a: 0 }; };
const HIT = [2, 3, 4].map((k) => SEG.slice(0, k).reduce((a, b) => a + b, 0) / LEN);   // route fraction where each machine is reached
const fleetP = (t: number) => interpolate(t, [T.map, T.out0 - 0.3], [0, 1], { ...CL, easing: EASE.sine });
const hitTime = (frac: number) => { for (let x = T.map; x < T.out0; x += 1 / 60) if (fleetP(x) >= frac) return x; return T.out0; };
export const HIT_T = HIT.map(hitTime);

const SPEC = ["# Billing page", "", "Add a checkout flow, an invoice history", "table and a webhook handler, with tests.", "Keep the existing auth.", "", "## Done when", "- checkout works end to end", "- the reviewer approves the diff"];
const TODOS: { id: string; label: string; role: Role; layer: number; y: number }[] = [
  { id: "t1", label: "db schema", role: "developer", layer: 0, y: 590 },
  { id: "t2", label: "checkout ui", role: "developer", layer: 1, y: 380 }, { id: "t3", label: "invoice table", role: "developer", layer: 1, y: 590 }, { id: "t4", label: "webhook handler", role: "developer", layer: 1, y: 800 },
  { id: "t5", label: "review layer 2", role: "reviewer", layer: 2, y: 590 },
];
const LX = [430, 960, 1490];

export const JericoLaptop: React.FC = () => {
  const f = useCurrentFrame(); const fps = 30, W = 1920, H = 1080, t = f / fps;
  const ease = (a: number, b: number, e = EASE.out) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });
  const c = camAt(t);
  const glass: React.CSSProperties = { background: "rgba(242,240,236,0.10)", backdropFilter: "blur(26px) saturate(150%)", WebkitBackdropFilter: "blur(26px) saturate(150%)", border: "1.5px solid rgba(242,240,236,0.35)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 24px 60px rgba(0,0,0,0.5)" };
  const mono = (size: number, color = J.ink2, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: MONO, fontSize: size, color, letterSpacing: 1.5, ...extra });
  const Tag: React.FC<{ role: Role; size?: number }> = ({ role, size = 18 }) => <span style={{ ...mono(size, ROLE_C[role], { fontWeight: 600, letterSpacing: 3 }), padding: "3px 10px", border: `1.5px solid ${ROLE_C[role]}55`, borderRadius: 4 }}>{role.toUpperCase()}</span>;
  const Lines: React.FC<{ n: number; seed: string; live?: boolean; w?: number }> = ({ n, seed, live = true, w = 100 }) => (
    <>{Array.from({ length: n }).map((_, i) => { const scroll = live ? (f * 0.6 + i * 7) % 1 : 0; const ww = 30 + random(`${seed}${i}${Math.floor(live ? f / 6 : 0)}`) * 60;
      return <div key={i} style={{ height: 10, width: `${(ww * w) / 100}%`, borderRadius: 5, marginTop: 13, background: i === n - 1 && live ? J.ink2 : J.rule2, opacity: 1 - scroll * 0.2 }} />; })}</>
  );

  /* ---------- console chrome ---------- */
  const phases = ["SPEC", "PLAN", "APPROVE", "DISPATCH", "REVIEW"];
  const active = t < 3.7 ? 0 : t < 4.5 ? 1 : t < T.send ? 2 : t < HIT_T[2] ? 3 : 4;
  const Logo: React.FC<{ s: number; color?: string }> = ({ s, color = J.ink }) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.6" fill={color} /><circle cx="18" cy="5.5" r="2.6" fill={color} /><circle cx="18" cy="18.5" r="2.6" fill={color} /><path d="M8.3 11 L15.6 6.6 M8.3 13 L15.6 17.4" stroke={color} strokeWidth="1.8" /></svg>
  );
  const chrome = (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 160, background: J.bg, borderBottom: `1px solid ${J.rule}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "60px 56px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}><Logo s={34} /><span style={{ fontFamily: ARCH, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: J.ink }}>JERICO</span></div>
      <div style={{ display: "flex", gap: 30 }}>{phases.map((p, i) => <span key={p} style={mono(19, i === active ? J.ink : J.ghost, { fontWeight: i === active ? 600 : 400, letterSpacing: 4, borderBottom: i === active ? `2px solid ${J.hold}` : "2px solid transparent", paddingBottom: 6 })}>{p}</span>)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, ...mono(19) }}><span style={{ width: 11, height: 11, borderRadius: 6, background: J.live, boxShadow: `0 0 12px ${J.live}` }} />3 machines · 5 agents live</div>
    </div>
  );
  const grid = <AbsoluteFill style={{ backgroundImage: `linear-gradient(90deg, ${J.rule}66 1px, transparent 1px)`, backgroundSize: "160px 100%" }} />;

  /* ---------- A: panel grid, panels burst out ---------- */
  const explode = interpolate(t, [0.7, 1.35, 1.95, 2.45], [0, 1, 1, 0], { ...CL, easing: EASE.io });
  const GRID: [Role, string][] = [["planner", "claude-code"], ["developer", "codex"], ["developer", "qwen"], ["developer", "claude-code"], ["reviewer", "opencode"], ["developer", "kimi"]];
  const panelGrid = t < T.push1 + 0.2 && (
    <AbsoluteFill style={{ background: J.bg, transformStyle: "preserve-3d" }}>
      {grid}{chrome}
      {GRID.map(([role, eng], i) => { const x = 60 + (i % 3) * 610, y = 170 + Math.floor(i / 3) * 500; const z = explode * (480 + random(`jz${i}`) * 560), rr = explode * (random(`jr${i}`) - 0.5) * 24;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 580, height: 460, borderRadius: 14, background: J.bg2, border: `1.5px solid ${explode > 0.2 ? ROLE_C[role] + "aa" : J.rule2}`, padding: 26, boxShadow: `0 ${20 + explode * 50}px ${40 + explode * 70}px rgba(0,0,0,${0.4 + explode * 0.3})`,
          transform: `translateZ(${z}px) rotate(${rr}deg) translate(${explode * (i % 3 - 1) * 80}px, ${explode * (Math.floor(i / 3) - 0.5) * 70}px)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Tag role={role} /><span style={{ width: 12, height: 12, borderRadius: 6, background: J.live, boxShadow: `0 0 10px ${J.live}` }} /></div>
          <div style={{ fontFamily: MONO, fontSize: 34, color: J.ink, marginTop: 22, fontWeight: 500 }}>{eng}</div>
          <Lines n={9} seed={`g${i}`} />
        </div>; })}
    </AbsoluteFill>
  );

  /* ---------- B: SPEC + planner ---------- */
  const specOn = t >= T.push0 && t < T.cam + 0.4; const typedN = (a: number, b: number) => Math.floor(SPEC.join("\n").length * ease(a, b, (x) => x));
  const specText = SPEC.join("\n").slice(0, typedN(2.85, 4.0)).split("\n");
  const plan = (k: number) => ease(3.7 + k * 0.13, 3.9 + k * 0.13);
  const spec = specOn && (
    <AbsoluteFill style={{ background: J.bg }}>
      {grid}{chrome}
      <div style={{ position: "absolute", left: 80, top: 210, width: 1000, height: 740, borderRadius: 14, background: J.bg2, border: `1.5px solid ${J.rule2}`, overflow: "hidden" }}>
        <div style={{ height: 60, borderBottom: `1px solid ${J.rule}`, display: "flex", alignItems: "center", padding: "0 26px", ...mono(20, J.ink) }}>spec.md <span style={{ marginLeft: 16, color: J.ghost }}>— one spec, every todo</span></div>
        <div style={{ padding: "26px 34px", fontFamily: MONO, fontSize: 31, lineHeight: 1.62, color: J.ink }}>
          {specText.map((ln, i) => <div key={i} style={{ minHeight: 50, color: ln.startsWith("#") ? J.ink : ln.startsWith("-") ? J.developer : J.ink2, fontWeight: ln.startsWith("#") ? 600 : 400 }}>{ln}{i === specText.length - 1 && t < 4.4 && Math.floor(t * 3) % 2 === 0 ? "▍" : ""}</div>)}
        </div>
      </div>
      <div style={{ position: "absolute", left: 1130, top: 370, width: 710, height: 580, borderRadius: 14, background: J.bg2, border: `1.5px solid ${t > 3.6 ? J.planner + "aa" : J.rule2}`, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><Tag role="planner" /><span style={mono(20)}>claude-code</span></div>
        <div style={{ ...mono(22, J.ink), marginTop: 22 }}>{t < 3.7 ? `decomposing spec${".".repeat(1 + (Math.floor(t * 4) % 3))}` : "plan · 5 todos · 3 layers"}</div>
        {TODOS.map((td, k) => <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20, opacity: plan(k), transform: `translateX(${(1 - plan(k)) * 20}px)` }}>
          <span style={{ width: 10, height: 34, borderRadius: 3, background: ROLE_C[td.role] }} /><span style={mono(24, J.ghost)}>{td.id}</span><span style={{ fontFamily: ARCH, fontSize: 30, color: J.ink, fontWeight: 500 }}>{td.label}</span><span style={{ ...mono(18), marginLeft: "auto" }}>L{td.layer + 1}</span></div>)}
      </div>
    </AbsoluteFill>
  );

  /* ---------- C: DAG behind the approval gate ---------- */
  const dagOn = t >= T.cam - 0.3 && t < T.map + 0.5; const dagOp = interpolate(t, [T.cam - 0.3, T.cam + 0.1, T.map - 0.2, T.map + 0.3], [0, 1, 1, 0], CL);
  const nodeIn = (l: number) => ease(T.cam + 0.1 + l * 0.35, T.cam + 0.45 + l * 0.35); const edgeIn = (l: number) => ease(T.cam + 0.4 + l * 0.35, T.cam + 0.8 + l * 0.35, EASE.io);
  const state = (td: (typeof TODOS)[number]) => t < T.send ? "ready" : td.layer === 0 ? "done" : td.layer === 1 ? "running" : "waiting";
  const dag = dagOn && (
    <AbsoluteFill style={{ background: J.bg, opacity: dagOp }}>
      {grid}{chrome}
      <svg width={SW} height={SH} style={{ position: "absolute" }}>
        {TODOS.filter((d) => d.layer > 0).map((d) => TODOS.filter((s) => s.layer === d.layer - 1).map((s) => { const x0 = LX[s.layer] + 190, x1 = LX[d.layer] - 190; const lit = t > T.send && d.layer === 1;
          return <path key={s.id + d.id} d={`M ${x0} ${s.y} C ${x0 + 120} ${s.y}, ${x1 - 120} ${d.y}, ${x1} ${d.y}`} stroke={lit ? J.developer : J.rule2} strokeWidth={lit ? 4 : 3} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - edgeIn(s.layer)} />; }))}
      </svg>
      {LX.map((x, l) => <div key={l} style={{ position: "absolute", left: x - 190, top: 250, ...mono(18, J.ghost, { letterSpacing: 4 }), opacity: nodeIn(l) }}>LAYER {l + 1}</div>)}
      {TODOS.map((td) => { const p = nodeIn(td.layer); const st = state(td); const pulse = st === "running" ? 0.5 + 0.5 * Math.sin(t * 9 + td.y) : 0;
        return <div key={td.id} style={{ position: "absolute", left: LX[td.layer] - 190, top: td.y - 62, width: 380, height: 124, borderRadius: 12, background: J.bg2, border: `1.5px solid ${st === "running" ? J.developer : st === "done" ? J.live : J.rule2}`, boxShadow: st === "running" ? `0 0 ${20 + pulse * 20}px ${J.developer}44` : "none",
          display: "flex", alignItems: "center", gap: 18, padding: "0 22px", opacity: p, transform: `scale(${0.85 + 0.15 * p})` }}>
          <span style={{ width: 9, alignSelf: "stretch", margin: "20px 0", borderRadius: 3, background: ROLE_C[td.role] }} />
          <div style={{ flex: 1 }}><div style={{ display: "flex", gap: 12, alignItems: "baseline" }}><span style={mono(20, J.ghost)}>{td.id}</span><span style={{ fontFamily: ARCH, fontSize: 30, fontWeight: 600, color: J.ink }}>{td.label}</span></div>
            <div style={mono(17, st === "running" ? J.developer : st === "done" ? J.live : J.ink2, { marginTop: 6, letterSpacing: 3 })}>{st === "done" ? "DONE ✓" : st === "running" ? "RUNNING" : st === "waiting" ? "WAITING FOR LAYER 2" : td.role.toUpperCase()}</div></div>
        </div>; })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 862, textAlign: "center", ...mono(22, t < T.rec ? J.ink2 : t < T.send ? J.hold : J.live, { letterSpacing: 5, fontWeight: 600 }), opacity: ease(T.cam + 0.4, T.cam + 0.7) }}>
        {t < T.rec ? "PLAN READY · 5 TODOS · 3 LAYERS" : t < T.send ? "APPROVAL GATE · NO AGENT WRITES YET" : "APPROVED · DISPATCHING 3 TODOS IN PARALLEL"}</div>
    </AbsoluteFill>
  );

  /* ---------- D: fleet dispatch (camera follows the packet) ---------- */
  const fp = fleetP(t); const pos = along(fp * LEN); const fleetOn = t >= T.map - 0.4 && t < T.out0 + 0.5;
  const fleetOp = interpolate(t, [T.map - 0.4, T.map + 0.1, T.out0 + 0.1, T.out0 + 0.5], [0, 1, 1, 0], CL);
  const fz = interpolate(t, [T.map - 0.4, T.map + 0.8], [1.5, 1.0], { ...CL, easing: EASE.out }); const frot = interpolate(t, [T.map, T.out0], [-4, 3], { ...CL, easing: EASE.sine });
  const fleet = fleetOn && (
    <AbsoluteFill style={{ background: J.bg, opacity: fleetOp, overflow: "hidden" }}>
      {grid}
      <div style={{ position: "absolute", left: SW / 2, top: 640, transform: `scale(${fz}) rotate(${frot}deg) translate(${-pos.x}px, ${-pos.y}px)`, transformOrigin: "0 0" }}>
        <svg width={2100} height={1500} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {MACHINES.map((m) => <path key={m.name} d={`M ${SERVER.x} ${SERVER.y} L ${SERVER.x} 360 L ${m.x} ${m.y === 980 ? 700 : 450} L ${m.x} ${m.y - 170}`} stroke={J.rule2} strokeWidth={4} fill="none" strokeDasharray="10 12" />)}
          <path d={`M ${ROUTE.map((p) => p.join(" ")).join(" L ")}`} stroke={J.live} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - fp} style={{ filter: `drop-shadow(0 0 10px ${J.live})` }} />
        </svg>
        <div style={{ position: "absolute", left: SERVER.x - 220, top: SERVER.y - 80, width: 440, height: 120, borderRadius: 14, background: J.bg3, border: `1.5px solid ${J.rule2}`, display: "flex", alignItems: "center", gap: 18, padding: "0 26px" }}>
          <Logo s={40} /><div><div style={{ fontFamily: ARCH, fontWeight: 700, fontSize: 30, color: J.ink }}>Jerico server</div><div style={mono(17)}>run graph · dispatcher</div></div></div>
        {MACHINES.map((m, mi) => { const lit = ease(HIT_T[mi] - 0.05, HIT_T[mi] + 0.25); const w = m.panels.length > 1 ? 760 : 420;
          return <div key={m.name} style={{ position: "absolute", left: m.x - w / 2, top: m.y - 170, width: w, borderRadius: 16, background: J.bg2, border: `1.5px solid ${lit > 0.5 ? J.live + "aa" : J.rule2}`, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", ...mono(19, J.ink) }}><span>{m.name}</span><span style={{ color: J.live }}>● daemon</span></div>
            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>{m.panels.map((p, pi) => { const run = lit > 0.5; const isRev = p.role === "reviewer"; const approved = isRev && t > HIT_T[mi] + 0.9;
              return <div key={pi} style={{ flex: 1, height: 220, borderRadius: 10, background: J.bg, border: `1.5px solid ${run ? ROLE_C[p.role] : J.rule}`, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Tag role={p.role} size={15} /><span style={mono(17, J.ink)}>{p.engine}</span></div>
                <div style={mono(17, run ? ROLE_C[p.role] : J.ghost, { marginTop: 12 })}>{approved ? "LAYER 2 APPROVED ✓" : run ? p.todo : "idle"}</div>
                {run && !approved && <Lines n={5} seed={`f${mi}${pi}`} w={90} />}
                {approved && <div style={{ fontFamily: ARCH, fontSize: 64, color: J.reviewer, marginTop: 14, textAlign: "center" }}>✓</div>}
              </div>; })}</div>
          </div>; })}
      </div>
      {chrome}
    </AbsoluteFill>
  );

  /* ---------- E: end card ---------- */
  const end = t >= T.out0 + 0.2 && (() => { const lp = ease(T.logo, T.logo + 0.8); return (
    <AbsoluteFill style={{ background: J.bg, opacity: ease(T.out0 + 0.2, T.out0 + 0.6), alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: lp, transform: `scale(${1.08 - 0.08 * lp})`, filter: `blur(${(1 - lp) * 10}px)` }}><Logo s={150} /><span style={{ fontFamily: ARCH, fontWeight: 800, fontSize: 190, letterSpacing: 26, color: J.ink }}>JERICO</span></div>
      <div style={{ fontFamily: ARCH, fontWeight: 500, fontSize: 62, color: J.ink, marginTop: 34, opacity: ease(T.logo + 0.4, T.logo + 1.0) }}>One spec in. A fleet of agents out.</div>
      <div style={{ ...mono(28, J.ink2, { letterSpacing: 6 }), marginTop: 30, opacity: ease(T.logo + 0.8, T.logo + 1.4) }}>SPEC → PLAN → APPROVE → DISPATCH → REVIEW</div>
    </AbsoluteFill>); })();

  /* ---------- the morphing glass bubble ---------- */
  const [, bx, by, bw, bh, br] = bubbleAt(t);
  const bubOn = t >= 2.9 && t < T.out0 + 0.3; const bIn = ease(2.9, 3.3), bOut = ease(T.out0 - 0.1, T.out0 + 0.25, EASE.in);
  const phase = t < 4.1 ? "note" : t < 4.5 ? "morph" : t < 5.18 ? "approve" : t < 5.5 ? "morph" : t < T.rec ? "gate" : t < T.send ? "hold" : t < 8.5 ? "go" : "packet";
  const fadeIn = (a: number) => ease(a, a + 0.25); const goP = ease(T.send, T.send + 0.3); const press = interpolate(t, [4.95, 5.02, 5.12], [1, 0.9, 1], CL);
  const tint = phase === "hold" ? "rgba(255,181,71,0.92)" : phase === "go" ? `rgba(111,220,160,${0.6 + 0.3 * goP})` : phase === "packet" ? "rgba(111,220,160,0.85)" : phase === "gate" ? "rgba(242,240,236,0.9)" : phase === "morph" && t > 5.18 ? `rgba(242,240,236,${0.1 + 0.8 * ease(5.18, 5.5)})` : "rgba(242,240,236,0.10)";
  const bubble = bubOn && (
    <div style={{ position: "absolute", left: bx - bw / 2, top: by - bh / 2 + (1 - bIn) * -60, width: bw, height: bh, borderRadius: br, ...glass, background: tint, opacity: bIn * (1 - bOut), overflow: "hidden", color: J.ink,
      boxShadow: phase === "packet" || phase === "go" ? `0 0 50px ${J.live}88, ${glass.boxShadow}` : glass.boxShadow }}>
      {phase === "note" && <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "0 28px", height: "100%", opacity: fadeIn(3.0) * (1 - ease(3.95, 4.1)) }}>
        <div style={{ width: 78, height: 78, borderRadius: 14, background: J.bg3, border: `1.5px solid ${J.planner}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Logo s={44} color={J.planner} /></div>
        <div><div style={mono(19, J.planner, { fontWeight: 600, letterSpacing: 4 })}>PLANNER · NOW</div><div style={{ fontFamily: ARCH, fontSize: 32, fontWeight: 600, marginTop: 4 }}>Plan ready — 5 todos, 3 layers</div></div></div>}
      {phase === "approve" && <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 30px", height: "100%", opacity: fadeIn(4.5) * (1 - ease(5.05, 5.18)) }}>
        <div style={{ flex: 1 }}><div style={{ fontFamily: ARCH, fontSize: 36, fontWeight: 700 }}>Approve plan?</div><div style={mono(19, J.ink2, { marginTop: 4 })}>no agent touches a file before you do</div></div>
        <div style={{ ...mono(22, J.ink2, { fontWeight: 600 }), padding: "16px 30px", border: `1.5px solid ${J.rule2}`, borderRadius: 8 }}>REJECT</div>
        <div style={{ ...mono(22, J.bg, { fontWeight: 600 }), padding: "16px 34px", background: J.hold, borderRadius: 8, transform: `scale(${press})` }}>APPROVE ▸</div></div>}
      {phase === "gate" && <svg width={bw} height={bh} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, padding: bw * 0.28, opacity: fadeIn(5.5) }}><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke={J.bg} strokeWidth="2" /><path d="M8 10 V7 a4 4 0 0 1 8 0 V10" fill="none" stroke={J.bg} strokeWidth="2" /></svg>}
      {phase === "hold" && <svg width={bw} height={bh} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, padding: bw * 0.27 }}><path d="M5 12.5 L10 17 L19 7" stroke={J.bg} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(T.rec + 0.2, T.rec + 0.6)} /></svg>}
      {(phase === "go" || phase === "packet") && <svg width={bw} height={bh} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, padding: bw * 0.26, opacity: phase === "go" ? goP : 1, transform: phase === "packet" ? `rotate(${(pos.a * 180) / Math.PI + 90 + frot}deg)` : undefined }}><path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill={J.bg} /></svg>}
    </div>
  );

  /* ---------- laptop rig (same as LaptopGlass) ---------- */
  const keys = Array.from({ length: 5 * 14 }); const groupW = SW + BZ * 2, groupH = SH + BZ * 2;
  const shadowOp = interpolate(c.s, [0.45, 0.8], [0.5, 0], CL);
  const sfx: [number, string, number][] = [
    [0.0, "audio-lib/sfx/synth_whoosh/synth-whoosh-06.mp3", 0.5], ...[0.75, 0.9, 1.05, 1.2, 1.35].map((a, i) => [a, `audio-lib/sfx/synth_ui/synth-pop-0${(i % 3) + 1}.mp3`, 0.4] as [number, string, number]),
    [T.push0, "audio-lib/sfx/synth_whoosh/synth-whoosh-08.mp3", 0.45], ...Array.from({ length: 6 }).map((_, i) => [2.9 + i * 0.18, `audio-lib/sfx/synth_ui/synth-click-0${(i % 6) + 1}.mp3`, 0.3] as [number, string, number]),
    [3.0, "audio-lib/sfx/synth_ui/synth-blip-01.mp3", 0.5], [4.25, "audio-lib/sfx/synth_ui/synth-bubble-02.mp3", 0.45], [4.98, "audio-lib/sfx/synth_ui/synth-click-01.mp3", 0.6],
    [5.4, "audio-lib/sfx/synth_ui/synth-bubble-01.mp3", 0.4], [T.rec, "audio-lib/sfx/synth_ui/synth-pop-03.mp3", 0.5], [T.send, "audio-lib/sfx/synth_scifi/synth-powerup-01.mp3", 0.45],
    [T.tilt0, "audio-lib/sfx/synth_whoosh/synth-whoosh-04.mp3", 0.45], ...HIT_T.map((x) => [x, "audio-lib/sfx/synth_ui/synth-blip-02.mp3", 0.5] as [number, string, number]),
    [HIT_T[2] + 0.9, "audio-lib/sfx/synth_chime/synth-chime-02.mp3", 0.4], [T.out0, "audio-lib/sfx/synth_whoosh/synth-whoosh-03.mp3", 0.45], [T.logo, "audio-lib/sfx/synth_chime/synth-sparkle-02.mp3", 0.4],
  ];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 40%, #FAF9F7, #E2E0DC)", overflow: "hidden" }}>
      <AudioLayer fps={fps} duration={LAPTOP_SEC * fps} cfg={{ music: "videos/laptop-glass/pulse.wav", musicVolume: 0.45, sfx }} />
      <div style={{ position: "absolute", left: W / 2 - 700 * c.s, top: H / 2 + 520 * c.s + c.ty, width: 1400 * c.s, height: 160 * c.s, borderRadius: "50%", background: "rgba(0,0,0,0.35)", filter: `blur(${40 * c.s}px)`, opacity: shadowOp }} />
      <AbsoluteFill style={{ perspective: 3200, perspectiveOrigin: "50% 45%", filter: c.blur > 0.05 ? `blur(${c.blur}px)` : undefined }}>
        <div style={{ position: "absolute", left: W / 2 - groupW / 2, top: H / 2 - groupH / 2, width: groupW, height: groupH, transformStyle: "preserve-3d",
          transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.s}) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg)` }}>
          <div style={{ position: "absolute", left: -90, top: groupH - 6, width: groupW + 180, height: 1250, transformOrigin: "50% 0", transform: "rotateX(82deg)", borderRadius: "0 0 60px 60px", background: "linear-gradient(180deg, #D7D7DA, #BDBDC1)", boxShadow: "inset 0 0 0 4px #CACACE" }}>
            <div style={{ position: "absolute", left: 210, top: 90, right: 210, height: 560, display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 12 }}>{keys.map((_, i) => <div key={i} style={{ borderRadius: 10, background: "#1E1E21" }} />)}</div>
            <div style={{ position: "absolute", left: "50%", top: 720, width: 760, height: 440, marginLeft: -380, borderRadius: 26, background: "#C6C6CA", boxShadow: "inset 0 0 0 2px #B3B3B8" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, borderRadius: 46, background: "#0A0A0B", boxShadow: "0 0 0 5px #C7C7CB", transformStyle: "preserve-3d" }}>
            <div style={{ position: "absolute", left: BZ, top: BZ, width: SW, height: SH, borderRadius: 16, overflow: explode > 0.01 ? "visible" : "hidden", transformStyle: "preserve-3d", background: J.bg }}>
              {panelGrid}{spec}{dag}{fleet}{end}{bubble}
            </div>
            <div style={{ position: "absolute", left: "50%", top: 10, width: 10, height: 10, marginLeft: -5, borderRadius: 5, background: "#1c1c22" }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
