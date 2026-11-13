#!/usr/bin/env python
"""layer_check.py - the production contract for LayerScene manifests (layers.json). FAIL blocks the render.

  python tools/layer_check.py videos/x/layers.json [--audio narration.wav] [--max-still 2.5]

Checks: shots cover 0..end with no gap/overlap · layer from/to inside the shot · key times increasing and inside the
shot · unique ids · every animated layer declares motion {role: actor|prop|information, reason} · principal-picture
motion: no window longer than --max-still seconds without a real change of x/y/angle/progress/scale/w (alpha-only
fades, caption changes and cuts do NOT count) · captions ordered, non-overlapping, one line at the caption size
(estimated width) · a caption never runs past the picture · the picture is at least as long as the narration."""
import argparse, json, pathlib, subprocess, sys

ap = argparse.ArgumentParser(); ap.add_argument("manifest"); ap.add_argument("--audio"); ap.add_argument("--max-still", type=float, default=2.5)
a = ap.parse_args()
p = json.loads(pathlib.Path(a.manifest).read_text())
fails, warns = [], []
F = fails.append; Wn = warns.append
shots = p["shots"]
end = shots[-1]["end"] if shots else 0
prev = 0.0
for i, s in enumerate(shots):
    if abs(s["start"] - prev) > 1e-3: F(f"shot {i}: starts at {s['start']} but the previous ends at {prev} (gap/overlap)")
    if s["end"] <= s["start"]: F(f"shot {i}: end <= start")
    prev = s["end"]


def walk(ls, anc=()):
    for l in ls:
        yield l, anc
        if l.get("type") == "group": yield from walk(l.get("children", []), anc + (l,))


ids, intervals = set(), []
for i, s in enumerate(shots):
    span = s["end"] - s["start"] + 1e-6
    for l, anc in walk(s["layers"]):
        lid = l.get("id")
        if lid:
            if lid in ids: F(f"duplicate id {lid}")
            ids.add(lid)
        fr, to = l.get("from", 0), l.get("to", span)
        if not (0 <= fr <= to <= span): F(f"shot {i} layer {lid or l['type']}: from/to {fr}/{to} outside 0..{span:.3f}")
        last = -1
        for k in l.get("keys", []):
            if k["t"] <= last: F(f"shot {i} layer {lid}: key times must increase")
            if not (0 <= k["t"] <= span): F(f"shot {i} layer {lid}: key t={k['t']} outside the shot")
            last = k["t"]
        if l.get("keys") and not l.get("motion"): Wn(f"shot {i} layer {lid or l['type']}: keys without motion {{role, reason}} do not count as story motion")
        if l.get("motion"):
            m = l["motion"]
            if not lid or m.get("role") not in ("actor", "prop", "information") or not m.get("reason"): F(f"shot {i} layer {lid}: motion needs id, role actor|prop|information and a reason")
            for prop, d in (("x", 2), ("y", 2), ("angle", .02), ("progress", .02), ("scaleX", .02), ("scaleY", .02), ("w", 2)):
                ks = [k for k in l.get("keys", []) if prop in k]
                for k0, k1 in zip(ks, ks[1:]):
                    if abs(k1[prop] - k0[prop]) >= d:
                        st = s["start"] + max(k0["t"], fr, *[x.get("from", 0) for x in anc]); en = s["start"] + min(k1["t"], to, *[x.get("to", span) for x in anc])
                        if en > st: intervals.append((st, en, lid))
cur = 0.0
for st, en, lid in sorted(intervals):
    if st - cur > a.max_still + 1e-6: F(f"no principal-picture motion {cur:.2f}-{st:.2f}s ({st - cur:.2f}s > {a.max_still}s); add story-led local action (alpha fades do not count)")
    cur = max(cur, en)
if end - cur > a.max_still + 1e-6: F(f"no principal-picture motion {cur:.2f}-{end:.2f}s at the end")

size = p.get("captionSize", 34); last_end = -1
for c in p.get("captions", []):
    if c["start"] < last_end - 1e-6: F(f"caption '{c['text'][:30]}' overlaps the previous one")
    if c["end"] <= c["start"]: F(f"caption '{c['text'][:30]}' has end <= start")
    if c["end"] > end + 1e-3: F(f"caption '{c['text'][:30]}' runs past the picture ({c['end']} > {end})")
    width = sum(0.62 if ch.isupper() or not ch.isalpha() else 0.55 for ch in c["text"].upper()) * size
    if width > 1200: F(f"caption '{c['text'][:30]}…' needs ~{width:.0f} of 1280 units: regroup by meaning into two cues")
    if "\n" in c["text"]: F("captions are one line: no line breaks")
    if c["end"] - c["start"] < 0.6: Wn(f"caption '{c['text'][:30]}' is on screen {c['end'] - c['start']:.2f}s")
    last_end = c["end"]
if a.audio:
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.audio], capture_output=True, text=True).stdout)
    if end < d: F(f"picture {end:.2f}s is shorter than the narration {d:.2f}s")
for w in warns: print("WARN", w)
for f in fails: print("FAIL", f)
print(f"LAYERS {'FAIL' if fails else 'PASS'}  shots={len(shots)} end={end:.2f}s motion_intervals={len(intervals)} fail={len(fails)} warn={len(warns)}")
sys.exit(1 if fails else 0)
