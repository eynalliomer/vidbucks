#!/usr/bin/env python
"""board_map.py - a map print for BoardFilm from Natural Earth (public domain), projected straight into world pixels.

  python tools/board_map.py --name atl --lon -85 40 --lat -45 55 --proj mercator --lon0 -25 --K 12000 \
      --place "İstanbul=41.01,28.98" --place "Gelibolu=40.41,26.67" --out public/board/piri/map_atl.json

Projection units are earth radii, scaled by K (K=12000: the Atlantic from Brazil to Istanbul is ~26,000 world px).
Projections: mercator (lon0) or albers (lon0, lat0, p1, p2). Writes {regions: {name: svg path}, places: {name: [x, y]},
bounds: [x0, y0, x1, y1]}; paste it into board.json "maps" (or load it in the template)."""
import argparse, json, math, os, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"
ap = argparse.ArgumentParser()
ap.add_argument("--name", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--lon", nargs=2, type=float, required=True); ap.add_argument("--lat", nargs=2, type=float, required=True)
ap.add_argument("--proj", default="mercator", choices=["mercator", "albers"])
ap.add_argument("--lon0", type=float, default=0); ap.add_argument("--lat0", type=float, default=0)
ap.add_argument("--p1", type=float, default=29.5); ap.add_argument("--p2", type=float, default=45.5)
ap.add_argument("--K", type=float, default=12000); ap.add_argument("--place", action="append", default=[])
ap.add_argument("--simplify", type=float, default=0.0015, help="drop points closer than this (earth radii)")
a = ap.parse_args()

cache = ROOT / "data" / "naturalearth" / "countries50.geojson"
if not cache.exists():
    cache.parent.mkdir(parents=True, exist_ok=True); print("download", SRC); urllib.request.urlretrieve(SRC, cache)
geo = json.loads(cache.read_text())
R = math.radians


wrap = lambda d: ((d + 540) % 360) - 180          # longitudes relative to lon0, across the antimeridian


def project(lon, lat):
    if a.proj == "mercator":
        lat = max(-85, min(85, lat))
        return R(wrap(lon - a.lon0)), -math.log(math.tan(math.pi / 4 + R(lat) / 2))
    n = (math.sin(R(a.p1)) + math.sin(R(a.p2))) / 2; C = math.cos(R(a.p1)) ** 2 + 2 * n * math.sin(R(a.p1))
    rho0 = math.sqrt(C - 2 * n * math.sin(R(a.lat0))) / n; rho = math.sqrt(C - 2 * n * math.sin(R(lat))) / n; th = n * R(lon - a.lon0)
    return rho * math.sin(th), -(rho0 - rho * math.cos(th))


L0, L1 = wrap(a.lon[0] - a.lon0), wrap(a.lon[1] - a.lon0)


def inside(lon, lat, m=8):
    d = wrap(lon - a.lon0)
    return L0 - m <= d <= L1 + m and a.lat[0] - m <= lat <= a.lat[1] + m


regions = {}
for f in geo["features"]:
    name = f["properties"].get("NAME") or f["properties"].get("ADMIN")
    g = f["geometry"]; polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    parts = []
    for poly in polys:
        ring = poly[0]
        if not any(inside(x, y) for x, y in ring): continue
        runs, pts, last, prev = [], [], None, None
        for lon, lat in ring:
            d = wrap(lon - a.lon0)
            if prev is not None and abs(d - prev) > 180:   # the ring crosses the map's seam: never draw a band across the world
                runs.append(pts); pts, last = [], None
            prev = d
            lon = a.lon0 + max(L0 - 8, min(L1 + 8, d)); lat = max(a.lat[0] - 8, min(a.lat[1] + 8, lat))
            x, y = project(lon, lat)
            if last and math.hypot(x - last[0], y - last[1]) < a.simplify: continue
            pts.append((x * a.K, y * a.K)); last = (x, y)
        runs.append(pts)
        for pts in runs:
            if len(pts) > 3: parts.append("M" + " L".join(f"{x:.0f},{y:.0f}" for x, y in pts) + " Z")
    if parts: regions[name] = " ".join(parts)
corners = [project(a.lon0 + lo, la) for lo in (L0, L1) for la in a.lat]
xs = [c[0] * a.K for c in corners]; ys = [c[1] * a.K for c in corners]
places = {}
for p in a.place:
    n, ll = p.split("="); la, lo = map(float, ll.split(","))
    x, y = project(lo, la); places[n] = [round(x * a.K), round(y * a.K)]
out = {"regions": regions, "places": places, "bounds": [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))]}
pathlib.Path(a.out).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(a.out).write_text(json.dumps(out, ensure_ascii=False))
print(f"{len(regions)} regions, places {places}, bounds {out['bounds']} -> {a.out} ({os.path.getsize(a.out) // 1024} KB)")
