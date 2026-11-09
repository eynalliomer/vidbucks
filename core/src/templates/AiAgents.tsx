// "AI agents don't just chat" - 16:9 explainer in the style of an AI-tool Short: off-white ground, one floating UI card (rebuilt as vectors),
// word-synced captions with italic-serif keywords, neo-brutal step badges with an orange offset shadow, small stickers, comment CTA.
// Caption/scene times come from the voice-over word times (public/videos/ai-agents/words.json, shifted by VO_AT).
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { AudioLayer, CL, EASE } from "./kit";
import WORDS from "../../public/videos/ai-agents/words.json";

const { fontFamily: SANS } = loadInter("normal", { weights: ["400", "500", "600", "700", "800", "900"], subsets: ["latin"] });
const { fontFamily: SERIF } = loadSerif("italic", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: MONO } = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

const C = { bg: "#F3F1EE", ink: "#111111", orange: "#E8803A", card: "#141414", card2: "#1E1E1E", line: "#2C2C2C", green: "#2E7D4F", yellow: "#F8E27A", red: "#D9342B", blue: "#3B82F6", grey: "#8A8A8A" };
export const VO_AT = 0.25;
export const AI_AGENTS_SEC = 15;
const KEY = new Set(["chat", "work", "plan", "tools", "results", "guide"]);
const W_ = (WORDS as { w: string; start: number; end: number }[]).map((x) => ({ ...x, start: x.start + VO_AT, end: x.end + VO_AT }));
const at = (i: number) => W_[i].start;

// scene starts keyed to words: They(5) First(7) Then(12) On(21) Want(30) Comment(34)
const SC = { work: at(5) - 0.1, plan: at(7) - 0.12, tools: at(12) - 0.12, check: at(21) - 0.12, want: at(30) - 0.1, cta: at(34) - 0.15 };

// caption chunks: <= 2 words, break after punctuation
const CHUNKS = (() => {
  const out: { words: string[]; from: number }[] = []; let cur: string[] = [], from = 0;
  W_.forEach((w, i) => { if (!cur.length) from = w.start; cur.push(w.w); if (/[.,?!]$/.test(w.w) || cur.length === 2 || i === W_.length - 1) { out.push({ words: cur, from }); cur = []; } });
  return out.map((c, i) => ({ ...c, to: i < out.length - 1 ? out[i + 1].from : AI_AGENTS_SEC }));
})();

export const AiAgents: React.FC = () => {
  const f = useCurrentFrame(); const fps = 30, W = 1920, H = 1080, t = f / fps; const cx = W / 2;
  const sp = (from: number, damping = 14) => spring({ frame: f - Math.round(from * fps), fps, config: { damping, stiffness: 160, mass: 0.7 } });
  const ease = (a: number, b: number, e = EASE.out) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });

  /* ---------- card shell ---------- */
  const cardW = 1000, cardH = 540, cardY = 90;
  const Card: React.FC<{ from: number; to: number; dark?: boolean; children: React.ReactNode }> = ({ from, to, dark = true, children }) => {
    if (t < from || t >= to) return null;
    const s = sp(from), ex = ease(to - 0.14, to, EASE.in); const float = Math.sin((t - from) * 2.2) * 4;
    return (
      <div style={{ position: "absolute", left: cx - cardW / 2, top: cardY, width: cardW, height: cardH, borderRadius: 26, overflow: "hidden", background: dark ? C.card : "#FFFFFF",
        boxShadow: "0 30px 70px rgba(0,0,0,0.22), 0 6px 18px rgba(0,0,0,0.12)", border: dark ? "1px solid #2a2a2a" : "1px solid #e4e1dc",
        opacity: Math.min(1, s * 1.4) * (1 - ex), transform: `translateY(${(1 - s) * 60 + float - ex * 40}px) scale(${0.9 + 0.1 * s - ex * 0.04}) rotate(${(1 - s) * -2.5}deg)` }}>
        <div style={{ height: 44, display: "flex", alignItems: "center", gap: 9, paddingLeft: 20, background: dark ? "#1b1b1b" : "#F4F2EF", borderBottom: dark ? "1px solid #262626" : "1px solid #e8e5e0" }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
        </div>
        <div style={{ position: "relative", height: cardH - 44 }}>{children}</div>
      </div>
    );
  };
  const typed = (s: string, a: number, b: number) => s.slice(0, Math.floor(s.length * ease(a, b, (x) => x)));
  const caret = (on: boolean) => on && Math.floor(t * 3) % 2 === 0 ? "|" : "";

  /* ---------- 1: chat ---------- */
  const strike = ease(at(4), at(4) + 0.35, EASE.io);
  const chat = (
    <Card from={0} to={SC.work} dark={false}>
      <div style={{ padding: "40px 60px", fontFamily: SANS, fontSize: 30 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", opacity: ease(0.1, 0.4), transform: `translateY(${(1 - ease(0.1, 0.4)) * 20}px)` }}>
          <div style={{ background: C.ink, color: "white", padding: "18px 26px", borderRadius: "24px 24px 6px 24px", fontWeight: 500 }}>Can you plan my trip to Rome?</div>
        </div>
        <div style={{ position: "relative", marginTop: 36, width: 720, opacity: ease(0.55, 0.85), transform: `translateY(${(1 - ease(0.55, 0.85)) * 20}px)` }}>
          <div style={{ background: "#EEECE8", color: C.ink, padding: "20px 28px", borderRadius: "24px 24px 24px 6px", lineHeight: 1.45 }}>
            Sure! Here are some general tips for visiting Rome: book early, check museum hours, and…
          </div>
          <div style={{ position: "absolute", left: -10, top: "50%", height: 6, width: `${strike * 104}%`, background: C.red, borderRadius: 3, transform: "rotate(-2deg)" }} />
        </div>
        <div style={{ marginTop: 34, display: "flex", gap: 10, opacity: ease(1.0, 1.2) * (1 - strike) }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "#B9B6B1", transform: `translateY(${Math.sin(t * 8 + i) * 4}px)` }} />)}</div>
      </div>
    </Card>
  );

  /* ---------- 2: agent working ---------- */
  const tasks = ["Search flights", "Compare hotels", "Build itinerary"];
  const work = (
    <Card from={SC.work} to={SC.plan}>
      <div style={{ padding: "40px 64px", fontFamily: SANS, color: "white" }}>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 3, color: C.orange }}>AGENT · RUNNING</div>
        <div style={{ fontSize: 50, fontWeight: 700, marginTop: 14 }}>Plan my trip to <span style={{ color: C.orange }}>Rome.</span></div>
        {tasks.map((x, i) => { const d = ease(SC.work + 0.12 + i * 0.16, SC.work + 0.3 + i * 0.16); return (
          <div key={x} style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 26, fontSize: 32, opacity: 0.35 + 0.65 * d }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, border: `3px solid ${d > 0.5 ? C.orange : "#555"}`, background: d > 0.5 ? C.orange : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: C.card, fontSize: 22, fontWeight: 900 }}>{d > 0.5 ? "✓" : ""}</div>{x}
          </div>); })}
      </div>
    </Card>
  );

  /* ---------- 3: plan steps ---------- */
  const steps = [["01", "Plan", "Break the goal down"], ["02", "Search", "Find live data"], ["03", "Build", "Write & run code"], ["04", "Check", "Verify the result"]];
  const planCard = (
    <Card from={SC.plan} to={SC.tools}>
      <div style={{ padding: "34px 50px", fontFamily: SANS, color: "white" }}>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: C.orange }}>HOW AN AGENT WORKS / 01 — 04</div>
        <div style={{ fontSize: 50, fontWeight: 700, marginTop: 12 }}>Your goal. <span style={{ color: C.orange }}>A finished result.</span></div>
        <div style={{ display: "flex", gap: 18, marginTop: 40 }}>
          {steps.map(([n, a, b], i) => { const on = ease(SC.plan + 0.25 + i * 0.22, SC.plan + 0.45 + i * 0.22); return (
            <div key={n} style={{ flex: 1, height: 200, borderRadius: 16, background: C.card2, border: `2px solid ${on > 0.5 ? C.orange : C.line}`, padding: 20, transform: `translateY(${(1 - on) * 14}px)`, opacity: 0.45 + 0.55 * on }}>
              <div style={{ fontFamily: MONO, fontSize: 18, color: C.orange }}>{n}</div>
              <div style={{ width: 46, height: 46, borderRadius: 12, border: "2px solid #444", marginTop: 14 }} />
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 16 }}>{a}</div>
              <div style={{ fontSize: 19, color: C.grey, marginTop: 4 }}>{b}</div>
            </div>); })}
        </div>
        <div style={{ height: 5, background: C.line, borderRadius: 3, marginTop: 30 }}><div style={{ height: 5, width: `${ease(SC.plan + 0.2, SC.tools - 0.1, EASE.sine) * 100}%`, background: C.orange, borderRadius: 3 }} /></div>
      </div>
    </Card>
  );

  /* ---------- 4: tools (search + code) ---------- */
  const q = "flights to Rome, May";
  const code = [["const", " flights = ", "await", " search(query);"], ["const", " best = flights.", "sort", "(byPrice)[0];"], ["", "plan.", "add", "(best);"], ["return", " plan;", "", ""]];
  const codeP = ease(at(17), at(20) + 0.25, (x) => x);
  const tools = (
    <Card from={SC.tools} to={SC.check}>
      <div style={{ display: "flex", height: "100%", fontFamily: SANS }}>
        <div style={{ flex: 1, padding: 34, borderRight: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: 3, color: C.orange }}>TOOL · WEB SEARCH</div>
          <div style={{ marginTop: 18, height: 64, borderRadius: 32, background: C.card2, border: `2px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 14, color: "white", fontSize: 25, whiteSpace: "nowrap", overflow: "hidden" }}>
            <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="10" cy="10" r="7" stroke={C.orange} strokeWidth="2.6" fill="none" /><line x1="15" y1="15" x2="21" y2="21" stroke={C.orange} strokeWidth="2.6" strokeLinecap="round" /></svg>
            {typed(q, SC.tools + 0.1, at(16))}{caret(t < at(17))}
          </div>
          {[0, 1, 2].map((i) => { const r = ease(at(16) + i * 0.1, at(16) + 0.22 + i * 0.1); return (
            <div key={i} style={{ marginTop: 20, padding: "16px 20px", borderRadius: 14, background: C.card2, opacity: r, transform: `translateX(${(1 - r) * -20}px)` }}>
              <div style={{ height: 14, width: `${70 - i * 12}%`, background: i === 0 ? C.orange : "#4a4a4a", borderRadius: 7 }} />
              <div style={{ height: 10, width: "88%", background: "#333", borderRadius: 5, marginTop: 12 }} />
            </div>); })}
        </div>
        <div style={{ flex: 1, padding: 34, fontFamily: MONO, fontSize: 20, color: "#D6D6D6" }}>
          <div style={{ fontSize: 17, letterSpacing: 3, color: C.orange, fontFamily: MONO }}>TOOL · CODE</div>
          <div style={{ marginTop: 22, lineHeight: 1.9 }}>
            {code.map((ln, i) => { const p = interpolate(codeP * code.length - i, [0, 1], [0, 1], CL); const full = ln.join(""); const n = Math.floor(full.length * p); let used = 0;
              return <div key={i} style={{ whiteSpace: "pre", minHeight: 44 }}><span style={{ color: "#555", marginRight: 18 }}>{i + 1}</span>{ln.map((part, k) => { const s = part.slice(0, Math.max(0, n - used)); used += part.length; return <span key={k} style={{ color: k % 2 === 0 ? C.orange : "#E6E6E6" }}>{s}</span>; })}</div>; })}
          </div>
          <div style={{ marginTop: 18, display: "inline-block", padding: "10px 18px", borderRadius: 10, background: "rgba(46,125,79,0.25)", color: "#7BD99B", fontSize: 20, opacity: ease(at(20) + 0.3, at(20) + 0.5) }}>▶ ran in 0.8 s</div>
        </div>
      </div>
    </Card>
  );

  /* ---------- 5: check (doc with red circle + highlight) ---------- */
  const circ = ease(at(26), at(27) + 0.3, EASE.io), hl = ease(at(25), at(26), EASE.io), stamp = sp(at(29), 10);
  const check = (
    <Card from={SC.check} to={SC.want} dark={false}>
      <div style={{ padding: "36px 70px", fontFamily: SANS, color: C.ink, position: "relative" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.grey, letterSpacing: 2 }}>TRIP PLAN — DRAFT 2</div>
        <div style={{ fontSize: 44, fontWeight: 800, marginTop: 10 }}>Rome, 3 nights</div>
        {[92, 84, 96].map((w, i) => <div key={i} style={{ height: 14, width: `${w}%`, background: "#E6E3DE", borderRadius: 7, marginTop: 18 }} />)}
        <div style={{ position: "relative", marginTop: 30, fontSize: 32, display: "inline-block" }}>
          <span style={{ background: `linear-gradient(90deg, ${C.yellow} ${hl * 100}%, transparent ${hl * 100}%)`, padding: "4px 6px" }}>Flight lands <b>Tue 14 May</b>, hotel check-in 15:00.</span>
          <svg width={330} height={110} style={{ position: "absolute", left: 160, top: -28, overflow: "visible" }}>
            <ellipse cx={165} cy={55} rx={150} ry={42} fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circ} transform="rotate(-4 165 55)" />
          </svg>
        </div>
        {[88, 70].map((w, i) => <div key={i} style={{ height: 14, width: `${w}%`, background: "#E6E3DE", borderRadius: 7, marginTop: 20 }} />)}
        <div style={{ position: "absolute", right: 60, top: 40, padding: "12px 24px", border: `4px solid ${C.green}`, color: C.green, borderRadius: 12, fontWeight: 900, fontSize: 30, letterSpacing: 2,
          opacity: Math.min(1, stamp * 1.3), transform: `rotate(-8deg) scale(${1.6 - 0.6 * stamp})` }}>✓ VERIFIED</div>
      </div>
    </Card>
  );

  /* ---------- 5b: guide card (bridges "Want the full guide?") ---------- */
  const guide = (
    <Card from={SC.want} to={SC.cta}>
      <div style={{ padding: "60px 70px", fontFamily: SANS, color: "white" }}>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 4, color: C.orange }}>FREE GUIDE · PDF</div>
        <div style={{ fontSize: 76, fontWeight: 800, marginTop: 20, lineHeight: 1.08, letterSpacing: -2 }}>How AI agents<br /><span style={{ color: C.orange }}>plan, act and check.</span></div>
        <div style={{ display: "flex", gap: 14, marginTop: 40 }}>{["Plan", "Tools", "Check"].map((x, i) => { const r = ease(SC.want + 0.2 + i * 0.12, SC.want + 0.4 + i * 0.12); return <div key={x} style={{ padding: "10px 22px", borderRadius: 30, border: `2px solid ${C.orange}`, color: C.orange, fontSize: 24, fontWeight: 600, opacity: r, transform: `translateY(${(1 - r) * 12}px)` }}>{x}</div>; })}</div>
      </div>
    </Card>
  );

  /* ---------- 6: CTA ---------- */
  const pill = sp(SC.cta - 0.05), block = sp(SC.cta, 12), tuck = sp(SC.cta + 0.25);
  const cta = t >= SC.cta - 0.05 && (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: cx - 430, top: 70, width: 860, height: 104, borderRadius: 52, background: "white", boxShadow: "0 14px 40px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", padding: "0 30px", gap: 22, fontFamily: SANS,
        opacity: Math.min(1, pill * 1.4), transform: `translateY(${(1 - pill) * -40}px)` }}>
        <div style={{ width: 66, height: 66, borderRadius: 33, background: C.orange, color: "white", fontWeight: 700, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>you</div>
        <div style={{ flex: 1, fontSize: 38, fontWeight: 800, color: C.ink, letterSpacing: 1 }}>{typed("AGENT", at(34), at(35) + 0.1)}{caret(t < at(36))}</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.blue }}>Post</div>
      </div>
      {t >= SC.cta && (<>
        <div style={{ position: "absolute", left: cx - 520, top: 250, width: 1040, height: 420, background: C.ink, boxShadow: `18px 18px 0 ${C.orange}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: SANS,
          opacity: Math.min(1, block * 1.5), transform: `scale(${0.85 + 0.15 * block}) rotate(${(1 - block) * -3}deg)` }}>
          <div style={{ fontSize: 120, fontWeight: 900, color: "white", lineHeight: 1 }}>COMMENT</div>
          <div style={{ fontSize: 150, fontWeight: 900, color: C.orange, lineHeight: 1.05 }}>"AGENT"</div>
          <div style={{ fontSize: 50, fontWeight: 800, color: "white", marginTop: 8 }}>and I'll send you the guide</div>
        </div>
        <div style={{ position: "absolute", left: cx - 300, top: 640, width: 600, height: 300, borderRadius: 22, background: C.card, border: "1px solid #2a2a2a", boxShadow: "0 24px 50px rgba(0,0,0,0.25)", padding: "34px 40px", fontFamily: SANS, color: "white", textAlign: "center",
          opacity: Math.min(1, tuck * 1.4), transform: `translateY(${(1 - tuck) * 80}px) rotate(${-2 + Math.sin(t * 2) * 0.6}deg)` }}>
          <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: 3, color: C.orange }}>FREE GUIDE</div>
          <div style={{ fontSize: 38, fontWeight: 700, marginTop: 12, lineHeight: 1.2 }}>How AI agents <span style={{ color: C.orange }}>plan, act and check.</span></div>
        </div>
      </>)}
    </AbsoluteFill>
  );

  /* ---------- stickers ---------- */
  const Sticker: React.FC<{ from: number; to: number; x: number; y: number; rot: number; children: React.ReactNode }> = ({ from, to, x, y, rot, children }) => {
    if (t < from || t >= to) return null; const s = sp(from, 9); const ex = ease(to - 0.12, to, EASE.in);
    return <div style={{ position: "absolute", left: x, top: y, transform: `scale(${s * (1 - ex)}) rotate(${rot + Math.sin(t * 3) * 3}deg)` }}>{children}</div>;
  };
  const spark = (bg: string, icon: React.ReactNode) => <div style={{ width: 104, height: 104, borderRadius: 26, background: bg, boxShadow: "0 10px 24px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="58" height="58" viewBox="0 0 24 24">{icon}</svg></div>;
  const star = <path d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z" fill="white" />;
  const stickers = (<>
    <Sticker from={0.2} to={SC.work} x={cx - 600} y={40} rot={-10}>{spark(C.orange, star)}</Sticker>
    <Sticker from={0.45} to={SC.work} x={cx + 420} y={50} rot={8}><div style={{ padding: "12px 30px", borderRadius: 40, background: C.green, color: "white", fontFamily: SANS, fontWeight: 900, fontSize: 40, boxShadow: "0 10px 24px rgba(0,0,0,0.18)" }}>AI</div></Sticker>
    <Sticker from={SC.plan + 0.1} to={SC.tools} x={cx - 600} y={40} rot={-8}>{spark(C.ink, <><rect x="5" y="4" width="14" height="17" rx="2" stroke="white" strokeWidth="2" fill="none" /><line x1="8" y1="10" x2="16" y2="10" stroke={C.orange} strokeWidth="2" /><line x1="8" y1="14" x2="14" y2="14" stroke="white" strokeWidth="2" /></>)}</Sticker>
    <Sticker from={SC.tools + 0.1} to={SC.check} x={cx + 470} y={40} rot={9}>{spark(C.orange, <><circle cx="10" cy="10" r="6.5" stroke="white" strokeWidth="2.6" fill="none" /><line x1="15" y1="15" x2="21" y2="21" stroke="white" strokeWidth="2.6" strokeLinecap="round" /></>)}</Sticker>
    <Sticker from={SC.check + 0.1} to={SC.want} x={cx - 600} y={40} rot={-9}>{spark(C.green, <path d="M5 12.5 L10 17 L19 7" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />)}</Sticker>
  </>);

  /* ---------- badges ---------- */
  const badges: [number, number, string, string][] = [[at(7), SC.tools, "FIRST", "PLAN THE TASK"], [at(12), SC.check, "THEN", "USE REAL TOOLS"], [at(21), SC.want, "ON TOP OF THAT", "CHECK THE RESULTS"]];
  const badgeView = badges.map(([a, b, lab, txt]) => { if (t < a || t >= b) return null; const s = sp(a + 0.05, 11); const ex = ease(b - 0.12, b, EASE.in);
    return (
      <div key={lab} style={{ position: "absolute", left: 0, right: 0, top: 920, display: "flex", justifyContent: "center", opacity: 1 - ex }}>
        <div style={{ position: "relative", background: "white", border: `4px solid ${C.ink}`, boxShadow: `9px 9px 0 ${C.orange}`, padding: "6px 30px 10px", fontFamily: SANS, transform: `translateY(${(1 - s) * 50}px) scale(${0.8 + 0.2 * s})`, opacity: Math.min(1, s * 1.5) }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.orange, letterSpacing: 2 }}>{lab}</div>
          <div style={{ fontSize: 46, fontWeight: 900, color: C.ink, lineHeight: 1.05 }}>{txt}</div>
        </div>
      </div>
    ); });

  /* ---------- captions ---------- */
  const ch = CHUNKS.find((c) => t >= c.from && t < c.to && c.from < SC.cta);
  const caption = ch && (() => { const p = interpolate(t, [ch.from, ch.from + 0.12], [0, 1], { ...CL, easing: EASE.out });
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 86, color: C.ink, letterSpacing: -2, transform: `translateY(${(1 - p) * 16}px) scale(${0.94 + 0.06 * p})`, opacity: p }}>
        {ch.words.map((w, i) => { const clean = w.replace(/[.,?!]/g, ""); const k = KEY.has(clean.toLowerCase());
          return <span key={i} style={k ? { fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 104, letterSpacing: 0 } : {}}>{i ? " " : ""}{k ? clean : clean}</span>; })}
      </div>
    ); })();

  const sfx: [number, string, number][] = [
    [0.05, "audio-lib/sfx/synth_ui/synth-pop-01.mp3", 0.5], [0.45, "audio-lib/sfx/synth_ui/synth-pop-02.mp3", 0.4], [at(4), "audio-lib/sfx/synth_whoosh/synth-whoosh-05.mp3", 0.35],
    ...[SC.work, SC.plan, SC.tools, SC.check].map((s) => [s, "audio-lib/sfx/synth_whoosh/synth-whoosh-01.mp3", 0.35] as [number, string, number]),
    ...badges.map(([a]) => [a + 0.05, "audio-lib/sfx/synth_ui/synth-pop-03.mp3", 0.5] as [number, string, number]),
    ...[0, 1, 2].map((i) => [SC.work + 0.2 + i * 0.16, "audio-lib/sfx/synth_ui/synth-blip-02.mp3", 0.35] as [number, string, number]),
    ...Array.from({ length: 8 }).map((_, i) => [SC.tools + 0.15 + i * 0.14, `audio-lib/sfx/synth_ui/synth-click-0${(i % 6) + 1}.mp3`, 0.4] as [number, string, number]),
    [at(29), "audio-lib/sfx/synth_chime/synth-chime-02.mp3", 0.4], [SC.want, "audio-lib/sfx/synth_ui/synth-bubble-01.mp3", 0.45],
    [SC.cta, "audio-lib/sfx/synth_impact/synth-impact-03.mp3", 0.45],
  ];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AudioLayer cfg={{ voice: "videos/ai-agents/vo.wav", voiceAt: VO_AT, music: "videos/ai-agents/pulse.wav", musicVolume: 0.12, sfx }} fps={fps} duration={AI_AGENTS_SEC * fps} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 40%, #FBFAF8, #EDEAE5)" }} />
      <svg width={W} height={H} style={{ position: "absolute", opacity: 0.05 }}><filter id="ai-n"><feTurbulence type="fractalNoise" baseFrequency="0.9" seed={f % 7} /></filter><rect width={W} height={H} filter="url(#ai-n)" /></svg>
      {chat}{work}{planCard}{tools}{check}{guide}
      {stickers}{caption}{badgeView}{cta}
    </AbsoluteFill>
  );
};
