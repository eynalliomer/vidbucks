#!/usr/bin/env python3
"""analysis_selftest.py - prove the analysers are right before trusting them on a real reference.

  python tools/analysis_selftest.py            # builds a synthetic video with KNOWN answers, runs our analysers, scores them
  python tools/analysis_selftest.py --keep     # keep the test video and reports (prints the folder)

Ground truth baked into the test video (18 s, 640x360, 24 fps):
  cuts at 4.0, 7.0, 12.0, 14.5 s           -> detect_cuts precision / recall within +-2 frames
  a click track at 120 BPM                 -> beat_analysis BPM error (octave-free)
  loudness normalised to -16 LUFS          -> loudness error
  7-12 s a sideways pan, 14.5-18 s still   -> shot_review.camera_class labels
  4-7 s the words "BURNED TEXT 1453"       -> quality_gate OCR finds them (macOS / tesseract only)
  the picture stops at 18 s, sound at 18 s -> quality_gate streams check stays quiet (no false alarm)

Exit 1 if any measured answer is outside its tolerance. Run it after changing an analyser and after installing on a
new machine; the result line goes into the setup report.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile, types
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import analyze_reference as AR
import shot_review as SR
import quality_gate as QG

CUTS = [4.0, 7.0, 12.0, 14.5, 16.25]; SEAMS = [16.25]; BPM = 120; LUFS = -16.0; DUR = 18.0

def sh(*c):
    r = subprocess.run(list(c), capture_output=True, text=True)
    if r.returncode: raise SystemExit("ffmpeg failed: " + r.stderr[-400:])

def make(tmp):
    W, H = 640, 360
    rng = np.random.default_rng(7)
    big = (rng.random((H, 2200, 3)) * 255).astype(np.uint8)
    big = np.array(Image.fromarray(big).resize((2200 // 8, H // 8)).resize((2200, H), Image.NEAREST))
    Image.fromarray(big).save(os.path.join(tmp, "pan.png"))
    im = Image.new("RGB", (W, H), (30, 60, 110)); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 54)
    except Exception: f = ImageFont.load_default()
    d.text((70, 140), "BURNED TEXT 1453", fill="white", font=f); im.save(os.path.join(tmp, "text.png"))
    g = Image.new("RGB", (W, H)); gd = ImageDraw.Draw(g)
    for x in range(W): gd.line([(x, 0), (x, H)], fill=(40 + x * 150 // W, 60 + x * 120 // W, 120))   # brightness rises left to right
    gd.rectangle([60, 80, 220, 280], fill=(230, 220, 200)); gd.ellipse([300, 60, 380, 140], fill=(20, 20, 30))
    g.save(os.path.join(tmp, "still.png"))
    # same framing, new "generation": brighter and a prop moved - a jump cut / AI seam, not a new shot
    g2 = g.point(lambda v: min(255, v + 45)); ImageDraw.Draw(g2).ellipse([400, 120, 470, 190], fill=(250, 230, 40)); g2.save(os.path.join(tmp, "still2.png"))
    segs = [
        ["-f", "lavfi", "-i", f"testsrc2=size={W}x{H}:rate=24:duration=4"],
        ["-loop", "1", "-t", "3", "-i", os.path.join(tmp, "text.png")],
        ["-loop", "1", "-t", "5", "-i", os.path.join(tmp, "pan.png")],
        ["-f", "lavfi", "-i", f"mandelbrot=size={W}x{H}:rate=24"],
        ["-loop", "1", "-t", "1.75", "-i", os.path.join(tmp, "still.png")],
        ["-loop", "1", "-t", "1.75", "-i", os.path.join(tmp, "still2.png")],
    ]
    args = ["ffmpeg", "-v", "error", "-y"]
    for s in segs: args += s
    fc = (f"[0:v]setsar=1,fps=24[v0];[1:v]scale={W}:{H},setsar=1,fps=24[v1];"
          f"[2:v]crop={W}:{H}:'min(t*300,1500)':0,setsar=1,fps=24[v2];[3:v]trim=duration=2.5,setsar=1,fps=24[v3];[4:v]scale={W}:{H},setsar=1,fps=24[v4];[5:v]scale={W}:{H},setsar=1,fps=24[v5];"
          f"[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0,format=yuv420p[v]")
    args += ["-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-crf", "18", os.path.join(tmp, "pic.mp4")]
    sh(*args)
    sh("ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"aevalsrc='0.6*sin(2*PI*1200*t)*lt(mod(t,{60 / BPM}),0.035)+0.05*sin(2*PI*220*t)':s=44100:d={DUR}",
       "-af", f"loudnorm=I={LUFS}:TP=-1.5:LRA=7", "-ar", "44100", os.path.join(tmp, "a.wav"))
    out = os.path.join(tmp, "selftest.mp4")
    sh("ffmpeg", "-v", "error", "-y", "-i", os.path.join(tmp, "pic.mp4"), "-i", os.path.join(tmp, "a.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", str(DUR), out)
    return out

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); ap.add_argument("--keep", action="store_true")
    a = ap.parse_args()
    tmp = tempfile.mkdtemp(prefix="vb-selftest-")
    rows = []
    def row(name, truth, got, ok, note=""):
        rows.append((name, truth, got, ok, note))
    try:
        v = make(tmp)
        fr, fps = AR.read_frames(v, fps=24, w=192, h=108)
        cuts, _, _ = AR.detect_cuts(fr, fps)
        ct = [c / fps for c in cuts]
        tp = sum(1 for t in CUTS if any(abs(t - c) <= 2 / fps for c in ct))
        prec = tp / len(ct) if ct else 0; rec = tp / len(CUTS)
        row("cuts recall", "1.00", f"{rec:.2f}", rec >= 0.99, f"found {', '.join(f'{c:.2f}' for c in ct)}")
        row("cuts precision", "1.00", f"{prec:.2f}", prec >= 0.99)
        out, fp, _ = AR.analyze_file(v, "", False)
        kinds = {round(t["t"], 1): t["kind"] for t in fp["transitions"] and json.load(open(os.path.join(out, "fingerprint.json")))["transition_list"]}
        shutil.rmtree(out, ignore_errors=True)
        seam_ok = all(any(abs(k - s_) <= 0.1 and v_.startswith("jump") for k, v_ in kinds.items()) for s_ in SEAMS)
        false_seam = [k for k, v_ in kinds.items() if v_.startswith("jump") and all(abs(k - s_) > 0.1 for s_ in SEAMS)]
        row("seam vs shot change", "16.25 = seam, others = shots", "ok" if seam_ok and not false_seam else f"{kinds}", seam_ok and not false_seam)
        y, sr = AR.audio_mono(v)
        b = AR.beat_analysis(y, sr, ct) or {}
        bpm = b.get("bpm") or 0; octave = min(abs(bpm / BPM - m) / m for m in (0.5, 1, 2)) if bpm else 1
        row("tempo (BPM)", BPM, bpm, octave <= 0.03)
        L = AR.loudness(v)
        row("loudness (LUFS)", LUFS, L.get("lufs"), L.get("lufs") is not None and abs(L["lufs"] - LUFS) <= 1.0)
        g12, f12 = AR.read_frames(v, fps=12, w=96, h=54); g = g12.astype(np.float32).mean(3)
        pan = SR.camera_class(g[int(7.4 * 12):int(11.6 * 12)])["class"]; still = SR.camera_class(g[int(14.7 * 12):int(16.1 * 12)])["class"]
        row("camera: pan segment", "pan_tilt", pan, pan in ("pan_tilt", "fast"))
        row("camera: still segment", "static", still, still == "static")
        args = types.SimpleNamespace(no_ocr=False, allow_text=False, speech=False, script=None, brief=None, ref=None, lang="", lufs=-16.0)
        R = QG.gate(v, args)
        if R.get("ocr", "").startswith("not checked"):
            row("burned text (OCR)", "BURNED TEXT 1453 at 4-7 s", "not checked", True, "no OCR engine here: install tesseract or run on macOS")
        else:
            found = [s for s in R.get("burned_text", []) if "1453" in s["text"] or "BURNED" in s["text"].upper()]
            got = f"{found[0]['text']} {found[0]['start']}-{found[0]['end']} s" if found else "none"
            row("burned text (OCR)", "BURNED TEXT 1453 at 4-7 s", got, bool(found) and 3.5 <= found[0]["start"] <= 5.0)
        sfail = [c for c in R["checks"] if c["check"] == "streams" and c["severity"] == "FAIL"]
        row("streams false alarm", "none", "none" if not sfail else sfail[0]["msg"], not sfail)
    finally:
        if not a.keep: shutil.rmtree(tmp, ignore_errors=True)
    ok = sum(1 for r in rows if r[3])
    print(f"{'check':24} {'truth':>26} {'measured':>26}  verdict")
    for n, t, gt, p, note in rows:
        print(f"{n:24} {str(t):>26} {str(gt):>26}  {'OK' if p else 'WRONG'}" + (f"   ({note})" if note else ""))
    print(f"\nSELFTEST {ok}/{len(rows)}" + (f"  kept: {tmp}" if a.keep else ""))
    sys.exit(0 if ok == len(rows) else 1)

if __name__ == "__main__":
    main()
