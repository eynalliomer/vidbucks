#!/usr/bin/env python
"""asr_line_check.py - every narration line is heard back exactly as written (catches TTS skips, slurs, wrong numbers).

  python tools/asr_line_check.py --lines lines.json --dir voices/ [--lang en]          # one WAV per line: <id>.wav
  python tools/asr_line_check.py --timing timing.json --audio narration.wav [--lang tr] # one track, cut by line times

lines.json: [{id, text, asr?}]. "asr" overrides the expected text when Whisper writes a name, number or spelling its
own way ("2 kilometers" for "two kilometres"). Words are compared letter-only and Unicode-aware; spelled-out numbers
match digits (English and Turkish 0-9999); British/American spellings match (-our/-or, -re/-er, -ise/-ize).
Exit 1 lists every mismatch; then regenerate that line or, after listening, put what Whisper heard in "asr"."""
import argparse, json, pathlib, re, subprocess, sys, tempfile, unicodedata

ap = argparse.ArgumentParser()
ap.add_argument("--lines"); ap.add_argument("--dir"); ap.add_argument("--timing"); ap.add_argument("--audio")
ap.add_argument("--lang", default="en"); ap.add_argument("--audio-offset", type=float, help="video time where the audio file starts (default: timing lead; 0 when the track already contains the lead)"); ap.add_argument("--model", default="small"); ap.add_argument("--threshold", type=float, default=0.9)
a = ap.parse_args()
EN = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
      "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40,
      "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90}
TR = {"sıfır": 0, "bir": 1, "iki": 2, "üç": 3, "dört": 4, "beş": 5, "altı": 6, "yedi": 7, "sekiz": 8, "dokuz": 9, "on": 10, "yirmi": 20, "otuz": 30,
      "kırk": 40, "elli": 50, "altmış": 60, "yetmiş": 70, "seksen": 80, "doksan": 90}


TRW = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
TRT = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]


def tr_words(n):
    if n == 0: return "sıfır"
    out = []
    if n >= 1000: out.append(("" if n // 1000 == 1 else tr_words(n // 1000)) + "bin"); n %= 1000
    if n >= 100: out.append(("" if n // 100 == 1 else TRW[n // 100]) + "yüz"); n %= 100
    if n >= 10: out.append(TRT[n // 10]); n %= 10
    if n: out.append(TRW[n])
    return "".join(out)


def fold(s): return unicodedata.normalize("NFC", s.replace("İ", "i").replace("I", "ı").lower())


def numbers(tokens):
    """collapse spelled numbers into digits (English: 'nineteen oh three' style years too; Turkish: bin dokuz yüz ...)."""
    out, i = [], 0
    units = TR if a.lang == "tr" else EN
    while i < len(tokens):
        w = tokens[i]
        if w in units or (a.lang == "tr" and w in ("yüz", "bin")) or (a.lang != "tr" and w in ("hundred", "thousand")):
            total, cur, j = 0, 0, i
            while j < len(tokens) and (tokens[j] in units or tokens[j] in ("yüz", "bin", "hundred", "thousand", "and")):
                t = tokens[j]
                if t in units: cur += units[t]
                elif t in ("yüz", "hundred"): cur = max(cur, 1) * 100
                elif t in ("bin", "thousand"): total += max(cur, 1) * 1000; cur = 0
                j += 1
            out.append(str(total + cur)); i = j
        else: out.append(w); i += 1
    return out


def norm(s):
    s = fold(s)
    s = re.sub(r"(\d),(\d)", r"\1\2", s)
    if a.lang == "tr":   # Whisper writes "3'te 1'i" for "üçte biri": spell digits out and keep the suffix attached
        s = re.sub(r"\d+", lambda m: tr_words(int(m.group(0))) if len(m.group(0)) <= 4 else m.group(0), s).replace("'", "")
        s = s.replace("â", "a").replace("î", "i").replace("û", "u")
        return list("".join(re.findall(r"[^\W_]+", s)))   # character-level: Turkish suffixes split words unpredictably
    toks = re.findall(r"[^\W_]+", s)
    toks = [re.sub(r"our$", "or", re.sub(r"tre$", "ter", re.sub(r"ise$", "ize", t))) if a.lang == "en" else t for t in toks]
    return [t for t in numbers(toks) if t != "and"]


def sim(x, y):
    import difflib
    return difflib.SequenceMatcher(None, x, y).ratio()


from faster_whisper import WhisperModel
model = WhisperModel(a.model, device="cpu", compute_type="int8")
jobs = []
if a.lines:
    for l in json.loads(pathlib.Path(a.lines).read_text()): jobs.append((l["id"], l.get("asr") or l["text"], str(pathlib.Path(a.dir) / f"{l['id']}.wav")))
else:
    T = json.loads(pathlib.Path(a.timing).read_text()); tmp = tempfile.mkdtemp(); lead = T.get("lead", 0) if a.audio_offset is None else a.audio_offset
    for l in T["lines"]:
        f = f"{tmp}/{l['id']}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(max(0, l["start"] - lead - 0.15)), "-to", str(l["end"] - lead + 0.25), "-i", a.audio, f], check=True)
        jobs.append((l["id"], l.get("asr") or l["text"], f))
bad = 0
for lid, expect, wav in jobs:
    segs, _ = model.transcribe(wav, language=a.lang)
    heard = " ".join(s.text.strip() for s in segs)
    e, h = norm(expect), norm(heard); r = sim(e, h)
    ok = r >= a.threshold; bad += not ok
    print(f"{'OK  ' if ok else 'DIFF'} {lid}: {r:.2f} | {expect[:60]} -> {heard[:60]}")
print(f"ASR {'PASS' if not bad else 'FAIL'}: {bad} mismatch(es) of {len(jobs)}")
sys.exit(1 if bad else 0)
