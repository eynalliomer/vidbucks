"""Second-pass DIRECTION for the other seven films. Each film decides every dimension from its own content; no two
films share a main direction. Facts on screen come from the script or are checkable (hexagon perimeters are geometry)."""
import json, pathlib
F = pathlib.Path(__file__).resolve().parent
def load(s): return json.loads((F / s / "visuals.json").read_text())
def save(s, V): (F / s / "visuals.json").write_text(json.dumps(V, ensure_ascii=False, indent=1))
def line(V, n): return next(l for l in V["lines"] if l["line"] == n)
def setl(V, n, shot, idea, data=None, direction=None, keep_pic=True, pic=None, extra=None):
    l = line(V, n); l["shot"] = shot; l["idea"] = idea; l["data"] = data or {}
    if direction: l["direction"] = direction
    else: l.pop("direction", None)
    if not keep_pic: l.pop("picked", None); l.pop("extra", None); l["media"] = {"need": False}
    if pic: l["picked"] = dict(pic)
    if extra is not None: l["extra"] = [dict(e) for e in extra if e]
    return l
D = lambda cam, ent, fr, cap, disp, text, sound, **k: {"camera": cam, "enter": ent, "frame": fr, "caption": cap, "fonts": {"display": disp, "text": text}, "sound": sound, **k}

# ---------------------------------------------------------------- culluk: a journey film - poster, night chart, body plan
V = load("culluk"); P = {l["line"]: l.get("picked") for l in V["lines"]}; X6 = line(V, 6).get("extra") or []
V["sound"] = {"mood": "bright", "bpm": 98}
V["acts"] = [
 {"id": "A1", "lines": [1, 2], "style": "silkscreen-poster", "why": "the take-off and the bird itself: a loud field poster, the camera whips in", "direction": D("whip", "tear", "torn", "kinetic", "staat", "oswald", "poster")},
 {"id": "A2", "lines": [3, 4], "style": "flat-space-explainer", "why": "the route: a night navigation chart, calm and wide", "direction": D("kenburns", "mask", "arch", "karaoke", "rubik", "grotesk", "soft"), "transition": {"kind": "zoom", "dur": 0.5}},
 {"id": "A3", "lines": [5, 6, 7], "style": "blueprint", "why": "inside the body: a technical plate, drifting slowly, typed notes", "direction": D("drift", "scan", "window", "typewriter", "mono", "mono", "paper"), "transition": {"kind": "wipe", "dur": 0.5}},
 {"id": "A4", "lines": [8], "style": "silkscreen-poster", "why": "the return closes in the opening poster", "direction": D("punch", "slide", "bleed", "kinetic", "staat", "oswald", "poster"), "transition": {"kind": "push", "dur": 0.45}}]
setl(V, 1, "photo", "The flock lifting off; the camera whips onto it and the words slam in", {"text": "bottom", "from": [0.5, 0.6, 1.0], "to": [0.5, 0.4, 1.2]}, {"frame": "bleed"})
setl(V, 2, "diagram", "The godwit as a labelled specimen: the barred tail, the long bill", {"callouts": [{"x": 0.2, "y": 0.42, "label": "uzun gaga"}, {"x": 0.8, "y": 0.5, "label": "çizgili kuyruk"}]})
setl(V, 3, "map", "The whole Pacific at night; an arc grows from Alaska to New Zealand", {"map": "pac", "stops": ["Alaska", "Yeni Zelanda"], "look": "night"})
setl(V, 4, "number", "Thirteen thousand kilometres slams over open ocean seen from above", {"value": 13000, "unit": "kilometre, tek seferde", "suffix": " km", "mode": "slam"})
setl(V, 5, "bigword", "Fat equals fuel: two words as a formula", {"words": ["yağ =", "yakıt"], "hot": 1}, keep_pic=False)
setl(V, 6, "compare", "Before and in flight in two window cards with a VS badge", {"left_label": "önce", "right_label": "uçuşta"})
setl(V, 7, "ratio", "Half a ring: almost half the body weight gone on landing", {"fraction": 0.5, "label": "yarısı"}, keep_pic=False)
setl(V, 8, "map", "The same chart in daylight; the arc drawn back north", {"map": "pac", "stops": ["Yeni Zelanda", "Alaska"], "look": "paper"})
save("culluk", V)

# ---------------------------------------------------------------- curie: a life in three materials - deco title, newsreel, glowing tube
V = load("curie"); P = {l["line"]: l.get("picked") for l in V["lines"]}
V["sound"] = {"mood": "calm", "bpm": 70}
V["acts"] = [
 {"id": "A1", "lines": [1, 2], "style": "art-deco", "why": "Paris of the 1890s: an ornamental title and an inked map", "direction": D("drift", "mask", "arch", "lower", "abril", "cormorant", "soft")},
 {"id": "A2", "lines": [3, 4, 5, 6], "style": "newsreel", "why": "the working years and the prizes as newsreel: hand-held, projected, film strip", "direction": D("handheld", "projector", "strip", "lower", "anton", "courier", "archive", texture="film"), "transition": {"kind": "flash", "dur": 0.35}},
 {"id": "A3", "lines": [7, 8], "style": "oscilloscope-math", "why": "the radiation that outlived her: a dark tube glow, typed readings", "direction": D("locked", "glitch", "crt", "typewriter", "mono", "mono", "digital"), "transition": {"kind": "dip", "dur": 0.6}}]
setl(V, 1, "title", "Her name set letter by letter in a deco frame", {"title": "Marie Curie", "size": 190, "mode": "letters"})
setl(V, 2, "map", "An inked map: an arc from Warsaw to Paris", {"map": "eu", "stops": ["Varşova", "Paris"], "look": "ink"})
setl(V, 3, "photo", "Marie and Pierre in the laboratory, in a strip of film", {"kicker": "laboratuvar"})
setl(V, 4, "timeline", "A vertical timeline; the playhead falls to 1898", {"years": [1891, 1898, 1903, 1911], "current": 1898, "labels": ["Paris", "polonyum · radyum", "fizik", "kimya"], "axis": "y"}, pic=P[3])
setl(V, 5, "bigword", "1903 and PHYSICS across her portrait", {"words": ["1903", "Fizik"], "hot": 0}, {"frame": "bleed", "camera": "kenburns"})
setl(V, 6, "document", "The chemistry diploma; the year underlined in red", {"region": [0.1, 0.6, 0.9, 0.8], "mark": "underline"})
setl(V, 7, "detail", "Her notebook on a tube screen; brackets close on it: still radioactive", {"region": [0.2, 0.25, 0.8, 0.6], "label": "hâlâ radyoaktif", "mark": "bracket"}, {"frame": "bleed", "treat": "cold", "enter": "scan"})
setl(V, 8, "photo", "The late portrait developing inside a round glow, the last words huge", {"from": [0.5, 0.35, 1.0], "to": [0.5, 0.3, 1.15]}, {"frame": "circle", "enter": "develop", "camera": "kenburns", "caption": "subtitle"})
save("curie", V)

# ---------------------------------------------------------------- deprem: one checklist, one act - pictograms and round frames
V = load("deprem"); P = {l["line"]: l.get("picked") for l in V["lines"]}
V["sound"] = {"mood": "calm", "bpm": 86}
V["acts"] = [{"id": "A1", "lines": [1, 2, 3, 4, 5, 6, 7], "style": "pictogram-motion", "why": "one public checklist in one voice: a locked camera, round frames, the spoken word lights up; every item is its own graphic",
              "direction": D("locked", "slide", "circle", "karaoke", "rubik", "rubik", "soft")}]
setl(V, 1, "bigword", "Two words that say when: preparation, today", {"words": ["Hazırlık", "bugün"], "hot": 1}, keep_pic=False)
setl(V, 2, "pictos", "Three water drops fill one by one: three days of water", {"total": 3, "filled": 3, "icon": "drop", "label": "gün su", "heading": "Su"}, keep_pic=False)
setl(V, 3, "list", "Two ticked boxes: food that keeps, a torch", {"items": ["Bozulmayan yiyecek", "El feneri"], "bullet": "check"}, keep_pic=False)
setl(V, 4, "title", "The whistle gets a card of its own, wiped in", {"title": "Düdük", "size": 220, "mode": "mask"}, keep_pic=False)
setl(V, 5, "collage", "Pill organisers in round frames beside the first aid supplies", {})
setl(V, 6, "diagram", "The zip bag with two pins: ID copies, some cash", {"callouts": [{"x": 0.4, "y": 0.35, "label": "Kimlik fotokopileri"}, {"x": 0.6, "y": 0.65, "label": "Biraz nakit"}]}, {"frame": "window"})
setl(V, 7, "photo", "The assembly-area sign in a window card: where the family meets", {"kicker": "buluşma noktası"}, {"frame": "window", "enter": "drop"})
save("deprem", V)

# ---------------------------------------------------------------- kahve: a recipe by hand - chalk, prints, a flame dial
V = load("kahve"); P = {l["line"]: l.get("picked") for l in V["lines"]}
V["sound"] = {"mood": "calm", "bpm": 72}
V["acts"] = [{"id": "A1", "lines": [1, 2, 3, 4, 5, 6, 7], "style": "chalkboard", "why": "one recipe told by hand: a hand-held camera, photos that develop like prints on the board, chalk writing",
              "direction": D("handheld", "develop", "print", "lower", "hand", "hand", "classroom")}]
setl(V, 1, "photo", "The cezve fills the frame, hand-held, developing out of white", {"text": "bottom", "from": [0.5, 0.5, 1.0], "to": [0.5, 0.45, 1.2]}, {"frame": "bleed"})
setl(V, 2, "list", "The measures chalked as two ticked lines", {"items": ["1 tatlı kaşığı kahve", "1 fincan soğuk su"], "bullet": "check"}, keep_pic=False)
setl(V, 3, "stamp", "A taped print of sugar cubes; NOW is stamped on it", {"text": "ŞİMDİ"})
setl(V, 4, "gauge", "A flame dial whose needle settles at low", {"value": 0.18, "label": "kısık ateş", "low": "kısık", "high": "harlı"}, keep_pic=False)
setl(V, 5, "split", "The pour on one side, the instruction chalked on the other", {"photo_side": "left"}, {"frame": "polaroid", "enter": "drop"})
setl(V, 6, "detail", "The foam; an arrow points at it", {"region": [0.15, 0.15, 0.75, 0.8], "label": "köpük", "mark": "arrow"}, {"frame": "bleed"})
setl(V, 7, "photo", "The served tray as a polaroid with a handwritten wish", {"kicker": "servis"}, {"frame": "polaroid", "enter": "drop", "camera": "locked"})
line(V, 7)["picked"]["label"] = "afiyet olsun"
save("kahve", V)

# ---------------------------------------------------------------- kehribar: a cold case - cold open, old ink, the file
V = load("kehribar"); P = {l["line"]: l.get("picked") for l in V["lines"]}; X6 = line(V, 6).get("extra") or []
V["sound"] = {"mood": "dark", "bpm": 78}
V["acts"] = [
 {"id": "A1", "lines": [1, 2], "style": "spy-titles", "why": "a cold open in 1941: whip pans, slabs of type", "direction": D("whip", "slide", "bleed", "kinetic", "bebas", "oswald", "thriller")},
 {"id": "A2", "lines": [3, 4], "style": "woodcut", "why": "the eighteenth-century gift and the wartime route: old ink on torn paper", "direction": D("locked", "tear", "torn", "lower", "abril", "serif", "paper"), "transition": {"kind": "dip", "dur": 0.6}},
 {"id": "A3", "lines": [5, 6, 7], "style": "halftone-dossier", "why": "the open case file: polaroids dropped on a desk, typed notes, a board that ends on a question", "direction": D("kenburns", "drop", "polaroid", "typewriter", "elite", "courier", "thriller"), "transition": {"kind": "knife", "dur": 0.4}}]
setl(V, 1, "photo", "The amber room; the year slams over it", {"text": "bottom", "kicker": "1941", "from": [0.5, 0.5, 1.2], "to": [0.5, 0.5, 1.0]})
setl(V, 2, "detail", "A dive into one amber panel, bracketed and named", {"region": [0.35, 0.3, 0.65, 0.6], "label": "kehribar", "mark": "bracket"})
setl(V, 3, "document", "The tsar's portrait as a torn print; a box closes on the face of the gift's receiver", {"region": [0.3, 0.06, 0.75, 0.42], "mark": "box"})
setl(V, 4, "map", "An inked Baltic; the route to Königsberg", {"map": "baltic", "stops": ["Sankt Petersburg", "Königsberg"], "look": "ink"})
setl(V, 5, "stamp", "A polaroid of a bunker; NO TRACE stamped on it", {"text": "İZ YOK", "y": 0.38})
setl(V, 6, "compare", "Two polaroids: 1931 and today, the copy", {"left_label": "1931", "right_label": "bugün"})
setl(V, 7, "board", "The desk at the end: the room's pictures pinned together, the last note a question mark", {"surface": "desk", "notes": ["1941", "Königsberg", "?"]}, extra=[P[1], P[5]])
save("kehribar", V)

# ---------------------------------------------------------------- nova: a launch - scans, a labelled product, a strip of colours
V = load("nova"); P = {l["line"]: l.get("picked") for l in V["lines"]}; X5 = line(V, 5).get("extra") or []
V["sound"] = {"mood": "dark", "bpm": 104}
V["acts"] = [{"id": "A1", "lines": [1, 2, 3, 4, 5, 6], "style": "dark-keynote", "why": "one launch in one voice: the product scans in, whip moves, huge spoken phrases",
              "direction": D("whip", "scan", "window", "kinetic", "unbounded", "inter", "digital", ornament="hud")}]
setl(V, 1, "photo", "The watch lights up full frame; the claim lands in huge type", {"text": "bottom", "from": [0.5, 0.5, 1.2], "to": [0.5, 0.5, 1.0]}, {"frame": "bleed"})
setl(V, 2, "number", "Seven slams in: days of battery", {"value": 7, "unit": "gün pil", "mode": "slam"}, keep_pic=False)
setl(V, 3, "diagram", "The health screen with three pins: heart rhythm, sleep, oxygen", {"callouts": [{"x": 0.5, "y": 0.4, "label": "Kalp ritmi"}, {"x": 0.5, "y": 0.5, "label": "Uyku"}, {"x": 0.5, "y": 0.58, "label": "Oksijen"}]}, {"caption": "subtitle"})
setl(V, 4, "bigword", "The case weight stacked in huge type: 32 over the word gram, the number in the accent colour", {"words": ["32", "gram"], "hot": 0}, {"caption": "subtitle"}, keep_pic=False)
setl(V, 5, "filmstrip", "The three colours pass through the gate one by one", {}, {"caption": "subtitle"})
setl(V, 6, "title", "The name, letter by letter; pre-orders today", {"title": "Nova S", "size": 220, "mode": "letters"}, keep_pic=False)
save("nova", V)

# ---------------------------------------------------------------- petek: why hexagons - question card, geometry plates in hexagons, a warm ending
V = load("petek"); P = {l["line"]: l.get("picked") for l in V["lines"]}
V["sound"] = {"mood": "calm", "bpm": 90}
V["acts"] = [
 {"id": "A1", "lines": [1, 2], "style": "flat-space-explainer", "why": "the hook: a look inside the hive, then the question in two big words", "direction": D("kenburns", "mask", "bleed", "karaoke", "rubik", "grotesk", "soft")},
 {"id": "A2", "lines": [3, 4, 5, 6], "style": "blueprint", "why": "the proof: geometry plates, pictures seen through hexagons, a rostrum camera, notes in the margin", "direction": D("rostrum", "blinds", "hex", "margin", "syne", "grotesk", "paper"), "transition": {"kind": "wipe", "dur": 0.5}},
 {"id": "A3", "lines": [7, 8], "style": "risograph", "why": "back to the bees: warm ink, torn prints, a hand-held look", "direction": D("handheld", "tear", "torn", "kinetic", "fraunces", "grotesk", "soft"), "transition": {"kind": "push", "dur": 0.5}}]
setl(V, 1, "photo", "Bees on comb, the camera pushing into the cells", {"text": "bottom", "from": [0.5, 0.5, 1.0], "to": [0.55, 0.45, 1.3]})
setl(V, 2, "bigword", "The question as a card: why, then hexagon with its question mark in the accent colour", {"words": ["Neden", "altıgen?"], "hot": 1}, keep_pic=False)
setl(V, 3, "compare", "Circles and hexagons side by side, each seen through a hexagon", {"left_label": "daire", "right_label": "altıgen"})
setl(V, 4, "bars", "Wall length needed to enclose the same area: triangle, square, hexagon (geometry)", {"items": [{"label": "üçgen", "value": 4.56}, {"label": "kare", "value": 4.0}, {"label": "altıgen", "value": 3.72}], "decimals": 2, "highlight": 2, "heading": "Aynı alan için duvar uzunluğu"}, keep_pic=False)
setl(V, 5, "ratio", "The saving as a ring: less wax", {"fraction": 0.93, "label": "daha az mum"})
setl(V, 6, "typed", "The proof noted on an index card with its year", {"paper": "index", "heading": "Kanıt · Thomas Hales", "date": "1999"}, keep_pic=False)
setl(V, 7, "detail", "Warm wax; an arrow where the cells pull themselves into shape", {"region": [0.1, 0.35, 0.5, 0.75], "label": "ısınan mum", "mark": "arrow"}, {"frame": "bleed"})
setl(V, 8, "photo", "A wild hive in a torn print; the last line huge", {"from": [0.5, 0.5, 1.05], "to": [0.5, 0.5, 1.25]}, {"frame": "bleed"})
save("petek", V)
print("directed: culluk curie deprem kahve kehribar nova petek")
