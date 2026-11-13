// MultiStyle: one film, any number of styles (one or many - the style director decides from the content).
// edit.json = segments over ONE narration timeline; each segment names a renderer (board | layers | type | swiss-dance | shots)
// and its data. Segments get their lines re-based to local time, so every kit runs unchanged inside its <Sequence>.
// Transitions between styles: cut · fade · wipe · knife · flash · iris (chosen per pair by the director).
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BoardFilm, BoardCfg, MapData } from "../board/BoardFilm";
import { LayerScene, LayerCfg } from "../layers/LayerScene";
import { TypeCards, TypeCardsCfg } from "../type/TypeCards";
import { SwissDance } from "../swiss/Swiss";
import { ShotFilm, Visuals } from "../shots/ShotFilm";
import { KitTiming, PRESS, clamp } from "../time";

export type Transition = { kind: "cut" | "fade" | "wipe" | "knife" | "flash" | "iris"; dur?: number };
export type Segment = {
  id: string; start: number; end: number; lines: number[]; style: string; renderer: "board" | "layers" | "type" | "swiss-dance" | "shots";
  data: unknown; transition?: Transition; reason?: string;
};
export type Edit = { width: number; height: number; fps: number; duration: number; audio?: { src: string; gain?: number }; segments: Segment[]; maps?: Record<string, MapData> };

/** lines of this segment, moved to local time (segment start = 0) */
export function localTiming(timing: KitTiming, seg: Segment): KitTiming {
  const s = seg.start;
  return { ...timing, duration: seg.end - seg.start, lines: timing.lines.filter((l) => seg.lines.includes(l.id)).map((l) => ({ ...l, start: l.start - s, end: l.end - s, words: l.words?.map(([w, a, b]) => [w, a - s, b - s] as [string, number, number]) })) };
}

const Enter: React.FC<{ tr?: Transition; children: React.ReactNode }> = ({ tr, children }) => {
  const f = useCurrentFrame(), { fps, width: W, height: H } = useVideoConfig(), t = f / fps, d = tr?.dur ?? 0.4, k = PRESS(clamp(t / d));
  if (!tr || tr.kind === "cut" || k >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  if (tr.kind === "fade") return <AbsoluteFill style={{ opacity: k }}>{children}</AbsoluteFill>;
  if (tr.kind === "wipe") return <AbsoluteFill style={{ clipPath: `inset(0 ${100 - k * 100}% 0 0)` }}>{children}</AbsoluteFill>;
  if (tr.kind === "iris") return <AbsoluteFill style={{ clipPath: `circle(${k * 75}% at 50% 50%)` }}>{children}</AbsoluteFill>;
  if (tr.kind === "knife") return (<AbsoluteFill>
    <AbsoluteFill style={{ clipPath: `inset(${50 - k * 50}% 0 ${50 - k * 50}% 0)` }}>{children}</AbsoluteFill>
    {k < 0.98 && <div style={{ position: "absolute", left: 0, top: H / 2 - 1, width: W, height: 2, background: "#ff5a00", opacity: 1 - k }} />}
  </AbsoluteFill>);
  return (<AbsoluteFill>{children}<AbsoluteFill style={{ background: "#fff", opacity: 1 - clamp(t / d) }} /></AbsoluteFill>);   // flash
};

export const MultiStyle: React.FC<{ edit: Edit; timing: KitTiming }> = ({ edit, timing }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {edit.segments.map((seg, i) => {
        const from = Math.round(seg.start * fps), next = edit.segments[i + 1], overlap = next?.transition && next.transition.kind !== "cut" ? next.transition.dur ?? 0.4 : 0;
        const dur = Math.max(1, Math.round((seg.end - seg.start + overlap) * fps)), lt = localTiming(timing, seg), sec = seg.end - seg.start + overlap;
        let body: React.ReactNode = null;
        if (seg.renderer === "board") body = <BoardFilm cfg={{ ...(seg.data as BoardCfg), maps: { ...(edit.maps ?? {}), ...((seg.data as BoardCfg).maps ?? {}) } }} timing={lt} durationSec={sec} />;
        else if (seg.renderer === "layers") body = <LayerScene cfg={seg.data as LayerCfg} />;
        else if (seg.renderer === "type") body = <TypeCards cfg={seg.data as TypeCardsCfg} timing={lt} durationSec={sec} />;
        else if (seg.renderer === "swiss-dance") body = <SwissDance timing={lt} />;
        else if (seg.renderer === "shots") body = <ShotFilm visuals={{ ...(seg.data as Visuals), maps: { ...(edit.maps ?? {}), ...((seg.data as Visuals).maps ?? {}) } }} timing={lt} durationSec={sec} />;
        return <Sequence key={seg.id} from={from} durationInFrames={dur} name={`${seg.id} · ${seg.style}`}><Enter tr={i ? seg.transition : undefined}>{body}</Enter></Sequence>;
      })}
      {edit.audio && <Audio src={staticFile(edit.audio.src)} volume={edit.audio.gain ?? 1} />}
    </AbsoluteFill>
  );
};
