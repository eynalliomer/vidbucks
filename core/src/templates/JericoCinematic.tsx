// "JericoCinematic": 4K final cut. Alternates AI-generated cinematic 3D transitions (Higgsfield / MiniMax H3, keyframed on our own
// renders so every cut is a match cut) with the crisp code-drawn UI segments of JericoLaptop rendered at 4K (ui4k.mp4).
// Segment list = the edit decision list; each entry plays [from, from+len) of its source at `rate`.
import React from "react";
import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { AudioLayer, CL } from "./kit";
import { T } from "./LaptopGlass";

const V = "videos/jerico-cine";
type Seg = { src: string; from: number; len: number; rate?: number; label: string };
// len = seconds of SOURCE used; on-screen duration = len / rate
export const EDL: Seg[] = [
  { src: `${V}/clipA2.mp4`, from: 0.0, len: 5.0, label: "A2 macro edge -> pull-out orbit (AI)" },
  { src: `${V}/clipA.mp4`, from: 0.15, len: 4.7, rate: 1.6, label: "A panels settle back (AI)" },
  { src: `${V}/clipB.mp4`, from: 0.0, len: 5.0, rate: 1.25, label: "B dive into the screen (AI)" },
  { src: `${V}/ui4k.mp4`, from: 3.5, len: 1.1, label: "UI spec + planner + approve bar" },
  { src: `${V}/clipE.mp4`, from: 0.0, len: 5.0, rate: 1.25, label: "E approve -> UI tilts into the DAG (AI)" },
  { src: `${V}/ui4k.mp4`, from: 6.17, len: 1.83, label: "UI approval gate -> dispatch" },
  { src: `${V}/clipC.mp4`, from: 0.0, len: 5.0, rate: 1.25, label: "C fly into the fleet (AI)" },
  { src: `${V}/clipF.mp4`, from: 0.0, len: 3.6, rate: 1.1, label: "F packet races across the machines (AI)" },
  { src: `${V}/clipG.mp4`, from: 0.0, len: 5.0, rate: 1.1, label: "G pull out of the screen -> laptop + logo (AI)" },
  { src: `${V}/clipD.mp4`, from: 0.0, len: 4.8, label: "D hero finale (AI)" },
];
const FPS = 30;
const starts = EDL.reduce<number[]>((a, s, i) => [...a, i === 0 ? 0 : a[i - 1] + EDL[i - 1].len / (EDL[i - 1].rate ?? 1)], []);
export const CINE_SEC = starts[EDL.length - 1] + EDL[EDL.length - 1].len / (EDL[EDL.length - 1].rate ?? 1);
const at = (seg: number, srcT: number) => starts[seg] + (srcT - EDL[seg].from) / (EDL[seg].rate ?? 1);   // source time -> final time

export const JericoCinematic: React.FC = () => {
  const f = useCurrentFrame(); const t = f / FPS;
  const XF = 0.2; // short cross-dissolve at every join to hide sub-frame mismatches
  const W = "audio-lib/sfx/synth_whoosh/synth-whoosh-", U = "audio-lib/sfx/synth_ui/synth-";
  const sfx: [number, string, number][] = [
    [0.0, "audio-lib/sfx/synth_swell/synth-swell-02.mp3", 0.35], [0.9, `${W}06.mp3`, 0.5], [2.2, `${U}pop-01.mp3`, 0.35], [2.5, `${U}pop-02.mp3`, 0.35],
    [starts[1] + 0.2, `${W}01.mp3`, 0.3], [starts[2], `${W}08.mp3`, 0.5], [starts[2] + 2.6, `${U}blip-01.mp3`, 0.45],
    [starts[3] + 0.6, `${U}bubble-02.mp3`, 0.45], [starts[4] + 0.25, `${U}click-01.mp3`, 0.6], [starts[4] + 0.6, `${W}02.mp3`, 0.45], [starts[4] + 3.4, `${U}bubble-01.mp3`, 0.4],
    [at(5, T.rec), `${U}pop-03.mp3`, 0.5], [at(5, T.send), "audio-lib/sfx/synth_scifi/synth-powerup-01.mp3", 0.45],
    [starts[6], `${W}04.mp3`, 0.55], [starts[6] + 1.2, "audio-lib/sfx/synth_riser/synth-riser-01.mp3", 0.3],
    [starts[7], `${W}05.mp3`, 0.45], [starts[7] + 0.9, `${U}blip-02.mp3`, 0.5], [starts[7] + 1.7, `${U}blip-02.mp3`, 0.5], [starts[7] + 2.6, `${U}blip-01.mp3`, 0.5],
    [starts[8] + 0.2, "audio-lib/sfx/synth_chime/synth-chime-02.mp3", 0.35], [starts[8] + 1.6, `${W}03.mp3`, 0.45], [starts[8] + 2.9, "audio-lib/sfx/synth_chime/synth-sparkle-02.mp3", 0.4],
    [starts[9] + 0.2, "audio-lib/sfx/synth_impact/synth-impact-05.mp3", 0.3],
  ];
  return (
    <AbsoluteFill style={{ background: "#0b0b0b" }}>
      <AudioLayer fps={FPS} duration={Math.round(CINE_SEC * FPS)} cfg={{ music: `${V}/pulse.wav`, musicVolume: 0.5, sfx }} />
      {EDL.map((s, i) => {
        const r = s.rate ?? 1, dur = s.len / r, a = starts[i];
        const fadeIn = i === 0 ? 1 : interpolate(t, [a, a + XF], [0, 1], CL);
        return (
          <Sequence key={i} from={Math.round(a * FPS)} durationInFrames={Math.round((dur + (i < EDL.length - 1 ? XF : 0)) * FPS)}>
            <AbsoluteFill style={{ opacity: fadeIn }}>
              <OffthreadVideo src={staticFile(s.src)} startFrom={Math.round(s.from * FPS)} playbackRate={r} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.18) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(t, [CINE_SEC - 0.5, CINE_SEC], [0, 1], CL) }} />
    </AbsoluteFill>
  );
};
