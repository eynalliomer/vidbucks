// Looks = a board and a finish; every item works on every look.
export type Look = { bg: string; board: string; grain: number; grainAlpha: number; grainMatrix: string; ink: string; paper: string; card: string; cardInk: string; mapInk: string; mapHalo: string };
const m = (r: number, g: number, b: number, a = 0.9) => `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${a} 0`;
export const LOOKS = {
  wall: { bg: "#1b1410", board: "#4a3523", grain: 0.012, grainAlpha: 0.55, grainMatrix: m(0.22, 0.15, 0.09), ink: "#f4f0e8", paper: "#efe9dc", card: "#f3eee4", cardInk: "#221e1a", mapInk: "#f4efe6", mapHalo: "rgba(30,22,16,.85)" },
  slate: { bg: "#111315", board: "#262a2e", grain: 0.02, grainAlpha: 0.45, grainMatrix: m(0.12, 0.13, 0.14), ink: "#eef0f2", paper: "#e9e6df", card: "#e9e7e2", cardInk: "#1a1c1e", mapInk: "#f2f2f2", mapHalo: "rgba(10,12,14,.85)" },
  studio: { bg: "#e9e6e0", board: "#efece6", grain: 0.008, grainAlpha: 0.12, grainMatrix: m(0.6, 0.58, 0.55, 0.5), ink: "#22201e", paper: "#ffffff", card: "#ffffff", cardInk: "#22201e", mapInk: "#22201e", mapHalo: "rgba(255,255,255,.85)" },
  charcoal: { bg: "#151515", board: "#232323", grain: 0.015, grainAlpha: 0.35, grainMatrix: m(0.1, 0.1, 0.1), ink: "#f2f2f2", paper: "#f2efe8", card: "#2e2e2e", cardInk: "#f2f2f2", mapInk: "#f2f2f2", mapHalo: "rgba(0,0,0,.8)" },
  blueprint: { bg: "#0d2a52", board: "#123a6e", grain: 0.006, grainAlpha: 0.25, grainMatrix: m(0.3, 0.45, 0.7, 0.6), ink: "#e8f1ff", paper: "#e8f1ff", card: "#164784", cardInk: "#e8f1ff", mapInk: "#e8f1ff", mapHalo: "rgba(13,42,82,.85)" },
  paper: { bg: "#e8e0cf", board: "#efe7d6", grain: 0.03, grainAlpha: 0.25, grainMatrix: m(0.55, 0.48, 0.38, 0.6), ink: "#2a2420", paper: "#fbf8f1", card: "#fbf8f1", cardInk: "#2a2420", mapInk: "#2a2420", mapHalo: "rgba(251,248,241,.85)" },
  night: { bg: "#05070d", board: "#0b1020", grain: 0.01, grainAlpha: 0.4, grainMatrix: m(0.05, 0.07, 0.14), ink: "#eaf2ff", paper: "#dfe6f2", card: "#121a33", cardInk: "#eaf2ff", mapInk: "#eaf2ff", mapHalo: "rgba(5,7,13,.85)" },
} satisfies Record<string, Look>;
export type LookName = keyof typeof LOOKS;
