#!/usr/bin/env python
"""variety_check.py - refuses sameness: inside a film and across a batch of films.

  python tools/variety_check.py videos/films/*/visuals.json          # a batch
  python tools/variety_check.py videos/x/visuals.json                # one film

Each act's DIRECTION is read as it will be drawn (line > act > the style's default from ShotFilm's STYLE_DIRECTION):
camera · enter · frame · caption · display font · sound palette. Inside a film: FAIL when two neighbouring acts share
camera+enter+frame (the act change would be a colour change only); WARN when one scene type carries more than 40 % of
the lines or one scene repeats back to back. Across films: every pair is scored on the share of dimensions their main
acts have in common (camera, enter, frame, caption, font, palette, the top-3 scenes); >= 0.7 FAIL, >= 0.5 WARN.
Variety is not decoration: a film may still be one act in one direction - the check is about films looking like each other."""
import collections, itertools, json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "src/kits/shots/ShotFilm.tsx").read_text()
SD = {m.group(1): json.loads("[" + m.group(2) + "]") for m in re.finditer(r'"?([a-z0-9-]+)"?: \[("[a-z]+"(?:, "[a-z]+")*)\]', src.split("STYLE_DIRECTION")[1].split("};")[0])}
sys.path.insert(0, str(ROOT / "videos/films"))
try: from audio_all import STYLE_PAL
except Exception: STYLE_PAL = {}


def act_dir(V, a):
    d = SD.get(a["style"], ["kenburns", "slide", "bleed", "lower", "?", "?"]); x = a.get("direction") or {}; f = x.get("fonts") or {}
    return {"camera": x.get("camera", d[0]), "enter": x.get("enter", d[1]), "frame": x.get("frame", d[2]), "caption": x.get("caption", d[3]), "font": f.get("display", d[4] if len(d) > 4 else "?"),
            "sound": x.get("sound") or (V.get("sound") or {}).get("palette") or STYLE_PAL.get(a["style"], "soft")}


def film(path):
    V = json.loads(pathlib.Path(path).read_text()); acts = [(a, act_dir(V, a)) for a in V["acts"]]; shots = [l["shot"] for l in V["lines"]]
    main = max(acts, key=lambda p: len(p[0]["lines"]))[1]
    return {"name": pathlib.Path(path).parent.name, "acts": acts, "shots": shots, "main": main, "top": [s for s, _ in collections.Counter(shots).most_common(3)], "styles": [a["style"] for a in V["acts"]]}


fails = warns = 0
films = [film(p) for p in sys.argv[1:]]
for f in films:
    msgs = []
    for (a, da), (b, db) in zip(f["acts"], f["acts"][1:]):
        if all(da[k] == db[k] for k in ("camera", "enter", "frame")): msgs.append(("FAIL", f"acts {a['id']} and {b['id']} move alike ({da['camera']}/{da['enter']}/{da['frame']}): only the colours change"))
    cnt = collections.Counter(f["shots"]); top, n = cnt.most_common(1)[0]
    if len(f["shots"]) >= 5 and n / len(f["shots"]) > 0.4: msgs.append(("WARN", f"scene '{top}' carries {n}/{len(f['shots'])} lines"))
    for i, (x, y) in enumerate(zip(f["shots"], f["shots"][1:])):
        if x == y: msgs.append(("WARN", f"scene '{x}' twice in a row (lines {i + 1}-{i + 2})"))
    d = f["main"]; print(f"{f['name']:<11} {'/'.join(f['styles']):<58} {d['camera']:<8} {d['enter']:<9} {d['frame']:<8} {d['caption']:<10} {d['font']:<9} {d['sound']:<9} scenes={len(set(f['shots']))}/{len(f['shots'])}")
    for sev, m in msgs: print(f"   {sev} {m}"); fails += sev == "FAIL"; warns += sev == "WARN"
for a, b in itertools.combinations(films, 2):
    dims = [a["main"][k] == b["main"][k] for k in ("camera", "enter", "frame", "caption", "font", "sound")] + [len(set(a["top"]) & set(b["top"])) >= 2]
    sc = sum(dims) / len(dims)
    if sc >= 0.5: sev = "FAIL" if sc >= 0.7 else "WARN"; print(f"   {sev} {a['name']} ~ {b['name']}: {sc:.0%} of their direction is the same"); fails += sev == "FAIL"; warns += sev == "WARN"
if len(films) > 1:
    for k in ("camera", "enter", "frame", "caption", "font", "sound"): print(f"   pool {k:<8}", dict(collections.Counter(f["main"][k] for f in films)))
print(f"VARIETY {'FAIL' if fails else 'PASS'}  films={len(films)} fail={fails} warn={warns}"); sys.exit(1 if fails else 0)
