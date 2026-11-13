# Visual treatments for the 10 taught films: acts from the approved gold decisions, one specific idea per line,
# the layout that shows it, the data it needs and precise media queries. Writes videos/films/<slug>/visuals.json + maps.
import json, pathlib, subprocess, sys
ROOT = pathlib.Path("/Users/eyna/vb-test/vidbucks/core"); GOLD = ROOT.parent / "knowledge/director/gold"


def L(line, shot, idea, q=None, data=None, **k):
    m = {"queries": q, "n": 3, **({"min_width": k.pop("minw")} if "minw" in k else {})} if q else {"need": False}
    return {"line": line, "shot": shot, "idea": idea, "media": m, **({"data": data} if data else {}), **k}


MAPS = {  # slug -> [(name, args)]
    "galata": [("ist", ["--lon", "28.85", "29.15", "--lat", "40.95", "41.1", "--proj", "mercator", "--lon0", "29.0", "--K", "400000", "--place", "Galata=41.0256,28.9742", "--place", "Üsküdar=41.0226,29.0153"])],
    "curie": [("eu", ["--lon", "-6", "30", "--lat", "40", "58", "--proj", "mercator", "--lon0", "12", "--K", "14000", "--place", "Varşova=52.23,21.01", "--place", "Paris=48.86,2.35"])],
    "kehribar": [("baltic", ["--lon", "10", "40", "--lat", "50", "64", "--proj", "mercator", "--lon0", "25", "--K", "16000", "--place", "Sankt Petersburg=59.72,30.40", "--place", "Königsberg=54.71,20.51"])],
    "culluk": [("pac", ["--lon", "10.5", "0", "--lat", "-60", "78", "--proj", "mercator", "--lon0", "-170", "--K", "5000", "--place", "Alaska=60.7,-161.8", "--place", "Yeni Zelanda=-37.0,175.0"])],
}
F = {}
F["galata"] = ([
    {"id": "A1", "lines": [1, 2, 3], "style": "engraving", "why": "medieval origin: an engraved chronicle"},
    {"id": "A2", "lines": [4, 5, 6], "style": "silent-film", "why": "Ottoman fire watch and the flight legend as a playful period film", "transition": {"kind": "iris", "dur": 0.6}},
    {"id": "A3", "lines": [7, 8], "style": "silkscreen-poster", "why": "today: the tower as the city's icon on a travel poster", "transition": {"kind": "wipe", "dur": 0.5}}], [
    L(1, "photo", "The Galata Tower rising above the rooftops of Beyoğlu in the Istanbul skyline", ["Galata Tower Istanbul skyline", "Galata Tower from Golden Horn"], {"text": "bottom", "from": [0.5, 0.6, 1.0], "to": [0.5, 0.45, 1.15]}),
    L(2, "timeline", "A timeline drawn from 1348, when Genoese builders finished the tower, to today", None, {"years": [1348, 1453, 1632, 2025], "current": 1348, "labels": ["Ceneviz", "Fetih", "Hezarfen", "Bugün"]}),
    L(3, "document", "An old engraved view of Galata with the tower named Christea Turris in the corner", ["Galata engraving 16th century", "Constantinople Galata old print"], {"region": [0.55, 0.15, 0.85, 0.5]}),
    L(4, "detail", "A historic photograph of the tower's top storey where fire watchers scanned the city", ["Galata Tower historic photograph", "Galata tower 19th century photo"], {"region": [0.35, 0.05, 0.65, 0.35], "label": "yangın gözcüsü"}),
    L(5, "map", "A dotted flight line across the Bosphorus from Galata to Üsküdar, marked as a legend", None, {"map": "ist", "stops": ["Galata", "Üsküdar"], "zoom": 0.32, "kicker": "rivayet"}),
    L(6, "collage", "Two pictures of the tower in different centuries, its cap changing shape after fires", ["Galata Tower 1900", "Galata Tower old postcard"]),
    L(7, "number", "The tower's height counting up to 67 metres over a close view of its stone body", ["Galata Tower close up stone"], {"value": 67, "unit": "metre", "suffix": " m"}),
    L(8, "photo", "Evening view down to the Golden Horn from the tower's windows", ["view from Galata Tower Golden Horn", "Golden Horn from Galata Tower"], {"text": "bottom", "from": [0.4, 0.5, 1.0], "to": [0.6, 0.5, 1.12]})])
F["petek"] = ([
    {"id": "A1", "lines": [1, 2], "style": "flat-space-explainer", "why": "hook: a bright question card"},
    {"id": "A2", "lines": [3, 4, 5, 6], "style": "blueprint", "why": "the geometry proof as a technical drawing", "transition": {"kind": "wipe", "dur": 0.5}},
    {"id": "A3", "lines": [7, 8], "style": "risograph", "why": "back to the hive: a warm printed close", "transition": {"kind": "fade", "dur": 0.5}}], [
    L(1, "photo", "Honeybees crawling over a honeycomb frame packed with hexagonal cells", ["honeycomb bees frame close up", "honey bees on comb macro"], {"text": "bottom", "from": [0.5, 0.5, 1.0], "to": [0.55, 0.45, 1.2]}),
    L(2, "title", "The question itself as a chapter card: why not squares or circles", None, {"title": "Neden altıgen?", "size": 170}),
    L(3, "compare", "Packed circles with gaps beside packed hexagons with none, side by side", ["circle packing hexagonal", "close packing of equal circles diagram"], {"left_label": "daire", "right_label": "altıgen"}),
    L(4, "detail", "A single wax cell wall magnified: the shortest wall enclosing the same area", ["honeycomb cells macro wax", "honeycomb hexagonal cells close up"], {"region": [0.4, 0.4, 0.6, 0.6], "label": "en kısa duvar"}),
    L(5, "ratio", "A ring shows how much less wax a hexagonal comb needs than square cells", ["beeswax comb"], {"fraction": 0.93, "label": "daha az mum"}),
    L(6, "photo", "A blackboard of hexagonal tilings for the 1999 proof by Thomas Hales", ["hexagonal tiling", "honeycomb conjecture"], {"text": "left", "kicker": "1999 · Thomas Hales"}),
    L(7, "detail", "Fresh comb at the edge of a frame where round cells are still settling into hexagons", ["new honeycomb cells building bees", "bees building comb"], {"region": [0.3, 0.3, 0.7, 0.7], "label": "ısınan mum"}),
    L(8, "split", "A wild honeycomb hanging from a branch in sunlight", ["wild honeycomb tree", "wild bee nest honeycomb"], {"photo_side": "right", "from": [0.5, 0.5, 1.05], "to": [0.5, 0.5, 1.2]})])
F["nova"] = ([
    {"id": "A1", "lines": [1, 2, 3, 4, 5, 6], "style": "dark-keynote", "why": "one product launch: one keynote look"}], [
    L(1, "photo", "A smartwatch on a wrist lighting up in the dark, no brand visible", ["smartwatch on wrist dark", "smart watch wrist night"], {"text": "bottom", "from": [0.5, 0.5, 1.15], "to": [0.5, 0.5, 1.0]}),
    L(2, "number", "Seven days of battery counting up over a dim watch face", ["smartwatch charging"], {"value": 7, "unit": "gün pil"}),
    L(3, "list", "Three health readings appearing one by one beside the watch", ["smartwatch health heart rate"], {"items": ["Kalp ritmi", "Uyku", "Oksijen"]}),
    L(4, "number", "The case weight of 32 grams landing like a spec on a keynote slide", ["smartwatch side view"], {"value": 32, "unit": "gram", "suffix": " g"}),
    L(5, "collage", "Three watch bands in night, sand and ocean tones laid out side by side", ["watch strap colors", "silicone watch bands"]),
    L(6, "title", "The launch line as the closing card: pre-orders open today", None, {"title": "Nova S", "size": 200})])
F["enflasyon"] = ([
    {"id": "A1", "lines": [1, 2, 3, 4, 5, 6, 7], "style": "dataviz", "why": "a data explainer: one chart language"}], [
    L(1, "compare", "Two shopping baskets bought with the same 100 lira: last year full, this year half empty", ["shopping basket groceries full", "empty shopping basket supermarket"], {"left_label": "geçen yıl", "right_label": "bu yıl"}),
    L(2, "title", "The word itself as a definition card: prices rising across the board", None, {"title": "Enflasyon", "size": 190}),
    L(3, "list", "The two engines of rising prices listed against a printing press", ["banknote printing press"], {"items": ["Para arzı artar", "Maliyetler yükselir"]}),
    L(4, "number", "A worked example: a 100 lira basket becoming 110 lira at ten percent", None, {"value": 110, "unit": "yüzde on sonra", "suffix": " ₺"}),
    L(5, "ratio", "A ring of purchasing power shrinking when wages lag prices", ["wallet coins"], {"fraction": 0.91, "label": "alım gücü"}),
    L(6, "photo", "A central bank building, the institution that raises rates like a brake", ["Central Bank of the Republic of Turkey building", "central bank building"], {"text": "bottom"}),
    L(7, "document", "A long market receipt, its total line highlighted like the end of a chart", ["supermarket receipt", "grocery receipt"], {"region": [0.1, 0.7, 0.9, 0.82]})])
F["kehribar"] = ([
    {"id": "A1", "lines": [1, 2], "style": "spy-titles", "why": "a mystery hook as a title sequence"},
    {"id": "A2", "lines": [3, 4, 5], "style": "newsreel", "why": "the history up to 1945 as period news film", "transition": {"kind": "iris", "dur": 0.6}},
    {"id": "A3", "lines": [6, 7], "style": "halftone-dossier", "why": "the open case as an investigation dossier", "transition": {"kind": "knife", "dur": 0.45}}], [
    L(1, "photo", "A 1941 photograph of an ornate palace room being emptied", ["Amber Room 1931 photograph", "Catherine Palace Amber Room historic photo"], {"text": "bottom", "kicker": "1941", "from": [0.5, 0.5, 1.15], "to": [0.5, 0.5, 1.0]}),
    L(2, "detail", "Close on the amber panels: carved mosaics glowing honey-gold", ["Amber Room panel detail", "Amber Room Catherine Palace"], {"region": [0.35, 0.3, 0.65, 0.6], "label": "kehribar"}),
    L(3, "document", "A royal portrait of Peter the Great, who received the room as a Prussian gift", ["Peter the Great portrait", "Peter I of Russia portrait"], {"region": [0.2, 0.08, 0.8, 0.45]}),
    L(4, "map", "A route from the palace near Saint Petersburg to Königsberg across the Baltic", None, {"map": "baltic", "stops": ["Sankt Petersburg", "Königsberg"], "zoom": 0.3}),
    L(5, "stamp", "A ruined Königsberg street in 1945 under a stamp: trail lost", ["Königsberg 1945 ruins", "Königsberg castle ruins"], {"text": "İZ YOK"}),
    L(6, "compare", "The historic black-and-white room beside the reconstructed one in full colour", ["Amber Room reconstruction", "Amber Room 1931"], {"left_label": "1931", "right_label": "bugün"}),
    L(7, "stamp", "The reconstructed amber walls with a red LOST stamp for the original", ["Amber Room Catherine Palace interior"], {"text": "KAYIP"})])
F["culluk"] = ([
    {"id": "A1", "lines": [1, 2, 3, 4], "style": "silkscreen-poster", "why": "the journey as a travel-poster voyage"},
    {"id": "A2", "lines": [5, 6, 7], "style": "flat-space-explainer", "why": "inside the body: a clear science explainer", "transition": {"kind": "wipe", "dur": 0.5}},
    {"id": "A3", "lines": [8], "style": "silkscreen-poster", "why": "bookend: the voyage poster returns", "transition": {"kind": "wipe", "dur": 0.5}}], [
    L(1, "photo", "A flock of shorebirds lifting off an Alaskan mudflat at dawn", ["bar-tailed godwit flock flying", "godwits flock flight"], {"text": "bottom", "from": [0.5, 0.6, 1.0], "to": [0.5, 0.4, 1.15]}),
    L(2, "detail", "Close on one bar-tailed godwit: long upturned bill, barred tail", ["bar-tailed godwit Limosa lapponica", "bar-tailed godwit portrait"], {"region": [0.3, 0.2, 0.7, 0.6], "label": "çamurçulluğu"}),
    L(3, "map", "A line across the whole Pacific from Alaska to New Zealand", None, {"map": "pac", "stops": ["Alaska", "Yeni Zelanda"], "zoom": 0.16}),
    L(4, "number", "13,000 kilometres counting up, non-stop", ["Pacific ocean aerial"], {"value": 13000, "unit": "kilometre, tek seferde", "suffix": " km"}),
    L(5, "ratio", "A ring of body mass turning mostly to fuel before departure", ["bar-tailed godwit feeding mudflat"], {"fraction": 0.55, "label": "yakıt"}),
    L(6, "compare", "A feeding godwit beside one in flight: gut shrinks, wings take over", ["godwit feeding", "godwit flying"], {"left_label": "önce", "right_label": "uçuşta"}),
    L(7, "number", "Nearly half the body weight lost on arrival", ["godwit resting beach New Zealand"], {"value": 50, "unit": "ağırlık kaybı", "suffix": "%"}),
    L(8, "map", "The line drawn back north the next spring, the voyage repeating", None, {"map": "pac", "stops": ["Yeni Zelanda", "Alaska"], "zoom": 0.16})])
F["kahve"] = ([
    {"id": "A1", "lines": [1, 2, 3, 4, 5, 6, 7], "style": "chalkboard", "why": "a recipe from the café board: hand-written throughout"}], [
    L(1, "photo", "A copper cezve on a stove next to two small porcelain cups", ["Turkish coffee cezve", "cezve copper coffee pot"], {"text": "bottom", "from": [0.5, 0.5, 1.0], "to": [0.5, 0.5, 1.15]}),
    L(2, "list", "The measures chalked up: one spoon of coffee, one cup of cold water", ["ground coffee spoon"], {"items": ["1 tatlı kaşığı kahve", "1 fincan soğuk su"]}),
    L(3, "stamp", "Sugar spooned in now, with a chalk stamp: no stirring later", ["sugar cubes spoon"], {"text": "ŞİMDİ"}),
    L(4, "detail", "The lowest flame under the pot, close up", ["gas stove low flame", "stove flame blue"], {"region": [0.3, 0.4, 0.7, 0.8], "label": "kısık ateş"}),
    L(5, "split", "Foam rising in the cezve and being shared into the cups", ["Turkish coffee foam", "Turkish coffee pouring cezve"], {"photo_side": "left"}),
    L(6, "detail", "The thick foam crown on a finished cup", ["Turkish coffee cup foam top", "Turkish coffee"], {"region": [0.3, 0.2, 0.7, 0.6], "label": "köpük"}),
    L(7, "photo", "The coffee served on a tray with a glass of water", ["Turkish coffee with water glass", "Turkish coffee served tray"], {"text": "bottom", "from": [0.5, 0.5, 1.12], "to": [0.5, 0.5, 1.0]})])
F["deprem"] = ([
    {"id": "A1", "lines": [1], "style": "caption-news", "why": "the warning as a news bulletin"},
    {"id": "A2", "lines": [2, 3, 4, 5, 6], "style": "pictogram-motion", "why": "the kit: clear pictograms, one item per beat", "transition": {"kind": "knife", "dur": 0.4}},
    {"id": "A3", "lines": [7], "style": "caption-news", "why": "bookend: the bulletin's call to action", "transition": {"kind": "knife", "dur": 0.4}}], [
    L(1, "title", "A breaking-news card: an earthquake lasts seconds, preparation starts today", None, {"title": "Hazırlık bugün", "size": 170}),
    L(2, "number", "Three days of water counting up beside bottled water", ["bottled water emergency", "water bottles pack"], {"value": 3, "unit": "günlük su"}),
    L(3, "list", "Canned food and a flashlight listed with their pictures", ["emergency kit canned food flashlight"], {"items": ["Bozulmayan yiyecek", "El feneri"]}),
    L(4, "photo", "A plastic emergency whistle on a lanyard, held up close", ["emergency whistle", "safety whistle"], {"text": "bottom"}),
    L(5, "collage", "A first aid kit and a weekly pill box packed into the bag", ["first aid kit", "pill organizer box"]),
    L(6, "list", "Copies of IDs and some cash in a zip bag", ["documents zip bag", "cash banknotes envelope"], {"items": ["Kimlik fotokopileri", "Biraz nakit"]}),
    L(7, "photo", "An assembly-area sign in a park where families meet after a quake", ["earthquake assembly area sign", "emergency assembly point sign"], {"text": "bottom"})])
F["kedi"] = ([
    {"id": "A1", "lines": [1, 2, 3, 4, 5, 6], "style": "silent-film", "why": "a slapstick day: silent comedy with intertitles"}], [
    L(1, "photo", "A cat on a table edge, paw on a glass, staring at the camera at dawn", ["cat pushing glass off table", "cat on table glass"], {"text": "bottom", "from": [0.5, 0.5, 1.0], "to": [0.55, 0.45, 1.2]}),
    L(2, "detail", "The food bowl: full at the rim, a tiny bare patch in the middle", ["cat food bowl", "cat bowl kibble"], {"region": [0.35, 0.35, 0.65, 0.65], "label": "boş!"}),
    L(3, "photo", "A cat stretched across the one square of sunlight on the floor", ["cat sleeping in sunbeam", "cat sunlight floor"], {"text": "bottom"}),
    L(4, "compare", "An expensive cat bed ignored beside a cardboard box with the cat inside", ["cat bed", "cat in cardboard box"], {"left_label": "pahalı yatak", "right_label": "kutu"}),
    L(5, "title", "An intertitle at 3 a.m.: the race down the hallway", None, {"title": "Gece 03:00", "size": 180}),
    L(6, "stamp", "The cat beside the glass again, innocent, under a stamp: again", ["cat innocent look", "cat staring"], {"text": "YİNE"})])
F["curie"] = ([
    {"id": "A1", "lines": [1, 2, 3, 4, 5, 6], "style": "engraving", "why": "a period biography: engraved portraits and documents"},
    {"id": "A2", "lines": [7, 8], "style": "oscilloscope-math", "why": "the turn: her notebooks still glow", "transition": {"kind": "fade", "dur": 0.7}}], [
    L(1, "title", "A title card naming the only person with Nobels in two sciences", None, {"title": "Marie Curie", "size": 190}),
    L(2, "map", "A line from Warsaw to Paris, the journey she made to study", None, {"map": "eu", "stops": ["Varşova", "Paris"], "zoom": 0.3}),
    L(3, "photo", "Marie and Pierre Curie together in their laboratory", ["Pierre and Marie Curie laboratory", "Marie Curie Pierre Curie"], {"text": "bottom"}),
    L(4, "timeline", "A timeline landing on 1898, the year of polonium and radium", None, {"years": [1891, 1898, 1903, 1911], "current": 1898, "labels": ["Paris", "polonyum · radyum", "fizik", "kimya"]}),
    L(5, "number", "The 1903 physics prize counting in over her portrait", ["Marie Curie 1903 portrait", "Marie Curie portrait"], {"value": 1903, "unit": "fizik nobeli"}),
    L(6, "document", "Her Nobel diploma in chemistry with the year highlighted", ["Marie Curie Nobel diploma", "Nobel diploma Curie 1911"], {"region": [0.1, 0.6, 0.9, 0.8]}),
    L(7, "detail", "A page of her handwritten laboratory notebook, close", ["Marie Curie notebook", "Marie Curie laboratory notebook"], {"region": [0.2, 0.25, 0.8, 0.6], "label": "hâlâ radyoaktif"}),
    L(8, "photo", "A late portrait of Marie Curie in a soft glow", ["Marie Curie portrait 1920", "Marie Curie c1920"], {"text": "bottom", "from": [0.5, 0.35, 1.0], "to": [0.5, 0.3, 1.12]})])

for slug, (acts, lines) in F.items():
    d = ROOT / "videos/films" / slug; d.mkdir(parents=True, exist_ok=True)
    V = {"public_dir": f"films/{slug}", "acts": acts, "lines": lines}
    (d / "visuals.json").write_text(json.dumps(V, ensure_ascii=False, indent=1))
    for name, args in MAPS.get(slug, []):
        subprocess.run([sys.executable, str(ROOT / "tools/board_map.py"), "--name", name, *args, "--out", str(ROOT / "public/films" / slug / f"map_{name}.json")], check=True, capture_output=True)
    print(slug, len(lines), "lines", [n for n, _ in MAPS.get(slug, [])])
