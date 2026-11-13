# Style direction guide (how to choose acts, styles and layouts for a narrated film)

You decide, for one script: how the film splits into ACTS, which STYLE each act wears, and which LAYOUT each line uses.
The styles you may use are in `STYLES.md` (31 ids). The layouts are: photo · detail · split · compare · number · quote ·
document · map · timeline · list · ratio · title · stamp · collage. Worked cases: `cases/*.json` (read several first).

## 1. Acts come from the story, not from sentences
- Find the story's parts: a hook, then each change of time, place, question or tone. An act is usually 2-5 lines.
  A one-line act is allowed only as the opening hook or the closing line.
- **Count is a result.** One subject told in one voice (a product launch, a recipe, a single slapstick day, a data
  explainer, a public warning list, a travel postcard) = ONE act, one style, start to finish. A story that travels through
  eras, or turns from a question to a proof to a reflection, earns 2-4 acts.
- A new act needs a reason you can say in one line ("back to the present", "the investigation starts", "inside the body").

## 2. Pick the style for each act
Ask in this order:
1. **What era does the act live in?** A dated act wears a style of its era: before 1850 → engraving or woodcut;
   1850-1960 → newsreel, silent film, art deco, kino montage, halftone dossier; 1960-2005 → Swiss, Bauhaus, pictograms,
   silkscreen poster, pop art, spy titles, CRT/1-bit; today → news, dataviz, whiteboard/chalkboard, risograph, neon;
   the future → hologram HUD, circuit board, oscilloscope, dark keynote.
2. **What kind of telling is it?** documentary (history, a life) · investigation (a mystery, a lost object, a scam) ·
   news/warning (a bulletin, safety steps) · technical (how something works) · data (prices, percentages, comparisons) ·
   commercial (a launch, an offer) · playful (comedy, pets, slapstick) · poetic (feeling, nature, memory) · craft
   (handmade, food, a local shop) · travel (journeys, landscapes, routes).
3. **Mood and ground:** dark grounds for mystery, night, tech and drama; light grounds for warm, explanatory, playful.
4. Where era and register disagree, the **register of the act wins for undated acts** and the **era wins for dated acts**.

Edit rules:
- **Bookends:** when the film returns to its starting time or place at the end, close in the opening act's style.
- Neighbouring acts must differ in style; prefer a visible contrast (dark/light, or era change) at a real turn.
- Do not decorate: a style change only where the story changes.

## 3. Layouts: the most specific way to show THIS line
- A year or a jump in time → timeline (or number for one year). A count, price or measure → number. A share or part of
  a whole → ratio. Two things set against each other → compare. A place or route → map. A named object or picture to
  look into → detail. A written source → document; a spoken/written sentence → quote. Items in a kit or steps → list.
  A dramatic verdict (lost, banned, sold, done) → stamp. Several things of one kind → collage. The question or the
  chapter → title. Otherwise a strong picture → photo or split.
- Never the same layout on two lines in a row; no layout on more than a third of the lines.

## 4. Output
For each act: lines, style, two alternatives, one-line why. For each line: layout, one alternative.

## 5. Direction: a style is not a skin (decide every dimension, from the content)
The pool is `CAPABILITIES.md`. A style id gives a palette and a DEFAULT direction; you still decide, per act:
- **How does this part of the story move?** camera. An argument that hits beats → punch. Something to study (a map, an
  engraving, a manuscript) → rostrum. A witness-like, present-tense moment → handheld. A calm product or landscape →
  drift. A joke that needs a deadpan → locked.
- **How does material arrive, and what is it physically?** enter + frame. Archive finds land on a table (drop + print /
  polaroid); memories develop; evidence is torn or pinned; interfaces scan or glitch; film is projected in a strip.
- **How do the words live?** caption + fonts. One strong claim → kinetic. A recipe or a how-to → karaoke or margin. A
  file or a report → typewriter. A quiet picture → subtitle or none. Pick a display/text pair that belongs to the act.
- **What should the line BE?** the scene. Prefer the scene that carries the information itself (bars, chart, pictos,
  diagram, steps, board, versus, gauge, typed) over a picture with a caption. A picture is one option among many.
- **What does it sound like?** the sound palette and the music mood/BPM, per film.
- **Could this act be another engine entirely?** (BoardFilm for an investigation, TypeCards for a manifesto ...).

Rules that are never fixed: how many dimensions change between acts, how many scene types a film uses, or which
combination a genre "gets". A one-act film in one direction is right when the content is one thing; a history may need
archive pictures, drawn data, documents and a board in the same minute. Examples from the user or from `cases/` are
illustrations, never mappings. State the reason for each choice in the act's `why`.

Before rendering: `python tools/variety_check.py <visuals.json ...>`. FAIL = neighbouring acts that only change colour, or
two films in a batch that share >= 70 % of their direction. If the pool cannot express what the content needs, build
the missing piece (section 4 of `CAPABILITIES.md`) rather than settling for the nearest existing scene.
