#!/usr/bin/env python
"""style_director.py - decide which style(s) a film uses, segment by segment, from its topic and the content of each line.

  python tools/style_director.py --timing videos/x/timing.json [--brief videos/x/brief.json] --out videos/x/plan.json [--explain]

No fixed number of styles: the count comes out of the content. Each line is analysed (numbers, years, money, places,
process, comparison, quotes/documents, people, emotion, humour, tech, science, history, nature, product, warning,
mystery, title/closing). Lines with a similar profile form a segment; a new segment (and maybe a new style) starts only
when the content really changes and the current one has run long enough. Every style switch pays --switch-cost, and a
new style must beat staying in the current one by that much, so a uniform script stays in ONE style and a varied one
earns several. A brief can lock the format:
  brief.json = {"topic": "...", "tone": "documentary|playful|tech|calm|dramatic", "format": "auto|single",
                "style": "<id> (reference or user choice: wins)", "allow": ["skin", "author", "build"], "avoid": ["<id>"],
                "places": {"Name": [lat, lon]}, "images": [{"src": "...", "aspect": 1.5, "keywords": ["..."]}]}
Default allow: native + skin (renderable now). Writes plan.json: segments [{lines, start, end, style, renderer, preset,
readiness, transition, scores, reason}], plus the line analysis."""
import argparse, json, math, pathlib, re, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--timing", required=True); ap.add_argument("--brief"); ap.add_argument("--out", required=True)
ap.add_argument("--switch-cost", type=float, default=0.45, help="higher = fewer style changes")
ap.add_argument("--min-seg", type=float, default=6.0, help="seconds a segment runs before the content may change style")
ap.add_argument("--explain", action="store_true")
a = ap.parse_args()
T = json.loads(pathlib.Path(a.timing).read_text())
B = json.loads(pathlib.Path(a.brief).read_text()) if a.brief else {}
REG = json.loads((ROOT / "styles" / "registry.json").read_text())

fold = lambda s: unicodedata.normalize("NFC", s.replace("İ", "i").replace("I", "ı").lower())
LEX = {  # English + Turkish cue words (stems); extend freely
    "process": "first then next step steps finally how works process begin start after before önce sonra ardından adım aşama nasıl başla süreç önce sonunda",
    "comparison": "than versus vs compared bigger smaller more less faster slower instead while whereas karşı göre daha az fazla büyük küçük oysa yerine",
    "quote": "said wrote says writes letter telegram wrote: dedi yazdı yazar mektup telgraf söyledi",
    "document": "map document letter book record archive file report harita belge kitap kayıt arşiv rapor deri",
    "person": "he she his her man woman king sultan captain mother father brother uncle named name adı amcası kral sultan kaptan adam kadın kardeş baba anne",
    "emotion": "love fear hope alone lost heart afraid proud sad happy sevgi korku umut yalnız kayıp kalp gurur üzgün mutlu",
    "humor": "funny joke laugh silly weird komik şaka gül tuhaf",
    "tech": "battery phone computer code software chip data network voltage engine machine pil telefon bilgisayar kod yazılım çip ağ voltaj motor makine",
    "science": "ion particle atom cell energy molecule chemical physics biology liquid iyon parçacık atom hücre enerji molekül kimya fizik biyoloji sıvı",
    "history": "century empire ancient war palace ottoman kingdom found yüzyıl imparatorluk antik savaş saray osmanlı krallık bulundu tarih",
    "nature": "sea ocean river mountain forest sun sky bee flower rain deniz okyanus nehir dağ orman güneş gökyüzü arı çiçek yağmur",
    "product": "launch price feature design new product buy brand ürün fiyat özellik tasarım yeni marka satın",
    "warning": "never danger warning damage risk careful asla tehlike uyarı hasar risk dikkat",
    "mystery": "lost secret unknown hidden mystery missing kayıp gizli bilinmeyen saklı gizem eksik",
    "money": "dollar dollars euro price cost budget lira money para maliyet bütçe fiyat",
    "closing": "today still remains end finally ever bugün hâlâ hala kalır son sonunda",
    "list": "two habits three ways reasons rules tips iki üç yol neden kural ipucu",
}
LEXW = {k: set(fold(v).split()) for k, v in LEX.items()}
PLACES = {fold(k) for k in B.get("places", {})}
try:
    import json as _j
    geo = _j.loads((ROOT / "data" / "naturalearth" / "countries50.geojson").read_text())
    PLACES |= {fold(f["properties"].get("NAME", "")) for f in geo["features"]}
except Exception: pass
for fn, key in (("places50.geojson", "NAME"), ("marine50.geojson", "name")):
    try:
        g = _j.loads((ROOT / "data" / "naturalearth" / fn).read_text())
        PLACES |= {fold(f["properties"].get(key) or "") for f in g["features"] if f["properties"].get(key)}
    except Exception: pass
PLACES |= {"akdeniz", "karadeniz", "ege", "atlas", "istanbul", "gelibolu", "topkapı", "anadolu", "boğaz"}
TR_EN_COUNTRY = {"ispanya": "spain", "afrika": "africa", "amerika": "america", "türkiye": "turkey", "italya": "italy", "fransa": "france", "mısır": "egypt"}
PLACES |= set(TR_EN_COUNTRY)


def analyse(text, words):
    f = fold(text); toks = re.findall(r"[^\W_]+", f); feat = {}
    add = lambda k, v=1.0: feat.__setitem__(k, feat.get(k, 0) + v)
    for tk in toks:
        for k, lex in LEXW.items():
            if any(tk.startswith(w) for w in lex if len(w) > 3) or tk in lex: add(k)
    if re.search(r"\b(1[0-9]{3}|20[0-9]{2})\b", text) or re.search(r"\b(on|bin)\s+(dokuz|sekiz|yedi|beş)\s+yüz", f) or "nineteen" in f or "eighteen" in f: add("year", 1.5); add("history", .5)
    nums = re.findall(r"\d[\d.,]*", text) + [w for w in toks if w in {"two", "three", "four", "five", "ten", "twenty", "forty", "fifty", "hundred", "thousand", "million",
                                                                       "iki", "üç", "dört", "beş", "on", "yirmi", "kırk", "elli", "yüz", "bin", "milyon", "üçte", "yarısı"}]
    if nums: add("number", 1 + .3 * len(nums))
    if "%" in text or "percent" in f or "yüzde" in f: add("percent", 1.5)
    base = lambda w: re.sub(r"['’](d[ae]|t[ae]|n?[ıiuü]n|y?[ıiuü]|[ae]|d[ae]n|t[ae]n)$", "", w)
    if re.search(r"\b[A-ZÇĞİÖŞÜ][\wçğıöşü]+['’](d[ae]|t[ae])\b", text): add("place", 1.0)          # Turkish locative: Gelibolu'da
    if any(tk in PLACES or base(tk) in PLACES for tk in [fold(w) for w in re.findall(r"[\w'’]+", text)]) or any(p in f for p in PLACES if " " in p and len(p) > 5): add("place", 1.2); add("map", .8)
    if '"' in text or "“" in text or ":" in text: add("quote", .6)
    caps = [w for w in re.findall(r"\b[A-ZÇĞİÖŞÜ][\wçğıöşü'’-]+", text)][1:]
    if len(caps) >= 2: add("person", .4)
    if text.strip().endswith("?"): add("mystery", .5)
    return feat


lines = T["lines"]
info = []
for i, l in enumerate(lines):
    ft = analyse(l["text"], l.get("words"))
    if i == 0: ft["title"] = ft.get("title", 0) + .8
    if i == len(lines) - 1: ft["closing"] = ft.get("closing", 0) + 1
    info.append({"id": l["id"], "start": l["start"], "end": l["end"], "text": l["text"], "features": {k: round(v, 2) for k, v in ft.items()}})

# topic genre from the whole script + the brief
whole = {}
for x in info:
    for k, v in x["features"].items(): whole[k] = whole.get(k, 0) + v
tone = B.get("tone")
allow = {"native", "skin"} | set(B.get("allow", []))
cands = [s for s in REG if s.get("renderer") and s["readiness"] in allow and s["id"] not in set(B.get("avoid", []))]
if B.get("style"):
    locked = next((s for s in REG if s["id"] == B["style"]), None)
    if locked: cands = [locked]
if B.get("format") == "single" and not B.get("style"):
    # one format for the whole film: the best style for the WHOLE script
    best = max(cands, key=lambda s: sum(s["suits"].get(k, 0) * v for k, v in whole.items()))
    cands = [best]

READY = {"native": 1.0, "skin": .75, "author": .6, "build": .3}
TONE = {"documentary": {"documentary": .6, "print": .4, "evidence": .4}, "playful": {"illustration": .5, "graphic": .3}, "tech": {"screen": .6, "light": .4, "graphic": .2},
        "calm": {"illustration": .5, "print": .3}, "dramatic": {"film": .5, "documentary": .3, "light": .3}}


def unit(d):
    n = math.sqrt(sum(v * v for v in d.values())) or 1.0
    return {k: v / n for k, v in d.items()}


WHOLE_U = unit(whole)


def fit(style, feat):
    """cosine of the line's content with the style's fit (specific beats generic), plus the topic and tone, times readiness"""
    su = unit(style["suits"]); fu = unit(feat) if feat else {}
    s = sum(su.get(k, 0) * v for k, v in fu.items())
    s += .45 * sum(su.get(k, 0) * v for k, v in WHOLE_U.items())          # the film's topic as a whole
    s += .25 * TONE.get(tone, {}).get(style["family"], 0)
    return s * READY[style["readiness"]]


# dynamic programming over lines: state = style; cost of switching only at segment boundaries that respect --min-seg
n, S = len(info), len(cands)
score = [[fit(c, x["features"]) for c in cands] for x in info]
best = [[-1e9] * S for _ in range(n)]; back = [[None] * S for _ in range(n)]; seg_start = [[0] * S for _ in range(n)]
for j in range(S): best[0][j] = score[0][j]
for i in range(1, n):
    for j in range(S):
        stay = best[i - 1][j] + score[i][j]
        bj, bv = j, stay
        for k in range(S):
            if k == j: continue
            run = info[i - 1]["end"] - info[seg_start[i - 1][k]]["start"]
            if run < a.min_seg: continue                       # let the previous style finish a readable stretch
            v = best[i - 1][k] + score[i][j] - a.switch_cost
            if v > bv: bv, bj = v, k
        best[i][j], back[i][j] = bv, bj
        seg_start[i][j] = seg_start[i - 1][j] if bj == j else i
j = max(range(S), key=lambda q: best[n - 1][q]); path = [0] * n
for i in range(n - 1, -1, -1):
    path[i] = j
    if i: j = back[i][j]
segs = []
for i, j in enumerate(path):
    if segs and segs[-1]["_j"] == j: segs[-1]["lines"].append(info[i]["id"]); segs[-1]["end"] = info[i]["end"]
    else: segs.append({"_j": j, "lines": [info[i]["id"]], "start": info[i]["start"], "end": info[i]["end"]})


def transition(prev, cur):
    if prev is None: return None
    if prev["family"] == cur["family"]: return {"kind": "cut"}
    if cur["family"] == "film" or prev["family"] == "film": return {"kind": "iris", "dur": 0.6}
    if prev["dark"] != cur["dark"]: return {"kind": "wipe", "dur": 0.45}
    if cur["family"] == "graphic": return {"kind": "knife", "dur": 0.4}
    return {"kind": "flash", "dur": 0.25}


plan, prev = [], None
for k, sg in enumerate(segs):
    st = cands[sg["_j"]]; feats = {}
    for x in info:
        if x["id"] in sg["lines"]:
            for f_, v in x["features"].items(): feats[f_] = feats.get(f_, 0) + v
    top = sorted(feats.items(), key=lambda kv: -kv[1])[:4]
    ranked = sorted(cands, key=lambda c: -sum(fit(c, next(x for x in info if x["id"] == lid)["features"]) for lid in sg["lines"]))[:3]
    seg_start_t = 0.0 if k == 0 else sg["start"] - 0.25
    seg_end_t = segs[k + 1]["start"] - 0.25 if k + 1 < len(segs) else T["duration"]
    plan.append({"id": f"s{k + 1:02d}", "lines": sg["lines"], "start": round(seg_start_t, 3), "end": round(seg_end_t, 3), "style": st["id"], "name": st["name"],
                 "renderer": st["renderer"], "preset": st["preset"], "readiness": st["readiness"], "transition": transition(prev, st),
                 "content": dict(top), "runners_up": [c["id"] for c in ranked if c["id"] != st["id"]][:2],
                 "reason": f"content {', '.join(k_ for k_, _ in top) or 'plain narration'} -> {st['name']} ({st['readiness']})"})
    prev = st
out = {"duration": T["duration"], "styles_used": sorted({p["style"] for p in plan}), "switch_cost": a.switch_cost, "min_seg": a.min_seg,
       "format": B.get("format", "auto"), "locked_style": B.get("style"), "segments": plan, "lines": info}
pathlib.Path(a.out).write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f"{len(plan)} segment(s), {len(out['styles_used'])} style(s): {', '.join(out['styles_used'])} -> {a.out}")
for p in plan:
    print(f"  {p['id']} {p['start']:6.2f}-{p['end']:6.2f}  lines {p['lines'][0]}-{p['lines'][-1]}  {p['style']:<22} {p['transition']['kind'] if p['transition'] else '-':<6} {p['reason']}")
if a.explain:
    for x in info: print(f"    line {x['id']:>2}: {x['features']}  | {x['text'][:60]}")
