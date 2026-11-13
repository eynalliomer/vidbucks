"""director_core.py - the style director as a trainable model (used by style_director.py and director_train.py).

direct(lines, topic, params, registry, lang) -> {"acts": [{lines, style}], "layouts": [layout per line], "features": [...]}
Every decision is a function of PARAMS (core/styles/director_params.json, learned by director_train.py from the gold set in
knowledge/director/gold/): style-content affinities (registry "suits" + learned deltas), switch cost, minimum act length,
topic and bookend weights, layout-content weights, layout biases and the repeat penalty.
Styles: act-level dynamic programming (a switch pays switch_cost; acts shorter than min_lines are not allowed except a
one-line hook/close when hook_close is on). Layouts: Viterbi over lines with layout-content scores, hard requirements
(number needs a number, timeline a year, map a place, quote a quote, ratio a fraction) and a penalty for repeats."""
import json, math, pathlib, re, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
LAYOUTS = ["photo", "detail", "split", "compare", "number", "quote", "document", "map", "timeline", "list", "ratio", "title", "stamp", "collage"]
DEFAULT = {"knn_w": 1.5, "knn_k": 8, "knn_pow": 2.0, "era_carry": 1.0, "w_reg": 1.0, "w_era": 1.0, "attr_w": {}, "style_bias": {}, "suits_w": 1.0, "switch_cost": 0.45, "min_lines": 2, "hook_close": True, "topic_w": 0.45, "bookend": 0.25, "suits_delta": {},
           "layout_w": {}, "layout_bias": {"photo": 0.3, "split": 0.15, "detail": 0.1}, "repeat_penalty": 1.0, "renderers": ["type"]}

# shared, generalisable description of each renderable style: era it evokes, register, ground
ATTR = {
 "swiss-motion": "modern technical data light", "bauhaus-shapes": "modern playful light", "pictogram-motion": "modern technical news light list",
 "art-deco": "s1900 commercial title dark", "spy-titles": "modern investigation title dark", "pop-art": "modern playful commercial light",
 "risograph": "contemporary poetic craft light", "halftone-dossier": "s1900 investigation document light", "silkscreen-poster": "modern poetic travel light",
 "woodcut": "early documentary craft light", "engraving": "early documentary document light", "ascii-crt": "modern technical dark",
 "one-bit-dither": "modern technical dark", "silent-film": "s1900 playful documentary dark", "newsreel": "s1900 documentary news dark",
 "caption-news": "contemporary news warning dark", "news-package": "contemporary news dark", "dark-keynote": "future commercial technical dark",
 "hologram-hud": "future technical dark", "circuit-board": "future technical dark", "neon-tubes": "contemporary poetic playful dark",
 "oscilloscope-math": "future technical poetic dark", "chalkboard": "contemporary craft technical dark", "whiteboard": "contemporary technical list light",
 "blueprint": "modern technical dark", "kino-montage": "s1900 documentary title light", "text-flash-cuts": "contemporary title playful dark",
 "spreadsheet": "contemporary data technical light", "dataviz": "contemporary data light", "transit-map": "modern travel data light",
 "flat-space-explainer": "contemporary technical playful dark",
}
ATTR = {k: set(v.split()) for k, v in ATTR.items()}
ATTRS = sorted({a for v in ATTR.values() for a in v})
# the teacher's rubric: which register a kind of content asks for (shared by every style; not learned per style)
REGISTER_OF = {
 "history": {"documentary": 1.0}, "document": {"documentary": .6, "investigation": .5}, "person": {"documentary": .7}, "quote": {"documentary": .5},
 "mystery": {"investigation": 1.0, "title": .3}, "warning": {"news": 1.0, "warning": 1.0}, "science": {"technical": 1.0}, "tech": {"technical": .8, "commercial": .3},
 "process": {"technical": .4, "list": .6, "craft": .4}, "list": {"list": 1.0, "news": .2}, "number": {"data": .6}, "percent": {"data": 1.0},
 "money": {"data": .8, "commercial": .3}, "comparison": {"data": .6, "technical": .4}, "product": {"commercial": 1.0}, "humor": {"playful": 1.0},
 "emotion": {"poetic": 1.0}, "nature": {"poetic": .6, "travel": .3}, "place": {"travel": .6, "documentary": .3}, "map": {"travel": .6},
 "food": {"craft": 1.0}, "body": {"technical": .6}, "question": {"title": .6, "playful": .3}, "title": {"title": .4}, "fraction": {"data": .7},
}


def era_of(text):
    """years (digits or Turkish/English words) and centuries -> an era feature"""
    f = fold(text); ys = [int(y) for y in re.findall(r"\b(1[0-9]{3}|20[0-9]{2})\b", text)]
    m = re.search(r"\bbin\s+((?:dokuz|sekiz|yedi|altı|beş|dört|üç|iki)\s+)?yüz(\s+\w+){0,3}", f)
    if m:
        h = {"dokuz": 9, "sekiz": 8, "yedi": 7, "altı": 6, "beş": 5, "dört": 4, "üç": 3, "iki": 2}.get((m.group(1) or "").strip(), 1); ys.append(1000 + h * 100 + 50)
    c = re.search(r"\b(on\s+\w+|yirminci|yirmi\s+birinci)\s+yüzyıl", f) or re.search(r"\b(\w+)\s+century", f)
    if c:
        w = c.group(1); table = {"on yedinci": 1650, "on sekizinci": 1750, "on dokuzuncu": 1850, "on altıncı": 1550, "on beşinci": 1450, "on dördüncü": 1350,
                                 "yirminci": 1950, "seventeenth": 1650, "eighteenth": 1750, "nineteenth": 1850, "twentieth": 1950, "sixteenth": 1550}
        if w in table: ys.append(table[w])
    if re.search(r"\b(bugün|today|now|şimdi|artık)\b", f): ys.append(2025)
    if not ys: return None
    y = sum(ys) / len(ys)
    return "early" if y < 1850 else "s1900" if y < 1960 else "modern" if y < 2005 else "contemporary"


fold = lambda s: unicodedata.normalize("NFC", s.replace("İ", "i").replace("I", "ı").lower())
LEX = {
    "process": "first then next step steps finally how works process begin start after before önce sonra ardından adım aşama nasıl başla süreç sonunda ekleyin dökün kabartıp paylaştırın tutun",
    "comparison": "than versus vs compared bigger smaller more less faster slower instead while whereas karşı göre daha az fazla büyük küçük oysa yerine değil kare daire",
    "quote": "said wrote says writes letter telegram dedi yazdı yazar mektup telgraf söyledi",
    "document": "map document letter book record archive file report notebook harita belge kitap kayıt arşiv rapor deri defter",
    "person": "he she his her man woman king sultan captain mother father brother uncle named name eşi adı amcası kral sultan kaptan adam kadın kardeş baba anne çar matematikçi askerleri",
    "emotion": "love fear hope alone lost heart afraid proud sad happy sevgi korku umut yalnız kalp gurur üzgün mutlu ışığı",
    "humor": "funny joke laugh silly weird kedim komik şaka gül tuhaf nedensiz pahalı",
    "tech": "battery phone computer code software chip data network voltage engine machine watch pil telefon bilgisayar kod yazılım çip ağ voltaj motor makine saat ekran",
    "science": "ion particle atom cell energy molecule chemical physics biology radio iyon parçacık atom hücre enerji molekül kimya fizik biyoloji radyoaktif polonyum radyum mum kanıtladı geometri",
    "history": "century empire ancient war palace ottoman kingdom found yüzyıl yüzyılda imparatorluk antik savaş saray osmanlı krallık bulundu tarih kral çarı",
    "nature": "sea ocean river mountain forest sun sky bee flower rain bird deniz okyanus nehir dağ orman güneş gökyüzü arı çiçek yağmur kuş kovan doğa pasifik",
    "product": "launch price feature design new product buy brand color colour ürün fiyat özellik tasarım yeni marka satın renk sipariş kasası lansman lansmanı akıllı",
    "warning": "never danger warning damage risk careful emergency asla tehlike uyarı hasar risk dikkat deprem acil",
    "mystery": "lost secret unknown hidden mystery missing kayıp gizli bilinmeyen saklı gizem eksik kayboldu iz",
    "money": "dollar dollars euro price cost budget lira money salary para maliyet bütçe fiyat maaş faiz nakit",
    "closing": "today still remains end finally ever bugün hâlâ hala kalır son sonunda",
    "list": "habits ways reasons rules tips items kit needs olsun set çanta çantanızda",
    "food": "coffee cup sugar water food kahve fincan şeker su yiyecek cezve köpük",
    "body": "body organs weight fat vücut organ ağırlık yağ sindirim",
}
LEXW = {k: set(fold(v).split()) for k, v in LEX.items()}
NUMW = set(fold("two three four five six seven eight nine ten twenty thirty forty fifty hundred thousand million iki üç dört beş altı yedi sekiz dokuz on yirmi otuz kırk elli yüz bin milyon yarısı").split())
_PLACES = None


def places():
    global _PLACES
    if _PLACES is None:
        _PLACES = {"akdeniz", "karadeniz", "ege", "atlas", "istanbul", "gelibolu", "topkapı", "anadolu", "boğaz", "haliç", "üsküdar", "varşova", "paris",
                   "königsberg", "alaska", "pasifik", "yeni", "zelanda", "prusya", "rus", "galata"}
        for fn, key in (("countries50.geojson", "NAME"), ("places50.geojson", "NAME"), ("marine50.geojson", "name")):
            try:
                g = json.loads((ROOT / "data" / "naturalearth" / fn).read_text())
                _PLACES |= {fold(f["properties"].get(key) or "") for f in g["features"] if f["properties"].get(key)}
            except Exception:
                pass
    return _PLACES


def features(text, i, n):
    f = fold(text); toks = re.findall(r"[^\W_]+", f); ft = {}
    add = lambda k, v=1.0: ft.__setitem__(k, ft.get(k, 0) + v)
    for tk in toks:
        for k, lex in LEXW.items():
            if tk in lex or any(tk.startswith(w) for w in lex if len(w) > 4): add(k)
    if re.search(r"\b(1[0-9]{3}|20[0-9]{2})\b", text) or re.search(r"\bbin\s+(dokuz|sekiz|yedi|altı|beş|dört|üç)\s+yüz", f) or re.search(r"\b(nineteen|eighteen)\b", f): add("year", 1.5)
    if re.search(r"\b(yüzyıl|century)", f): add("year", .6); add("history", .6)
    nums = re.findall(r"\d[\d.,]*", text) + [w for w in toks if w in NUMW]
    if nums: add("number", 1 + .25 * len(nums))
    if "%" in text or "percent" in f or "yüzde" in f: add("percent", 1.5)
    if re.search(r"\b(yarısı|üçte|half|third|quarter|çeyrek)\b", f): add("fraction", 1.4)
    base = lambda w: re.sub(r"['’](d[ae]|t[ae]|n?[ıiuü]n|y?[ıiuü]|[ae]|d[ae]n|t[ae]n)$", "", w)
    P = places()
    if re.search(r"\b[A-ZÇĞİÖŞÜ][\wçğıöşü]+['’](d[ae]|t[ae]|[ye][ae])\b", text): add("place", 1.0)
    if any(fold(base(w)) in P for w in re.findall(r"[\w'’]+", text) if len(w) > 3 and w[:1].isupper()): add("place", 1.2); add("map", .8)
    if '"' in text or "“" in text or ":" in text: add("quote", .5)
    caps = re.findall(r"\b[A-ZÇĞİÖŞÜ][\wçğıöşü'’-]+", text)[1:]
    if len(caps) >= 2: add("person", .5)
    if text.strip().endswith("?"): add("question", 1.5)
    e = era_of(text)
    if e: add("era_" + e, 1.5)
    if i == 0: add("title", .8)
    if i == n - 1: add("closing", 1.0)
    return ft


def unit(d):
    nrm = math.sqrt(sum(v * v for v in d.values())) or 1.0
    return {k: v / nrm for k, v in d.items()}


_REG = None
_FCACHE = {}


def cached_features(texts, topic):
    key = (tuple(texts), topic)
    if key not in _FCACHE:
        n = len(texts); _FCACHE[key] = ([features(t, i, n) for i, t in enumerate(texts)], features(topic, -1, 0))
    return _FCACHE[key]


def lib_examples(golds):
    """labelled lines -> (context feature vector, gold style, accepted styles): the director's memory of taught examples"""
    ex = []
    for g in golds:
        n = len(g["lines"]); F, FT = cached_features(g["lines"], g["topic"])
        last = None; styles = {}
        for ac in g["acts"]:
            for l in ac["lines"]: styles[l] = (ac["style"], set(ac.get("ok", [])))
        for i, f in enumerate(F):
            f = dict(f); e = next((k for k in f if k.startswith("era_")), None)
            if e: last = e
            elif last: f[last] = 0.8
            ex.append((ctx_vec(f, FT, F), *styles[i + 1], g.get("slug")))
    return ex


def ctx_vec(f, FT, F):
    whole = {}
    for x in F + [FT]:
        for k, v in x.items(): whole[k] = whole.get(k, 0) + v
    wu = unit(whole); fu = unit(f) if f else {}
    return unit({k: fu.get(k, 0) + 0.45 * wu.get(k, 0) for k in set(fu) | set(wu)})


class Model:
    def __init__(self, params=None, registry=None, library=None):
        global _REG
        self.p = {**DEFAULT, **(params or {})}
        self.lib = library if library is not None else []
        if registry is None and _REG is None: _REG = json.loads((ROOT / "styles" / "registry.json").read_text())
        reg = registry or _REG
        self.cands = [s for s in reg if s.get("renderer") in self.p["renderers"] and s["readiness"] in ("native", "skin")]

    def suits(self, s):
        d = dict(s["suits"])
        for k, v in self.p["suits_delta"].get(s["id"], {}).items(): d[k] = d.get(k, 0) + v
        return d

    def style_score(self, s, fu, whole_u):
        su = unit({k: max(0.0, v) for k, v in self.suits(s).items()})
        mix = {k: fu.get(k, 0) + self.p["topic_w"] * whole_u.get(k, 0) for k in set(fu) | set(whole_u)}
        sc = self.p["suits_w"] * sum(su.get(k, 0) * v for k, v in mix.items())
        A = ATTR.get(s["id"], set()); W = self.p["attr_w"]
        reg = {}
        for k, v in mix.items():
            for r, w in REGISTER_OF.get(k, {}).items(): reg[r] = reg.get(r, 0) + v * w
        ru = unit(reg) if reg else {}
        sc += self.p["w_reg"] * sum(ru.get(a, 0) for a in A)                       # register match (rubric)
        eras = sorted((k for k in fu if k.startswith("era_")), key=lambda k: -fu[k]); eras = [k[4:] for k in eras]
        if eras: sc += self.p["w_era"] * (1.0 if eras[0] in A else -0.3)         # a dated line wants a style of its era
        sc += sum(v * W.get(k, {}).get(a, 0.0) for k, v in mix.items() for a in A) + self.p["style_bias"].get(s["id"], 0.0)
        return sc * (1.0 if s["readiness"] == "native" else 0.92)

    def direct(self, texts, topic="", fmt="auto", lock=None):
        n = len(texts); F0, FT = cached_features(texts, topic); F = [dict(f) for f in F0]
        last = None
        for f in F:
            e = next((k for k in f if k.startswith("era_")), None)
            if e: last = e
            elif last: f[last] = 0.8 * self.p.get("era_carry", 1.0)
        whole = {}
        for f in F + [FT]:
            for k, v in f.items(): whole[k] = whole.get(k, 0) + v
        whole_u = unit(whole); FU = [unit(f) if f else {} for f in F]
        cands = self.cands
        if lock: cands = [s for s in self.cands if s["id"] == lock] or cands
        S = len(cands); sc = [[self.style_score(s, FU[i], whole_u) for s in cands] for i in range(n)]
        if self.lib and self.p["knn_w"]:          # votes of the most similar taught lines (learning = adding examples)
            ids = [c["id"] for c in cands]
            for i in range(n):
                q = ctx_vec(F[i], FT, F)
                sims = sorted(((sum(q.get(k, 0) * v for k, v in e[0].items()), e) for e in self.lib), key=lambda x: -x[0])[: int(self.p["knn_k"])]
                vote = {}
                for sm, e in sims:
                    w = max(0.0, sm) ** self.p["knn_pow"]
                    vote[e[1]] = vote.get(e[1], 0) + w
                    for o in e[2]: vote[o] = vote.get(o, 0) + 0.4 * w
                tot = sum(vote.values()) or 1.0
                for j, sid in enumerate(ids): sc[i][j] += self.p["knn_w"] * vote.get(sid, 0) / tot
        if fmt == "single":
            j = max(range(S), key=lambda q: sum(sc[i][q] for i in range(n))); acts = [{"lines": list(range(1, n + 1)), "style": cands[j]["id"]}]
        else:
            # DP over segmentations: best[i] = best score of lines[:i]; an act covers lines a..i-1 in one style
            ml = self.p["min_lines"]; NEG = -1e9
            best = [NEG] * (n + 1); best[0] = 0.0; arg = [None] * (n + 1)
            for i in range(1, n + 1):
                for a in range(0, i):
                    L = i - a
                    if L < ml and not (self.p["hook_close"] and L == 1 and (a == 0 or i == n)): continue
                    if best[a] == NEG: continue
                    for j in range(S):
                        if arg[a] and arg[a][1] == j: continue          # adjacent acts must differ
                        v = best[a] + sum(sc[q][j] for q in range(a, i)) - (self.p["switch_cost"] if a > 0 else 0)
                        if v > best[i]: best[i], arg[i] = v, (a, j)
            acts, i = [], n
            while i > 0:
                a, j = arg[i]; acts.append({"lines": list(range(a + 1, i + 1)), "style": cands[j]["id"]}); i = a
            acts.reverse()
            # bookend: closing on the opening style when it is nearly as good
            if len(acts) >= 3:
                first = acts[0]["style"]; last = acts[-1]; jf = [c["id"] for c in cands].index(first)
                lj = [c["id"] for c in cands].index(last["style"])
                loss = sum(sc[q - 1][lj] - sc[q - 1][jf] for q in last["lines"])
                if loss < self.p["bookend"] * len(last["lines"]) and acts[-2]["style"] != first: last["style"] = first
        for ac in acts:   # a ranked shortlist per act for the agent: the director suggests, the agent decides
            tot = [(sum(sc[q - 1][j] for q in ac["lines"]), cands[j]["id"]) for j in range(S)]
            ac["shortlist"] = [sid for _, sid in sorted(tot, reverse=True)[:3]]
        return {"acts": acts, "layouts": self.layouts(texts, F), "features": F, "_sc": sc, "_ids": [c["id"] for c in cands]}

    # ---------------------------------------------------------------- layouts
    REQ = {"number": "number", "timeline": "year", "map": "place", "quote": "quote", "ratio": "fraction"}

    def layout_score(self, lay, f):
        w = self.p["layout_w"].get(lay, {}); fu = unit(f) if f else {}
        s = self.p["layout_bias"].get(lay, 0.0) + sum(w.get(k, 0) * v for k, v in fu.items())
        need = self.REQ.get(lay)
        if need and need not in f and not (lay == "ratio" and "percent" in f): s -= 5
        return s

    def layouts(self, texts, F):
        n = len(texts); K = len(LAYOUTS); rp = self.p["repeat_penalty"]
        sc = [[self.layout_score(l, F[i]) for l in LAYOUTS] for i in range(n)]
        best = [sc[0][:]]; back = [[None] * K]
        for i in range(1, n):
            row, bk = [], []
            for k in range(K):
                cand = [(best[i - 1][q] - (rp if q == k else 0), q) for q in range(K)]
                v, q = max(cand); row.append(v + sc[i][k]); bk.append(q)
            best.append(row); back.append(bk)
        k = max(range(K), key=lambda q: best[-1][q]); out = [k]
        for i in range(n - 1, 0, -1): k = back[i][k]; out.append(k)
        return [LAYOUTS[q] for q in reversed(out)]


def load_params():
    p = ROOT / "styles" / "director_params.json"
    return json.loads(p.read_text()) if p.exists() else {}
