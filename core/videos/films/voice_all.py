# Piper TR narration per line (0.55 s gaps), then kit timing with Whisper words, for every gold topic.
import json, pathlib, subprocess, sys, tempfile
ROOT = pathlib.Path("/Users/eyna/vb-test/vidbucks/core"); M = ROOT / "models/piper/tr_TR-dfki-medium.onnx"
for gf in sorted((ROOT.parent / "knowledge/director/gold").glob("*.json")):
    g = json.loads(gf.read_text()); d = ROOT / "videos/films" / g["slug"]; d.mkdir(parents=True, exist_ok=True)
    (d / "script.txt").write_text("\n\n".join(g["lines"]) + "\n", encoding="utf-8")
    if (d / "timing.json").exists(): continue
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp); parts = []
        for i, l in enumerate(g["lines"]):
            w = tmp / f"{i}.wav"; subprocess.run(["piper", "-m", str(M), "-f", str(w), "--length-scale", "1.05", "--sentence-silence", "0.25"], input=l, text=True, check=True, capture_output=True); parts.append(w)
        sil = tmp / "s.wav"; subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "0.55", str(sil)], check=True)
        (tmp / "l.txt").write_text("".join(f"file '{p}'\nfile '{sil}'\n" for p in parts[:-1]) + f"file '{parts[-1]}'\n")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "l.txt"), "-ar", "48000", "-ac", "1", str(d / "narration.wav")], check=True)
    subprocess.run([sys.executable, str(ROOT / "tools/kit_timing.py"), "--script", str(d / "script.txt"), "--audio", str(d / "narration.wav"), "--out", str(d / "timing.json"), "--lang", "tr", "--lead", "0.4", "--tail", "1.2"], check=True)
    t = json.loads((d / "timing.json").read_text()); print(g["slug"], t["duration"], flush=True)
