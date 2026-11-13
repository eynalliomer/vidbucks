---
name: vidbucks-style-library
description: Make a narrated film in one OR MANY visual styles - the style director analyses the topic and every line and decides how many styles the film needs and which one each segment gets (a uniform script stays in one style; a varied one earns several; a reference video or 'one format' locks it). Styles (98 styles - neon tubes, ukiyo-e, Swiss motion graphics, blueprint, cork-board documentary, pixel RPG, ink wash, stained glass, LiDAR, thermal camera, newsreel, ...) entirely in code with Vidbucks' kits - BoardFilm (one camera over a designed wall), LayerScene (agent-authored vector scenes with a strict motion contract), Swiss (grid typography on the beat) - or a new composition on the same timing core. Use when the user names a style, asks "which styles are there", wants a documentary / explainer / evidence-board / launch film without a reference video, or wants to mix looks in one video. Covers style choice, script, voice, timing, scene data, checks, sound and mix.
---

# vidbucks-style-library

A film here = **one timeline** (the narration's lines and word times) + **scene data** the agent writes + a **kit**
that draws it. Read `docs/kits.md` once (formats, rules, mixing kits). Everything renders through Remotion.

## 0. The non-negotiables (why the first multi-style drafts failed)
Auto-drafted cards are NOT a film. Three things failed and are now rules:
1. **One specific idea per line.** Before any style or kit, write `visuals.json` (the visual treatment): for every line
   the single most specific thing on screen (an object, a place, a document, a moment - "the torn right edge of the
   parchment", never "a card with the text"), the shot layout that shows it best, and the media to find.
2. **Real media, hunted per line.** `python tools/media_hunt.py hunt --visuals visuals.json` searches every source with
   2-3 precise queries per line (archive names, object names, places; Wikimedia/Openverse, plus Pexels/Pixabay when
   their keys are in core/.env), drops NC/ND, low-res and duplicates, and writes numbered contact sheets. LOOK at every
   sheet and `pick` the most specific picture (crop it to vary framing). No candidate = refine the queries, then
   `fallback: procedural`. Never reuse a generic picture for a line it does not show.
3. **Edited, not scattered.** Styles live on ACTS (story parts: hook, the man, the mystery, the return), each with a
   written "why"; a style changes only between acts, with a motivated transition (bookends, era changes, tone turns).
   Inside an act the LAYOUT changes line to line (photo · detail · split · compare · number · quote · document · map ·
   timeline · list · ratio · title · stamp · collage) so nothing repeats.
`python tools/visual_check.py visuals.json` FAILs generic or repeated ideas, the same layout twice in a row, one layout
over a third of the film, styles changing inside an act, shots without picked media, layouts missing their data.
Render with `ShotFilm` (`src/kits/shots/`, demo `Tpl-ShotFilm`); BoardFilm / LayerScene / Swiss stay for acts that
need a continuous camera, authored vector art or a bespoke typographic system.

## 0b. How style decisions are made (taught, measured)
Read `knowledge/director/GUIDE.md` and `knowledge/director/STYLES.md`, then the closest worked cases:
`python tools/director_cases.py similar --script script.txt --topic "..." --k 5` (read those case files). Decide acts,
styles (with 2 alternatives and a one-line why each) and layouts yourself, following the guide; `style_director.py`
is only a second opinion. When the user approves a film, add it: `python tools/director_cases.py add --visuals ... --timing ... --topic "..."`.
Measured on 10 unseen topics (blind fresh agent): 83 % acceptable styles, 100 % shortlist recall, 87 % acceptable layouts
(`knowledge/director/RESULTS.md`). Watch the known misses: keep a one-line hook or closing act when the story has one.

## 1. Let the content decide the style(s) - no fixed count
The catalogue is `core/styles/registry.json` (104 styles: the 98 style prompts in `third_party/lemo-opuscar/styles/`
(CC BY-NC 4.0, © Lemomo - read as direction, never paste their text into deliverables) plus Vidbucks' own templates).
Each entry says what content it suits, its look family, and how it renders today: `native` (its own kit/preset),
`skin` (a related kit in its palette/type/texture, flagged as an approximation), `author` (LayerScene art you write),
`build` (no kit yet - build one, section 2), `config` (a Vidbucks template you fill).

```
python tools/style_director.py --timing timing.json [--brief brief.json] --out plan.json --explain
python tools/segment_draft.py --plan plan.json --timing timing.json [--brief brief.json] --out public/multi/<name>/edit.json [--audio multi/<name>/mix.m4a]
```
- The director analyses every line (years, numbers, money, %, places - Natural Earth countries, cities, seas and
  Turkish locatives -, process, comparison, quotes/documents, people, emotion, humour, tech, science, history, nature,
  product, warning, mystery, title, closing) and the whole topic; lines with a similar profile form a segment.
- **The number of styles is a result, not a rule.** Each switch must beat staying by `--switch-cost` and a segment
  runs at least `--min-seg` seconds, so one-topic documentaries usually stay in one style and multi-part scripts
  (a hook, a number, a place, a process, a quote, a turn) earn several. Lower the cost for a collage, raise it for calm.
- The brief can lock it: `"format": "single"` (one style for the whole film, the best fit for the whole script),
  `"style": "<id>"` (the user's or the reference's style wins), `"avoid"`, `"allow": ["author", "build"]`,
  `"tone"`, `"places"` (name -> [lat, lon]) and `"images"` (src, aspect, keywords, label) for the drafts.
  **A reference video in one format = lock that format** (measure it first: vidbucks-reference-to-video).
- Read `plan.json` (reason, content, runners-up per segment) and override anything with a better editorial reason.
- `style_director.py` proposes the acts and styles; treat it as a second opinion and write the acts yourself in
  visuals.json with a reason each. `segment_draft.py` writes a quick draft of every segment (for previews only) (TypeCards cards with a hero number/year; BoardFilm clusters
  with matching photos, stamped dates, counters, documents, map markers and camera keys); LayerScene / build styles are
  left as `todo` for you. Render `Tpl-MultiStyle` (or register your own id with the same component) and refine.
- Transitions are picked per style pair (cut within a family, iris to/from film looks, wipe between dark and light,
  knife into graphic, flash otherwise) and can be edited in edit.json.

## 2. Kits and building a missing style
| Kit | Styles it fits directly | How |
|---|---|---|
| **BoardFilm** | archive-lighttable, briefing-board, visual-investigation, dark-documentary, halftone-dossier, vintage-collage, map-explainer, satellite-briefing (with imagery), blueprint (look `blueprint`), chalkboard / whiteboard (look `slate` / `paper`), dark-keynote (look `night`) | `board.json`: items + camera keys; look + grade |
| **TypeCards** (`src/kits/type/`, presets in `presets.ts`) | ~30 graphic styles with a skin: swiss-motion, bauhaus-shapes, pictogram-motion, art-deco, spy-titles, pop-art, risograph, halftone-dossier, silkscreen-poster, woodcut, engraving, ascii-crt, one-bit-dither, silent-film, newsreel, caption-news, news-package, dark-keynote, hologram-hud, circuit-board, neon-tubes, oscilloscope-math, chalkboard, whiteboard, blueprint, kino-montage, text-flash-cuts, spreadsheet, dataviz, transit-map, flat-space-explainer | drafted from the narration (`segment_draft.py`): a card per line, hero number/year, the style's motion grammar |
| **Swiss** (bespoke) | swiss-motion, bauhaus-shapes, pictogram-motion, art-deco, spy-titles, flat-space-explainer, dataviz, spreadsheet, transit-map | `ClipText`, `Statement`, `knife`, `grid`, `snapTo` on the beat grid; one signal colour |
| **LayerScene** | stick-explainer, one-line, sketchnote, marker-paper, ipad-sketch, instruction-manual, iso-infographic, assembly-line-diagram, pen-plotter, shadow-puppet, papercut-red, silhouette-rhythm, midcentury-toon, rubber-hose (look `grid` / `paper` / `tv`) | `layers.json` shots of paths/shapes/groups with bounded keys; `tools/layer_check.py` must PASS |
| **New composition** on `src/kits/time.ts` + `camera.ts` | everything else (neon-tubes, ink-wash, ukiyoe, stained-glass, watercolor, impasto, pixel-rpg, hd-2d, crt, newsreel, scratch-film, three.js styles: tilt-shift, glass-product, lowpoly-island, lidar-survey, thermal-camera, paper-popup …) | write `src/kits/<style>/` from the STYLE.md: a pure `render(t)` in React/SVG/canvas (or `@remotion/three` for 3D); prototype ONE style frame, compare it with the STYLE.md, then build |

When a new style kit works, keep it: register a `Tpl-<Style>` demo in `src/templates/index.tsx`, add its renderer to
`MultiStyle.tsx`, mark it in `tools/style_registry.py` (renderer + preset + readiness) and rebuild the registry, so the
director can choose it for any future film.

## 3. Production (every kit)
1. **Treatment**: three candidate structures for the topic, pick one, write `TREATMENT.md` (opening, turn, ending; the
   style's native moves you will use). Facts true or marked; no invented quotes; recreations labelled.
2. **Script** -> `python tools/words_check.py script.txt` (no FAIL). One idea per line; 60 s ≈ 140-170 words.
3. **Voice** (user's choice; Kokoro/Piper/OmniVoice/any `--tts-cmd`): `make_narration.py` or `vo_words.py`.
   Check each line: `python tools/asr_line_check.py --timing timing.json --audio narration.wav --lang <xx>`
   (put Whisper's spelling in an `asr` field only after listening). Never slow or re-time accepted speech.
4. **Timing**: `python tools/kit_timing.py --script script.txt --audio narration.wav --out videos/<name>/timing.json [--lead 0.15] [--bpm N]`.
5. **Scene data** with time expressions (`{"word": [7, "ceylan"], "dt": -0.1}`), so a new voice re-times the film by itself.
   Maps: `python tools/board_map.py --name <n> --lon a b --lat c d --proj mercator --lon0 L --K 12000 --place "City=lat,lon" --out public/<dir>/map_<n>.json`.
   Images: `fetch-stock.mjs` (licence recorded; no NC/ND), credits in `CREDITS.md`.
6. **Checks before render**: LayerScene -> `layer_check.py` PASS; on-screen statements -> `python tools/readcheck.py --timing timing.json`
   (or `--texts`); captions -> `readcheck.py --captions layers.json`.
7. **Look test**: `npx remotion still src/index.ts <Id> out/qa/f.png --frame N --scale 0.4` at the END of several lines
   (mid-line frames catch the camera in transit) and LOOK. Fix composition before the full render.
8. **Sound**: `python tools/kit_cues.py --board board.json --timing timing.json --out cues.json` ->
   `python tools/sfx_synth.py --cues cues.json --duration <s> --out sfx.wav` -> `python tools/mix_film.py --voice narration.wav --sfx sfx.wav [--music score.wav] --lead <lead> --lufs -16 --out mix.m4a`
   (music: `make_pulse_track.py` at the film's BPM, or a licensed track). Point the composition's `audio` at the mix.
9. **Render** (`npx tsc --noEmit` first), then `python tools/quality_gate.py film.mp4 --profile board|motion|layers --script script.txt --speech`
   (the profile sets what "alive" means for that format; on-screen text is expected there). No FAIL. Deliver with what
   was verified and what was not (you cannot hear the mix).

## 4. Many styles in one video
`src/kits/multi/MultiStyle.tsx` renders edit.json: each segment's lines are re-based to local time and drawn by its
renderer (board | type | layers | swiss-dance) inside a `<Sequence>`, with the chosen transition; one narration and one
mix for the whole film. New renderers (a style kit you built) are added to the switch in MultiStyle and to the registry.
Sound: run `kit_cues.py` per board segment (or write cues), offset by the segment start, then `sfx_synth.py` once.
