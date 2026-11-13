# Kokoro (Apache-2.0) narration, one line at a time with short gaps; a long gap after the promise line for the bumper.
# Line boundaries are known exactly (we concatenate the lines), so timing.json is written here: Whisper only times the
# words inside each line's own clip, which cannot drift across lines when it spells numbers its own way.
import json, pathlib, re, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
from faster_whisper import WhisperModel
D = pathlib.Path(__file__).parent; lines = [p.strip() for p in re.split(r"\n\s*\n", (D / "script.txt").read_text()) if p.strip()]
pipe = KPipeline(lang_code="a"); sr = 24000; out = []; LEAD = 0.3; GAP = {3: 3.2}
wm = WhisperModel("small", device="cpu", compute_type="int8"); pos = 0.0; tl = []
for i, l in enumerate(lines):
    au = np.concatenate([np.asarray(a) for _, _, a in pipe(l, voice=sys.argv[1] if len(sys.argv) > 1 else "am_michael", speed=1.04)]).astype(np.float32)
    a16 = np.interp(np.arange(0, len(au), sr / 16000), np.arange(len(au)), au).astype(np.float32)   # Whisper reads raw arrays as 16 kHz
    segs, _ = wm.transcribe(a16, language="en", word_timestamps=True)
    words = [[w.word.strip(), round(LEAD + pos + w.start, 3), round(LEAD + pos + w.end, 3)] for s in segs for w in s.words]
    dur = len(au) / sr; tl.append({"id": i + 1, "text": l, "start": round(LEAD + pos, 3), "end": round(LEAD + pos + dur, 3), "words": words})
    gap = GAP.get(i, 0.32) if i < len(lines) - 1 else 0
    out += [au, np.zeros(int(sr * gap), dtype=np.float32)]; pos += dur + gap
sf.write(D / "narration.wav", np.concatenate(out), sr)
json.dump({"duration": round(LEAD + pos + 1.0, 3), "lead": LEAD, "lang": "en", "lines": tl}, open(D / "timing.json", "w"), indent=1)
print("seconds", round(pos, 1)); [print(x["id"], x["start"], x["end"], len(x["words"]), len(x["text"].split())) for x in tl]
