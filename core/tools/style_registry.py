#!/usr/bin/env python
"""style_registry.py - build core/styles/registry.json: every style Vidbucks knows, what content it suits, how it renders.

  python tools/style_registry.py            # rebuild from third_party/lemo-opuscar/styles + Vidbucks kits/templates

Each entry: id, name, family (look family, for transitions/contrast), category, suits {tag: weight}, tone, dark (bool),
renderer (board | type | layers | swiss-dance | null), preset (look/preset for the renderer), readiness:
  native = drawn by its own kit/preset · skin = drawn by a related kit in this style's palette/type/texture (approximation,
  flagged in the edit) · author = needs agent-authored art (LayerScene) · build = no kit yet (the style-library skill builds one)
Content tags (what style_director.py detects in the script): number year money percent place map process list comparison
quote document person emotion story humor tech data science history nature product warning mystery title closing."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEMO = ROOT.parent / "third_party" / "lemo-opuscar" / "styles"
CAT = {
    "Edit & Documentary": {"history": 1, "document": .8, "place": .6, "person": .6, "quote": .5},
    "Painting & Illustration": {"emotion": 1, "nature": .8, "story": .8, "person": .4},
    "Sketch & Board": {"process": 1, "science": .7, "list": .7, "comparison": .5},
    "Traditional Crafts": {"history": .8, "story": .9, "nature": .6, "emotion": .5},
    "Print & Printmaking": {"history": .8, "document": .7, "quote": .7, "title": .5},
    "Graphic & Type": {"number": 1, "list": .8, "title": .9, "data": .6, "product": .5, "year": .6},
    "Line Diagrams": {"process": 1, "tech": .8, "science": .8, "product": .7},
    "Cartoons": {"humor": 1, "story": .8, "person": .7},
    "Games": {"humor": .8, "list": .6, "process": .5, "story": .6},
    "Film & Tape": {"history": .7, "mystery": .8, "tech": .4, "story": .5},
    "Screens & Interfaces": {"tech": 1, "product": .9, "data": .7, "number": .5},
    "Light & Lines": {"tech": .7, "science": .7, "mystery": .6, "emotion": .4},
    "3D & Miniature": {"product": .9, "place": .7, "process": .6},
    "Instruments & Evidence": {"science": .9, "mystery": .7, "place": .6, "data": .6, "document": .5},
    "Data & Maps": {"data": 1, "number": .9, "place": .8, "comparison": .8, "map": .9, "percent": .8},
}
# style-specific accents on top of the category
EXTRA = {
    "archive-lighttable": {"document": 1, "history": 1, "year": .8}, "briefing-board": {"process": .8, "tech": .6, "list": .6},
    "visual-investigation": {"mystery": 1, "place": .8, "document": .8}, "dark-documentary": {"mystery": 1, "warning": .8, "place": .6},
    "map-explainer": {"place": 1, "map": 1}, "satellite-briefing": {"place": 1, "map": 1, "nature": .6}, "transit-map": {"place": .7, "process": .7, "list": .6},
    "caption-news": {"warning": 1, "number": .6, "place": .4}, "news-package": {"warning": .8, "person": .6, "place": .5}, "newsreel": {"history": 1, "year": .9},
    "silent-film": {"history": 1, "humor": .7, "quote": .6, "story": .6}, "countdown": {"number": 1, "warning": .8},
    "swiss-motion": {"number": .9, "process": .6, "list": .7}, "pop-art": {"product": .8, "humor": .6, "money": .6}, "spy-titles": {"mystery": 1, "title": 1},
    "art-deco": {"title": 1, "money": .6, "history": .5}, "bauhaus-shapes": {"process": .5, "title": .6}, "kino-montage": {"history": .8, "person": .6, "title": .6},
    "halftone-dossier": {"document": 1, "mystery": .8, "person": .6}, "woodcut": {"history": .8, "story": .6}, "engraving": {"history": .9, "quote": .7, "science": .5},
    "ascii-crt": {"tech": 1, "data": .6}, "one-bit-dither": {"tech": .8}, "hologram-hud": {"tech": 1, "data": .8, "science": .6}, "circuit-board": {"tech": 1, "process": .6},
    "dark-keynote": {"product": 1, "tech": .9, "number": .6}, "neon-tubes": {"emotion": .7, "story": .7, "place": .5}, "oscilloscope-math": {"science": 1, "data": .7},
    "chalkboard": {"science": .8, "process": .8, "number": .5}, "whiteboard": {"process": 1, "list": .8}, "blueprint": {"tech": .9, "process": .9, "product": .7},
    "dataviz": {"data": 1, "number": 1, "percent": 1, "comparison": .9}, "spreadsheet": {"data": .9, "money": .9, "number": .8},
    "text-flash-cuts": {"title": 1, "emotion": .6}, "flat-space-explainer": {"number": .9, "science": .8, "comparison": .9},
    "microscope": {"science": 1, "nature": .8}, "thermal-camera": {"science": .8, "nature": .6, "mystery": .5}, "security-xray": {"mystery": .8, "product": .6},
    "lidar-survey": {"place": .9, "science": .7, "history": .5}, "ink-wash": {"nature": 1, "emotion": .8, "history": .6}, "ukiyoe": {"nature": .9, "history": .8},
    "stained-glass": {"story": 1, "history": .8, "emotion": .6}, "gilded-illumination": {"history": 1, "quote": .8}, "shadow-puppet": {"story": 1, "history": .7},
    "watercolor": {"nature": 1, "emotion": 1}, "impasto": {"emotion": 1, "person": .7}, "pixel-rpg": {"story": .8, "humor": .8, "process": .5},
    "rubber-hose": {"humor": 1}, "stick-explainer": {"process": .8, "person": .6, "humor": .6}, "tilt-shift": {"place": .9, "process": .6},
    "glass-product": {"product": 1}, "lowpoly-island": {"place": .8, "nature": .6}, "paper-popup": {"story": .9, "place": .6},
}
TYPE_PRESETS = ["swiss-motion", "bauhaus-shapes", "pictogram-motion", "art-deco", "spy-titles", "pop-art", "risograph", "halftone-dossier", "silkscreen-poster",
                "woodcut", "engraving", "ascii-crt", "one-bit-dither", "silent-film", "newsreel", "caption-news", "news-package", "dark-keynote", "hologram-hud",
                "circuit-board", "neon-tubes", "oscilloscope-math", "chalkboard", "whiteboard", "blueprint", "kino-montage", "text-flash-cuts", "spreadsheet",
                "dataviz", "transit-map", "flat-space-explainer"]
NATIVE_TYPE = {"swiss-motion", "bauhaus-shapes", "pictogram-motion", "art-deco", "spy-titles", "pop-art", "caption-news", "news-package", "dark-keynote",
               "text-flash-cuts", "silent-film", "newsreel", "ascii-crt", "risograph", "silkscreen-poster"}
BOARD = {"archive-lighttable": ("wall", "bw", "native"), "briefing-board": ("studio", "natural", "native"), "visual-investigation": ("charcoal", "natural", "native"),
         "dark-documentary": ("night", "natural", "skin"), "map-explainer": ("paper", "natural", "skin"), "satellite-briefing": ("night", "natural", "skin"),
         "vintage-collage": ("paper", "sepia", "skin")}
LAYERS = {"stick-explainer": "grid", "one-line": "grid", "sketchnote": "paper", "marker-paper": "grid", "ipad-sketch": "grid", "instruction-manual": "grid",
          "iso-infographic": "grid", "assembly-line-diagram": "grid", "pen-plotter": "paper", "shadow-puppet": "paper", "papercut-red": "paper",
          "silhouette-rhythm": "tv", "midcentury-toon": "paper", "rubber-hose": "grid"}
DARK = {"spy-titles", "ascii-crt", "one-bit-dither", "silent-film", "newsreel", "caption-news", "news-package", "dark-keynote", "hologram-hud", "circuit-board",
        "neon-tubes", "oscilloscope-math", "chalkboard", "blueprint", "text-flash-cuts", "flat-space-explainer", "art-deco", "archive-lighttable",
        "visual-investigation", "dark-documentary", "satellite-briefing", "backrooms", "scratch-film", "double-exposure", "thermal-camera", "security-xray",
        "lidar-survey", "firefly-pointillism", "flow-field", "silhouette-rhythm", "ink-wash"}
FAMILY = lambda cat: {"Edit & Documentary": "documentary", "Print & Printmaking": "print", "Graphic & Type": "graphic", "Film & Tape": "film",
                      "Screens & Interfaces": "screen", "Light & Lines": "light", "Instruments & Evidence": "evidence", "Data & Maps": "data"}.get(cat, "illustration")

out = []
for d in sorted(LEMO.iterdir()):
    j = d / "style.json"
    if not j.exists() or d.name.startswith("_"): continue
    s = json.loads(j.read_text()); slug = d.name; cat = s.get("category_en", "")
    base = 0.35 if slug in EXTRA else 1.0          # a style with its own profile keeps only a trace of its category
    suits = {k: v * base for k, v in CAT.get(cat, {}).items()}
    for k, v in EXTRA.get(slug, {}).items(): suits[k] = max(suits.get(k, 0), v)
    e = {"id": slug, "name": s.get("en", slug), "category": cat, "family": FAMILY(cat), "dark": slug in DARK, "suits": suits,
         "uses": s.get("uses", []), "source": "lemo-opuscar (CC BY-NC 4.0 docs)", "style_doc": f"third_party/lemo-opuscar/styles/{slug}/STYLE.md",
         "needs": s.get("needs", [])}
    if slug in BOARD: lk, gr, rd = BOARD[slug]; e.update(renderer="board", preset={"look": lk, "grade": gr}, readiness=rd)
    elif slug in TYPE_PRESETS: e.update(renderer="type", preset=slug, readiness="native" if slug in NATIVE_TYPE else "skin")
    elif slug in LAYERS: e.update(renderer="layers", preset={"look": LAYERS[slug]}, readiness="author")
    else: e.update(renderer=None, preset=None, readiness="build")
    out.append(e)
# Vidbucks' own templates (configs the agent fills; not yet MultiStyle renderers)
for tid, name, suits, dark in [("kinetic-type", "Kinetic Typography (Tpl-KineticType)", {"title": 1, "emotion": .7, "number": .6}, True),
                               ("object-story", "Object Story (Tpl-ObjectStory)", {"product": .8, "story": .7, "emotion": .6}, False),
                               ("icon-story", "Icon Story (Tpl-IconStory)", {"process": .8, "list": .7, "product": .6}, True),
                               ("particle-bloom", "Particle Bloom (Tpl-ParticleBloom)", {"tech": .8, "science": .7, "emotion": .5}, True),
                               ("stickman-longform", "Stickman long-form engine", {"story": .8, "process": .7, "humor": .7}, False),
                               ("geomap-europe", "GeoMap documentary (Europe)", {"place": 1, "map": 1, "history": .8}, False)]:
    out.append({"id": tid, "name": name, "category": "Vidbucks templates", "family": "vidbucks", "dark": dark, "suits": suits, "uses": [],
                "source": "vidbucks", "renderer": None, "preset": None, "readiness": "config"})
dst = ROOT / "styles" / "registry.json"; dst.parent.mkdir(exist_ok=True)
dst.write_text(json.dumps(out, ensure_ascii=False, indent=1))
from collections import Counter
print(f"{len(out)} styles -> {dst}", dict(Counter(e["readiness"] for e in out)))
