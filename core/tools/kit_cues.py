#!/usr/bin/env python
"""kit_cues.py - every sound hit the picture makes, from the scene data (items announce their own cues).

  python tools/kit_cues.py --board videos/x/board.json --timing videos/x/timing.json --out videos/x/cues.json
  python tools/kit_cues.py --layers videos/x/layers.json --out videos/x/cues.json        # LayerScene: explicit sfx + motion starts

BoardFilm items -> cues: print pop (torn: slide), doc pop, stamp stamp, counter ticks, bigtext impact, pen marker/pencil,
string slide, route whoosh, marker pop, region whoosh; big camera moves -> whoosh. Explicit "cues" in board.json are added.
Then: python tools/sfx_synth.py --cues cues.json --duration <s> --out sfx.wav"""
import argparse, json, math, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from kittime import Clock

ap = argparse.ArgumentParser()
ap.add_argument("--board"); ap.add_argument("--layers"); ap.add_argument("--timing"); ap.add_argument("--out", required=True)
a = ap.parse_args()
cues = []
if a.board:
    b = json.loads(pathlib.Path(a.board).read_text()); clk = Clock(a.timing)
    T = lambda e, d=0.0: clk.at(e, d)
    for it in b["items"]:
        ty, t0 = it["type"], T(it.get("t_in"), 0.0)
        if it.get("sfx") is False: continue
        if ty == "print": cues.append(("slide" if it.get("torn") else "pop", t0, 0.8))
        elif ty == "doc": cues.append(("pop", t0, 0.6))
        elif ty == "card": cues.append(("pop", t0, 0.5))
        elif ty == "stamp": cues.append(("stamp", t0, 1.0))
        elif ty == "counter": cues.append(("ticks", t0, 0.6, it.get("dur", 1.0)))
        elif ty == "bigtext": cues.append(("impact", t0, 0.7))
        elif ty == "pen": cues.append(("marker" if it.get("kind") == "highlight" else "pencil", t0, 0.6, it.get("dur", 0.5)))
        elif ty == "string": cues.append(("slide", t0, 0.35, it.get("dur", 0.8)))
        elif ty == "route": cues.append(("whoosh", t0, 0.5, it.get("dur", 1.4)))
        elif ty == "marker": cues.append(("pop", t0, 0.45))
        elif ty == "region": cues.append(("whoosh", t0, 0.25, 0.5))
        if it.get("label") and ty == "print": cues.append(("snip", T(it.get("label_t"), t0 + 0.35), 0.4))
    cams = sorted((T(k["t"]), k) for k in b["camera"])
    for (t0, k0), (t1, k1) in zip(cams, cams[1:]):
        dist = math.hypot(k1["x"] - k0["x"], k1["y"] - k0["y"]) * k1["zoom"] + abs(math.log(k1["zoom"] / k0["zoom"])) * 2000
        if dist > 2600 and t1 - t0 < 2.2: cues.append(("whoosh", t0, min(0.7, dist / 9000), t1 - t0))
    for c in b.get("cues", []): cues.append((c["kind"], T(c["t"]), c.get("gain", 0.6), c.get("dur")))
if a.layers:
    p = json.loads(pathlib.Path(a.layers).read_text())
    for s in p.get("sfx", []): cues.append((s["kind"], s["time"], s.get("gain", 0.5) * 20, s.get("duration")))
out = [{"kind": c[0], "t": round(c[1], 3), "gain": round(c[2], 3), **({"dur": round(c[3], 3)} if len(c) > 3 and c[3] else {})} for c in sorted(cues, key=lambda c: c[1])]
pathlib.Path(a.out).write_text(json.dumps(out, indent=0))
from collections import Counter
print(f"{len(out)} cues ->", a.out, dict(Counter(c['kind'] for c in out)))
