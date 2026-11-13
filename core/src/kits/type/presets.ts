// TypeCards presets: a style's palette, type, texture, ornament and motion grammar. One preset per graphic style.
// motion: snap (Swiss press-ease clip reveal) · type (typewriter) · flicker (neon/film strike) · slam (scale-in hit) ·
//         stamp (rotated ink stamp) · scroll (terminal line feed) · iris (silent-film iris open)
// texture: none · grain · halftone · scanlines · paper · dither · riso (misregistered second ink) · vignette-film
// ornament: none · grid · rules · bauhaus (circle/square/triangle blocks) · deco (fans, frames) · frame (double border) ·
//           burst (pop-art rays) · bars (spy-title slabs) · hud (corner brackets, ticks) · circuit (traces) · band (news lower third)
export type TypePreset = {
  bg: string; fg: string; accent: string; dim: string; font: "archivo" | "oswald" | "serif" | "mono" | "deco" | "hand" | "pixel";
  weight: number; upper: boolean; motion: "snap" | "type" | "flicker" | "slam" | "stamp" | "scroll" | "iris";
  texture: "none" | "grain" | "halftone" | "scanlines" | "paper" | "dither" | "riso" | "film";
  ornament: "none" | "grid" | "rules" | "bauhaus" | "deco" | "frame" | "burst" | "bars" | "hud" | "circuit" | "band";
  glow?: number; align?: "left" | "center";
};
const P = (o: TypePreset) => o;
export const TYPE_PRESETS: Record<string, TypePreset> = {
  "swiss-motion": P({ bg: "#F2F0EA", fg: "#141414", accent: "#FF5A00", dim: "#8A867D", font: "archivo", weight: 800, upper: false, motion: "snap", texture: "none", ornament: "grid", align: "left" }),
  "bauhaus-shapes": P({ bg: "#EFE8D8", fg: "#1A1A1A", accent: "#D7261E", dim: "#2B59A6", font: "archivo", weight: 800, upper: true, motion: "snap", texture: "paper", ornament: "bauhaus", align: "left" }),
  "pictogram-motion": P({ bg: "#FFFFFF", fg: "#111111", accent: "#0067B1", dim: "#9AA0A6", font: "archivo", weight: 700, upper: true, motion: "snap", texture: "none", ornament: "rules", align: "left" }),
  "art-deco": P({ bg: "#0E1A1F", fg: "#E9D8A6", accent: "#C9A44C", dim: "#7C6A3C", font: "deco", weight: 400, upper: true, motion: "slam", texture: "grain", ornament: "deco", align: "center" }),
  "spy-titles": P({ bg: "#111111", fg: "#F4EFE6", accent: "#E8492C", dim: "#8E8A82", font: "oswald", weight: 700, upper: true, motion: "slam", texture: "grain", ornament: "bars", align: "left" }),
  "pop-art": P({ bg: "#FFE100", fg: "#111111", accent: "#E4002B", dim: "#0072CE", font: "oswald", weight: 700, upper: true, motion: "slam", texture: "halftone", ornament: "burst", align: "center" }),
  "risograph": P({ bg: "#F4EEE3", fg: "#1D3C8F", accent: "#FF4F79", dim: "#9AA7C9", font: "archivo", weight: 800, upper: true, motion: "snap", texture: "riso", ornament: "none", align: "left" }),
  "halftone-dossier": P({ bg: "#E8E1D1", fg: "#1C1C1C", accent: "#B3261E", dim: "#6F6A60", font: "mono", weight: 700, upper: true, motion: "stamp", texture: "halftone", ornament: "frame", align: "left" }),
  "silkscreen-poster": P({ bg: "#F2D9A6", fg: "#1F3A5F", accent: "#E25A2C", dim: "#7A9CA8", font: "oswald", weight: 700, upper: true, motion: "snap", texture: "paper", ornament: "frame", align: "center" }),
  "woodcut": P({ bg: "#EDE4D0", fg: "#1A1410", accent: "#9C2A1E", dim: "#5A4C3C", font: "serif", weight: 700, upper: true, motion: "stamp", texture: "paper", ornament: "frame", align: "center" }),
  "engraving": P({ bg: "#F1EADB", fg: "#23201B", accent: "#6B4E2E", dim: "#8B7E68", font: "serif", weight: 400, upper: false, motion: "type", texture: "paper", ornament: "frame", align: "center" }),
  "ascii-crt": P({ bg: "#050805", fg: "#7CFF8A", accent: "#E7FFB0", dim: "#2E7A3A", font: "mono", weight: 400, upper: true, motion: "scroll", texture: "scanlines", ornament: "none", glow: 0.8, align: "left" }),
  "one-bit-dither": P({ bg: "#000000", fg: "#FFFFFF", accent: "#FFFFFF", dim: "#7F7F7F", font: "pixel", weight: 400, upper: true, motion: "type", texture: "dither", ornament: "frame", align: "left" }),
  "silent-film": P({ bg: "#0B0B0B", fg: "#EDE6D3", accent: "#EDE6D3", dim: "#8C846F", font: "deco", weight: 400, upper: false, motion: "iris", texture: "film", ornament: "deco", align: "center" }),
  "newsreel": P({ bg: "#1A1A1A", fg: "#F2F2F2", accent: "#F2F2F2", dim: "#9A9A9A", font: "oswald", weight: 700, upper: true, motion: "slam", texture: "film", ornament: "rules", align: "center" }),
  "caption-news": P({ bg: "#0F1624", fg: "#FFFFFF", accent: "#D7263D", dim: "#AEB6C4", font: "archivo", weight: 800, upper: true, motion: "snap", texture: "none", ornament: "band", align: "left" }),
  "news-package": P({ bg: "#0A2342", fg: "#FFFFFF", accent: "#F2A900", dim: "#9FB3C8", font: "archivo", weight: 800, upper: true, motion: "snap", texture: "none", ornament: "band", align: "left" }),
  "dark-keynote": P({ bg: "#000000", fg: "#F5F5F7", accent: "#2997FF", dim: "#86868B", font: "archivo", weight: 700, upper: false, motion: "snap", texture: "none", ornament: "none", glow: 0.3, align: "center" }),
  "hologram-hud": P({ bg: "#020B14", fg: "#7FE7FF", accent: "#FFB347", dim: "#2C6D86", font: "mono", weight: 500, upper: true, motion: "type", texture: "scanlines", ornament: "hud", glow: 0.7, align: "left" }),
  "circuit-board": P({ bg: "#06281B", fg: "#D9F5E6", accent: "#F2C14E", dim: "#2F7A55", font: "mono", weight: 500, upper: true, motion: "type", texture: "grain", ornament: "circuit", glow: 0.4, align: "left" }),
  "neon-tubes": P({ bg: "#07070C", fg: "#FF3D9E", accent: "#1FF2D9", dim: "#3D75FF", font: "hand", weight: 400, upper: false, motion: "flicker", texture: "grain", ornament: "none", glow: 1.0, align: "center" }),
  "oscilloscope-math": P({ bg: "#020604", fg: "#6CFF9A", accent: "#6CFF9A", dim: "#1F5E36", font: "mono", weight: 400, upper: false, motion: "type", texture: "scanlines", ornament: "grid", glow: 0.9, align: "center" }),
  "chalkboard": P({ bg: "#22302A", fg: "#F2F1EA", accent: "#F6D55C", dim: "#9FB0A6", font: "hand", weight: 400, upper: false, motion: "type", texture: "grain", ornament: "none", align: "left" }),
  "whiteboard": P({ bg: "#FAFAF7", fg: "#1F2A44", accent: "#E4572E", dim: "#7C8798", font: "hand", weight: 400, upper: false, motion: "type", texture: "none", ornament: "none", align: "left" }),
  "blueprint": P({ bg: "#0F3B73", fg: "#E8F1FF", accent: "#FFFFFF", dim: "#7FA6D6", font: "mono", weight: 500, upper: true, motion: "type", texture: "grain", ornament: "grid", align: "left" }),
  "kino-montage": P({ bg: "#E9E1CF", fg: "#111111", accent: "#C8102E", dim: "#6E6556", font: "oswald", weight: 700, upper: true, motion: "slam", texture: "paper", ornament: "bauhaus", align: "left" }),
  "text-flash-cuts": P({ bg: "#000000", fg: "#FFFFFF", accent: "#FF2E2E", dim: "#777777", font: "oswald", weight: 700, upper: true, motion: "slam", texture: "none", ornament: "none", align: "center" }),
  "spreadsheet": P({ bg: "#FFFFFF", fg: "#1E1E1E", accent: "#107C41", dim: "#C6C6C6", font: "archivo", weight: 600, upper: false, motion: "type", texture: "none", ornament: "grid", align: "left" }),
  "dataviz": P({ bg: "#F7F6F2", fg: "#1B1B1B", accent: "#E4572E", dim: "#9A968C", font: "archivo", weight: 700, upper: false, motion: "snap", texture: "none", ornament: "rules", align: "left" }),
  "transit-map": P({ bg: "#FFFFFF", fg: "#1A1A1A", accent: "#E32017", dim: "#0098D4", font: "archivo", weight: 700, upper: false, motion: "snap", texture: "none", ornament: "rules", align: "left" }),
  "flat-space-explainer": P({ bg: "#101935", fg: "#FFFFFF", accent: "#FFC857", dim: "#5F6F94", font: "archivo", weight: 800, upper: false, motion: "slam", texture: "none", ornament: "none", align: "center" }),
};
