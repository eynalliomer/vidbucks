---
name: vidbucks-historical-pov
description: Historical / character POV vlogs made with an AI video model (Google Flow Omni/Veo, Higgsfield, any image-to-video) at the quality of the top channels - a famous figure films their own day like a modern vlogger (selfie, servant-filmed, hidden-camera B-roll), deadpan comedy, real history underneath. Covers the measured format, the script engine, the character lock, prompt blocks, continuity by extending clips, Flow settings and costs, failure rules, and the quality gates. Use when the user asks for a "tarihi vlog", "padişah vlogu", "Elizabeth/Tudor gibi", "POV vlog", "sultan selfie", a comedic history short, or any AI-generated character vlog in that style.
---

# vidbucks-historical-pov

The format: a historical figure records a vlog of one ordinary-but-revealing day ("My Bathing Routine, 1588"). Comedy comes from status + deadpan + modern comparison; quality comes from long held takes, a consistent face, real history and zero dead air. Everything below was measured on the reference channel and on our own renders (see `knowledge/references/tudor-with-elizabeth/`).

## 1. The measured form (do not drift from it without a reason)
| measure | reference (Tudor "Armada", 10:51, verified shot review) | rule for us |
|---|---|---|
| screen time | selfie talking 79 % · third-person (servant / observer) 9 % · B-roll without the lead 11 % | ~70-80 % / 10 % / 10-15 % |
| shot length | average 13.6 s; talking takes 20-30 s held in one framing; B-roll 1-15 s | talk = 1-3 joined clips per take; B-roll 4-6 s under voice-over |
| framing | extreme close-up 65 %, close-up 16 %; the lead's hand/arm at the frame edge in selfies | open ECU, live mostly in CU |
| camera | fixed-ish 58 %, slow push / walk 38 %; view changes by turning or handing the phone, not by cutting | no cut where a turn of the phone can do it |
| opening | 29 s ECU cold open -> quick montage -> channel title card -> the day | first words in the first second; title card after the hook |
| sound | voice + many small effects, no music bed under talk | ambience per place; music only on montages |
| Shorts | vertical, burned captions (white caps, one yellow keyword) added in the edit | captions in the edit, never in the prompt |

## 2. Script engine (write the lines first, check them, then prompt)
- **Title:** "<everyday vlog trope>, <year> (<Figure> Vlog)". One topic per video, a real event or habit (e.g. Bellini painting Mehmed II, 1480).
- **Greeting** with the figure's voice of status ("Selam olsun, kullarım"), then a **myth/comment hook** ("Yorumlarda hep aynı soru…") and the promise.
- **One journey through connected places;** each clip ends on the action the next starts with.
- **Engines:** an off-screen filmer the lead talks to (a page, a lady-in-waiting) · a modern comparison ("Siz buna selfie diyorsunuz. Bizde üç ay sürüyor.") · others react (servants freeze, viziers bow too low) · the lead's deadpan one-word answers after a pause · self-aware status jokes.
- **Lines per 8 s clip:** 10-18 Turkish words, one pause, speech or a reaction until the last second (dead air was 1/3 of our first draft).
- **Outro:** a question to the comments that pays off the topic + a CTA joke in character.
- **History honesty:** every fact true or marked as legend ("rivayet") in the description; servants, pashas, painters are generic and fictional; no claims about real living people.
- **Check:** `python tools/words_check.py script.txt` before any prompt.

## 3. The character lock
- Reference sheet (front, three-quarter, profile, neutral grey) made once: Flow image mode (Nano Banana 2.1, **0 credits**, 2 variants) or Higgsfield (`gpt_image_2_6`, 0.25 credits each). Pick the variant with the most consistent face across views. Age must match the year (Mehmed II is 21 in 1453 and 48 in 1480: two different references).
- A short **lock block** pasted at the top of every prompt that shows the lead: physical description (age, nose, beard, eyes), costume (turban, colours, fur, belt), "same face and clothes in every frame", light, "real skin texture, no beauty filter", "dry deadpan humour", "speaks Turkish at a natural pace, lips synced, talking or reacting until the end", "ambient sound only, no music, no subtitles, no names, no writing or letters anywhere, no modern objects".
- **Never write the real name in the prompt** ("the sultan exactly as in the reference image"; "a bearded Ottoman ruler of about 48"). Video models refuse "recognised people" (our Flow refusal, refunded) and burn names in as captions ("SELIM", "April 1453 / Sultan Mehmed II"). `words_check.py --prompts` flags names.
- Fictional IP (Batman and similar) is never generated as itself: an original character inspired by the archetype, no emblem, no signature shapes (a bat in a circle reads as the Bat-Signal).

## 4. Prompt blocks (from the verified review's `prompt_formula.md`)
- **SELFIE:** `[lock] + arm's-length front-camera selfie, his hand at the frame edge, slight wide-angle distortion, <ECU/CU>, <place>, <light>, <action>, he says: "<line>" Beat. "<line>" + Sound: <2-3 real sounds>`
- **THIRD-PERSON:** `[lock] + medium shot as if a young page films from two metres away, slight shake, <action with other people>, he looks at the camera: "<line>"`
- **HIDDEN OBSERVER / B-ROLL:** no lock, no reference: `cinematic photorealistic B-roll, <place, year>, <subject>, slow camera move, film grain, nobody looks at the camera, off-screen a calm deep male voice says in Turkish: "<line>" + no writing anywhere`
- **CONTINUATION:** Flow editor -> timeline `+` -> **Uzat (extend)**, 8 s: `The same continuous handheld selfie continues with no cut, same man, same room, same light. <what changes> "<line>"`

## 5. Flow production (cost and failure rules)
- New project: close the agent panel and switch **Ajan off** (the agent picks Omni 1.2 720p 10 s = 30 credits per clip; one agent run cost us 180 credits for 6 clips).
- Settings: Video · İçerik öğeleri · 16:9 (long-form) or 9:16 (Shorts) · **Omni 1.1 Flash · 360p · 8 sn · x1 = 6 credits** (Omni 1.2 Flash 8 s = 8 credits; Omni 1.1 is removed on 5 Dec 2026, then 1.2 is the default). Check the price line before every send; `x2` carries over from image mode.
- Order: all reference clips first (each with the reference as ingredient), then the extensions. Extend works only with Omni 1.2; an extended clip downloads as one 16 s file at 360p (720p disabled for stacks). Normal clips: download 720p (upscaled) or 360p and upscale in the edit.
- One clip at a time, about 30-60 s apart. **Stop at the first "Olağan dışı etkinlikler tespit ettik"** (it names page-modifying browser extensions): no retry; disable extensions that inject into flow.google.com (Erasio, "Veo" download buttons, automation helpers), never run page JavaScript in the Flow tab, wait ~45 min. A "tanınmış kişiler" refusal is refunded: rewrite without the name.
- Driving Flow for the user: Claude in Chrome clicks (no script injection); the user's Chrome window must stay visible on the current Space (a hidden window stops painting and menus never open).

## 6. Edit and gates
1. Order clips; hard cuts; the 16 s extended files stay whole. Burned text: `ffmpeg delogo` on the OCR box (`quality_gate` gives time and box). Concatenate with the **concat filter** using video-stream durations (never container durations: a 0.013 s audio overhang per clip dropped the picture after 2 clips in two of our videos).
2. Upscale to 1280x720 (lanczos) for 16:9 delivery, loudnorm -16 LUFS / TP -1.5 + limiter.
3. `python tools/quality_gate.py <final>.mp4 --script script.md --speech` -> no FAIL (streams, burned text, still open, silence). Hook rule: the first 2 s must move (an ECU hold that does not move fails: start the line with a small push-in or a hand wiping the lens).
4. The jury (skill `vidbucks-qa-revise`), honest score, max 3 fixes.
5. Deliver: the file, the gate summary, the credits used, what a human must check (voice, lip sync, jokes, face consistency), history notes for the description.

## 7. Defaults when the user only says "make one"
16:9, ~60 s demo (8 clips x 8 s) before any full video, Turkish dialogue, one real event, reference character made first, cost stated before sending (~48-56 credits).
