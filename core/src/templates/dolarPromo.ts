// "Dolar" brand promo - HoloPromo config. Reference: an abstract holographic motion-design Short (link-only visual pass).
// Beat grid 120 BPM (0.5 s): every scene change sits on a beat; the ray burst lands on beat 16 (8.0 s), the logo on beat 19 (9.5 s).
import type { HoloPromoConfig } from "./HoloPromo";

const W = "audio-lib/sfx/synth_whoosh/synth-whoosh-";

export const dolarPromo: HoloPromoConfig = {
  width: 1080, height: 1920, fps: 30, durationSec: 12,
  bg: "#020806",
  holo: ["#19F59B", "#08C5C0", "#F4D35E", "#0E9F6E"],
  scenes: [
    { kind: "cone", from: 0, to: 1.0, word: "uncertain times" },
    { kind: "discs", from: 1.0, to: 2.5, word: "noisy markets" },
    { kind: "slab", from: 2.5, to: 4.0, word: "steady growth" },
    { kind: "tunnel", from: 4.0, to: 5.5, word: "clear focus" },
    { kind: "tower", from: 5.5, to: 7.0, word: "solid structure" },
    { kind: "bars", from: 7.0, to: 8.0, word: "smart decisions" },
    { kind: "burst", from: 8.0, to: 9.5, word: "total clarity" },
  ],
  logo: { text: "Dolar", sub: "Clarity for your money.", at: 9.5, dot: "#19F59B" },
  audio: {
    music: "videos/dolar-promo/pulse.wav", musicVolume: 0.5,
    sfx: [
      [0.0, `${W}05.mp3`, 0.4],
      [1.0, `${W}01.mp3`, 0.45], [1.75, "audio-lib/sfx/synth_ui/synth-pop-02.mp3", 0.5], [2.45, "audio-lib/sfx/synth_ui/synth-pop-03.mp3", 0.5],
      [2.5, `${W}07.mp3`, 0.45], [4.0, `${W}03.mp3`, 0.45], [5.5, `${W}02.mp3`, 0.45], [7.0, `${W}05.mp3`, 0.45],
      [6.5, "audio-lib/sfx/synth_riser/synth-riser-01.mp3", 0.35],
      [8.0, "audio-lib/sfx/synth_impact/synth-impact-03.mp3", 0.6],
      [9.5, "audio-lib/sfx/synth_chime/synth-sparkle-02.mp3", 0.45],
    ],
  },
};
