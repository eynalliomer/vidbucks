# Capability pool (what a film can be made of)

The director chooses from ALL of this, per film and per act, from the content. Nothing here is a default look.
`built` = usable now · `kit` = another engine reachable as a MultiStyle segment · `buildable` = not built yet; build it
when a film needs it and add it here (the pool is meant to grow with every film).

## 1. Engines (an act may be any of them; MultiStyle joins them on one narration)
| engine | what it is | status |
|---|---|---|
| ShotFilm (`shots`) | one scene per line, a direction per act | built |
| BoardFilm (`board`) | ONE continuous world: a camera travels over prints, documents, strings, maps, stamps | kit |
| LayerScene (`layers`) | parallax layers and stickman/illustration scenes with micro-motion | kit |
| TypeCards (`type`) | pure typography cards, 31 presets | kit |
| SwissDance (`swiss-dance`) | grid choreography, words as shapes | kit |
| KineticType, ObjectStory, IconStory, ParticleBloom, GeoMap, engine characters (Doomer, Face2, Meme) | older templates | built, not yet MultiStyle segments (buildable: thin adapters) |
| real video plates, AI-video clips (Flow/Veo), screen recordings | footage acts | buildable: a `clip` scene (OffthreadVideo + the same captions) |

## 2. Direction: seven independent dimensions (ShotFilm, `act.direction`, overridable per line)
- **camera** kenburns (slow push) · locked (still, the scene moves) · punch (hard jump-ins) · handheld (wobble) · drift (lateral) · whip (fast pan, lands) · rostrum (two-leg move over flat artwork)
- **enter** (how media arrives) cut · slide · drop (lands on the table) · develop (photo develops) · mask (circle opens) · blinds · tear (torn strip) · projector (flickers on) · scan (line sweeps down) · glitch · unfold
- **frame** bleed · print (bordered, taped) · hex (six-sided window) · polaroid (with a handwritten label) · window (rounded card) · arch · circle · strip (film perforations) · crt (bezel + scanlines) · torn
- **caption** lower (plate) · kinetic (only the spoken phrase, huge) · subtitle · typewriter · karaoke (spoken word lights) · margin (side column) · none
- **fonts** display + text from 24 families: archivo, oswald, serif (Baskerville), mono (Plex), deco (Limelight), hand (Caveat), pixel (VT323), playfair, bebas, grotesk, anton, elite (typewriter), courier, fraunces, abril, dmserif, inter, righteous, bangers, cormorant, unbounded, staat, syne, rubik
- **treat** (picture grade) natural · bw · sepia · duotone · halftone · riso · night · warm · cold · faded; plus **palette**, **texture** (grain, paper, halftone, dither, scanlines, film with gate scratches), **ornament** (grid, rules, frame, hud, bars, band, burst, deco, circuit, bauhaus)
- **sound** palette: paper · archive · digital · poster · comedy · classroom · soft · thriller (28 synthesised hits; music mood and BPM per film)
- **transition** into an act: cut · fade · wipe · knife · flash · iris · push · zoom · dip

## 3. Scenes (one per line)
Pictures: photo · detail (dive + ring / bracket / arrow) · split · compare · collage (2-4) · stamp · filmstrip · board (pinned prints, strings, notes, travelling camera)
Documents and words: document (highlight / underline / box) · quote · typed (our line typed on a card or telegram; never a faked source) · title (track / letters / mask) · bigword
Numbers and data: number (count / odometer / slam) · ratio · bars (h/v) · chart (drawn line, marked point) · pictos (unit chart, 12 glyphs) · gauge · versus (two columns) · timeline (horizontal / vertical, playhead) · steps (process)
Places: map (fit to all stops, arc route, looks paper / night / ink) · diagram (picture + callouts with leader lines)
Lists: list (num / check / dash)

## 4. Buildable next (not yet in the pool; add when a film needs them)
footage `clip` scene · character acts (engine figures inside ShotFilm) · cut-out parallax from one photo (`cutout.py` + depth layers) · animated SVG illustrations per topic · calendar/clock flips · scale comparisons (silhouettes) · screen/UI mock-ups · split-screen multi-clip · rotoscope-style outlines · 3D/particle acts (ParticleBloom adapter) · city-scale maps (finer geodata than 1:50m)

## Added 2026-11-13 (footage + channel devices)
- Media: any `Pic` may be a video clip (`.mp4`, `in` = in-point s, `rate`); every camera/enter/frame/treat applies. Source: `tools/archive_clips.py` (trusted public-domain footage, licence checked per item).
- Scene `montage`: full-bleed shots cut on the narrator's words (`data.cuts` = script word indices).
- Line overlays: `tag` (chapter pill that persists until changed), `pops` (word-timed numbers/words), `after` (a card in the silence after the line: bumper, chapter title); film `brand` (own corner bug + tag/pop colours).
- Treat `vhs` (scanlines, tracking band, chroma fringe, tape noise) and `kodak` (warm faded print); frame `inset` (a 4:3 screen on the act's ground).
