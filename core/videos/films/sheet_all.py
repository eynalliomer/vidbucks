"""One review sheet per film: a frame 0.6 s into each line and one at its end, from the final mp4."""
import json, pathlib, subprocess, sys
C = pathlib.Path(__file__).resolve().parents[2]
for s in sys.argv[1:]:
    T = json.loads((C / f"videos/films/{s}/timing.json").read_text()); ts = []
    for l in T["lines"]: ts += [l["start"] + 0.6, max(l["start"] + 0.7, l["end"] - 0.1)]
    sel = "+".join(f"eq(n\\,{round(t * 30)})" for t in ts); cols = 4; rows = -(-len(ts) // cols)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(C / f"out/films/{s}.mp4"), "-vf", f"select='{sel}',scale=480:-1,tile={cols}x{rows}", "-frames:v", "1", str(C / f"out/films/qa/{s}_sheet.jpg")], check=True)
    print(s, len(ts))
