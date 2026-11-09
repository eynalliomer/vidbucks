---
name: vidbucks-qa-revise
description: Quality gates for a built video and the revision protocol - words check before generating, the measured quality gate (streams, hook, life, repeats, dead air, burned-in text, loudness, script adherence, brief targets), contact-sheet review, the six-question jury with an anchored score, and turning user feedback into a numbered change list with minimal re-rendering. Use when checking a video before delivery, after any render or AI-video download, or when the user asks for changes.
---

# vidbucks-qa-revise

## QA gates (run in order, stop at the first failure)
- **Before anything is generated or narrated:** `python tools/words_check.py script.txt` (dashes, cliches, machine-written tells, scenes > 40 words) and, for AI-video prompts, `python tools/words_check.py prompts.md --prompts` (real-person / IP names that video models refuse, prompts that invite on-screen words, missing no-text guard). FAIL lines are fixed first.
- **After every render or AI-clip assembly:** `python tools/quality_gate.py out/<video>.mp4 [--script script.txt --speech] [--brief brief.json] [--ref <ref>/fingerprint.json]`. It measures, it does not guess: picture shorter than sound (FAIL), hook motion in 0-2 s, near-still share and static shots, same framing back to back, one-frame pops, black/frozen stretches, silences, burned-in text (Apple Vision OCR on macOS), loudness/true peak, resolution, every script line spoken as written, the user's brief targets. Read `<video>.qa/report.md`; a FAIL blocks delivery. Its "a human must still check" list goes into the delivery message.
- **Trust the analysers only after** `python tools/analysis_selftest.py` passes (8/8) on this machine and after any analyser change.
0. On a fresh PC first `node tools/smoke.mjs` (render pipeline works without a TTS engine).
1. `npx tsc --noEmit` clean · `python tools/blank_start.py <name>` reports 0 blank starts · `python tools/check_anchors.py <name>` clean (scene count = paragraph count; anchor words spoken).
2. Contact sheets (`node tools/stills.mjs <name> --scale 0.4`): for every scene look at both frames. Defects to hunt: blank first half, text on a figure, objects outside the 1920×1080 frame or under the caption pill (y > 930), overlapping text, wrong content for the spoken paragraph (shifted scenes), unreadable color on `dark`, ghost-pale icons, text wider than its box.
3. Render, then `ffprobe`/`node tools/qa.mjs`: 1080p, audio stream, duration vs target ±30 s, loudness −16 ±1.5 LUFS, true peak ≤ −1 dBTP, no silence > 2.5 s, no black frames, size.
4. Sound: no more than 2 simultaneous effects; whoosh not on every cut; music under voice. You cannot hear the audio — say so, and ask the user to listen to two spots (the hook and one random middle section).
5. Thumbnail half-second test (view at 160 px).
6. Compare against the Decision Card (length, language, title) and `knowledge/creator-playbook.md` §5 gates.

## The jury (offer it with every delivered draft; 2-3 minutes, no new render)
Answer six questions from the gate report, the contact sheet and at most three frames, each with a timecode and one sentence:
1. **Hook** - do the first 2 s show the subject acting? If not, what would?
2. **Hero moment** - where is it, and does it land harder than everything around it?
3. **Generic** - which frame could belong to any channel (template look, AI default, stock feel)?
4. **Weakest 5 seconds** - where and why (still, repeated, unclear, too long, dead air)?
5. **Sound on the picture** - do the three biggest cuts/impacts have their sound?
6. **Words** - does a line read as machine-written (`words_check.py --line`)? Is every scripted line spoken?
Then ONE honest score (5 student, 6 template, 7 solid professional, 8 agency, 9 award shortlist; first drafts usually 5-7) and at most THREE fixes, biggest first, each a timecode + what changes in numbers; at least one fix raises the wow, not only polish. Ask which fixes to apply (all three recommended); the chosen ones become `R1..Rn` below.

## Revision protocol (details in CLAUDE.md §6)
0. What the user praised is locked: fixes and re-plans keep it. Notes are saved verbatim per round in `REVISIONS.md`. A defect is diagnosed on a few test frames before anything is rebuilt.
1. Write the numbered change list `R1..Rn` with the targets (scene numbers / script lines / voice / music / thumbnail / title) and whether timing changes.
2. Ask only about ambiguous or user-owned items.
3. Edit source files only (script.txt, scenes.json, video.json, thumb.json); never edit timing.json by hand.
4. Cheapest redo path: text change → re-narrate + anchors + stills + render; visual change → stills of those scenes + render; audio-only change → render with new mix (or remux); packaging change → stills only.
5. Keep versions (`-v1-final`, `-v2-final`), append to `REVISIONS.md`, re-run the gates the change can break (always `quality_gate.py`), report verified vs not verified.
6. If the user's change contradicts a guideline, do it and note the trade-off once.

## Common fixes
- A figure overlapping text → move the text or use `s` smaller; ground label overlapping the ground line → drop `label`.
- A word anchor that Whisper misheard (e.g. "notes" → "note") is matched by stem; for totally different words pick another word in the same sentence or a numeric time.
- Long scene with nothing happening → add a `list`/`dots`/`tline` that fills on spoken words, or split the paragraph in the script (then re-narrate).
