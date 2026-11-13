#!/usr/bin/env python
"""media_hunt.py - real, licensed pictures for every line of a film: search wide, look, pick (never one generic image reused).

  python tools/media_hunt.py hunt  --visuals videos/x/visuals.json [--lines 3,7] [--n 4]   # candidates + numbered contact sheets
  python tools/media_hunt.py pick  --visuals videos/x/visuals.json --line 7 --index 3 [--crop 0.1,0,0.9,0.8]
  python tools/media_hunt.py status --visuals videos/x/visuals.json                        # what each line still needs

visuals.json (the visual treatment, see tools/visual_check.py) gives each line a "media" block:
  {"queries": ["Piri Reis map 1513", "Topkapi palace library manuscript"], "type": "image" | "video", "n": 4, "need": true}
hunt  runs every query on every source (Wikimedia, Openverse; Pexels and Pixabay when PEXELS_API_KEY / PIXABAY_API_KEY are
      in core/.env), keeps commercial-use licences only (PD, CC0, CC BY, CC BY-SA, Pexels, Pixabay; never NC/ND), drops
      duplicates and pictures under --min-width px, and writes media/cands/L<id>/sheet.jpg with numbered tiles.
      LOOK at every sheet: pick the most specific picture for the line, not the prettiest.
pick  copies the choice to public/<visuals.public_dir>/L<id>.<ext> (optionally cropped, fractions of w/h), stores its aspect,
      licence and credit in visuals.json and media/credits.json (attribution lines for the description).
A line with no good candidate gets "fallback": "procedural" (drawn in code) - never a picture of something else."""
import argparse, hashlib, json, os, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser(); ap.add_argument("cmd", choices=["hunt", "pick", "status"]); ap.add_argument("--visuals", required=True)
ap.add_argument("--lines"); ap.add_argument("--n", type=int, default=4); ap.add_argument("--min-width", type=int, default=1100)
ap.add_argument("--line", type=int); ap.add_argument("--index", type=int); ap.add_argument("--crop")
ap.add_argument("--extra", action="store_true", help="add as a second/third picture (compare, collage) instead of the main one")
ap.add_argument("--label", default=None)
ap.add_argument("--from-line", type=int, default=None, help="take the candidate from another line's sheet (same subject found there)")
a = ap.parse_args()
VP = pathlib.Path(a.visuals); V = json.loads(VP.read_text()); base = VP.parent
cand_root = base / "media" / "cands"
env = dict(os.environ)
envf = ROOT / ".env"
if envf.exists():
    for ln in envf.read_text().splitlines():
        if "=" in ln and not ln.strip().startswith("#"): k, v = ln.split("=", 1); env.setdefault(k.strip(), v.strip())
sources = ["wikimedia", "openverse"] + [s for s, k in (("pexels", "PEXELS_API_KEY"), ("pixabay", "PIXABAY_API_KEY")) if env.get(k)]
rows = {r["line"]: r for r in V["lines"]}


def save():
    VP.write_text(json.dumps(V, ensure_ascii=False, indent=1))


if a.cmd == "hunt":
    from PIL import Image, ImageDraw, ImageFont
    want = {int(x) for x in a.lines.split(",")} if a.lines else None
    for r in V["lines"]:
        m = r.get("media") or {}
        if not m.get("need", True) or not m.get("queries") or (want and r["line"] not in want): continue
        d = cand_root / f"L{r['line']:02d}"; d.mkdir(parents=True, exist_ok=True)
        for q in m["queries"]:
            for src in sources:
                subprocess.run(["node", str(ROOT / "tools" / "fetch-stock.mjs"), "--q", q, "--type", m.get("type", "image"), "--n", str(m.get("n", a.n)),
                                "--source", src, "--out", str(d)], env=env, capture_output=True, text=True, timeout=240)
        cred = json.loads((d / "credits.json").read_text()) if (d / "credits.json").exists() else []
        seen, keep = set(), []
        for c in cred:
            f = d / c["file"]
            if not f.exists() or f.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"): continue
            h = hashlib.md5(f.read_bytes()[:200000]).hexdigest()
            try: im = Image.open(f); w, hh = im.size
            except Exception: continue
            if h in seen or w < m.get("min_width", a.min_width): continue
            seen.add(h); c["w"], c["h"] = w, hh; keep.append(c)
        (d / "candidates.json").write_text(json.dumps(keep, ensure_ascii=False, indent=1))
        if not keep:
            print(f"L{r['line']:02d}: no usable candidate for {m['queries']} -> refine the queries or mark fallback: procedural"); continue
        tw, th, cols = 420, 280, 4; rows_n = (len(keep) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows_n * (th + 34)), (24, 24, 24)); dr = ImageDraw.Draw(sheet)
        try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 22)
        except Exception: font = ImageFont.load_default()
        for i, c in enumerate(keep):
            im = Image.open(d / c["file"]).convert("RGB"); im.thumbnail((tw, th))
            x, y = (i % cols) * tw, (i // cols) * (th + 34); sheet.paste(im, (x + (tw - im.width) // 2, y + (th - im.height) // 2))
            dr.text((x + 8, y + th + 6), f"#{i}  {c['w']}x{c['h']}  {c['license'][:18]}  {c['source'][:14]}", fill=(240, 220, 120), font=font)
        sheet.save(d / "sheet.jpg", quality=85)
        print(f"L{r['line']:02d}: {len(keep)} candidates -> {d / 'sheet.jpg'}")
elif a.cmd == "pick":
    from PIL import Image
    r = rows[a.line]; d = cand_root / f"L{(a.from_line or a.line):02d}"; keep = json.loads((d / "candidates.json").read_text()); c = keep[a.index]
    pub = ROOT / "public" / V["public_dir"]; pub.mkdir(parents=True, exist_ok=True)
    n_extra = len(r.get("extra", [])) if a.extra else 0
    src = d / c["file"]; dst = pub / (f"L{a.line:02d}x{n_extra + 1}.jpg" if a.extra else f"L{a.line:02d}.jpg")
    im = Image.open(src).convert("RGB")
    if a.crop:
        x0, y0, x1, y1 = map(float, a.crop.split(",")); im = im.crop((int(x0 * im.width), int(y0 * im.height), int(x1 * im.width), int(y1 * im.height)))
    if im.width > 2600: im = im.resize((2600, int(im.height * 2600 / im.width)))
    im.save(dst, quality=88)
    info = {"src": f"{V['public_dir']}/{dst.name}", "aspect": round(im.width / im.height, 4), "title": c["title"], "creator": c["creator"],
                   "license": c["license"], "page": c["pageUrl"], "source": c["source"], "attribution": c.get("attribution", True)}
    if a.label: info["label"] = a.label
    if a.extra: r.setdefault("extra", []).append(info)
    else: r["picked"] = info
    save()
    cr = base / "media" / "credits.json"; allc = json.loads(cr.read_text()) if cr.exists() else []
    allc = [x for x in allc if x.get("src") != info["src"]] + [{"line": a.line, **info}]
    cr.write_text(json.dumps(allc, ensure_ascii=False, indent=1))
    print(f"L{a.line:02d}{' extra' if a.extra else ''} <- #{a.index} {c['title'][:50]} ({c['license']}) -> {dst}")
else:
    for r in V["lines"]:
        m = r.get("media") or {}
        st = "picked" if r.get("picked") else ("procedural" if r.get("fallback") == "procedural" else ("no media" if not m.get("need", True) else "NEEDS MEDIA"))
        print(f"L{r['line']:02d} {st:<12} {r.get('shot', '?'):<10} {r.get('idea', '')[:70]}")
