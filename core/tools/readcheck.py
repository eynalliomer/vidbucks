#!/usr/bin/env python
"""readcheck.py - every text a viewer must read stays on screen long enough to read it.

  python tools/readcheck.py --captions videos/x/layers.json            # LayerScene captions
  python tools/readcheck.py --timing videos/x/timing.json [--hold-to-next]   # statements built from narration lines
  python tools/readcheck.py --texts texts.json                          # [{text, start, end, pass?}] any on-screen text

Rule (per text): need = 1.5 s + Latin/Cyrillic letters / 15 per s + CJK characters / 4.5 per s (a settled, readable
text; flashing does not count). "pass": true marks text not meant to be read in full (fine print passing by).
Captions (--captions) are speech subtitles: need = letters / --subtitle-cps (default 20), at least 0.7 s.
With --timing each line counts from its start to the next line's start (the statement stays until the next one)."""
import argparse, json, pathlib, sys, unicodedata

ap = argparse.ArgumentParser(); ap.add_argument("--captions"); ap.add_argument("--timing"); ap.add_argument("--texts")
ap.add_argument("--latin-cps", type=float, default=15); ap.add_argument("--cjk-cps", type=float, default=4.5); ap.add_argument("--base", type=float, default=1.5)
ap.add_argument("--subtitle-cps", type=float, default=20, help="captions synced to speech: letters per second (no base)")
a = ap.parse_args()
items = []
if a.captions:
    for c in json.loads(pathlib.Path(a.captions).read_text())["captions"]: items.append((c["text"], c["start"], c["end"], "sub"))
if a.timing:
    t = json.loads(pathlib.Path(a.timing).read_text()); ls = t["lines"]
    for i, l in enumerate(ls): items.append((l["text"], l["start"], ls[i + 1]["start"] if i + 1 < len(ls) else t["duration"], False))
if a.texts:
    for x in json.loads(pathlib.Path(a.texts).read_text()): items.append((x["text"], x["start"], x["end"], x.get("pass", False)))
bad = 0
for text, s, e, skip in items:
    cjk = sum(1 for ch in text if "CJK" in unicodedata.name(ch, ""))
    lat = sum(1 for ch in text if ch.isalnum()) - cjk
    need = max(0.7, (lat + cjk * 3) / a.subtitle_cps) if skip == "sub" else a.base + lat / a.latin_cps + cjk / a.cjk_cps; got = e - s
    ok = (skip is True) or got + 1e-6 >= need; bad += not ok
    print(f"{'OK ' if ok else 'BAD'} {s:7.2f}s {len(text):3d} chars need {need:4.2f}s got {got:4.2f}s  {text[:48]!r}")
print(f"READCHECK {'PASS' if not bad else 'FAIL'}: {bad} of {len(items)} too short")
sys.exit(1 if bad else 0)
