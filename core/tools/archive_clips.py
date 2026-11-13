#!/usr/bin/env python3
"""Period footage from trusted public archives, with the licence checked per item.

  python tools/archive_clips.py search --q "supermarket" --years 1950-1969 [--rows 20] [--homemovies]
  python tools/archive_clips.py scan   --id <identifier> --every 15 [--from 0 --to 600] --out sheet.jpg
  python tools/archive_clips.py cut    --id <identifier> --at 123.4 --dur 4 --out public/films/x/c1.mp4 [--credits public/films/x/credits.json]

Why so strict: on the Internet Archive the uploader sets the licence field, and many uploads of TV shows or commercials
carry a public-domain or CC0 mark they have no right to give. So an item is accepted only when ALL hold:
  * it sits in a curated collection (default: prelinger; home movies only with --homemovies, they show private people)
  * its licenceurl is public domain / CC0 / CC BY / CC BY-SA (never NC or ND)
  * its rights text does not say "reserved"
Nothing is downloaded whole: `scan` reads single frames over HTTP range requests, `cut` copies only the seconds asked for.
Every cut is logged with title, year, licence and page URL so the credits can be written.
"""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

UA = {"User-Agent": "vidbucks/2.1 (open-licence footage research)"}
TRUSTED = ["prelinger"]
OK_LIC = re.compile(r"publicdomain|/zero/|/licenses/by/|/licenses/by-sa/")
BAD_LIC = re.compile(r"-nc|-nd|/by-nc|/by-nd")


def get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40))


def licence_ok(md):
    lic = str(md.get("licenseurl") or "")
    rights = " ".join(md.get("rights")) if isinstance(md.get("rights"), list) else str(md.get("rights") or "")
    if not lic or not OK_LIC.search(lic) or BAD_LIC.search(lic):
        return False, f"licence '{lic or 'none'}'"
    if "reserved" in rights.lower():
        return False, "rights reserved"
    return True, lic


def video_file(meta):
    files = [f for f in meta["files"] if f["name"].lower().endswith(".mp4")]
    files.sort(key=lambda f: (f.get("format") != "h.264", "512kb" in f["name"].lower(), -int(f.get("size", 0) or 0)))
    if not files:
        raise SystemExit("no mp4 in this item")
    f = files[0]
    return f"https://archive.org/download/{meta['metadata']['identifier']}/{urllib.parse.quote(f['name'])}", float(f.get("length") or 0)


def item(ident):
    meta = get(f"https://archive.org/metadata/{ident}")
    md = meta["metadata"]
    coll = md.get("collection") or []
    coll = [coll] if isinstance(coll, str) else coll
    return meta, md, coll


def cmd_search(a):
    y0, y1 = (a.years.split("-") + [a.years])[:2]
    colls = TRUSTED + (["prelingerhomemovies"] if a.homemovies else [])
    q = f"({' OR '.join('collection:' + c for c in colls)}) AND year:[{y0} TO {y1}] AND ({a.q})"
    url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
        [("q", q), ("fl[]", "identifier"), ("fl[]", "title"), ("fl[]", "year"), ("fl[]", "licenseurl"), ("fl[]", "rights"), ("fl[]", "collection"), ("rows", a.rows), ("output", "json")])
    docs = get(url)["response"]["docs"]
    shown = 0
    for d in docs:
        coll = d.get("collection") or []
        coll = [coll] if isinstance(coll, str) else coll
        if "prelingerhomemovies" in coll and not a.homemovies:
            continue
        ok, why = licence_ok(d)
        print(f"{'OK  ' if ok else 'skip'} {d.get('year')} {d['identifier'][:46]:46} {str(d.get('title'))[:60]}" + ("" if ok else f"   ({why})"))
        shown += ok
    print(f"{shown} usable of {len(docs)}")


def frame_at(url, t, path, w=480):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", url, "-frames:v", "1", "-vf", f"scale={w}:-2", path], check=True, timeout=120)


def cmd_scan(a):
    meta, md, coll = item(a.id)
    url, length = video_file(meta)
    t1 = min(a.to or length, length - 1) if length else (a.to or 600)
    times = [a.frm + i * a.every for i in range(int((t1 - a.frm) // a.every) + 1)]
    from PIL import Image, ImageDraw
    tiles = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(times):
            p = os.path.join(tmp, f"{i}.jpg")
            try:
                frame_at(url, t, p)
                tiles.append((t, Image.open(p).convert("RGB")))
            except Exception as e:  # a bad seek should not stop the sheet
                print("  frame failed at", t, e, file=sys.stderr)
        if not tiles:
            raise SystemExit("no frames")
        tw, th = tiles[0][1].size
        cols = 5
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows * th), "black")
        g = ImageDraw.Draw(sheet)
        for i, (t, im) in enumerate(tiles):
            x, y = (i % cols) * tw, (i // cols) * th
            sheet.paste(im.resize((tw, th)), (x, y))
            g.rectangle([x, y + th - 30, x + 110, y + th], fill="black")
            g.text((x + 8, y + th - 26), f"{t:.0f}s", fill="yellow")
        sheet.save(a.out, quality=85)
    ok, lic = licence_ok(md)
    print(f"{a.out}  ({len(tiles)} frames, {md.get('title')}, {md.get('year')}, licence: {lic if ok else 'NOT USABLE - ' + lic})")


def cmd_cut(a):
    meta, md, coll = item(a.id)
    ok, lic = licence_ok(md)
    if not any(c in coll for c in TRUSTED + (["prelingerhomemovies"] if a.homemovies else [])):
        raise SystemExit(f"refused: {a.id} is not in a trusted collection ({coll})")
    if not ok:
        raise SystemExit(f"refused: {a.id} {lic}")
    url, _ = video_file(meta)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    vf = f"scale=1280:-2:flags=lanczos,fps=30" + (",hflip" if a.flip else "")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a.at:.2f}", "-i", url, "-t", f"{a.dur:.2f}", "-an", "-vf", vf,
                    "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", a.out], check=True, timeout=300)
    page = f"https://archive.org/details/{a.id}"
    rec = {"file": a.out, "title": md.get("title"), "year": md.get("year"), "creator": md.get("creator") or md.get("sponsor") or "unknown",
           "license": lic, "source": "Internet Archive / " + ",".join(coll), "page": page, "in": a.at, "dur": a.dur}
    cp = a.credits or os.path.join(os.path.dirname(a.out), "credits.json")
    data = json.load(open(cp)) if os.path.exists(cp) else []
    data = [d for d in data if d.get("file") != a.out] + [rec]
    json.dump(data, open(cp, "w"), indent=1, ensure_ascii=False)
    print(f"{a.out}  <- {md.get('title')} ({md.get('year')}) {a.at:.1f}+{a.dur:.1f}s  [{lic}]")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("--q", required=True); s.add_argument("--years", default="1940-1995"); s.add_argument("--rows", type=int, default=20); s.add_argument("--homemovies", action="store_true")
    s = sub.add_parser("scan"); s.add_argument("--id", required=True); s.add_argument("--every", type=float, default=15); s.add_argument("--from", dest="frm", type=float, default=0); s.add_argument("--to", type=float); s.add_argument("--out", required=True)
    s = sub.add_parser("cut"); s.add_argument("--id", required=True); s.add_argument("--at", type=float, required=True); s.add_argument("--dur", type=float, default=4); s.add_argument("--out", required=True); s.add_argument("--credits"); s.add_argument("--flip", action="store_true"); s.add_argument("--homemovies", action="store_true")
    a = p.parse_args()
    {"search": cmd_search, "scan": cmd_scan, "cut": cmd_cut}[a.cmd](a)


if __name__ == "__main__":
    main()
