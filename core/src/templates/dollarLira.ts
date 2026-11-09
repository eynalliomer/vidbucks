// "Dollar up, lira down" Short - ObjectStory config. Reference: an editorial object-metaphor Short (link-only visual pass).
// Beat grid 90 BPM (0.667 s): split = beat 4, piggy = beat 8, cut to the dark stage = beat 12. Caption times = word times of vo_spaced.wav.
import type { ObjectStoryConfig } from "./ObjectStory";

const V = "videos/dollar-lira";

export const dollarLira: ObjectStoryConfig = {
  width: 1080, height: 1920, fps: 30, durationSec: 14,
  paper: { center: "#dedcd8", mid: "#bdbbb7", edge: "#8f8d8a", ink: "#0b0b0b", small: "#6c6c6c" },
  stage: { bg: "#0a0a0a", glow: "#181817", fg: "#f1f1ef" },
  images: {
    portrait: `${V}/frame.jpg`,
    objectA: { src: `${V}/coin.png`, w: 560, h: 560 },
    objectB: { src: `${V}/piggy.png`, w: 640, h: 582 },
    stageObject: { src: `${V}/coin.png`, w: 780, h: 780 },
  },
  t: { frameIn: 0.0, split: 2.67, eyeIn: 5.33, cut: 8.0, lockupAt: 99 },
  captions: [
    { small: [["the", 0.75], ["dollar", 1.12]], big: "climbs", bigAt: 1.42, end: 2.55, on: "paper", x: 100, y: 0.2 },
    { small: [["the", 3.0], ["lira", 3.51]], big: "melts", bigAt: 3.81, end: 5.2, on: "paper", x: 100, y: 0.29 },
    { small: [["same", 5.6], ["salary", 6.33], ["buys", 6.89]], big: "less", bigAt: 7.19, end: 7.8, on: "paper", x: 100, y: 0.245 },
    { small: [["it's", 8.49], ["not", 8.85], ["just", 8.99], ["the", 9.23]], big: "rate", bigAt: 9.41, end: 10.0, on: "stage", y: 0.29 },
    { small: [["it's", 10.29], ["your", 10.53], ["buying", 10.65]], big: "power", bigAt: 11.01, end: 13.3, on: "stage", y: 0.22 },
  ],
  stageGrid: true,
  audio: {
    voice: `${V}/vo_spaced.wav`,
    music: `${V}/pulse.wav`, musicVolume: 0.18,
    sfx: [
      [0.2, "audio-lib/sfx/synth_paper/synth-pageturn-02.mp3", 0.35],
      [2.6, "audio-lib/sfx/synth_whoosh/synth-whoosh-03.mp3", 0.5],
      [5.25, "audio-lib/sfx/synth_whoosh/synth-whoosh-02.mp3", 0.4],
      [6.5, "audio-lib/sfx/synth_riser/synth-riser-01.mp3", 0.3],
      [8.0, "audio-lib/sfx/synth_impact/synth-impact-03.mp3", 0.6],
    ],
  },
};
