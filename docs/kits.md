# Kits: one timeline, any number of styles, chosen by the content

Vidbucks' kits turn a narration into a film from **data the agent writes**, with every hit on the spoken word.
They are Remotion components, so kits can be sequenced, layered or nested in one composition, and they share one
voice, one sound pipeline and the same gates.

```
script.txt ──► voice (make_narration.py / vo_words.py / any TTS) ──► tools/kit_timing.py ──► timing.json
                                                                     (lines + Whisper word times)
timing.json + scene data ─► BoardFilm | LayerScene | Swiss | your composition (src/kits/*) ─► render
scene data ─► tools/kit_cues.py ─► cues.json ─► tools/sfx_synth.py ─► sfx.wav ─┐
narration.wav (+ music) ──────────────────────────────────────────────────────┴► tools/mix_film.py ─► mix.m4a
checks: layer_check.py (contract) · readcheck.py (reading time) · asr_line_check.py (every line heard) · quality_gate.py --profile
```

## Style director and MultiStyle (the whole catalogue in one film)
`core/styles/registry.json` lists every style (98 style prompts + Vidbucks templates) with the content it suits and how
it renders (native / skin / author / build / config). `tools/style_director.py` analyses the topic and each line and
segments the film; the number of styles comes out of the content (a switch must pay `--switch-cost`, a segment runs
`--min-seg` seconds; `"format": "single"` or a reference style locks one). `tools/segment_draft.py` drafts each
segment's data; `src/kits/multi/MultiStyle.tsx` renders them in sequence with per-pair transitions over one narration.
TypeCards (`src/kits/type/`) gives ~30 graphic styles a skin (palette, type, texture, ornament, motion grammar) that is
drafted straight from the narration. Demos: `Tpl-MultiStyle` (director's default for a documentary script: one style),
`Tpl-MultiStyle-Many` (the same script with switch cost 0: 11 segments, 7 styles).

## The shared core (`src/kits/time.ts`, `src/kits/camera.ts`, `tools/kittime.py`)
- **Time expressions** in data files: `12.4` · `{"line": 7}` · `{"end": 7}` · `{"word": [7, "ceylan"], "dt": -0.1}` · `{"beat": 12}`.
  Words come from Whisper; without them a word's time is its share of the line's letters. Unicode-aware: Turkish
  `ı ş ğ ü ö ç İ` count (a lesson from testing an a-z-only engine, where every Turkish hit drifted).
- **Easing**: `PRESS` = cubic-bezier(.7,0,.2,1) for snaps that land on a beat (`snapTo`), `easeOutCubic`, `easeOutBack`, `smooth`.
- **Camera**: keys `{t, x, y, zoom, rot}` in world units (4K px at zoom 1), monotone cubic Hermite (no overshoot
  between holds), zoom in log space, slow handheld wobble, a spotlight with its own keys. `worldTransform`, `toScreen`.
- **Cues**: items announce their own sounds; `kit_cues.py` collects them, `sfx_synth.py` synthesises every kind
  (pop, slide, whoosh, marker, pencil, ticks, stamp, impact, boom, heartbeat, riser, snap, thunk, knife, glock, …).

## BoardFilm (`src/kits/board/`, demo `Tpl-BoardFilm`)
One continuous camera over one designed world: a cork wall, slate, studio table, blueprint, paper or night board.
`board.json`: `look`, `grade` (bw / sepia / natural), `items`, `camera`. Items: `print` (photo with border, pin,
drop-in, torn clipping, name label), `doc` (typeset document with grey body rows, real quote, highlights on words,
"RECREATION" mark), `bigtext`, `counter`, `stamp`, `pen` (underline / ellipse / highlight / tick / cross), `string`,
`card`, `map` + `region` + `route` + `marker` (maps from `tools/board_map.py`: Natural Earth, Mercator or Albers,
projected straight into world px). Rules: one hero per line (the spotlight dims the rest); hits land on the spoken
word; a phrase is shown one way (typed OR on a document); after the cold open, story time only moves forward;
type readable on a phone (≥ 3 % of frame height); nothing invented that looks real (code-drawn documents are marked
as recreations and quote only real words). Self-review traps: dark ink on a dark board, the spotlight left behind
the camera, map scale too small, colliding labels, highlights off their words.

## LayerScene (`src/kits/layers/`, demo `Tpl-LayerScene`, contract `tools/layer_check.py`)
Agent-authored vector scenes: `layers.json` = shots `[{start, end, layers}]` that cover the film with no gap,
layers `rect / ellipse / path (M L Q C Z) / group (pivot) / line / arrow / underline / text / image`, bounded local
keys (x, y, w, angle, alpha, progress, scaleX/Y) with smoothstep, `from/to` visibility, one-line semantic captions,
an optional analog-TV finish (`look: tv | grid | paper`). The contract: every animated layer declares
`motion {role: actor|prop|information, reason}`; no window over 2.5 s without a real change of position, angle,
scale, width or drawing progress (**alpha fades, caption turnover and cuts do not count**); captions one line,
grouped by meaning, never past the picture. Designing rules that worked: blank round heads, rounded joints,
generous negative space, show the behaviour the narration names (an approach needs steps, not a sliding sprite).

## Swiss (`src/kits/swiss/`, demo `Tpl-SwissDance`)
International-Typographic-Style motion: 12-column grid, paper / ink / greys and **one** signal colour, every snap on
the beat with `PRESS`, entrances are clip-reveals (`ClipText`), deletions are knife cuts (`knife`), the subtitles
are part of the layout (`Statement`: a grey lead-in and a bold sentence revealed on each word's spoken time).
The one element allowed off the grid (the "exception") moves linearly and unsnapped.

## Mixing kits
```tsx
<Series>
  <Series.Sequence durationInFrames={...}><BoardFilm cfg={board} timing={timing} /></Series.Sequence>
  <Series.Sequence durationInFrames={...}><SwissDance timing={timing2} /></Series.Sequence>
</Series>
```
A kit inside another: render a LayerScene in an `AbsoluteFill` over a BoardFilm, or place any React component in a
BoardFilm card via a new item type (all kits take time from `useCurrentFrame`, so nesting stays frame-exact).

## Where the ideas came from
The kits re-implement, in Vidbucks' own code, the architectures of three open engines that were installed, read and
pushed with a one-minute film each (study notes: `.vidbucks/research/`, not in the repo): a Python/Skia "board film"
engine (one camera, items that cue their own sounds), a declarative layer-manifest runtime with a strict motion and
caption contract, and the Lemo-Opuscar style library (a style = a written prompt + a hand-built engine; reading-time and
speech checks; a page rendered as a pure function of time). Lemo-Opuscar's style documents ship unchanged, with credit
and under their own non-commercial licence, in `third_party/lemo-opuscar/` (see its README).
