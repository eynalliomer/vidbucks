# cinecode + rea-video review for Vidbucks (2026-11-09)

Sources read (not run): cinecode-main (MIT, Sarp Yıldız; 51 style recipes MIT lemo-opuscar), rea-video-main (Apache-2.0). We adopt STRATEGY and rules in our own words and code; no files copied.

## cinecode in one paragraph
A code-only film kit (HTML/three.js + Web Audio -> MP4). Two modes (Quick: card -> 2 stills -> half-size draft -> 2 revisions; Film: 6 gated steps). Strength is process discipline enforced by tools and hooks, not generation.

## Methods worth adopting (what Vidbucks lacks)
1. Hard craft rules checked by scripts, not by memory: hook (motion in 0-2 s, `qc.py hook`), one action per beat + "every beat changes something" (`scene_check.py action` flags shots whose frames barely change once camera move is removed), no adjacent repeat of shot size / move / transition, one-frame pops, freeze/duplicate frames, loop seam.
2. Counts scale with length (one table: shots = runtime / average shot length by tempo: energetic 4 s, standard 6 s, contemplative 8-12 s).
3. Jury: 6 fixed questions answered with timecodes (hook, hero moment, generic frame, weakest 5 s, sound on the 3 biggest cuts, generated-sounding words) + anchored score (5 student, 6 template, 7 pro, 8 agency, 9 award) + max 3 fixes, one must raise the "wow".
4. Words check before render: banned cliché list (TR+EN) and generated-sounding tells; no dashes in spoken/on-screen words.
5. Reference video = FORM only (length, rhythm, look, sound) + "what should change" question; "could a frame be mistaken for the reference's own? redo"; the idea is never taken from the reference.
6. Steering: name what the medium draws badly before offering options; star option keeps the idea, changes how it is shown.
7. Anti-habit: AI-overused images/palettes/fonts need a written reason ("habit image" line).
8. Look library as vocabulary with index (58 recipes) + direction board of 3 rows (reference vs 2 alternatives).
9. Process: show before asking, one question per gate, star = recommended, praised things are locked, notes saved verbatim per round, defect diagnosed on test frames before rebuild.
10. Small context: one render command returns 4 lines; logs to files; images < 1 MP.

## rea-video strategy worth adopting
- Shot-level production-method classification (live / AI / avatar / 3D / code / screen / still-motion) with evidence + confidence, then an agent-as-VLM review loop (review tasks -> answers -> apply) that rewrites the report.
- Per-shot aspects: framing (shot size from face height), camera support, lighting set-up and ratio, grade; editing stats (cuts/min, average shot); audio sources (voice/music/SFX, BPM, stems).
- Remake plan as generation units: same-scene shots joined into one call, first-frame continuity between units.
- Packaging layer: captions/stickers/SFX hits as persistent layers kept OUT of prompts.

## Gaps measured in our own runs that these fix
- v1 Yavuz: 97 % near-still frames, 26 s dead air -> no "every beat changes" check existed.
- Flow burned text ("SELIM", "No!", "April 1453") -> no on-picture text check.
- Reference "copy" risk -> no explicit "could be mistaken for the reference" test.

## Plan for Vidbucks (to build next, our own code)
A. `analyze_reference.py` gains: shot-size/face framing, camera-support guess, shot-type mix (selfie / third-person / B-roll by face presence + motion), packaging layer, and a review loop (`--review` writes tasks, `--apply-review` merges the agent's per-shot answers incl. prompt structure). rea-video stays optional for production-method forensics.
B. New `core/tools/quality_gate.py`: hook motion, dead air (speech coverage), near-still share, adjacent-shot repetition, one-frame pops, burned-in text (OCR-free: bright high-contrast blob detection + optional tesseract), loudness; one 4-line summary.
C. `words_check` for scripts (TR/EN cliché + generated tells + dashes).
D. Jury step in the QA skill (6 questions, anchored score, 3 fixes).
E. New skill `vidbucks-historical-pov`: the Tudor formula (screen-time split, cold-open ECU, long takes via extend, filmer gag, modern comparison, outro question), character lock, nameless prompts, Flow settings and failure rules, quality/dynamics gates from B-D.
