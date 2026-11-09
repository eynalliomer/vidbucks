---
name: flow-brief
description: Turn a topic into a brief.yaml for the Vidbucks Flow Bridge (characters, locked style block, scene prompts with chosen durations). Use when the user wants a Flow video made from a topic, story or reference analysis. Claude only writes the brief; the extension and Python generate, download and edit.
---

# flow-brief

Your whole job is to write ONE file, `flow-bridge/briefs/<name>.yaml`, then tell the user the two commands to run.
Do not generate, download or edit anything yourself: that is what the extension and `make_video.py` do without using tokens.

## Steps
1. Ask only what is missing and user-owned: topic/story, language of the dialogue, number of scenes (default 6 = one minute), tone. Everything else, decide.
2. Write `briefs/<name>.yaml` (schema in `BRIEF.md`).
3. Run `python3 make_video.py briefs/<name>.yaml --plan` and show the credit estimate.
4. Tell the user: open a Flow project tab, run `python3 doctor.py`, then
   `python3 make_video.py briefs/<name>.yaml --max-credits <estimate+10%> --yes`.
   Credits are theirs; never raise the budget on your own.

## Brief rules (learned the hard way)
- Duration is chosen per scene (`duration:`; Omni 1.1 Flash: 4, 6, 8 or 10 s; Veo 3.1 models: 8 s only). Default 10. Shot times in the prompt must add up to that duration ("0-3s: wide ...", "3-6s: close-up ..."). Rough speech budget: ~2.5 words per second, at most 2 speakers. Longer duration costs more credits (360p: 4 s=4, 6 s=5, 8 s=6, 10 s=7; 720p: 7/10/12/15 - the agent's price list, only 360p/10 s verified).
- `model: omni-flash` (default), `quality: 360p|720p`, `aspect: 16:9|9:16` at brief level; all scenes share one aspect.
- `characters:` one entry per recurring person. Each description states ONE fixed outfit, hair and skin tone in plain words, neutral grey studio background, full-body + head-and-shoulders, "No logos, no text." Never use real people or celebrities.
- `refs:` the character names. Each scene may override with its own `refs:`.
- `lock:` a block pasted before every scene. It repeats the outfits ("CHIDI (as the reference): ..."), the location described in words, light, 16:9 and ALWAYS: "No camera, tripod, film crew or equipment visible. No music, no laugh track, no subtitles, no on-screen text."
  - Do not write "locked tripod camera": the model draws a tripod. Write "locked framing".
- If a character's outfit drifted in a scene, say it again inside that scene's prompt in capitals ("NGOZI must wear the MUSTARD-YELLOW top ... not beige").
- Locations are described in `lock:` words only. The extension cannot create location images yet.
- Dialogue in the user's language; everything else (prompts, YAML keys) in English.
- Fictional characters only; no copyrighted music/footage; no logos.
- QA is off by default. Set `qa: {mode: claude, checks: "...", retries: 1}` only if the user wants frame checks (it uses Claude tokens and needs `claude` logged in).
