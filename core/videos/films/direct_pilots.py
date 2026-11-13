"""Second-pass DIRECTION for three pilot films (galata, enflasyon, kedi): every act decides camera, entrance, frame,
caption, type and sound from its content; lines become the scene that carries their information."""
import json, pathlib
F = pathlib.Path(__file__).resolve().parent
def load(s): return json.loads((F / s / "visuals.json").read_text())
def save(s, V): (F / s / "visuals.json").write_text(json.dumps(V, ensure_ascii=False, indent=1))
def line(V, n): return next(l for l in V["lines"] if l["line"] == n)
def setl(V, n, shot, idea, data=None, direction=None, keep_pic=True):
    l = line(V, n); l["shot"] = shot; l["idea"] = idea; l["data"] = data or {}
    if direction: l["direction"] = direction
    else: l.pop("direction", None)
    if not keep_pic: l.pop("picked", None); l.pop("extra", None); l["media"] = {"need": False}
    return l

# ---------------------------------------------------------------- galata: a history told with four kinds of material
V = load("galata"); pics = {l["line"]: l.get("picked") for l in V["lines"]}; ex6 = (line(V, 6).get("extra") or [])
V["sound"] = {"mood": "calm", "bpm": 74}
V["acts"] = [
 {"id": "A1", "lines": [1, 2, 3], "style": "engraving", "why": "the medieval tower: studied like an old print, a rostrum camera over paper",
  "direction": {"camera": "rostrum", "enter": "unfold", "frame": "print", "caption": "lower", "fonts": {"display": "playfair", "text": "serif"}, "sound": "paper"}},
 {"id": "A2", "lines": [4, 5, 6], "style": "halftone-dossier", "why": "Ottoman centuries as a case file: finds dropped on a board, a typed legend, fires and quakes pinned together",
  "direction": {"camera": "handheld", "enter": "drop", "frame": "polaroid", "caption": "typewriter", "fonts": {"display": "elite", "text": "courier"}, "sound": "thriller"}, "transition": {"kind": "dip", "dur": 0.6}},
 {"id": "A3", "lines": [7, 8], "style": "silkscreen-poster", "why": "back to today: a loud poster, the number and the view",
  "direction": {"camera": "drift", "enter": "mask", "frame": "bleed", "caption": "kinetic", "fonts": {"display": "staat", "text": "oswald"}, "sound": "poster"}, "transition": {"kind": "push", "dur": 0.5}}]
setl(V, 1, "bigword", "Seven hundred years stamped across the skyline with the tower behind", {"words": ["700", "yıl"], "hot": 0}, {"frame": "bleed", "camera": "kenburns", "enter": "develop"})
line(V, 1)["data"].update({"from": [0.3, 0.62, 1.1], "to": [0.27, 0.6, 1.4]})
setl(V, 2, "timeline", "A timeline whose playhead stops on 1348, the Genoese year", {"years": [1348, 1453, 1632, 2025], "current": 1348, "labels": ["Ceneviz", "Fetih", "Hezarfen", "Bugün"], "axis": "x"})
setl(V, 3, "detail", "The old panorama; the camera dives to the tower and an arrow names it the Tower of Christ", {"region": [0.38, 0.05, 0.56, 0.5], "label": "İsa Kulesi", "mark": "arrow"}, {"frame": "bleed"})
setl(V, 4, "photo", "A polaroid of the tower's gallery dropped on the file: the fire watch", {"kicker": "yangın gözcüsü"})
line(V, 4).setdefault("picked", pics[4]); line(V, 4)["picked"]["label"] = "yangın gözcüsü"
setl(V, 5, "typed", "The legend typed on a file card, marked as a tale and credited to the traveller who told it", {"paper": "index", "heading": "Rivayet · Evliya Çelebi aktarır", "date": "17. yüzyıl"}, keep_pic=False)
l6 = setl(V, 6, "board", "A cork board: the tower's damaged and rebuilt states pinned and joined by a red string", {"surface": "cork", "notes": ["yangın", "deprem", "yeniden"]})
l6["extra"] = (ex6 + [dict(pics[3]), dict(pics[4])])[:3]
setl(V, 7, "number", "Sixty-seven metres rolling up like an odometer over the tower", {"value": 67, "suffix": " m", "unit": "yükseklik", "mode": "odometer"})
if pics.get(4): line(V, 7)["picked"] = dict(pics[4])
setl(V, 8, "photo", "The view from the windows across the water, drifting, the last words huge", {"text": "bottom"})
save("galata", V)

# ---------------------------------------------------------------- enflasyon: one voice, one act; the information IS the picture
V = load("enflasyon"); V["sound"] = {"palette": "digital", "mood": "dark", "bpm": 92}
V["acts"] = [{"id": "A1", "lines": [1, 2, 3, 4, 5, 6, 7], "style": "dataviz", "why": "one explanation in one voice: a locked camera, every line a different graphic that carries the fact",
              "direction": {"camera": "locked", "enter": "mask", "frame": "window", "caption": "subtitle", "fonts": {"display": "grotesk", "text": "inter"}}}]
setl(V, 1, "versus", "The same hundred lira in two columns: last year a full basket, this year less", {"left": "Geçen yıl", "right": "Bu yıl", "rows": [["cebinizde", "100 ₺", "100 ₺"], ["sepet", "dolu", "daha az"]]}, keep_pic=False)
setl(V, 2, "bigword", "The word itself, huge, over a supermarket shelf", {"words": ["Enflasyon"]}, {"camera": "drift"})
line(V, 2)["picked"] = dict(next(l for l in load("enflasyon")["lines"] if l["line"] == 1)["picked"]) if next(l for l in load("enflasyon")["lines"] if l["line"] == 1).get("picked") else line(V, 2).get("picked")
setl(V, 3, "steps", "Cause and effect as three stations joined by a travelling line", {"items": ["Para çoğalır", "Maliyet yükselir", "Fiyat tırmanır"], "heading": "Neden olur?"}, keep_pic=False)
setl(V, 4, "bars", "Two bars: the basket at 100 and at 110 lira", {"items": [{"label": "geçen yıl", "value": 100}, {"label": "bu yıl", "value": 110}], "unit": "₺", "orient": "v", "heading": "%10 enflasyon"}, keep_pic=False)
setl(V, 5, "gauge", "A dial for purchasing power; the needle settles low", {"value": 0.28, "label": "alım gücü", "low": "düşük", "high": "yüksek"}, keep_pic=False)
setl(V, 6, "photo", "The central bank tower in a window card; the brake", {"kicker": "faiz = fren"}, {"caption": "karaoke"})
setl(V, 7, "document", "A real receipt; a box closes around the totals: the graph in your hand", {"region": [0.1, 0.62, 0.9, 0.78], "mark": "box"})
save("enflasyon", V)

# ---------------------------------------------------------------- kedi: a silent comedy, jump cuts and intertitles
V = load("kedi"); V["sound"] = {"palette": "comedy", "mood": "bright", "bpm": 118}
V["acts"] = [{"id": "A1", "lines": [1, 2, 3, 4, 5, 6], "style": "silent-film", "why": "one slapstick day: a silent comedy with jump-cut punch-ins, an iris and big intertitles",
              "direction": {"camera": "punch", "enter": "projector", "frame": "bleed", "caption": "subtitle", "fonts": {"display": "deco", "text": "serif"}, "texture": "film"}}]
setl(V, 1, "photo", "Dawn: the cat by the table edge, the camera jumping closer three times", {"kicker": "06:00", "from": [0.25, 0.3, 1.0], "to": [0.22, 0.28, 1.7]})
setl(V, 2, "detail", "The bowl: an arrow accuses the bare patch in the middle", {"region": [0.2, 0.55, 0.5, 0.95], "label": "boş!", "mark": "arrow"})
setl(V, 3, "photo", "Noon seen through a silent-film iris: one square of sun, fully occupied", {"kicker": "öğlen"}, {"frame": "circle", "enter": "mask", "camera": "kenburns"})
setl(V, 4, "compare", "Two framed prints and a VS badge: the costly bed against the cardboard box", {"left_label": "pahalı yatak", "right_label": "kutu"}, {"frame": "polaroid", "enter": "drop", "camera": "locked"})
setl(V, 5, "bigword", "An intertitle that shouts the hour and the race", {"words": ["Gece", "03:00", "yarış!"], "hot": 1}, keep_pic=False)
setl(V, 6, "stamp", "The innocent face in a film-strip frame; AGAIN is stamped on it", {"text": "yine", "y": 0.4}, {"frame": "strip", "camera": "handheld"})
save("kedi", V)
print("directed: galata, enflasyon, kedi")
