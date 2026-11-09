# brief.yaml reference
```yaml
name: my-video                    # output folder / file name
project: new                      # new (default) = create a fresh Flow project for this video and remember its URL here; or paste an existing https://flow.google.com/project/<id>
refs: [CHIDI, NGOZI]              # characters attached to every scene (scene-level refs: overrides)
characters:                       # created once in Flow (image generation); skipped if the name already exists
  - name: CHIDI
    description: "Photorealistic character reference. A ... man, navy polo, grey studio background, full-body and head-and-shoulders. No logos, no text."
model: omni-flash                 # omni-flash | veo-lite | veo-fast | veo-quality (Veo: 8 s only; Quality costs 100 credits per clip)
quality: 360p                     # 360p | 720p (Omni only)
aspect: 16:9                      # 16:9 | 9:16, same for every scene
duration: 10                      # default seconds per scene: Omni 4, 6, 8 or 10; Veo 8
batch: 1                          # scenes sent to the Flow agent in ONE message (parallel generation); 1 = one scene at a time
lufs: -16                         # loudness of the final mix
transition: fade                  # between scenes: none|fade|dissolve|fadeblack|fadewhite|wipeleft|wiperight|slideleft|slideright|circleopen|smoothleft
transition_duration: 0.4          # seconds (per scene you may set transition_in / transition_duration to override the cut INTO that scene)
lock: |                           # prepended to every scene prompt
  Photorealistic ... CHIDI (as the reference): ... No camera, tripod, crew or equipment visible. No music, no laugh track, no subtitles, no on-screen text.
qa:                               # optional; default off (no tokens)
  mode: claude                    # needs a logged-in `claude` CLI; uses tokens
  retries: 1
  checks: "a visible camera or tripod, burned-in text, a character whose outfit differs from ..."
  fix: "no camera, tripod, crew or equipment visible; no text or captions."
scenes:
  - id: 1
    duration: 6                   # optional, overrides the default for this scene
    refs: [CHIDI]                 # optional
    prompt: |
      Scene 1 of 6, morning. 0-3s: wide shot ... "Dialogue in quotes." 3-6s: close-up ...  (the times must add up to this scene's duration)
```
Commands: `--plan` (estimate only), `--max-credits N` (hard budget), `--yes` (auto-approve Flow's credit gate inside the budget), `--only 2,3` (regenerate only these scenes).

## mode: standard (Flow's own generation box instead of the agent)
```yaml
mode: standard      # agent off: one prompt per clip in Flow's normal box, no credit question, random 8-20 s pause between prompts
model: omni-flash   # standard mode supports this model for now
```
The settings chip (Video / aspect / 360p or 720p / seconds / x1) is set automatically and the price Flow shows (e.g. 6 credits for 8 s at 360p) is counted against `--max-credits`.
