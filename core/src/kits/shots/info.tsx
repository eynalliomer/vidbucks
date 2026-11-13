// ShotFilm extended scenes: information graphics and physical set-ups, all animated on the narration.
//   bars · chart · pictos · diagram · steps · board · filmstrip · bigword · typed · versus · gauge
import React from "react";
import { Caption, Ctx, FONT, Ground, Pic, PRESS, clamp, easeInOut, easeOutBack, easeOutCubic, fw, light, mulberry, ramp } from "./prims";
import { fitBox, pic } from "./layouts";

const GLYPH: Record<string, string> = {   // 24x24 pictogram paths for unit charts
  dot: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", person: "M12 2.5a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4zM6.5 22v-8.2c0-2.4 2-4 5.5-4s5.5 1.6 5.5 4V22z",
  drop: "M12 2c4 5.4 7 9 7 12.6a7 7 0 0 1-14 0C5 11 8 7.400 12 2z", coin: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zm-1.200 4.500h2.400v9h-2.400z", square: "M4 4h16v16H4z",
  hex: "M12 2l8.700 5v10L12 22l-8.700-5V7z", house: "M12 3l9 8h-2.500v10h-13V11H3z", bag: "M5 8h14l1.500 13h-17zM9 8V6a3 3 0 0 1 6 0v2h-2V6a1 1 0 0 0-2 0v2z", bolt: "M13 2L5 13.500h5.500L9.500 22l9-12.500h-5.800z",
  heart: "M12 21C5 15.500 3 12.500 3 9a4.500 4.500 0 0 1 9-1.400A4.500 4.500 0 0 1 21 9c0 3.500-2 6.500-9 12z", star: "M12 2l3 6.600 7.200.800-5.400 4.800 1.600 7.100L12 17.700 5.600 21.300l1.600-7.100L1.800 9.400 9 8.600z", bird: "M3 13c4-1 6-4 8-7c1 3 4 4 8 3c-2 2-3 3-3 6c-3 3-8 3-13-2z",
};

export function extended(c: Ctx): React.ReactNode {
  const { t, t0, t1, W, H, skin, L, words, up } = c, d = L.data ?? {}, s = W / 1920, k = clamp((t - t0) / Math.max(0.5, t1 - t0)), P = L.picked;
  const disp = FONT[skin.display], dw = fw(skin.display, skin.weight), span = Math.max(1.2, t1 - t0), onA = light(skin.accent) ? "#111" : "#fff";
  const head = d.heading ? <div style={{ position: "absolute", left: 140 * s, top: 90 * s, fontFamily: disp, fontWeight: dw, fontSize: 64 * s, color: skin.fg, opacity: ramp(t, t0, 0.3), clipPath: `inset(0 ${(1 - PRESS(ramp(t, t0, 0.5))) * 100}% 0 0)` }}>{skin.upper ? up(d.heading) : d.heading}</div> : null;
  switch (L.shot) {
    case "bars": {   // items: [{label, value, note?}], unit, highlight (index), orient: h | v
      const items: { label: string; value: number; note?: string }[] = d.items ?? [], max = Math.max(...items.map((i) => i.value), 1), hi = d.highlight ?? items.length - 1, vertical = (d.orient ?? "h") === "v";
      const at = (i: number) => d.at?.[i] ?? t0 + 0.4 + (i * span * 0.55) / Math.max(1, items.length), fmt = (v: number) => `${d.prefix ?? ""}${v.toLocaleString("tr-TR", { maximumFractionDigits: d.decimals ?? 0 })}${d.unit ? " " + d.unit : ""}`;
      return (<>
        <Ground c={c} dim />{head}
        {vertical ? items.map((it, i) => { const u = easeOutCubic(ramp(t, at(i), 0.7)), bw = Math.min(340 * s, (W * 0.72) / items.length - 60 * s), x = W * 0.14 + (i + 0.5) * ((W * 0.72) / items.length) - bw / 2, hgt = H * 0.46 * (it.value / max) * u;
          return <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x, bottom: H * 0.26, width: bw, height: hgt, background: i === hi ? skin.accent : skin.dim, opacity: i === hi ? 1 : 0.7 }} />
            <div style={{ position: "absolute", left: x - 40 * s, width: bw + 80 * s, bottom: H * 0.26 + hgt + 14 * s, textAlign: "center", fontFamily: disp, fontWeight: dw, fontSize: (i === hi ? 110 : 76) * s, color: i === hi ? skin.accent : skin.fg, opacity: ramp(t, at(i) + 0.3, 0.3) }}>{fmt(Math.round(it.value * u * 10) / 10)}</div>
            <div style={{ position: "absolute", left: x - 60 * s, width: bw + 120 * s, top: H * 0.76, textAlign: "center", fontFamily: FONT.mono, fontSize: 36 * s, color: skin.fg, opacity: ramp(t, at(i), 0.3) }}>{up(it.label)}</div></React.Fragment>; })
          : items.map((it, i) => { const u = easeOutCubic(ramp(t, at(i), 0.7)), y = H * 0.27 + i * Math.min(190 * s, (H * 0.5) / items.length), len = W * 0.46 * (it.value / max) * u;
          return <React.Fragment key={i}>
            <div style={{ position: "absolute", left: 140 * s, top: y, width: W * 0.2, textAlign: "right", fontFamily: disp, fontWeight: dw, fontSize: 62 * s, color: skin.fg, opacity: ramp(t, at(i) - 0.1, 0.3) }}>{skin.upper ? up(it.label) : it.label}</div>
            <div style={{ position: "absolute", left: 140 * s + W * 0.22, top: y + 4 * s, width: len, height: 84 * s, background: i === hi ? skin.accent : skin.dim, opacity: i === hi ? 1 : 0.7 }} />
            <div style={{ position: "absolute", left: 140 * s + W * 0.22 + len + 18 * s, top: y + 4 * s, fontFamily: FONT.mono, fontWeight: 700, fontSize: 62 * s, color: i === hi ? skin.accent : skin.fg, opacity: ramp(t, at(i) + 0.3, 0.3) }}>{fmt(Math.round(it.value * u * 10) / 10)}</div></React.Fragment>; })}
        <Caption c={c} plate={false} />
      </>);
    }
    case "chart": {   // values: number[], labels?: string[], mark?: index, unit; the line draws, the marked point pulses
      const vals: number[] = d.values ?? [], n = vals.length, lo = Math.min(...vals, d.min ?? Infinity), hiV = Math.max(...vals, d.max ?? -Infinity), mk = d.mark ?? n - 1;
      const X = (i: number) => W * 0.14 + (i / Math.max(1, n - 1)) * W * 0.72, Y = (v: number) => H * 0.72 - ((v - lo) / Math.max(1e-6, hiV - lo)) * H * 0.46, draw = easeInOut(ramp(t, t0 + 0.4, span * 0.6));
      const path = vals.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(" "), reached = draw >= mk / Math.max(1, n - 1) - 0.02;
      return (<>
        <Ground c={c} dim />{head}
        <svg width={W} height={H} style={{ position: "absolute", transform: `scale(${1 + 0.04 * k})`, transformOrigin: "50% 60%" }}>
          {[0, 0.5, 1].map((g) => <line key={g} x1={W * 0.14} x2={W * 0.86} y1={H * 0.72 - g * H * 0.46} y2={H * 0.72 - g * H * 0.46} stroke={skin.dim} strokeWidth={1.5 * s} opacity={0.4} strokeDasharray={`${8 * s} ${8 * s}`} />)}
          {d.area !== false && <path d={`${path} L${X(n - 1)},${H * 0.72} L${X(0)},${H * 0.72} Z`} fill={skin.accent} opacity={0.14} style={{ clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)` }} />}
          <path d={path} fill="none" stroke={skin.accent} strokeWidth={9 * s} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          {(d.labels ?? []).map((lb: string, i: number) => lb && <text key={i} x={X(i)} y={H * 0.72 + 50 * s} textAnchor="middle" fontFamily={FONT.mono} fontSize={24 * s} fill={skin.dim}>{up(lb)}</text>)}
          {reached && <g><circle cx={X(mk)} cy={Y(vals[mk])} r={(16 + 5 * Math.sin(t * 6)) * s} fill={skin.accent} stroke={skin.bg} strokeWidth={5 * s} />
            <text x={X(mk) + (mk > n / 2 ? -30 : 30) * s} y={Y(vals[mk]) - 34 * s} textAnchor={mk > n / 2 ? "end" : "start"} fontFamily={disp} fontWeight={dw} fontSize={84 * s} fill={skin.fg}>{`${d.prefix ?? ""}${vals[mk].toLocaleString("tr-TR")}${d.unit ? " " + d.unit : ""}`}</text></g>}
        </svg>
        <Caption c={c} plate={false} />
      </>);
    }
    case "pictos": {   // total icons, `filled` of them light up one by one: a unit chart ("7 out of 10")
      const total = Number(d.total ?? 10), filled = Number(d.filled ?? 3), cols = d.cols ?? (total <= 10 ? total : Math.ceil(Math.sqrt(total * 2))), rows = Math.ceil(total / cols), g = GLYPH[d.icon ?? "dot"] ?? GLYPH.dot;
      const cell = Math.min((W * 0.74) / cols, (H * 0.5) / rows), ox = (W - cell * cols) / 2, oy = H * 0.2 + (H * 0.5 - cell * rows) / 2, from = d.at ?? t0 + 0.5;
      return (<>
        <Ground c={c} dim />{head}
        <svg width={W} height={H} style={{ position: "absolute" }}>
          {Array.from({ length: total }, (_, i) => { const on = ramp(t, from + (i / Math.max(1, filled)) * span * 0.5, 0.18) * (i < filled ? 1 : 0), pop = easeOutBack(ramp(t, t0 + 0.1 + i * 0.02, 0.3));
            return <g key={i} transform={`translate(${ox + (i % cols) * cell + cell * 0.14} ${oy + Math.floor(i / cols) * cell + cell * 0.14}) scale(${(cell * 0.72 / 24) * pop})`}><path d={g} fill={on > 0 ? skin.accent : skin.dim} opacity={on > 0 ? 1 : 0.35} transform={on > 0 && on < 1 ? `translate(12 12) scale(${1.4 - 0.4 * on}) translate(-12 -12)` : undefined} /></g>; })}
        </svg>
        {d.label && <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.74, textAlign: "center", fontFamily: disp, fontWeight: dw, fontSize: 70 * s, color: skin.fg, opacity: ramp(t, from + span * 0.4, 0.3) }}><span style={{ color: skin.accent }}>{filled}</span> / {total} {skin.upper ? up(d.label) : d.label}</div>}
        <Caption c={c} plate={false} />
      </>);
    }
    case "diagram": {   // a picture with callouts: pins at (x,y) with leader lines and labels that arrive one per beat
      const calls: { x: number; y: number; label: string }[] = d.callouts ?? [], b = fitBox(W, H, P?.aspect ?? 1.5, 0.56, 0.74), left = W * 0.08, top = (H - b.h) / 2 - 20 * s;
      return (<>
        <Ground c={c} dim />{head}
        {pic(c, P, b.w, b.h, { style: { left, top }, frame: skin.dir.frame === "bleed" ? "window" : skin.dir.frame, camera: "locked", from: [0.5, 0.5, 1] })}
        <svg width={W} height={H} style={{ position: "absolute" }}>
          {calls.map((q, i) => { const a = d.at?.[i] ?? t0 + 0.6 + (i * span * 0.6) / Math.max(1, calls.length), u = PRESS(ramp(t, a, 0.4)), px = left + q.x * b.w, py = top + q.y * b.h, lx = W * 0.7, ly = H * 0.22 + i * ((H * 0.56) / Math.max(1, calls.length));
            return <g key={i} opacity={ramp(t, a, 0.15)}><circle cx={px} cy={py} r={(10 + 12 * ((t * 1.2 + i * 0.3) % 1)) * s} fill="none" stroke={skin.accent} strokeWidth={3 * s} opacity={1 - ((t * 1.2 + i * 0.3) % 1)} /><circle cx={px} cy={py} r={10 * s} fill={skin.accent} stroke="#fff" strokeWidth={3 * s} />
              <path d={`M${px},${py} L${lx - 30 * s},${ly} L${lx},${ly}`} fill="none" stroke={skin.accent} strokeWidth={3 * s} pathLength={1} strokeDasharray={`${u} 1`} /></g>; })}
        </svg>
        {calls.map((q, i) => { const a = d.at?.[i] ?? t0 + 0.6 + (i * span * 0.6) / Math.max(1, calls.length); return <div key={i} style={{ position: "absolute", left: W * 0.7 + 14 * s, top: H * 0.22 + i * ((H * 0.56) / Math.max(1, calls.length)) - 30 * s, right: 80 * s, fontFamily: disp, fontWeight: dw, fontSize: 46 * s, color: skin.fg, opacity: ramp(t, a + 0.3, 0.25), transform: `translateX(${(1 - PRESS(ramp(t, a + 0.3, 0.3))) * 30 * s}px)` }}>{skin.upper ? up(q.label) : q.label}</div>; })}
        <Caption c={c} plate={false} box={{ right: W * 0.34 }} />
      </>);
    }
    case "steps": {   // a process: numbered stations joined by an arrow that travels; each lights on its beat
      const items: string[] = d.items ?? [], n = items.length, at = (i: number) => d.at?.[i] ?? t0 + 0.4 + (i * span * 0.65) / Math.max(1, n), X = (i: number) => W * 0.17 + (i / Math.max(1, n - 1)) * W * 0.66;
      const prog = items.reduce((q, _, i) => q + ramp(t, at(i), 0.5), 0) - 1;
      return (<>
        <Ground c={c} dim />{head}
        <svg width={W} height={H} style={{ position: "absolute" }}>
          <line x1={X(0)} x2={X(n - 1)} y1={H * 0.45} y2={H * 0.45} stroke={skin.dim} strokeWidth={4 * s} strokeDasharray={`${14 * s} ${12 * s}`} opacity={0.5} />
          <line x1={X(0)} x2={X(0) + (X(n - 1) - X(0)) * clamp(prog / Math.max(1, n - 1))} y1={H * 0.45} y2={H * 0.45} stroke={skin.accent} strokeWidth={8 * s} />
          {items.map((_, i) => { const u = easeOutBack(ramp(t, at(i), 0.4)); return <g key={i} transform={`translate(${X(i)} ${H * 0.45}) scale(${u})`}><circle r={84 * s} fill={ramp(t, at(i), 0.2) > 0 ? skin.accent : skin.bg} stroke={skin.accent} strokeWidth={6 * s} /><text y={28 * s} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={80 * s} fill={onA}>{i + 1}</text></g>; })}
        </svg>
        {items.map((it, i) => <div key={i} style={{ position: "absolute", left: X(i) - W * 0.11, width: W * 0.22, top: H * 0.58, textAlign: "center", fontFamily: disp, fontWeight: dw, fontSize: 58 * s, lineHeight: 1.1, color: skin.fg, opacity: ramp(t, at(i) + 0.15, 0.3), transform: `translateY(${(1 - PRESS(ramp(t, at(i) + 0.15, 0.3))) * 24 * s}px)` }}>{skin.upper ? up(it) : it}</div>)}
        <Caption c={c} plate={false} />
      </>);
    }
    case "board": {   // an evidence board: prints pinned on a surface, strings between them, notes; the camera travels across it
      const all = [P, ...(L.extra ?? [])].filter(Boolean) as Pic[], n = Math.min(5, all.length), surf = d.surface ?? "cork", r = mulberry(c.seed);
      const spots = Array.from({ length: n }, (_, i) => ({ x: 0.08 + i * 0.36, y: 0.07 + (i % 2) * 0.2 + r() * 0.04, rot: (r() - 0.5) * 8, w: 0.27 + r() * 0.04 }));
      const pan = easeInOut(clamp((t - t0 - 0.8) / Math.max(1, span - 1.4))) * Math.max(0.03, (n - 1) * 0.36 + 0.36 - 0.92), bg = surf === "cork" ? "#b98a56" : surf === "desk" ? "#3a2c22" : surf === "wall" ? "#d9d4c7" : skin.bg, notes: string[] = d.notes ?? [];
      return (<>
        <div style={{ position: "absolute", inset: 0, background: bg, backgroundImage: surf === "cork" ? "radial-gradient(rgba(60,35,10,.28) 1.2px, transparent 1.6px), radial-gradient(rgba(255,230,180,.18) 1px, transparent 1.4px)" : surf === "desk" ? "repeating-linear-gradient(92deg, rgba(0,0,0,.18) 0 3px, transparent 3px 22px)" : undefined, backgroundSize: surf === "cork" ? "9px 9px, 13px 13px" : undefined, backgroundPosition: `${-pan * W}px 0` }} />
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${-pan * W}px) scale(${1 + 0.03 * k})`, transformOrigin: "0 50%" }}>
          <svg width={W * 2} height={H} style={{ position: "absolute", overflow: "visible" }}>
            {spots.slice(1).map((sp, i) => { const a = spots[i], st = t0 + 0.5 + (i + 1) * 0.6, u = easeInOut(ramp(t, st, 0.5)), x0 = (a.x + a.w / 2) * W, y0 = a.y * H + 14 * s, x1 = (sp.x + sp.w / 2) * W, y1 = sp.y * H + 14 * s;
              return <path key={i} d={`M${x0},${y0} Q${(x0 + x1) / 2},${Math.max(y0, y1) + 70 * s} ${x1},${y1}`} fill="none" stroke={d.string ?? "#b3202a"} strokeWidth={5 * s} pathLength={1} strokeDasharray={`${u} 1`} />; })}
          </svg>
          {all.slice(0, n).map((p, i) => { const sp = spots[i], w = W * sp.w, h = Math.min(w / Math.max(0.7, Math.min(1.8, p.aspect)), H * 0.4);
            return <React.Fragment key={i}>{pic(c, p, w, h, { style: { left: sp.x * W, top: sp.y * H, transform: `rotate(${sp.rot}deg)` }, frame: i % 2 ? "polaroid" : "print", i, delay: i * 0.6, enter: "drop", camera: "locked", from: [0.5, 0.4, 1.04] })}
              {t - t0 > i * 0.6 + 0.3 && <div style={{ position: "absolute", left: (sp.x + sp.w / 2) * W - 13 * s, top: sp.y * H - 4 * s, width: 26 * s, height: 26 * s, borderRadius: "50%", background: "#c4251f", boxShadow: "0 4px 6px rgba(0,0,0,.5)" }} />}
              {notes[i] && <div style={{ position: "absolute", left: sp.x * W + 20 * s, top: sp.y * H + h + 26 * s, background: "#f7e98e", color: "#2a2620", fontFamily: FONT.hand, fontWeight: 700, fontSize: 44 * s, padding: `${6 * s}px ${18 * s}px`, transform: `rotate(${-sp.rot}deg) scale(${easeOutBack(ramp(t, t0 + i * 0.6 + 0.7, 0.3))})`, boxShadow: "0 6px 14px rgba(0,0,0,.35)" }}>{notes[i]}</div>}</React.Fragment>; })}
        </div>
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 220px rgba(0,0,0,.55)" }} />
        <Caption c={c} />
      </>);
    }
    case "filmstrip": {   // the pictures pass like a strip of film, each stopping in the gate on its beat
      const all = [P, ...(L.extra ?? [])].filter(Boolean) as Pic[], n = all.length, fw2 = W * 0.56, gap = 40 * s, pos = n > 1 ? easeInOut(k) * (n - 1) : 0;
      return (<>
        <div style={{ position: "absolute", inset: 0, background: "#0b0b0b" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.14, height: H * 0.62, background: "#151515" }} />
        {[0.16, 0.71].map((y) => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: H * y, height: H * 0.035, backgroundImage: `repeating-linear-gradient(90deg, #e9e4d6 0 ${26 * s}px, transparent ${26 * s}px ${58 * s}px)`, backgroundPositionX: -pos * (fw2 + gap) }} />)}
        {all.map((p, i) => <React.Fragment key={i}>{pic(c, p, fw2, H * 0.48, { style: { left: W / 2 - fw2 / 2 + (i - pos) * (fw2 + gap), top: H * 0.215, opacity: 1 - Math.min(0.6, Math.abs(i - pos) * 0.6) }, i, enter: "cut", camera: "kenburns" })}</React.Fragment>)}
        <Caption c={c} />
      </>);
    }
    case "bigword": {   // one to three words fill the frame, each slamming on its spoken time; a picture may sit behind
      const list: string[] = d.words ?? words.slice(0, 3).map((w) => w[0]), at = (i: number) => d.at?.[i] ?? t0 + 0.2 + (i * span * 0.6) / Math.max(1, list.length), size = Math.min(360, 1500 / Math.max(...list.map((w) => w.length), 3));
      return (<>
        <Ground c={c} />
        {P && pic(c, P, W, H, { style: { opacity: 0.4 } })}
        <div style={{ position: "absolute", left: 100 * s, right: 100 * s, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: skin.align === "center" ? "center" : "flex-start", transform: `scale(${1 + 0.05 * k})` }}>
          {list.map((w, i) => { const u = ramp(t, at(i), 0.22); return <div key={i} style={{ fontFamily: disp, fontWeight: fw(skin.display, 900), fontSize: size * s, lineHeight: 0.98, color: i === (d.hot ?? list.length - 1) ? skin.accent : skin.fg, opacity: Math.min(1, u * 5), transform: `translateY(${(1 - easeOutCubic(u)) * 80 * s}px) scale(${1.25 - 0.25 * easeOutCubic(u)})`, transformOrigin: skin.align === "center" ? "50% 50%" : "0 50%", textShadow: skin.glow ? `0 0 ${40 * s}px ${skin.accent}` : undefined }}>{up(w)}</div>; })}
        </div>
        <Caption c={c} mode={skin.dir.caption === "kinetic" ? "subtitle" : undefined} />
      </>);
    }
    case "typed": {   // the line typed onto a paper card (a telegram, a file note): our own words, never a faked source
      const kind = d.paper ?? "card", wPx = W * 0.6, hPx = H * 0.62, full = words.map((w) => w[0]).join(" "), ta = words[0]?.[1] ?? t0, tb = words[words.length - 1]?.[2] ?? t1, nch = Math.floor(clamp((t - ta) / Math.max(0.4, tb - ta)) * full.length);
      return (<>
        <Ground c={c} dim />
        {P && pic(c, P, W, H, { style: { opacity: 0.25 } })}
        <div style={{ position: "absolute", left: (W - wPx) / 2, top: (H - hPx) / 2 - 20 * s, width: wPx, height: hPx, background: kind === "telegram" ? "#e9d9a8" : kind === "index" ? "#f7f3e6" : "#f3ecd9", boxShadow: "0 30px 80px rgba(0,0,0,.5)", transform: `rotate(${((c.seed % 5) - 2) * 0.7}deg) scale(${0.96 + 0.06 * k}) translateY(${(1 - easeOutCubic(ramp(t, t0, 0.5))) * 80 * s}px)`,
          backgroundImage: kind === "index" ? `repeating-linear-gradient(0deg, transparent 0 ${58 * s}px, rgba(60,90,160,.28) ${58 * s}px ${60 * s}px)` : undefined, backgroundPositionY: 120 * s }}>
          {d.heading && <div style={{ position: "absolute", left: 60 * s, right: 60 * s, top: 40 * s, fontFamily: FONT.courier, fontWeight: 700, fontSize: 30 * s, letterSpacing: 6 * s, color: "#7a2a22", borderBottom: `${3 * s}px solid #7a2a22`, paddingBottom: 12 * s }}>{up(d.heading)}</div>}
          <div style={{ position: "absolute", left: 60 * s, right: 60 * s, top: (d.heading ? 130 : 70) * s, fontFamily: kind === "telegram" ? FONT.elite : FONT.courier, fontSize: 50 * s, lineHeight: 1.2, color: "#221d18", whiteSpace: "pre-wrap" }}>{full.slice(0, nch)}<span style={{ opacity: Math.floor(t * 4) % 2 ? 1 : 0 }}>▌</span></div>
          {d.date && <div style={{ position: "absolute", right: 60 * s, bottom: 40 * s, fontFamily: FONT.courier, fontSize: 28 * s, color: "#5a5248" }}>{d.date}</div>}
        </div>
      </>);
    }
    case "versus": {   // two columns of facts with a centre spine; rows land one per beat
      const rows: [string, string, string][] = d.rows ?? [], at = (i: number) => d.at?.[i] ?? t0 + 0.5 + (i * span * 0.6) / Math.max(1, rows.length);
      return (<>
        <Ground c={c} dim />
        {P && pic(c, P, W, H, { style: { opacity: 0.22 } })}
        {[d.left, d.right].map((h: string, i: number) => <div key={i} style={{ position: "absolute", left: i ? W * 0.56 : 0, width: W * 0.44, top: 120 * s, textAlign: i ? "left" : "right", fontFamily: disp, fontWeight: dw, fontSize: 130 * s, color: i ? skin.accent : skin.fg, transform: `translateX(${(1 - PRESS(ramp(t, t0, 0.45))) * (i ? 1 : -1) * 120 * s}px)`, opacity: ramp(t, t0, 0.2) }}>{skin.upper ? up(h ?? "") : h}</div>)}
        <div style={{ position: "absolute", left: W / 2 - 2 * s, top: H * 0.1, width: 4 * s, height: H * 0.68 * PRESS(ramp(t, t0, 0.6)), background: skin.dim }} />
        {rows.map((r, i) => { const u = PRESS(ramp(t, at(i), 0.35)), y = H * 0.38 + i * Math.min(190 * s, (H * 0.42) / rows.length); return <React.Fragment key={i}>
          <div style={{ position: "absolute", left: 0, width: W * 0.44, top: y, textAlign: "right", fontFamily: FONT.mono, fontWeight: 700, fontSize: 96 * s, color: skin.fg, opacity: u, transform: `translateX(${(1 - u) * -40 * s}px)` }}>{r[1]}</div>
          <div style={{ position: "absolute", left: W * 0.44, width: W * 0.12, top: y + 40 * s, textAlign: "center", fontFamily: FONT.mono, fontSize: 26 * s, letterSpacing: 2 * s, color: skin.dim, opacity: u }}>{up(r[0])}</div>
          <div style={{ position: "absolute", left: W * 0.56, width: W * 0.44, top: y, fontFamily: FONT.mono, fontWeight: 700, fontSize: 96 * s, color: skin.accent, opacity: u, transform: `translateX(${(1 - u) * 40 * s}px)` }}>{r[2]}</div></React.Fragment>; })}
        <Caption c={c} plate={false} box={{ textAlign: "center" }} />
      </>);
    }
    case "gauge": {   // a dial whose needle swings to the value (0..1) on the spoken word
      const v = clamp(Number(d.value ?? 0.5)), u = easeOutBack(ramp(t, d.at ?? t0 + 0.5, 0.9), 1.0), ang = -90 + 180 * v * u + 1.2 * Math.sin(t * 9) * (u >= 1 ? 1 : 0), R = 440 * s, cx = W / 2, cy = H * 0.66;
      return (<>
        <Ground c={c} dim />{head}
        <svg width={W} height={H} style={{ position: "absolute" }}>
          {Array.from({ length: 21 }, (_, i) => { const a = (-180 + i * 9) * Math.PI / 180, hot = i / 20 <= v * u; return <line key={i} x1={cx + Math.cos(a) * R} y1={cy + Math.sin(a) * R} x2={cx + Math.cos(a) * (R - (i % 5 ? 30 : 56) * s)} y2={cy + Math.sin(a) * (R - (i % 5 ? 30 : 56) * s)} stroke={hot ? skin.accent : skin.dim} strokeWidth={(i % 5 ? 5 : 9) * s} />; })}
          <g transform={`rotate(${ang} ${cx} ${cy})`}><path d={`M${cx - 10 * s},${cy} L${cx},${cy - R + 70 * s} L${cx + 10 * s},${cy} Z`} fill={skin.fg} /></g><circle cx={cx} cy={cy} r={26 * s} fill={skin.accent} />
          {[d.low, d.high].map((lb: string, i: number) => lb && <text key={i} x={cx + (i ? 1 : -1) * (R + 20 * s)} y={cy + 50 * s} textAnchor={i ? "start" : "end"} fontFamily={FONT.mono} fontSize={26 * s} fill={skin.dim}>{up(lb)}</text>)}
        </svg>
        {d.label && <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.7, textAlign: "center", fontFamily: disp, fontWeight: dw, fontSize: 96 * s, color: skin.fg, opacity: ramp(t, (d.at ?? t0 + 0.5) + 0.6, 0.3) }}>{skin.upper ? up(d.label) : d.label}</div>}
        <Caption c={c} plate={false} box={{ textAlign: "center" }} />
      </>);
    }
  }
  return null;
}
export const EXTENDED = ["bars", "chart", "pictos", "diagram", "steps", "board", "filmstrip", "bigword", "typed", "versus", "gauge"];
