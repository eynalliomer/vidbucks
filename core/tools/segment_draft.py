#!/usr/bin/env python
"""segment_draft.py - turn the director's plan into a renderable edit.json: a first draft of every segment's scene data.

  python tools/segment_draft.py --plan plan.json --timing timing.json [--brief brief.json] --out public/multi/<name>/edit.json \
         [--public-dir multi/<name>] [--audio multi/<name>/mix.m4a]

type   -> one card per line: the hero is the line's year / number (from Whisper's digits or the text), else none
board  -> one cluster per line along the wall: images whose keywords match the line (brief "images"), years as a stamped
          date, numbers as counters, places as map markers (a map is projected for the segment's places with board_map.py),
          quotes/documents as a typeset recreation, everything else as a card; camera keys land on each cluster as its
          line starts, then a pull-back. Time expressions only, so a new voice re-times the draft.
layers -> skipped with a note: LayerScene art is authored by the agent (see docs/kits.md).
The draft is a starting point: the agent refines items, words and camera, then renders Tpl-MultiStyle (or its own id)."""
import argparse, json, pathlib, re, subprocess, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--plan", required=True); ap.add_argument("--timing", required=True); ap.add_argument("--brief"); ap.add_argument("--out", required=True)
ap.add_argument("--public-dir", default=None, help="folder under public/ for generated maps (default: the --out folder relative to public/)")
ap.add_argument("--audio"); ap.add_argument("--width", type=int, default=1920); ap.add_argument("--height", type=int, default=1080); ap.add_argument("--fps", type=int, default=30)
a = ap.parse_args()
P = json.loads(pathlib.Path(a.plan).read_text()); T = json.loads(pathlib.Path(a.timing).read_text())
B = json.loads(pathlib.Path(a.brief).read_text()) if a.brief else {}
lines = {l["id"]: l for l in T["lines"]}; info = {x["id"]: x for x in P["lines"]}
out_dir = pathlib.Path(a.out).parent; pub = a.public_dir or str(out_dir.resolve().relative_to((ROOT / "public").resolve()))
fold = lambda s: unicodedata.normalize("NFC", s.replace("İ", "i").replace("I", "ı").lower())


TRN = {"bir": 1, "iki": 2, "üç": 3, "dört": 4, "beş": 5, "altı": 6, "yedi": 7, "sekiz": 8, "dokuz": 9, "on": 10, "yirmi": 20, "otuz": 30, "kırk": 40,
       "elli": 50, "altmış": 60, "yetmiş": 70, "seksen": 80, "doksan": 90}
ENN = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
       "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
       "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90}


def spelled(text):
    """the first spelled-out number in a line as digits (Turkish 'bin dokuz yüz yirmi dokuz', English 'two', 'nineteen oh three')"""
    toks = re.findall(r"[^\W\d_]+", fold(text)); i = 0
    while i < len(toks):
        if toks[i] in TRN or toks[i] in ENN or toks[i] in ("yüz", "bin", "hundred", "thousand"):
            total = cur = 0; j = i
            while j < len(toks) and (toks[j] in TRN or toks[j] in ENN or toks[j] in ("yüz", "bin", "hundred", "thousand", "and")):
                w = toks[j]
                if w in TRN: cur += TRN[w]
                elif w in ENN: cur += ENN[w]
                elif w in ("yüz", "hundred"): cur = max(cur, 1) * 100
                elif w in ("bin", "thousand"): total += max(cur, 1) * 1000; cur = 0
                j += 1
            n = total + cur
            if n >= 2 or j - i > 1: return str(n)
            i = j
        else: i += 1
    return None


def hero_number(l):
    for w, *_ in l.get("words") or []:
        m = re.fullmatch(r"[\"'(]?(\d[\d.,]*)(%|'[a-zçğıöşü]+)?[.,:;!?)\"']*", w)
        if m: return m.group(1).rstrip(".,") + ("%" if m.group(2) == "%" else "")
    m = re.search(r"\d[\d.,]*%?", l["text"])
    return m.group(0).rstrip(".,") if m else spelled(l["text"])


def keyword(l):
    ws = [w.strip(".,:;!?\"'") for w in l["text"].split()]
    caps = [w for w in ws[1:] if w[:1].isupper() and len(w) > 2]
    return (caps[0] if caps else max(ws, key=len)).split("'")[0].split("’")[0]


segments, maps = [], {}
for sg in P["segments"]:
    seg = {k: sg[k] for k in ("id", "start", "end", "lines", "style", "renderer", "transition", "reason")}
    if sg["renderer"] == "type":
        cards = []
        for lid in sg["lines"]:
            n = hero_number(lines[lid]); f = info[lid]["features"]
            cards.append({"line": lid, **({"big": n} if n and ("year" in f or "number" in f or "percent" in f) else {})})
        seg["data"] = {"preset": sg["preset"], "cards": cards}
    elif sg["renderer"] == "board":
        items, cam, places = [], [], {}
        imgs = B.get("images", [])
        for k, lid in enumerate(sg["lines"]):
            l, f = lines[lid], info[lid]["features"]; cx, cy = k * 5600, (-1) ** k * 700
            W = lambda word, dt=0: {"word": [lid, word], "dt": dt}
            Ln = {"line": lid, "dt": 0.05}
            img = next((im for im in imgs if any(fold(kw) in fold(l["text"]) for kw in im.get("keywords", []))), None)
            n = hero_number(l)
            if img:
                items.append({"type": "print", "img": img["src"], "aspect": img.get("aspect", 1.5), "x": cx, "y": cy - 300, "w": 2600, "rot": (-1) ** k * 1.3, "t_in": Ln,
                              **({"label": img["label"], "label_t": {"line": lid, "dt": 0.6}} if img.get("label") else {})})
            elif "quote" in f or "document" in f:
                items.append({"type": "doc", "x": cx, "y": cy - 200, "w": 2300, "h": 3000, "rot": (-1) ** k * 1.5, "t_in": Ln, "rows": 14, "sentence_row": 5,
                              "sentence": l["text"], "sentence_size": 84, "header": [{"text": keyword(l).upper(), "size": 120, "font": "serif"}]})
            else:
                items.append({"type": "card", "x": cx, "y": cy - 200, "w": 3000, "h": 1700, "t_in": Ln, "title": keyword(l).upper(), "lines": [l["text"][:46], l["text"][46:92]]})
            if n and ("year" in f):
                items.append({"type": "bigtext", "text": n, "x": cx, "y": cy - 2100, "size": 620, "t_in": Ln, "bar": "#ffd60a", "color": "#1e1a16"})
            elif n:
                try: val = float(n.replace(",", "").rstrip("%"))
                except ValueError: val = None
                if val is not None: items.append({"type": "counter", "x": cx, "y": cy + 1500, "size": 560, "value": val, "t_in": {"line": lid, "dt": 0.3}, "dur": 1.0, **({"suffix": "%"} if n.endswith("%") else {})})
            if "mystery" in f or "warning" in f:
                items.append({"type": "stamp", "text": ("KAYIP" if re.search(r"kayıp", fold(l["text"])) else "LOST" if "lost" in fold(l["text"]) else "!"), "x": cx + 700, "y": cy + 300, "size": 300, "t_in": {"end": lid, "dt": -0.5}})
            for name, ll in B.get("places", {}).items():
                if fold(name) in fold(l["text"]): places[name] = ll
            cam.append({"t": {"line": lid, "dt": 0.35}, "x": cx, "y": cy, "zoom": 0.52, "rot": (-1) ** k * 0.5})
            cam.append({"t": {"end": lid, "dt": -0.1}, "x": cx + 120, "y": cy + 80, "zoom": 0.58, "rot": (-1) ** k * 0.7})
        if places:      # a map print for this segment, under the clusters, with a marker per place on the line that names it
            lats = [v[0] for v in places.values()]; lons = [v[1] for v in places.values()]
            name = f"{seg['id']}_map"; mp = ROOT / "public" / pub / f"map_{name}.json"
            args = [sys.executable, str(ROOT / "tools" / "board_map.py"), "--name", name, "--out", str(mp), "--lon", str(min(lons) - 25), str(max(lons) + 25),
                    "--lat", str(min(lats) - 15), str(max(lats) + 15), "--proj", "mercator", "--lon0", str(sum(lons) / len(lons)), "--K", "9000"]
            for n_, (la, lo) in places.items(): args += ["--place", f"{n_}={la},{lo}"]
            subprocess.run(args, check=True, capture_output=True)
            mdat = json.loads(mp.read_text()); b = mdat["bounds"]; mw = b[2] - b[0]
            dx = (len(sg["lines"]) - 1) * 2800 - (b[0] + mw / 2); dy = 5200 - b[1]        # map below the clusters
            for kk, v in mdat["places"].items(): mdat["places"][kk] = [v[0] + dx, v[1] + dy]
            mdat["bounds"] = [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]
            mdat["regions"] = {k_: re.sub(r"(-?\d+),(-?\d+)", lambda m: f"{int(m.group(1)) + round(dx)},{int(m.group(2)) + round(dy)}", d) for k_, d in mdat["regions"].items()}
            maps[name] = mdat
            items.insert(0, {"type": "map", "src": "", "name": name, "t_in": -1})
            for k, lid in enumerate(sg["lines"]):
                named = [n_ for n_ in places if fold(n_) in fold(lines[lid]["text"])]
                for q, n_ in enumerate(named):
                    items.append({"type": "marker", "at": {"place": n_, "map": name}, "label": n_.upper(), "t_in": {"line": lid, "dt": 0.2 + 0.35 * q}})
                if named:   # ONE camera key per line: frame every place it names
                    xs = [mdat["places"][n_][0] for n_ in named]; ys = [mdat["places"][n_][1] for n_ in named]
                    spread = max(max(xs) - min(xs), (max(ys) - min(ys)) * 16 / 9, 1)
                    cam.insert(2 * k + 1, {"t": {"line": lid, "dt": 0.9}, "x": sum(xs) / len(xs), "y": sum(ys) / len(ys), "zoom": round(min(0.35, 3840 * 0.6 / (spread + 1800)), 3)})
            cam.sort(key=lambda c: (lines[c["t"].get("line") or c["t"].get("end")]["start"], "end" in c["t"], c["t"].get("dt", 0)))
        span = (len(sg["lines"]) - 1) * 5600
        cam.append({"t": round(sg["end"] - sg["start"], 3), "x": span / 2, "y": 1500 if places else 0, "zoom": 0.12 if places else max(0.14, 0.5 / max(1, len(sg["lines"]) / 2)), "radius": 30000, "strength": 0.05})
        pr = sg["preset"] or {}
        seg["data"] = {"width": a.width, "height": a.height, "fps": a.fps, "look": pr.get("look", "wall"), "grade": pr.get("grade", "natural"), "fadeIn": 0.001, "fadeOut": 0.01, "items": items, "camera": cam}
    elif sg["renderer"] == "layers":
        seg["data"] = None; seg["todo"] = "author LayerScene shots for these lines (docs/kits.md); run tools/layer_check.py"
    else:
        seg["data"] = None; seg["todo"] = f"no renderer for {sg['style']} yet: build its kit (skill vidbucks-style-library)"
    segments.append(seg)
edit = {"width": a.width, "height": a.height, "fps": a.fps, "duration": T["duration"], "segments": segments, "maps": maps}
if a.audio: edit["audio"] = {"src": a.audio}
pathlib.Path(a.out).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(a.out).write_text(json.dumps(edit, ensure_ascii=False))
todo = [s["id"] for s in segments if s.get("todo")]
print(f"edit: {len(segments)} segment(s) -> {a.out}" + (f"; to author: {todo}" if todo else ""))
for s in segments: print(f"  {s['id']} {s['style']:<22} {s['renderer'] or '-':<6} {len((s.get('data') or {}).get('items', (s.get('data') or {}).get('cards', [])))} items")
