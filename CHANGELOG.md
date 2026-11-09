# Changelog

## 2.1.0 - Discipline layer and AI-video route
- `quality_gate.py`: measured delivery gate (picture vs sound, hook motion, still share, static and repeated framings, pops, black/frozen, silences, burned-in text via Apple Vision OCR, loudness, resolution, script adherence with Whisper, brief targets, reference rhythm); FAIL blocks delivery.
- `words_check.py`: script and prompt check (clichés and machine-written tells in TR/EN, dashes, long scenes; real-person/IP names and text-inviting prompts for video models).
- `shot_review.py`: verified shot-by-shot review with the agent as the vision model (evidence, coverage, contradiction checks against the measured camera); screen-time mix, takes, hook and a per-shot-type prompt formula.
- `analysis_selftest.py`: synthetic video with known answers; every analyser is scored before it is trusted (9/9).
- `analyze_reference.py`: colour-histogram cut signal, jump-cut / generation-seam detection, takes vs shots, transcript words in the fingerprint.
- New skill `vidbucks-historical-pov` (character POV vlogs with AI video models: measured format, script engine, character lock, prompt blocks, Flow costs and failure rules); jury and gates added to `vidbucks-qa-revise`; "form, never copy" in the reference skill.
- `flow-bridge/`: Chrome extension + Python bridge for Google Flow with the user's own account; assembly fixed to use video-stream durations (the picture no longer drops after the second clip).
- Extra promo compositions registered (AiAgents, HoloPromo, DollarLira, LaptopGlass, Jerico).
- Ideas from cinecode (MIT) and rea-video (Apache-2.0) re-implemented in our own code; no files copied.

## 2.0.0 - Vidbucks
- Pluggable stack: renderer registry (Remotion, HyperFrames with a tested round trip, custom tools), `config` command, renderer-aware doctor and smoke test, `--engine custom --tts-cmd` for any voice (also in `vo_words.py`).
- New name and open-source release by The Vidbucks Authors (MIT).
- Self-guiding onboarding: `vidbucks-setup` skill, `scripts/status.mjs`, SessionStart hook, doctor with hardware detection and an ordered install plan, voice test, smoke test, and a ready announcement that asks for the first reference video.
- Reference-to-video path: `analyze_reference.py` (file and link modes, fidelity gate, side-by-side), route hints, `vidbucks-reference-to-video` skill.
- Four config-driven templates: IconStory, ObjectStory, KineticType, ParticleBloom.
- Tools: cut-outs without ML, voice-over with word timing, mood track at an exact BPM, built-in licence-free sound library generator.
- Slash commands, agent personas, checklists, plugin manifests.
