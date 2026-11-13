// ShotFilm classic layouts (photo · detail · split · compare · number · quote · document · map · timeline · list · ratio ·
// title · stamp · collage). Every picture goes through Photo, so the act's camera / entrance / frame apply everywhere.
import React from "react";
import { Caption, Ctx, FONT, Ground, Photo, Pic, PRESS, Words, clamp, easeInOut, easeOutBack, easeOutCubic, fw, light, ramp } from "./prims";

/** a picture drawn with the act's direction; `i` staggers entrances and varies the seed */
export const pic = (c: Ctx, p: Pic | undefined, w: number, h: number, o: { style?: React.CSSProperties; i?: number; from?: number[]; to?: number[]; frame?: any; enter?: any; camera?: any; treat?: any; delay?: number; label?: string } = {}) => {
  if (!p) return null;
  const { t, t0, t1, skin, L } = c, d = L.data ?? {}, k = clamp((t - t0) / Math.max(0.5, t1 - t0)), since = t - t0 - (o.delay ?? 0);
  if (since < 0 && (o.enter ?? skin.dir.enter) !== "cut") return null;
  return <Photo src={p.src} w={w} h={h} skin={skin} k={k} t={t} since={since} from={o.from ?? d.from} to={o.to ?? d.to} style={o.style} frame={o.frame ?? "bleed"} enter={o.enter ?? skin.dir.enter} camera={o.camera} treat={o.treat} seed={c.seed + (o.i ?? 0) * 7} label={o.label ?? p.label} clipIn={p.in} rate={p.rate} />;
};
/** the box a framed picture gets on the ground: as large as fits, keeping a sane aspect */
export const fitBox = (W: number, H: number, aspect: number, maxW = 0.7, maxH = 0.68) => { const a = Math.max(0.7, Math.min(1.9, aspect || 1.5)); let h = H * maxH, w = h * a; if (w > W * maxW) { w = W * maxW; h = w / a; } return { w, h }; };

export function classic(c: Ctx): React.ReactNode {
  const { t, t0, t1, W, H, skin, L, words, up } = c, d = L.data ?? {}, s = W / 1920, k = clamp((t - t0) / Math.max(0.5, t1 - t0)), out = 1 - ramp(t, t1 - 0.18, 0.18), P = L.picked, fr = skin.dir.frame;
  const disp = FONT[skin.display], dw = fw(skin.display, skin.weight);
  const kicker = d.kicker ? <div style={{ position: "absolute", left: 120 * s, top: 100 * s, fontFamily: FONT.mono, fontSize: 24 * s, letterSpacing: 4 * s, color: skin.accent, opacity: ramp(t, t0, 0.3) * out }}>{up(d.kicker)}</div> : null;
  switch (L.shot) {
    case "photo": {
      if (fr !== "bleed") { const b = fitBox(W, H, P?.aspect ?? 1.5), left = skin.dir.caption === "margin" ? W * 0.32 + (W * 0.64 - b.w) / 2 : (W - b.w) / 2;
        return (<><Ground c={c} />{pic(c, P, b.w, b.h, { style: { left, top: (H - b.h) / 2 - 40 * s }, frame: fr })}{kicker}<Caption c={c} plate={false} side box={{ textAlign: skin.dir.caption === "lower" ? "center" : undefined, bottom: 54 * s }} /></>); }
      const side = d.text ?? "bottom", cm = skin.dir.caption;
      return (<>
        {pic(c, P, W, H)}
        {cm === "lower" && side !== "none" && <div style={{ position: "absolute", inset: 0, background: side === "left" ? `linear-gradient(90deg, ${skin.bg}f2 0%, ${skin.bg}d9 38%, ${skin.bg}00 62%)` : `linear-gradient(0deg, ${skin.bg}ee 0%, ${skin.bg}b3 20%, ${skin.bg}00 36%)` }} />}
        {cm === "kinetic" && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,0) 55%)" }} />}
        {cm === "margin" && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: W * 0.34, background: `${skin.bg}e6` }} />}
        {cm === "lower" ? (side === "none" ? null : side === "left" ? <div style={{ position: "absolute", left: 110 * s, top: H * 0.35, width: W * 0.42 }}><Words words={words} t={t} skin={skin} size={(d.size ?? 60) * s} up={up} out={out} /></div> : <Caption c={c} size={d.size ?? 60} plate={false} box={{ bottom: 100 * s }} />) : <Caption c={c} onPic side />}
        {kicker}
      </>);
    }
    case "montage": {   // a run of full-bleed shots cut on the narrator's words (d.cuts = word indices where each next shot starts; default evenly)
      const pics = [P, ...(L.extra ?? [])].filter(Boolean) as Pic[], n = pics.length;
      const at = (d.cuts as number[] | undefined)?.map((wi) => words[Math.min(words.length - 1, wi)]?.[1] ?? t0) ?? pics.map((_, j) => t0 + ((t1 - t0) * j) / n);
      let j = 0; for (let q = 0; q < n; q++) if (t >= (q === 0 ? -1e9 : at[q] - 0.05)) j = q;
      const a0 = j === 0 ? t0 : at[j] - 0.05, a1 = j + 1 < n ? at[j + 1] - 0.05 : t1, sub: Ctx = { ...c, t0: a0, t1: a1, seed: c.seed + j * 13 };
      return (<>{pic(sub, pics[j], W, H, { i: j, enter: j === 0 ? undefined : "cut" })}{skin.dir.caption !== "none" && <Caption c={c} onPic side />}{kicker}</>);
    }
    case "detail": {  // the whole picture, then the camera dives into one region that gets ringed and labelled
      const [x0, y0, x1, y1] = d.region ?? [0.4, 0.4, 0.6, 0.6], dive = easeInOut(ramp(t, t0 + (d.dive_at ?? 0.6), 1.2));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, zoom = (1 + dive * (Math.min(1 / (x1 - x0), 1 / (y1 - y0)) * 0.55 - 1)) * (1 + 0.08 * k), ring = ramp(t, t0 + (d.dive_at ?? 0.6) + 1.1, 0.5), mark = d.mark ?? ["ring", "bracket", "arrow"][c.seed % 3];
      return (<>
        {pic(c, P, W, H, { from: [cx, cy, zoom], to: [cx, cy, zoom], camera: "kenburns" })}
        <svg width={W} height={H} style={{ position: "absolute" }}>
          {mark === "ring" && <ellipse cx={W / 2} cy={H / 2} rx={W * 0.27} ry={H * 0.3} fill="none" stroke={skin.accent} strokeWidth={8 * s} pathLength={1} strokeDasharray={`${ring} 1`} transform={`rotate(-8 ${W / 2} ${H / 2})`} />}
          {mark === "bracket" && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <path key={i} d={`M${W / 2 + a * W * 0.26},${H / 2 + b * (H * 0.3 - 90 * s)} v${b * 90 * s} h${-a * 90 * s}`} fill="none" stroke={skin.accent} strokeWidth={9 * s} opacity={ring} transform={`translate(${a * (1 - ring) * 60 * s} ${b * (1 - ring) * 60 * s})`} />)}
          {mark === "arrow" && <g opacity={ring}><path d={`M${W * 0.8},${H * 0.2} Q${W * 0.72},${H * 0.3} ${W * 0.6},${H * 0.42}`} fill="none" stroke={skin.accent} strokeWidth={9 * s} pathLength={1} strokeDasharray={`${ring} 1`} strokeLinecap="round" /><path d={`M${W * 0.6},${H * 0.42} l${46 * s},${-8 * s} m${-46 * s},${8 * s} l${14 * s},${-44 * s}`} fill="none" stroke={skin.accent} strokeWidth={9 * s} strokeLinecap="round" /></g>}
        </svg>
        {d.label && <div style={{ position: "absolute", left: W * (mark === "arrow" ? 0.74 : 0.62), top: H * (mark === "arrow" ? 0.11 : 0.2), background: skin.accent, color: light(skin.accent) ? "#111" : "#fff", fontFamily: disp, fontWeight: dw, fontSize: 40 * s, padding: `${6 * s}px ${18 * s}px`, opacity: ring, transform: `rotate(-3deg)` }}>{up(d.label)}</div>}
        <Caption c={c} size={46} onPic />
      </>);
    }
    case "split": {
      const right = d.photo_side !== "left", pw = W * (d.ratio ?? 0.52), wipe = PRESS(ramp(t, t0 - 0.1, 0.5));
      return (<>
        <Ground c={c} dim />
        {fr === "bleed" ? pic(c, P, pw, H, { style: { left: right ? W - pw : 0, clipPath: skin.dir.enter === "cut" ? `inset(0 ${right ? 0 : (1 - wipe) * 100}% 0 ${right ? (1 - wipe) * 100 : 0}%)` : undefined } })
          : (() => { const b = fitBox(pw, H, P?.aspect ?? 1.2, 0.86, 0.76); return pic(c, P, b.w, b.h, { style: { left: (right ? W - pw : 0) + (pw - b.w) / 2, top: (H - b.h) / 2 }, frame: fr }); })()}
        <div style={{ position: "absolute", left: right ? 120 * s : pw + 90 * s, width: W - pw - 210 * s, top: H * 0.32, lineHeight: 1.18 }}><Words words={words} t={t} skin={skin} size={(d.size ?? 58) * s} up={up} out={out} mode={skin.dir.caption === "karaoke" ? "karaoke" : skin.dir.caption === "typewriter" ? "typewriter" : "reveal"} /></div>
        {kicker && <div style={{ position: "absolute", left: right ? 120 * s : pw + 90 * s, top: H * 0.24 }}>{kicker}</div>}
      </>);
    }
    case "compare": {   // two pictures, a divider that draws, labels that land on their words
      const b = L.extra?.[0], dv = PRESS(ramp(t, t0, 0.5)), boxed = fr !== "bleed", bw = boxed ? W * 0.4 : W / 2 - 4, bh = boxed ? H * 0.62 : H;
      return (<>
        <Ground c={c} dim />
        {pic(c, P, bw, bh, { style: { left: boxed ? W * 0.07 : 0, top: boxed ? H * 0.14 : 0 }, frame: fr, i: 0 })}
        {pic(c, b, bw, bh, { style: { left: boxed ? W * 0.53 : W / 2 + 4, top: boxed ? H * 0.14 : 0 }, frame: fr, i: 1, delay: 0.35 })}
        {!boxed && <div style={{ position: "absolute", left: W / 2 - 4, top: 0, width: 8, height: H * dv, background: skin.accent }} />}
        {boxed && <div style={{ position: "absolute", left: W / 2 - 46 * s, top: H * 0.4, width: 92 * s, height: 92 * s, borderRadius: "50%", background: skin.accent, color: light(skin.accent) ? "#111" : "#fff", fontFamily: disp, fontWeight: dw, fontSize: 34 * s, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${easeOutBack(ramp(t, t0 + 0.5, 0.35))})` }}>VS</div>}
        {[d.left_label, d.right_label].map((lb: string, i: number) => lb && <div key={i} style={{ position: "absolute", left: i ? W / 2 + 60 * s : 60 * s, top: 56 * s, fontFamily: disp, fontWeight: dw, fontSize: 64 * s, color: skin.fg, background: `${skin.bg}cc`, padding: `${4 * s}px ${16 * s}px`, opacity: ramp(t, t0 + 0.3 + i * 0.5, 0.25) }}>{up(lb)}</div>)}
        <Caption c={c} box={{ textAlign: "center" }} />
      </>);
    }
    case "number": {   // a number that counts on its spoken word, unit, a context line; the picture (if any) sits dark behind
      const v = Number(d.value ?? 0), at = d.at ?? t0 + 0.2, u = easeOutCubic(ramp(t, at, d.dur ?? 0.9)), dec = d.decimals ?? 0, mode = d.mode ?? ["count", "odometer", "slam"][c.seed % 3];
      const txt = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: d.grouping ?? !(Number.isInteger(v) && v >= 1000 && v <= 2100) });
      const land = ramp(t, at, 0.22);
      return (<>
        <Ground c={c} dim />
        {P && pic(c, P, W, H, { style: { opacity: 0.3 } })}
        {P && <div style={{ position: "absolute", inset: 0, background: `${skin.bg}88` }} />}
        <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.18, textAlign: "center", fontFamily: disp, fontWeight: dw, fontSize: 340 * s, color: skin.accent, lineHeight: 1, textShadow: skin.glow ? `0 0 ${30 * s}px ${skin.accent}` : undefined,
          transform: mode === "slam" ? `scale(${(2.2 - 1.2 * easeOutCubic(land)) * (1 + 0.07 * k)})` : `scale(${1 + 0.07 * k})`, opacity: mode === "slam" ? Math.min(1, land * 3) : 1 }}>
          {d.prefix ?? ""}{mode === "odometer"
            ? txt(v).split("").map((ch, i, arr) => <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - easeOutBack(ramp(t, at + (arr.length - i) * 0.07, 0.4))) * -120 * s}px)`, opacity: ramp(t, at + (arr.length - i) * 0.07, 0.15) }}>{ch}</span>)
            : txt(mode === "slam" ? v : v * u)}{d.suffix ?? ""}</div>
        {d.unit && <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.56, textAlign: "center", fontFamily: FONT.mono, fontSize: 34 * s, letterSpacing: 6 * s, color: skin.fg, opacity: ramp(t, at + 0.6, 0.3) }}>{up(d.unit)}</div>}
        <Caption c={c} plate={false} box={{ left: 160 * s, right: 160 * s, bottom: 100 * s, textAlign: "center" }} />
      </>);
    }
    case "quote": {
      return (<>
        <Ground c={c} dim />
        {P && pic(c, P, W * 0.34, H, { style: { left: 0 } })}
        <div style={{ position: "absolute", left: P ? W * 0.4 : 160 * s, right: 140 * s, top: H * 0.18, fontFamily: FONT.playfair, fontSize: 260 * s, color: skin.accent, lineHeight: 0.6, transform: `scale(${1 + 0.1 * k})`, transformOrigin: "0 0" }}>“</div>
        <div style={{ position: "absolute", left: P ? W * 0.4 : 160 * s, right: 140 * s, top: H * 0.33, lineHeight: 1.3 }}><Words words={words} t={t} skin={{ ...skin, upper: false }} size={(P ? 56 : 74) * s} up={up} out={out} font={FONT[skin.text === "mono" || skin.text === "courier" ? skin.text : "playfair"]} weight={400} /></div>
        {d.source && <div style={{ position: "absolute", left: P ? W * 0.4 : 160 * s, top: H * 0.8, fontFamily: FONT.mono, fontSize: 26 * s, color: skin.dim, opacity: ramp(t, t1 - 1.6, 0.4) }}>— {d.source}</div>}
      </>);
    }
    case "document": {   // a real document; a highlight sweeps the region the line talks about
      const [x0, y0, x1, y1] = d.region ?? [0.15, 0.4, 0.85, 0.48], hk = easeOutCubic(ramp(t, d.at ?? t0 + 0.8, 0.6)), zoom = 1 + 0.45 * easeInOut(ramp(t, t0 + 0.2, 1.6)) + 0.25 * k;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a = P?.aspect ?? 0.75, ph = H * 0.92, pw = ph * a, mark = d.mark ?? ["highlight", "underline", "box"][c.seed % 3];
      return (<>
        <Ground c={c} dim />
        <div style={{ position: "absolute", left: (W - pw) / 2, top: (H - ph) / 2, width: pw, height: ph, transform: `scale(${zoom}) rotate(${((c.seed % 5) - 2) * 0.6}deg)`, transformOrigin: `${cx * 100}% ${cy * 100}%`, boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
          {pic(c, P, pw, ph, { camera: "locked", from: [0.5, 0.5, 1], enter: skin.dir.enter === "cut" ? "unfold" : skin.dir.enter })}
          {mark === "highlight" && <div style={{ position: "absolute", left: x0 * pw, top: y0 * ph, width: (x1 - x0) * pw * hk, height: (y1 - y0) * ph, background: "rgba(255,214,10,.45)", mixBlendMode: "multiply" }} />}
          {mark === "underline" && <div style={{ position: "absolute", left: x0 * pw, top: y1 * ph, width: (x1 - x0) * pw * hk, height: 5 * s, background: "#c4251f", transform: "rotate(-0.6deg)" }} />}
          {mark === "box" && <div style={{ position: "absolute", left: x0 * pw - 8, top: y0 * ph - 8, width: (x1 - x0) * pw + 16, height: (y1 - y0) * ph + 16, border: `${5 * s}px solid #c4251f`, clipPath: `inset(0 ${(1 - hk) * 100}% 0 0)` }} />}
        </div>
        <Caption c={c} size={42} />
      </>);
    }
    case "map": {   // a projected map framed to fit all stops; the route draws between them while the camera pushes in
      const m = c.maps[d.map]; if (!m) return null;
      const stops: string[] = (d.stops ?? Object.keys(m.places)).filter((n: string) => m.places[n]), Pt = stops.map((n) => m.places[n]);
      const xs = Pt.map((p) => p[0]), ys = Pt.map((p) => p[1]), [bx0, by0, bx1, by1] = m.bounds;
      const dx = Math.max(...xs) - Math.min(...xs), dy = Math.max(...ys) - Math.min(...ys);
      const fit = Math.min((W * 0.6) / Math.max(1, dx), (H * 0.62) / Math.max(1, dy), d.max_zoom ?? 4), floor = Math.max(W / (bx1 - bx0), H / (by1 - by0));
      const z = Math.max(Math.min(floor, fit), fit * (0.9 + 0.14 * easeInOut(k))), half = [W / 2 / z, H / 2 / z];
      const keep = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v))), cxw = keep((Math.min(...xs) + Math.max(...xs)) / 2, bx0 + half[0], bx1 - half[0]), cyw = keep((Math.min(...ys) + Math.max(...ys)) / 2, by0 + half[1], by1 - half[1]);
      const draw = easeInOut(ramp(t, t0 + 0.5, Math.max(0.8, (t1 - t0) * 0.6))), u = 1 / z, look = d.look ?? (light(skin.bg) ? "paper" : "night");
      const water = d.water ?? (look === "night" ? "#0d1b2a" : look === "ink" ? skin.bg : "#9cc9d4"), land = d.land ?? (look === "night" ? "#1f3347" : look === "ink" ? "transparent" : "#efe8d8"), line = look === "night" ? "rgba(160,200,255,.35)" : look === "ink" ? skin.fg : "rgba(40,30,20,.35)";
      const arc = Pt.length === 2 && d.arc !== false ? `M${Pt[0][0]},${Pt[0][1]} Q${(Pt[0][0] + Pt[1][0]) / 2 + (Pt[1][1] - Pt[0][1]) * 0.18},${(Pt[0][1] + Pt[1][1]) / 2 - (Pt[1][0] - Pt[0][0]) * 0.18} ${Pt[1][0]},${Pt[1][1]}` : Pt.map((p, q) => `${q ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
      return (<>
        <div style={{ position: "absolute", inset: 0, background: water }} />
        <svg width={W} height={H} style={{ position: "absolute" }}><defs><clipPath id="sf-mapclip"><rect x={bx0} y={by0} width={bx1 - bx0} height={by1 - by0} /></clipPath></defs>
          <g transform={`translate(${W / 2} ${H / 2}) scale(${z}) translate(${-cxw} ${-cyw})`}><g clipPath="url(#sf-mapclip)">
          {Object.entries(m.regions).map(([n, dd]) => <path key={n} d={dd} fill={(d.highlight ?? []).includes(n) ? skin.accent : land} stroke={line} strokeWidth={(look === "ink" ? 2.5 : 1.5) * u} />)}</g>
          <path d={arc} fill="none" stroke={skin.accent} strokeWidth={8 * s * u} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          {stops.map((n, q) => { const p = Pt[q], left = Pt.length > 1 && dx > dy && q === xs.indexOf(Math.min(...xs)), a = ramp(t, t0 + 0.2 + q * Math.max(0.4, (t1 - t0) * 0.5), 0.3);
            return <g key={n} opacity={a}><circle cx={p[0]} cy={p[1]} r={(26 + 30 * ((t * 0.8 + q * 0.3) % 1)) * s * u} fill="none" stroke={skin.accent} strokeWidth={3 * s * u} opacity={1 - ((t * 0.8 + q * 0.3) % 1)} />
              <circle cx={p[0]} cy={p[1]} r={12 * s * u} fill={look === "night" ? "#fff" : skin.fg} stroke="#fff" strokeWidth={3 * s * u} />
              <text x={p[0] + (left ? -24 : 24) * s * u} y={p[1] + 13 * s * u} textAnchor={left ? "end" : "start"} fontFamily={disp} fontWeight={dw} fontSize={40 * s * u} fill={look === "night" ? "#fff" : "#1d1a16"} stroke={look === "night" ? "#0d1b2a" : "#fff"} strokeWidth={6 * s * u} paintOrder="stroke">{up(n)}</text></g>; })}
        </g></svg>
        {d.kicker && <div style={{ position: "absolute", left: 120 * s, top: 90 * s, fontFamily: FONT.mono, fontSize: 26 * s, letterSpacing: 5 * s, color: "#1d1a16", background: "#ffffffcc", padding: `${4 * s}px ${12 * s}px` }}>{up(d.kicker)}</div>}
        <Caption c={c} size={42} />
      </>);
    }
    case "timeline": {   // years on a line; a playhead travels to the year this line is about
      const yrs: number[] = d.years ?? [], cur = Number(d.current ?? yrs[yrs.length - 1]), vertical = (d.axis ?? (c.seed % 2 ? "x" : "y")) === "y" && yrs.length <= 5;
      const ci = Math.max(0, yrs.indexOf(cur)), ph = easeInOut(ramp(t, t0 + 0.7, Math.max(1, (t1 - t0) * 0.55))) * ci, draw = PRESS(ramp(t, t0, 0.8));
      const pos = (i: number) => (vertical ? H * 0.16 + (i / Math.max(1, yrs.length - 1)) * H * 0.6 : 260 * s + (i / Math.max(1, yrs.length - 1)) * (W - 520 * s)), PH = pos(Math.floor(ph)) + (pos(Math.min(yrs.length - 1, Math.floor(ph) + 1)) - pos(Math.floor(ph))) * (ph - Math.floor(ph));
      return (<>
        <Ground c={c} dim />
        {P && pic(c, P, W * 0.42, H, { style: { right: 0, opacity: 0.9 } })}
        <svg width={W} height={H} style={{ position: "absolute", transform: `scale(${1 + 0.08 * k})`, transformOrigin: vertical ? "20% 50%" : `${(PH / W) * 100}% 50%` }}>
          {vertical ? <><line x1={W * 0.2} x2={W * 0.2} y1={H * 0.12} y2={H * 0.12 + H * 0.68 * draw} stroke={skin.dim} strokeWidth={4 * s} /><line x1={W * 0.2} x2={W * 0.2} y1={pos(0)} y2={PH} stroke={skin.accent} strokeWidth={8 * s} /></>
            : <><line x1={160 * s} x2={160 * s + (W - 320 * s) * draw} y1={H * 0.5} y2={H * 0.5} stroke={skin.dim} strokeWidth={4 * s} /><line x1={pos(0)} x2={PH} y1={H * 0.5} y2={H * 0.5} stroke={skin.accent} strokeWidth={8 * s} /></>}
          {yrs.map((y, i) => { const on = y === cur && ph >= ci - 0.02, a = ramp(t, t0 + 0.2 + i * 0.25, 0.3) * (i <= ph + 0.01 || i > ci ? 1 : 0.45), X = vertical ? W * 0.2 : pos(i), Y = vertical ? pos(i) : H * 0.5;
            return <g key={y} opacity={a}><circle cx={X} cy={Y} r={(on ? 22 + 6 * Math.sin(t * 5) : 12) * s} fill={on ? skin.accent : skin.fg} />
              <text x={vertical ? X + 50 * s : X} y={vertical ? Y + (on ? 36 : 18) * s : Y - 50 * s} textAnchor={vertical ? "start" : "middle"} fontFamily={disp} fontWeight={dw} fontSize={(on ? 120 : 54) * s} fill={on ? skin.accent : skin.fg}>{y}</text>
              {d.labels?.[i] && <text x={vertical ? X + (on ? 330 : 200) * s : X} y={vertical ? Y + 12 * s : Y + 70 * s} textAnchor={vertical ? "start" : "middle"} fontFamily={FONT.mono} fontSize={24 * s} fill={skin.dim}>{up(d.labels[i])}</text>}</g>; })}
        </svg>
        <Caption c={c} plate={false} box={{ left: 160 * s, right: P ? W * 0.46 : 160 * s, bottom: 80 * s }} />
      </>);
    }
    case "list": {
      const items: string[] = d.items ?? [], style = d.bullet ?? ["num", "check", "dash"][c.seed % 3];
      return (<>
        <Ground c={c} dim />
        {P && (fr === "bleed" ? pic(c, P, W * 0.4, H, { style: { right: 0 } }) : (() => { const b = fitBox(W * 0.42, H, P.aspect, 0.86, 0.7); return pic(c, P, b.w, b.h, { style: { right: (W * 0.42 - b.w) / 2 + 30 * s, top: (H - b.h) / 2 }, frame: fr }); })())}
        {items.map((it, i) => { const a = PRESS(ramp(t, (d.at?.[i] ?? t0 + 0.3 + i * 0.6) - 0.1, 0.35)); return (
          <div key={i} style={{ position: "absolute", left: 140 * s, top: H * 0.2 + i * 140 * s, display: "flex", alignItems: "center", gap: 30 * s, opacity: a, transform: `translateX(${(1 - a) * -60 * s}px)` }}>
            {style === "num" && <span style={{ fontFamily: FONT.mono, fontSize: 40 * s, color: skin.accent }}>{String(i + 1).padStart(2, "0")}</span>}
            {style === "check" && <svg width={64 * s} height={64 * s} viewBox="0 0 64 64"><rect x={4} y={4} width={56} height={56} rx={10} fill="none" stroke={skin.fg} strokeWidth={5} /><path d="M16 33 L28 45 L50 19" fill="none" stroke={skin.accent} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={`${ramp(t, (d.at?.[i] ?? t0 + 0.3 + i * 0.6) + 0.2, 0.25)} 1`} /></svg>}
            {style === "dash" && <span style={{ width: 54 * s, height: 10 * s, background: skin.accent, display: "inline-block" }} />}
            <span style={{ fontFamily: disp, fontWeight: dw, fontSize: 76 * s, color: skin.fg }}>{skin.upper ? up(it) : it}</span></div>); })}
        <Caption c={c} plate={false} box={{ left: 140 * s, right: W * 0.45, bottom: 80 * s }} />
      </>);
    }
    case "ratio": {   // a part of a whole: a ring fills to the fraction, the rest is marked lost/other
      const f = Number(d.fraction ?? 0.33), u = easeOutCubic(ramp(t, d.at ?? t0 + 0.3, 1.0)), R = 300 * s, C = 2 * Math.PI * R, rx = W * (P ? 0.75 : 0.5);
      return (<>
        <Ground c={c} dim />
        {P && pic(c, P, W * 0.42, H * 0.8, { style: { left: 120 * s, top: H * 0.1, clipPath: `inset(0 ${(1 - f) * 100}% 0 0)` }, enter: "cut" })}
        {P && pic(c, P, W * 0.42, H * 0.8, { style: { left: 120 * s, top: H * 0.1, opacity: 0.18, clipPath: `inset(0 0 0 ${f * 100}%)` }, treat: "bw", enter: "cut" })}
        <svg width={W} height={H} style={{ position: "absolute" }}>
          <circle cx={rx} cy={H * 0.45} r={R} fill="none" stroke={skin.dim} strokeWidth={60 * s} opacity={0.3} />
          <circle cx={rx} cy={H * 0.45} r={R} fill="none" stroke={skin.accent} strokeWidth={60 * s} strokeDasharray={`${C * f * u} ${C}`} transform={`rotate(${-90 + 8 * k} ${rx} ${H * 0.45})`} />
          <text x={rx} y={H * 0.45 + 50 * s} textAnchor="middle" fontFamily={disp} fontWeight={dw} fontSize={Math.min(150, 760 / Math.max(3, String(d.label ?? "000%").length)) * s} fill={skin.fg}>{d.label ?? `${Math.round(f * 100 * u)}%`}</text>
        </svg>
        <Caption c={c} plate={false} />
      </>);
    }
    case "title": {   // chapter card: big title in the display face, the line underneath
      const a = ramp(t, t0, 0.3), land = easeOutCubic(ramp(t, t0, 1.4)), push = 1.18 - 0.18 * land + 0.07 * k, title: string = (skin.upper ? up(d.title ?? "") : d.title) ?? "", mode = d.mode ?? ["track", "letters", "mask"][c.seed % 3];
      return (<>
        <Ground c={c} />
        {P && pic(c, P, W, H, { style: { opacity: 0.35 } })}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 42%" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.3, textAlign: "center", fontFamily: disp, fontWeight: dw, fontSize: (d.size ?? 150) * s, color: skin.fg, letterSpacing: (4 + (mode === "track" ? 40 * (1 - land) : 0)) * s, opacity: a, filter: mode === "track" ? `blur(${(1 - land) * 6 * s}px)` : undefined,
            clipPath: mode === "mask" ? `inset(0 ${(1 - PRESS(ramp(t, t0, 0.7))) * 100}% 0 0)` : undefined, textShadow: skin.glow ? `0 0 ${30 * s}px ${skin.fg}` : undefined }}>
            {mode === "letters" ? title.split("").map((ch, i) => <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${(1 - easeOutBack(ramp(t, t0 + i * 0.04, 0.4))) * 90 * s}px)`, opacity: ramp(t, t0 + i * 0.04, 0.15) }}>{ch}</span>) : title}</div>
          <div style={{ position: "absolute", left: W * 0.3, right: W * 0.3, top: H * 0.56, height: 3 * s, background: skin.accent, transform: `scaleX(${PRESS(ramp(t, t0 + 0.3, 0.5))})` }} />
          <div style={{ position: "absolute", left: 200 * s, right: 200 * s, top: H * 0.64, textAlign: "center", lineHeight: 1.25 }}><Words words={words} t={t} skin={skin} size={40 * s * (skin.text === "hand" ? 1.3 : 1)} up={up} out={out} /></div>
        </div>
      </>);
    }
    case "stamp": {   // the picture, then a stamp slams on the spoken word
      const at = d.at ?? (words.length ? words[words.length - 1][1] : t1 - 1.2), u = ramp(t, at, 0.16), dark = !light(skin.bg), boxed = fr !== "bleed", b = fitBox(W, H, P?.aspect ?? 1.5);
      return (<>
        {boxed && <Ground c={c} />}
        {boxed ? pic(c, P, b.w, b.h, { style: { left: (W - b.w) / 2, top: (H - b.h) / 2 - 40 * s }, frame: fr }) : pic(c, P, W, H)}
        {t >= at && <div style={{ position: "absolute", left: W * (d.x ?? 0.5), top: H * (d.y ?? 0.42), transform: `translate(-50%,-50%) rotate(${d.rot ?? -9}deg) scale(${1.7 - 0.7 * easeOutCubic(u)})`, border: `${10 * s}px solid ${d.color ?? "#c4251f"}`, color: d.color ?? "#c4251f",
          fontFamily: FONT.oswald, fontWeight: 700, fontSize: 130 * s, letterSpacing: 10 * s, padding: `${4 * s}px ${30 * s}px`, opacity: 0.92 * Math.min(1, u * 4), mixBlendMode: dark ? "normal" : "multiply", background: dark ? "rgba(0,0,0,.35)" : undefined }}>{up(d.text ?? "")}</div>}
        <Caption c={c} onPic={!boxed} />
      </>);
    }
    case "collage": {   // up to four pictures arrive one per beat, each in the act's frame
      const all = [P, ...(L.extra ?? [])].filter(Boolean) as Pic[], n = Math.min(4, all.length), fr2 = fr === "bleed" ? "print" : fr;
      const slot = (i: number) => n === 2 ? { x: 0.06 + i * 0.46, y: 0.1 + i * 0.05, w: 0.42 } : n === 3 ? { x: 0.05 + i * 0.31, y: 0.1 + (i % 2) * 0.08, w: 0.28 } : { x: 0.05 + (i % 2) * 0.47 + (i > 1 ? 0.03 : 0), y: 0.05 + Math.floor(i / 2) * 0.4, w: 0.34 };
      return (<>
        <Ground c={c} dim />
        {all.slice(0, n).map((p, i) => { const g = slot(i), w = W * g.w, h = Math.min(w / Math.max(0.6, Math.min(2, p.aspect)), H * (n > 3 ? 0.36 : 0.62)); return <React.Fragment key={i}>{pic(c, p, w, h, { style: { left: W * g.x, top: H * g.y }, frame: fr2, i, delay: i * 0.45, enter: skin.dir.enter === "cut" ? "drop" : skin.dir.enter })}</React.Fragment>; })}
        <Caption c={c} plate={false} />
      </>);
    }
  }
  return null;
}
