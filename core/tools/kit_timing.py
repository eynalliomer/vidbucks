#!/usr/bin/env python
"""kit_timing.py - one timing file for the kits (BoardFilm, LayerScene, Swiss): lines + Whisper word times.

  python tools/kit_timing.py --script script.txt --audio narration.wav --out videos/x/timing.json [--lang tr] [--lead 0.15] [--bpm 112]
  python tools/kit_timing.py --script script.txt --words words.json --audio narration.wav --out ...   # reuse vo_words.py output

script.txt: one narration line per paragraph (blank line between) or one per line. Whisper's words are matched to the
script's words in order (letters only, Unicode-aware), so each line gets start/end and its spoken words. Numbers spoken
as words ("bin beş yüz on üç") that Whisper writes as digits ("1513") are absorbed by the alignment.
Writes {duration, lead, bpm, lines: [{id, text, start, end, words: [[w, s, e]]}]} with all times on the VIDEO timeline
(audio times + lead)."""
import argparse, json, pathlib, re, subprocess, sys, unicodedata

ap = argparse.ArgumentParser()
ap.add_argument("--script", required=True); ap.add_argument("--audio", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--words"); ap.add_argument("--lang", default="en"); ap.add_argument("--lead", type=float, default=0.0)
ap.add_argument("--tail", type=float, default=1.0); ap.add_argument("--bpm", type=float); ap.add_argument("--model", default="small")
a = ap.parse_args()

raw = pathlib.Path(a.script).read_text(encoding="utf-8")
paras = [p.strip().replace("\n", " ") for p in re.split(r"\n\s*\n", raw) if p.strip()]
if len(paras) == 1: paras = [l.strip() for l in raw.splitlines() if l.strip()]
fold = lambda s: "".join(c for c in unicodedata.normalize("NFC", s.replace("İ", "i").replace("I", "ı").lower()) if c.isalnum())

if a.words:
    W = json.loads(pathlib.Path(a.words).read_text())
    W = W.get("words", W) if isinstance(W, dict) else W
    words = [((w.get("w") or w.get("word")).strip(), w["start"], w["end"]) for w in W]
else:
    from faster_whisper import WhisperModel
    m = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(a.audio, language=a.lang, word_timestamps=True)
    words = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]

dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.audio], capture_output=True, text=True).stdout)

# script token stream with line ids; align Whisper tokens to it greedily by letter overlap (handles digits vs words)
toks = [(i + 1, fold(w)) for i, p in enumerate(paras) for w in p.split() if fold(w)]
lines = [{"id": i + 1, "text": p, "start": None, "end": None, "words": []} for i, p in enumerate(paras)]
j = 0
for txt, s, e in words:
    f = fold(txt)
    if not f: continue
    # find the best script token in a small window ahead
    best, bj = 0, j
    for k in range(j, min(j + 8, len(toks))):
        ft = toks[k][1]; sc = 1.0 if ft == f else (0.8 if ft.startswith(f) or f.startswith(ft) else 0.0)
        if f.isdigit(): sc = max(sc, 0.5)          # a spoken number written as digits: take the next slot
        if sc > best: best, bj = sc, k
    if best == 0 and j < len(toks): bj = j
    if bj >= len(toks): bj = len(toks) - 1
    lid = toks[bj][0]; L = lines[lid - 1]
    L["words"].append([txt, round(s + a.lead, 3), round(e + a.lead, 3)])
    L["start"] = L["start"] if L["start"] is not None else round(s + a.lead, 3)
    L["end"] = round(e + a.lead, 3)
    j = bj + 1
for k, L in enumerate(lines):          # a line Whisper missed: interpolate between neighbours
    if L["start"] is None:
        prev = lines[k - 1]["end"] if k else a.lead
        nxt = next((x["start"] for x in lines[k + 1:] if x["start"] is not None), dur + a.lead)
        L["start"], L["end"] = round(prev + 0.1, 3), round(max(prev + 0.2, nxt - 0.1), 3)
        print(f"WARN line {L['id']} not heard by Whisper: interpolated", file=sys.stderr)
out = {"duration": round(dur + a.lead + a.tail, 3), "lead": a.lead, "lang": a.lang, "lines": lines}
if a.bpm: out["bpm"] = a.bpm
pathlib.Path(a.out).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(a.out).write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f"{len(lines)} lines, {len(words)} words, duration {out['duration']} s -> {a.out}")
for L in lines: print(f"  {L['id']:>3} {L['start']:7.2f}-{L['end']:7.2f}  {L['text'][:60]}")
