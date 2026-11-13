#!/usr/bin/env python
"""director_cases.py - the director's memory: approved films become worked cases that teach the next decisions.

  python tools/director_cases.py add  --visuals videos/x/visuals.json --timing videos/x/timing.json --topic "..." [--slug x]
  python tools/director_cases.py similar --script script.txt --topic "..." [--k 5]     # the closest cases to read first
  python tools/director_cases.py list

add      turns an APPROVED film's visual treatment into knowledge/director/cases/<slug>.json (acts with style + why, layouts
         per line, the lines). Only add films the user approved: the cases are the taste the director learns.
similar  ranks the cases by content similarity to a new script (Unicode-aware features from director_core) so the agent
         reads the most relevant ones before deciding (GUIDE.md section 1-3).
The blind-exam result that justified this design: agent + GUIDE.md + 20 cases scored 83 % acceptable styles and 100 %
shortlist recall on 10 unseen topics, against 57-61 % for weight-trained models (knowledge/director/RESULTS.md)."""
import argparse, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from director_core import ROOT, cached_features, ctx_vec

CASES = ROOT.parent / "knowledge" / "director" / "cases"
ap = argparse.ArgumentParser(); ap.add_argument("cmd", choices=["add", "similar", "list"])
ap.add_argument("--visuals"); ap.add_argument("--timing"); ap.add_argument("--topic", default=""); ap.add_argument("--slug"); ap.add_argument("--script"); ap.add_argument("--k", type=int, default=5)
a = ap.parse_args()


def vec(lines, topic):
    F, FT = cached_features(lines, topic); tot = {}
    for f in F:
        for k, v in ctx_vec(f, FT, F).items(): tot[k] = tot.get(k, 0) + v
    import math
    n = math.sqrt(sum(v * v for v in tot.values())) or 1
    return {k: v / n for k, v in tot.items()}


if a.cmd == "add":
    V = json.loads(pathlib.Path(a.visuals).read_text()); T = json.loads(pathlib.Path(a.timing).read_text())
    text = {l["id"]: l["text"] for l in T["lines"]}
    case = {"slug": a.slug or pathlib.Path(a.visuals).parent.name, "topic": a.topic, "lang": T.get("lang", "tr"), "format": "auto",
            "lines": [text[l["line"]] for l in V["lines"]],
            "acts": [{"lines": [V["lines"].index(next(x for x in V["lines"] if x["line"] == ln)) + 1 for ln in ac["lines"]], "style": ac["style"], "ok": ac.get("ok", []), "why": ac.get("why", "")} for ac in V["acts"]],
            "layouts": [{"best": l["shot"], "ok": []} for l in V["lines"]], "ideas": [l["idea"] for l in V["lines"]], "approved": True}
    CASES.mkdir(parents=True, exist_ok=True); out = CASES / f"{case['slug']}.json"
    out.write_text(json.dumps(case, ensure_ascii=False, indent=1)); print("case added:", out)
elif a.cmd == "similar":
    raw = pathlib.Path(a.script).read_text(encoding="utf-8")
    import re
    lines = [p.strip().replace("\n", " ") for p in re.split(r"\n\s*\n", raw) if p.strip()]
    if len(lines) == 1: lines = [l.strip() for l in raw.splitlines() if l.strip()]
    q = vec(lines, a.topic); rows = []
    for f in sorted(CASES.glob("*.json")):
        c = json.loads(f.read_text()); v = vec(c["lines"], c["topic"])
        rows.append((sum(q.get(k, 0) * x for k, x in v.items()), c))
    for s, c in sorted(rows, key=lambda r: -r[0])[: a.k]:
        print(f"{s:.2f}  {c['slug']:<12} {c['topic'][:40]:<40} " + " | ".join(f"{x['lines'][0]}-{x['lines'][-1]}:{x['style']}" for x in c["acts"]))
else:
    for f in sorted(CASES.glob("*.json")):
        c = json.loads(f.read_text()); print(f"{c['slug']:<12} {'approved' if c.get('approved') else 'taught':<9} {c['topic']}")
