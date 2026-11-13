#!/usr/bin/env python
"""director_train.py - measure and teach the style director against a gold set (knowledge/director/gold/*.json).

  python tools/director_train.py eval                 # accuracy of the current params on every gold topic
  python tools/director_train.py cv [--folds 5]       # train on k-1 folds, test on the held-out fold (honest accuracy)
  python tools/director_train.py train [--save]       # train on everything, write core/styles/director_params.json

Metrics per topic: style (lines whose style is the gold style), style_ok (gold or an accepted alternative), act boundary F1
(±0 lines), n_styles error, layout (gold best), layout_ok (best or accepted). Training = perceptron updates of the
style-content deltas and layout-content weights on wrong lines, then a grid search of switch_cost, min_lines, topic_w,
bookend and repeat_penalty. A gold file: {topic, lines[], acts[{lines, style, ok[], why}], layouts[{best, ok[]}]}."""
import argparse, copy, itertools, json, pathlib, random, statistics, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from director_core import ATTR, DEFAULT, LAYOUTS, Model as _Model, ROOT, lib_examples, load_params, unit
LIB = []
Model = lambda p=None: _Model(p, library=LIB)

GOLD = sorted((ROOT.parent / "knowledge" / "director" / "gold").glob("*.json"))
DATA = [json.loads(p.read_text()) for p in GOLD]                                         # the exam (never trained on in "exam")
TRAIN = [json.loads(p.read_text()) for p in sorted((ROOT.parent / "knowledge" / "director" / "train").glob("*.json"))]
ap = argparse.ArgumentParser(); ap.add_argument("cmd", choices=["eval", "cv", "train", "exam", "score"]); ap.add_argument("--pred"); ap.add_argument("--style-learn", action="store_true"); ap.add_argument("--folds", type=int, default=5)
ap.add_argument("--epochs", type=int, default=12); ap.add_argument("--lr", type=float, default=0.25); ap.add_argument("--save", action="store_true")
ap.add_argument("--from-scratch", action="store_true", help="start from defaults, not the saved params")
a = ap.parse_args()


def line_styles(acts, n):
    out = [None] * n
    for ac in acts:
        for l in ac["lines"]: out[l - 1] = ac["style"]
    return out


def bounds(acts): return {ac["lines"][0] for ac in acts[1:]}


def score(model, g):
    n = len(g["lines"]); pr = model.direct(g["lines"], g["topic"], g.get("format", "auto"))
    ps, gs = line_styles(pr["acts"], n), line_styles(g["acts"], n)
    ok = [set([ac["style"]] + ac.get("ok", [])) for ac in g["acts"] for _ in ac["lines"]]
    pb, gb = bounds(pr["acts"]), bounds(g["acts"])
    tp = len(pb & gb); prec = tp / len(pb) if pb else (1.0 if not gb else 0.0); rec = tp / len(gb) if gb else (1.0 if not pb else 0.0)
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    lay = pr["layouts"]
    r3 = []      # recall@3 on the GOLD acts: is the gold (or an accepted) style among the 3 best for that act?
    for ac in g["acts"]:
        tot = sorted(((sum(pr["_sc"][q - 1][j] for q in ac["lines"]), sid) for j, sid in enumerate(pr["_ids"])), reverse=True)[:3]
        top = {sid for _, sid in tot}; r3.append(1.0 if top & ({ac["style"]} | set(ac.get("ok", []))) else 0.0)
    return {"style": sum(p == q for p, q in zip(ps, gs)) / n, "style_ok": sum(p in o for p, o in zip(ps, ok)) / n, "bound_f1": f1,
            "n_err": abs(len({x["style"] for x in pr["acts"]}) - len({x["style"] for x in g["acts"]})),
            "layout": sum(l == y["best"] for l, y in zip(lay, g["layouts"])) / n, "layout_ok": sum(l == y["best"] or l in y["ok"] for l, y in zip(lay, g["layouts"])) / n,
            "r3": statistics.mean(r3), "pred": pr}


def summary(model, data):
    rs = [score(model, g) for g in data]
    return {k: round(statistics.mean(r[k] for r in rs), 3) for k in ("style", "style_ok", "r3", "bound_f1", "n_err", "layout", "layout_ok")}, rs


def objective(s): return 1.2 * s["r3"] + s["style_ok"] + 0.4 * s["style"] + 0.5 * s["bound_f1"] - 0.15 * s["n_err"] + 0.5 * s["layout_ok"] + 0.3 * s["layout"]


STYLE_LEARN = False   # per-style/attribute weights memorise 10 topics; styles are taught by the rubric + learned scalars


def perceptron(params, data, epochs, lr):
    p = copy.deepcopy(params)
    for ep in range(epochs):
        random.Random(ep).shuffle(data := list(data))
        changed = 0
        for g in data:
            m = Model(p); n = len(g["lines"]); pr = m.direct(g["lines"], g["topic"], g.get("format", "auto"))
            ps, gs = line_styles(pr["acts"], n), line_styles(g["acts"], n)
            okset = [set([ac["style"]] + ac.get("ok", [])) for ac in g["acts"] for _ in ac["lines"]]
            for i, f in enumerate(pr["features"]):
                fu = unit(f) if f else {}
                if STYLE_LEARN and ps[i] not in okset[i]:
                    # shared update: content -> attributes the gold style has and the predicted one lacks (and vice versa)
                    ga, pa = ATTR.get(gs[i], set()), ATTR.get(ps[i], set())
                    for k, v in fu.items():
                        for at in ga - pa: p["attr_w"].setdefault(k, {})[at] = p["attr_w"].get(k, {}).get(at, 0) + lr * v
                        for at in pa - ga: p["attr_w"].setdefault(k, {})[at] = p["attr_w"].get(k, {}).get(at, 0) - lr * v
                    p["style_bias"][gs[i]] = p["style_bias"].get(gs[i], 0) + 0.02; p["style_bias"][ps[i]] = p["style_bias"].get(ps[i], 0) - 0.02
                    changed += 1
                gl, pl = g["layouts"][i]["best"], pr["layouts"][i]
                if pl != gl and pl not in g["layouts"][i]["ok"]:
                    for k, v in fu.items():
                        p["layout_w"].setdefault(gl, {})[k] = p["layout_w"].get(gl, {}).get(k, 0) + lr * v
                        p["layout_w"].setdefault(pl, {})[k] = p["layout_w"].get(pl, {}).get(k, 0) - lr * v
                    changed += 1
        for key in ("attr_w", "layout_w"):
            for kk in p[key]:
                for a2 in p[key][kk]: p[key][kk][a2] *= 0.97
        if not changed: break
    return p


SPACE = {"knn_w": [0.0, 1.0, 2.0, 4.0], "knn_k": [3, 6, 10], "knn_pow": [1.0, 2.0, 4.0], "era_carry": [0.0, 0.6, 1.0, 1.5], "w_reg": [0.0, 0.5, 1.0, 2.0], "w_era": [0.0, 0.5, 1.0, 2.0], "suits_w": [0.0, 0.5, 1.0], "switch_cost": [0.15, 0.3, 0.45, 0.7, 1.0, 1.5], "min_lines": [1, 2, 3], "topic_w": [0.2, 0.45, 0.8], "bookend": [0.0, 0.25, 0.6], "repeat_penalty": [0.5, 1.0, 2.0]}


def grid(params, data):
    """coordinate ascent over the scalar params (a few sweeps instead of the full product)"""
    ev = (lambda q: globals()["summary_train"](q)) if "summary_train" in globals() else (lambda q: summary(Model(q), data)[0])
    p = dict(params); best = objective(ev(p))
    for _ in range(2):
        for k, vals in SPACE.items():
            for v in vals:
                q = {**p, k: v}; o = objective(ev(q))
                if o > best + 1e-9: best, p = o, q
    return p


def fit(data, start):
    p = grid(start, data)
    for _ in range(3):
        p = perceptron(p, data, a.epochs, a.lr); p = grid(p, data)
    return p


STYLE_LEARN = a.style_learn
start = {**DEFAULT, **({} if a.from_scratch else load_params())}
start = {**start, **{k: copy.deepcopy(start.get(k, {})) for k in ("suits_delta", "layout_w", "attr_w", "style_bias")}}
if a.cmd == "eval":
    s, rs = summary(Model(start), DATA)
    for g, r in zip(DATA, rs):
        pa = " | ".join(f"{ac['lines'][0]}-{ac['lines'][-1]}:{ac['style']}" for ac in r["pred"]["acts"])
        ga = " | ".join(f"{ac['lines'][0]}-{ac['lines'][-1]}:{ac['style']}" for ac in g["acts"])
        print(f"{g['slug']:<10} style {r['style']:.2f} ok {r['style_ok']:.2f} f1 {r['bound_f1']:.2f} lay {r['layout']:.2f}/{r['layout_ok']:.2f}\n    pred {pa}\n    gold {ga}\n    lay  {' '.join(r['pred']['layouts'])}\n    gold {' '.join(x['best'] for x in g['layouts'])}")
    print("MEAN", s, "objective", round(objective(s), 3))
elif a.cmd == "cv":
    idx = list(range(len(DATA))); random.Random(7).shuffle(idx); folds = [idx[i::a.folds] for i in range(a.folds)]
    base_test, test, train = [], [], []
    for k, fo in enumerate(folds):
        tr = [DATA[i] for i in idx if i not in fo]; te = [DATA[i] for i in fo]
        base = {**DEFAULT, "suits_delta": {}, "layout_w": {}, "attr_w": {}, "style_bias": {}}
        p = fit(tr, base)
        b, _ = summary(Model(base), te); s, _ = summary(Model(p), te); t, _ = summary(Model(p), tr)
        base_test.append(b); test.append(s); train.append(t)
        print(f"fold {k}: held-out {[DATA[i]['slug'] for i in fo]}  base {b}  ->  trained {s}")
    mean = lambda L: {k: round(statistics.mean(x[k] for x in L), 3) for k in L[0]}
    print("BASELINE held-out", mean(base_test)); print("TRAINED  held-out", mean(test)); print("TRAINED  train   ", mean(train))
elif a.cmd == "score":
    P = json.loads(pathlib.Path(a.pred).read_text()); rows = []
    for g in DATA:
        pr = P[g["slug"]]; n = len(g["lines"])
        ps, gs = line_styles(pr["acts"], n), line_styles(g["acts"], n)
        okset = [set([ac["style"]] + ac.get("ok", [])) for ac in g["acts"] for _ in ac["lines"]]
        pb, gb = bounds(pr["acts"]), bounds(g["acts"]); tp = len(pb & gb)
        prec = tp / len(pb) if pb else (1.0 if not gb else 0.0); rec = tp / len(gb) if gb else (1.0 if not pb else 0.0)
        r3 = []
        for ac in g["acts"]:
            cand = set()
            for x in pr["acts"]:
                if set(x["lines"]) & set(ac["lines"]): cand |= {x["style"], *x.get("alternatives", [])}
            r3.append(1.0 if cand & ({ac["style"]} | set(ac.get("ok", []))) else 0.0)
        lay = pr["layouts"]
        r = {"style": sum(x == y for x, y in zip(ps, gs)) / n, "style_ok": sum(x in o for x, o in zip(ps, okset)) / n, "r3": statistics.mean(r3),
             "bound_f1": 2 * prec * rec / (prec + rec) if prec + rec else 0.0, "n_err": abs(len({x["style"] for x in pr["acts"]}) - len({x["style"] for x in g["acts"]})),
             "layout": sum(l == y["best"] for l, y in zip(lay, g["layouts"])) / n, "layout_ok": sum(l == y["best"] or l in y["ok"] for l, y in zip(lay, g["layouts"])) / n}
        rows.append(r)
        print(f"{g['slug']:<10} style {r['style']:.2f} ok {r['style_ok']:.2f} r3 {r['r3']:.2f} f1 {r['bound_f1']:.2f} lay {r['layout']:.2f}/{r['layout_ok']:.2f}  pred "
              + " | ".join(f"{x['lines'][0]}-{x['lines'][-1]}:{x['style']}" for x in pr["acts"]) + "   gold " + " | ".join(f"{x['lines'][0]}-{x['lines'][-1]}:{x['style']}" for x in g["acts"]))
    print("MEAN", {k: round(statistics.mean(r[k] for r in rows), 3) for k in rows[0]})
elif a.cmd == "exam":
    base = {**DEFAULT, "suits_delta": {}, "layout_w": {}, "attr_w": {}, "style_bias": {}}
    b, _ = summary(Model({**base, "knn_w": 0}), DATA)
    # the library while fitting: leave-one-topic-out inside TRAIN, so the knn weights are tuned on unseen topics too
    LIB[:] = lib_examples(TRAIN)
    def loo_summary(p):
        rs = []
        for g in TRAIN:
            LIB[:] = [e for e in lib_examples(TRAIN) if e[3] != g["slug"]]; rs.append(score(Model(p), g))
        LIB[:] = lib_examples(TRAIN)
        return {k: round(statistics.mean(r[k] for r in rs), 3) for k in ("style", "style_ok", "r3", "bound_f1", "n_err", "layout", "layout_ok")}
    globals()["summary_train"] = loo_summary
    p = fit(TRAIN, base); t, _ = summary(Model(p), TRAIN); s, rs = summary(Model(p), DATA)
    print("EXAM (10 unseen topics)  before", b); print("EXAM (10 unseen topics)  after ", s); print("train (20 topics)        after ", t)
    print("learned scalars", {k: p[k] for k in ("knn_w", "knn_k", "knn_pow", "switch_cost", "min_lines", "topic_w", "bookend", "repeat_penalty", "w_reg", "w_era", "suits_w", "era_carry")})
    for g, r in zip(DATA, rs): print(f"  {g['slug']:<10} style {r['style']:.2f} ok {r['style_ok']:.2f} f1 {r['bound_f1']:.2f} lay {r['layout_ok']:.2f}  pred " + " | ".join(f"{x['lines'][0]}-{x['lines'][-1]}:{x['style']}" for x in r['pred']['acts']))
    if a.save:
        out = ROOT / "styles" / "director_params.json"; out.write_text(json.dumps({k: v for k, v in p.items() if k in DEFAULT}, ensure_ascii=False, indent=1)); print("saved", out)
else:
    p = fit(DATA + TRAIN, start)
    s, _ = summary(Model(p), DATA); print("TRAINED on all", s, "objective", round(objective(s), 3))
    if a.save:
        out = ROOT / "styles" / "director_params.json"
        keep = {k: v for k, v in p.items() if k in DEFAULT}
        out.write_text(json.dumps(keep, ensure_ascii=False, indent=1)); print("saved", out)
