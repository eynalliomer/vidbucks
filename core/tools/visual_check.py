#!/usr/bin/env python
"""visual_check.py - the visual treatment (visuals.json) must be specific, varied and edited, before anything renders.

  python tools/visual_check.py videos/x/visuals.json [--timing timing.json]

FAIL when: a line has no idea, or a generic one (fewer than 6 words, or only words like "text", "title", "card", "image",
"photo", "background", "graphic", "visual") · two lines share the same idea · the same shot layout runs on two lines in a row
(unless the second sets "data": {"continue": "<why>"}) · one layout covers more than a third of the lines (more than half for
films under 6 lines) · an act is shorter than 2 lines (unless it is the only act, the hook or the close) · a style changes
inside an act (styles live on acts) · a shot that needs a picture has neither "picked" nor "fallback": "procedural" ·
a layout misses its data (number: value · map: map + stops · timeline: years · list: items · ratio: fraction ·
compare: a second picture in "extra" · detail/document: region · quote: source).
WARN when: the same picture is used on more than two lines · every act uses the same style while the content changes a lot."""
import argparse, collections, json, pathlib, re, sys

ap = argparse.ArgumentParser(); ap.add_argument("visuals"); ap.add_argument("--timing"); a = ap.parse_args()
V = json.loads(pathlib.Path(a.visuals).read_text())
F, Wn = [], []
GENERIC = {"text", "title", "card", "image", "photo", "picture", "background", "graphic", "visual", "slide", "words", "metin", "başlık", "kart", "görsel", "fotoğraf", "arka", "plan", "yazı"}
NEEDS_PIC = {"photo", "detail", "split", "compare", "document", "stamp", "collage"}
NEEDS = {"number": ["value"], "map": ["map", "stops"], "timeline": ["years"], "list": ["items"], "ratio": ["fraction"], "detail": ["region"], "document": ["region"], "quote": ["source"]}
lines = V["lines"]; ids = [l["line"] for l in lines]
act_of = {}
for ac in V["acts"]:
    for lid in ac["lines"]:
        if lid in act_of: F.append(f"line {lid} is in two acts ({act_of[lid]} and {ac['id']})")
        act_of[lid] = ac["id"]
for lid in ids:
    if lid not in act_of: F.append(f"line {lid} belongs to no act")
for k, ac in enumerate(V["acts"]):
    if len(ac["lines"]) < 2 and len(V["acts"]) > 1 and k not in (0, len(V["acts"]) - 1): F.append(f"act {ac['id']} has {len(ac['lines'])} line: an act needs at least 2 (merge it)")
    if not ac.get("why"): Wn.append(f"act {ac['id']}: say why this style serves this part (\"why\")")
seen = {}
for i, l in enumerate(lines):
    idea = (l.get("idea") or "").strip(); toks = re.findall(r"[^\W_]+", idea.lower())
    if len(toks) < 6 or all(t in GENERIC for t in toks if len(t) > 2): F.append(f"line {l['line']}: idea too generic: {idea!r} - name the specific thing on screen")
    key = " ".join(toks)
    if key in seen: F.append(f"line {l['line']}: same idea as line {seen[key]}")
    seen[key] = l["line"]
    if i and l["shot"] == lines[i - 1]["shot"] and not (l.get("data") or {}).get("continue"): F.append(f"line {l['line']}: '{l['shot']}' again right after line {lines[i - 1]['line']} - vary the layout or set data.continue with the reason")
    if l["shot"] in NEEDS_PIC and not l.get("picked") and l.get("fallback") != "procedural": F.append(f"line {l['line']}: '{l['shot']}' needs a picked picture (media_hunt.py) or fallback: procedural")
    for req in NEEDS.get(l["shot"], []):
        if req not in (l.get("data") or {}): F.append(f"line {l['line']}: '{l['shot']}' needs data.{req}")
    if l["shot"] == "compare" and not l.get("extra"): F.append(f"line {l['line']}: compare needs a second picture in extra")
cnt = collections.Counter(l["shot"] for l in lines); cap = 0.5 if len(lines) < 6 else 1 / 3
for s, n in cnt.items():
    if n / len(lines) > cap + 1e-9: F.append(f"layout '{s}' covers {n} of {len(lines)} lines (max {cap:.0%}): find another way to show some of them")
pics = collections.Counter((l.get("picked") or {}).get("src") for l in lines if l.get("picked"))
for p, n in pics.items():
    if n > 2: Wn.append(f"picture {p} used on {n} lines")
if len({ac["style"] for ac in V["acts"]}) == 1 and len(V["acts"]) > 2: Wn.append("every act has the same style: fine for one format, otherwise reconsider")
for w in Wn: print("WARN", w)
for f in F: print("FAIL", f)
print(f"VISUALS {'FAIL' if F else 'PASS'}  lines={len(lines)} acts={len(V['acts'])} layouts={dict(cnt)} fail={len(F)} warn={len(Wn)}")
sys.exit(1 if F else 0)
