#!/usr/bin/env python3
"""quality_gate.py - the measured gate every Vidbucks video passes before it is called done.

  python tools/quality_gate.py out/video.mp4                                  # all checks, 4-line summary
  python tools/quality_gate.py out/video.mp4 --script script.txt --speech     # + spoken words vs the script
  python tools/quality_gate.py out/video.mp4 --brief brief.json               # + the user's targets (length, aspect, loudness ...)
  python tools/quality_gate.py out/video.mp4 --ref knowledge/references/<slug>/fingerprint.json   # + rhythm vs the reference
  python tools/quality_gate.py out/video.mp4 --no-ocr --json qa.json

Checks (FAIL blocks delivery, WARN is shown with a timecode and a fix):
  streams    video and audio cover the same time (a picture that stops while the sound runs on = FAIL)
  hook       something moves in the first 2 s (mean frame change), not a still or a fade from black
  life       share of near-still moments (0.25 s steps); every shot must change something (static shots listed)
  repeats    adjacent shots with the same framing; one-frame pops/flashes; frozen and black stretches
  dead air   silences >= 1.2 s (ffmpeg silencedetect) and the longest one
  text       words burned into the picture (Apple Vision OCR on macOS; tesseract if installed; else "not checked")
  audio      integrated loudness and true peak vs target (-16 LUFS, TP <= -1 dBTP)
  delivery   resolution (>= 720p), frame rate, duration vs brief
  script     (--script --speech) each script line found in the speech (Whisper), missing/changed lines listed
  brief      (--brief) duration range, aspect, max still share, cuts per minute range, loudness, required lines
  reference  (--ref) cuts/min, median shot length, still share against a reference fingerprint

Writes <video>.qa/report.md and report.json (or --out DIR). Exit 1 on any FAIL. Every number is measured; the gate
never claims to have heard or watched the video: it lists what a human must still check (voice tone, lip sync, jokes).
"""
import argparse, difflib, json, math, os, re, shutil, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze_reference as AR  # probe, read_frames, detect_cuts, loudness, whisper_words

STEP = 0.25        # seconds between "life" samples (calibrated on our renders and on the Tudor reference)
STILL = 5.0        # mean abs grey difference (0..255, 64x36) under which a 0.25 s step counts as still
# Format profiles: what "alive" means differs by format. vlog = AI/filmed footage (the defaults); board = one camera over a
# designed wall (cinematic board films); motion = Swiss/kinetic/graphic design on a mostly still page; layers = agent-authored
# vector scenes with bounded local motion. Text on screen is part of board/motion/layers films, so it is reported as INFO.
PROFILES = {
    "vlog":   {"still_fail": 0.75, "still_warn": 0.50, "hook": STILL, "static_s": 3.0, "text": "FAIL"},
    "board":  {"still_fail": 0.92, "still_warn": 0.75, "hook": 1.5, "static_s": 5.0, "text": "INFO"},
    "motion": {"still_fail": 0.99, "still_warn": 0.93, "hook": 0.0, "static_s": 8.0, "text": "INFO"},
    "layers": {"still_fail": 0.99, "still_warn": 0.93, "hook": 0.5, "static_s": 6.0, "text": "INFO"},
}
TARGET_LUFS, LUFS_TOL, MAX_TP = -16.0, 1.5, -1.0

def run(cmd, timeout=600):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)

def stream_durations(path):
    j = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,duration,width,height,r_frame_rate", "-show_entries", "format=duration", "-of", "json", path]).stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), {}); a = next((s for s in j["streams"] if s["codec_type"] == "audio"), {})
    fmt = float(j["format"]["duration"])
    vd = float(v.get("duration") or fmt)
    # count real frames: container durations can lie when a filter graph dropped the picture
    nb = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path]).stdout.strip()
    n, d = (v.get("r_frame_rate", "24/1") + "/1").split("/")[:2]
    fps = float(n) / float(d) if float(d) else 24.0
    if nb.isdigit(): vd = min(vd, int(nb) / fps)
    return {"format": fmt, "video": vd, "audio": float(a["duration"]) if a.get("duration") else None, "w": v.get("width"), "h": v.get("height"), "fps": round(fps, 2), "has_audio": bool(a)}

def grey(path, fps, w=64, h=36):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={fps},scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True, timeout=900).stdout
    n = len(raw) // (w * h)
    return np.frombuffer(raw[: n * w * h], np.uint8).reshape(n, h, w).astype(np.float32)

def ffdetect(path, vf=None, af=None):
    cmd = ["ffmpeg", "-v", "info", "-i", path] + (["-vf", vf] if vf else ["-vn"]) + (["-af", af] if af else ["-an"]) + ["-f", "null", "-"]
    return run(cmd).stderr

def intervals(log, start_key, end_key):
    s = [float(x) for x in re.findall(start_key + r"[:=]\s*(-?[\d.]+)", log)]
    e = [float(x) for x in re.findall(end_key + r"[:=]\s*(-?[\d.]+)", log)]
    return [(a, b) for a, b in zip(s, e)]

def tc(t):
    return f"{int(t // 60)}:{t % 60:04.1f}"

# ------------------------------------------------------------------ OCR
def ocr_binary():
    if sys.platform != "darwin" or not shutil.which("swiftc"): return None
    cache = os.path.join(os.path.expanduser("~"), ".cache", "vidbucks"); os.makedirs(cache, exist_ok=True)
    exe, src = os.path.join(cache, "ocr_mac"), os.path.join(HERE, "ocr_mac.swift")
    if not os.path.exists(exe) or os.path.getmtime(exe) < os.path.getmtime(src):
        r = run(["swiftc", "-O", src, "-o", exe], timeout=600)
        if r.returncode != 0: return None
    return exe

def burned_text(path, dur, every=1.0):
    exe = ocr_binary(); tess = shutil.which("tesseract")
    if not exe and not tess: return None, "not checked (no Apple Vision / tesseract on this machine)"
    hits = []
    with tempfile.TemporaryDirectory() as tmp:
        run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps=1/{every},scale=960:-2", os.path.join(tmp, "f%04d.png")], timeout=900)
        files = sorted(os.listdir(tmp))
        if exe:
            out = run([exe] + [os.path.join(tmp, f) for f in files], timeout=1800).stdout
            for line in out.splitlines():
                try: o = json.loads(line)
                except Exception: continue
                k = int(re.findall(r"f(\d+)", os.path.basename(o["file"]))[0]) - 1
                for t in o["texts"]:
                    if t["conf"] >= 0.5 and len(re.sub(r"\W", "", t["text"])) >= 2:
                        hits.append({"t": round(k * every + every / 2, 1), "text": t["text"], "box": [round(x, 2) for x in t["box"]]})
        else:
            for k, f in enumerate(files):
                txt = run([tess, os.path.join(tmp, f), "-", "--psm", "11"]).stdout
                for w in re.findall(r"[A-Za-zÇĞİÖŞÜçğıöşü0-9!?]{3,}", txt):
                    hits.append({"t": round(k * every + every / 2, 1), "text": w, "box": None})
    # merge the same text over consecutive seconds into spans
    spans = []
    for h in hits:
        last = next((s for s in reversed(spans) if s["text"] == h["text"] and h["t"] - s["end"] <= every * 1.5), None)
        if last: last["end"] = h["t"]
        else: spans.append({"text": h["text"], "start": h["t"], "end": h["t"], "box": h["box"]})
    return spans, "Apple Vision" if exe else "tesseract"

# ------------------------------------------------------------------ script vs speech
_TRW = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
_TRT = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]
NUM_LANG = ""        # set from --lang: "tr" spells digits out so "1898'de" matches "bin sekiz yüz doksan sekizde"

def tr_spell(n):
    if n == 0: return "sıfır"
    out = []
    if n >= 1000: out += ([] if n // 1000 == 1 else tr_spell(n // 1000).split()) + ["bin"]; n %= 1000
    if n >= 100: out += ([] if n // 100 == 1 else [_TRW[n // 100]]) + ["yüz"]; n %= 100
    if n >= 10: out.append(_TRT[n // 10]); n %= 10
    if n: out.append(_TRW[n])
    return " ".join(out)

def norm(s):
    s = s.replace("I", "ı").replace("İ", "i").lower()
    if NUM_LANG == "tr":
        s = re.sub(r"(\d)[.,](\d{3})\b", r"\1\2", s)
        s = re.sub(r"(\d+)['’]?", lambda m: tr_spell(int(m.group(1))) if len(m.group(1)) <= 7 else m.group(1), s)
    return re.sub(r"[^\wçğıöşü ]", " ", s).split()

def script_lines(path):
    """the lines meant to be spoken: quoted text on numbered scene lines when the file has them, else every quoted
    string, else every non-empty line. Notes and headers never count."""
    txt = open(path, encoding="utf-8").read()
    rows = txt.splitlines()
    scene_rows = [r for r in rows if re.match(r"^\s*\d+\s*[\[.)\-]", r)]
    pool = scene_rows if scene_rows else [r for r in rows if not r.lstrip().startswith(("#", ">", "|"))]
    quoted = [a or b for r in pool for a, b in re.findall(r'"([^"]{2,})"|“([^”]{2,})”', r)]
    lines = quoted if quoted else [r.strip() for r in pool if r.strip()]
    return [l for l in lines if norm(l)]

def stem(w):
    return w[:5]            # Turkish suffixes and Whisper spelling drift live at the end of words

def script_match(lines, words):
    spoken = [stem(w) for w in norm(" ".join(w for _, w in words))]
    res = []
    for line in lines:
        tok = [stem(w) for w in norm(line)]
        if not tok: continue
        n, best, where = len(tok), 0.0, None
        for size in range(max(1, n - 1), n + 3):
            for i in range(0, max(1, len(spoken) - size + 1)):
                m = sum(b.size for b in difflib.SequenceMatcher(None, tok, spoken[i:i + size], autojunk=False).get_matching_blocks())
                sc = m / n
                if sc > best or (sc == best and where is None): best, where = sc, i
        t = words[where][0] if where is not None and where < len(words) else None
        res.append({"line": line, "score": round(best, 2), "t": round(t, 1) if t is not None else None})
    return res

# ------------------------------------------------------------------ gate
def gate(path, a):
    global NUM_LANG; NUM_LANG = (a.lang or "")[:2]
    R = {"file": path, "checks": [], "human_must_check": ["voice tone and timing (the gate cannot hear)", "lip sync on talking shots", "does each joke land (watch, do not read)", "character consistency between shots (face, costume)"]}
    def add(sev, check, msg, fix="", t=None):
        R["checks"].append({"severity": sev, "check": check, "t": t, "msg": msg, "fix": fix})
    sd = stream_durations(path); R["streams"] = sd
    dur = sd["format"]
    # streams
    if sd["has_audio"] and sd["audio"] and sd["video"] < sd["audio"] - 0.3:
        add("FAIL", "streams", f"picture ends at {tc(sd['video'])} but sound runs to {tc(sd['audio'])}", "rebuild the edit with the concat filter / video-stream durations (see flow-bridge concat fix)", sd["video"])
    if not sd["has_audio"]: add("WARN", "streams", "no audio track", "add voice/ambience; a silent upload loses retention")
    # delivery
    if sd["h"] and min(sd["w"], sd["h"]) < 720: add("WARN", "delivery", f"{sd['w']}x{sd['h']} is below 720p", "upscale or re-download at 720p+ before publishing")
    # life / hook / repeats
    g = grey(path, 1 / STEP)
    if len(g) > 2:
        d = np.abs(np.diff(g, axis=0)).mean((1, 2))
        still = float((d < STILL).mean()); R["life"] = {"mean_change": round(float(d.mean()), 1), "still_share": round(still, 2)}
        hook = float(d[: int(2 / STEP)].mean()) if len(d) >= int(2 / STEP) else float(d.mean())
        R["hook"] = round(hook, 1)
        b0 = float(g[: int(1 / STEP)].mean())
        PR = PROFILES[getattr(a, "profile", "vlog")]
        if hook < PR["hook"]: add("FAIL", "hook", f"first 2 s barely move (change {hook:.1f} < {PR['hook']}, profile {getattr(a, "profile", "vlog")})", "open on an action: the subject does something on frame 1, the camera moves with it", 0)
        if b0 < 18: add("WARN", "hook", "opens dark/black", "no fade from black; start on the picture", 0)
        if still > PR["still_fail"]: add("FAIL", "life", f"{still:.0%} of the video is near-still (profile {getattr(a, "profile", "vlog")})", "give every shot an action and camera life (walk, turn, reveal); reference Tudor Short = 36 %")
        elif still > PR["still_warn"]: add("WARN", "life", f"{still:.0%} of the video is near-still", "add movement or cut the held moments")
    fr, fps = AR.read_frames(path, fps=15 if dur < 240 else 8)        # same settings as analyze_reference: both tools must count the same cuts
    cuts, cd, _ = AR.detect_cuts(fr, fps)
    bounds = [0.0] + [c / fps for c in cuts] + [dur]
    shots = [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1) if bounds[i + 1] - bounds[i] > 0.2]
    R["shots"] = len(shots); R["cuts_per_min"] = round(len(cuts) / dur * 60, 1) if dur else 0
    small = fr[:, ::2, ::2]                                               # 96x54 for the per-shot life/framing measures
    gf = small.astype(np.float32).mean(3)
    statics, mids = [], []
    for s, e in shots:
        i0, i1 = int(s * fps), max(int(s * fps) + 2, int(e * fps))
        seg = gf[i0:i1]
        ch = float(np.abs(np.diff(seg, axis=0)).mean()) if len(seg) > 1 else 0
        span = float(np.abs(seg[-1] - seg[0]).mean()) if len(seg) > 1 else 0
        if e - s >= PROFILES[getattr(a, "profile", "vlog")]["static_s"] and ch < 1.2 and span < 6: statics.append((s, e))
        m = seg[len(seg) // 2] if len(seg) else None
        mids.append(None if m is None else (m - m.mean()) / (m.std() + 1e-6))
    for s, e in statics:
        add("WARN", "life", f"static shot {tc(s)}-{tc(e)} ({e - s:.1f} s): nothing changes", "give it an action or a camera move, or cut it shorter", s)
    for i in range(1, len(mids)):
        if mids[i] is not None and mids[i - 1] is not None:
            corr = float((mids[i] * mids[i - 1]).mean())
            if corr > 0.9: add("WARN", "repeats", f"shots at {tc(shots[i-1][0])} and {tc(shots[i][0])} share the same framing (corr {corr:.2f})", "change size, angle or lens at the cut (or join them into one take)", shots[i][0])
    # one-frame pops at 24 fps
    g24 = grey(path, 24, 48, 27)
    if len(g24) > 3:
        a1 = np.abs(g24[1:-1] - g24[:-2]).mean((1, 2)); a2 = np.abs(g24[1:-1] - g24[2:]).mean((1, 2)); a3 = np.abs(g24[2:] - g24[:-2]).mean((1, 2))
        pops = [round((i + 1) / 24, 2) for i in np.where((a1 > 25) & (a2 > 25) & (a3 < 8))[0]]
        for t in pops[:10]: add("WARN", "repeats", f"one-frame pop/flash at {tc(t)}", "remove the stray frame", t)
    blk = intervals(ffdetect(path, vf="blackdetect=d=0.3:pix_th=0.10"), "black_start", "black_end")
    for s, e in blk: add("WARN" if s > 0.5 else "FAIL", "repeats", f"black {tc(s)}-{tc(e)}", "cut it or put picture there", s)
    frz = intervals(ffdetect(path, vf="freezedetect=n=0.003:d=1.5"), "freeze_start", "freeze_end")
    for s, e in frz: add("WARN", "repeats", f"frozen picture {tc(s)}-{tc(e)} ({e - s:.1f} s)", "a frozen end frame reads as a stall; trim or animate", s)
    # audio
    if sd["has_audio"]:
        sil = intervals(ffdetect(path, af="silencedetect=noise=-42dB:d=1.2"), "silence_start", "silence_end")
        R["silences"] = [[round(s, 1), round(e, 1)] for s, e in sil]
        if sil:
            longest = max(e - s for s, e in sil)
            for s, e in sil:
                add("WARN" if e - s < 3 else "FAIL", "dead air", f"silence {tc(s)}-{tc(e)} ({e - s:.1f} s)", "fill with a line, ambience or a cut; dead air loses viewers", s)
            R["longest_silence"] = round(longest, 1)
        L = AR.loudness(path); R["loudness"] = L
        if L.get("lufs") is not None and abs(L["lufs"] - (a.lufs)) > LUFS_TOL:
            add("WARN", "audio", f"loudness {L['lufs']} LUFS (target {a.lufs})", f"ffmpeg loudnorm=I={a.lufs}:TP=-1.5")
        if L.get("true_peak_db") is not None and L["true_peak_db"] > MAX_TP:
            add("WARN", "audio", f"true peak {L['true_peak_db']} dBFS (> {MAX_TP})", "add alimiter after loudnorm")
    # burned-in text
    if not a.no_ocr:
        spans, how = burned_text(path, dur)
        R["ocr"] = how
        if spans is None: add("INFO", "text", how)
        else:
            R["burned_text"] = spans
            for s in spans:
                add("INFO" if (a.allow_text or PROFILES[getattr(a, "profile", "vlog")]["text"] == "INFO") else "FAIL", "text", f"text in the picture {tc(s['start'])}-{tc(s['end'])}: \"{s['text']}\"", "blur it (ffmpeg delogo on the box) or regenerate with 'no writing or letters anywhere'", s["start"])
    # speech vs script
    words = []
    if a.speech or a.script:
        words, lang = AR.whisper_words(path, a.lang)
        R["speech_words"] = len(words)
        if words:
            covered = sum(1 for k in range(int(dur)) if any(k <= t < k + 1 for t, _ in words)) / max(1, int(dur))
            R["speech_coverage"] = round(covered, 2)
    if a.script:
        lines = script_lines(a.script)
        if not words: add("WARN", "script", "no speech recognised - script not checked", "install faster-whisper or check the audio")
        else:
            m = script_match(lines, words); R["script"] = m
            ok = sum(1 for x in m if x["score"] >= 0.75)
            R["script_adherence"] = round(ok / max(1, len(m)), 2)
            for x in m:
                if x["score"] < 0.75:
                    add("FAIL" if x["score"] < 0.45 else "WARN", "script", f"line not spoken as written ({x['score']:.0%} match): \"{x['line'][:70]}\"", "regenerate that clip or accept the change knowingly", x["t"])
    # brief targets ("how close is it to what was asked")
    if a.brief:
        b = json.load(open(a.brief, encoding="utf-8")); R["brief"] = b
        if "duration_s" in b:
            lo, hi = b["duration_s"] if isinstance(b["duration_s"], list) else (b["duration_s"] * 0.9, b["duration_s"] * 1.1)
            if not lo <= dur <= hi: add("FAIL", "brief", f"duration {dur:.1f} s outside {lo}-{hi} s", "trim or extend to the asked length")
        if "aspect" in b and sd["w"]:
            want = {"16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1.0}.get(b["aspect"], b["aspect"])
            if abs(sd["w"] / sd["h"] - want) > 0.03: add("FAIL", "brief", f"aspect {sd['w']}x{sd['h']} is not {b['aspect']}", "render in the asked aspect")
        if "max_still_share" in b and R.get("life") and R["life"]["still_share"] > b["max_still_share"]:
            add("FAIL", "brief", f"still share {R['life']['still_share']:.0%} > asked {b['max_still_share']:.0%}", "add life to the static shots listed above")
        if "cuts_per_min" in b:
            lo, hi = b["cuts_per_min"]
            if not lo <= R["cuts_per_min"] <= hi: add("WARN", "brief", f"{R['cuts_per_min']} cuts/min outside {lo}-{hi}", "join or split shots to the asked rhythm")
        for line in b.get("required_lines", []):
            if words and max((x["score"] for x in script_match([line], words)), default=0) < 0.75:
                add("FAIL", "brief", f"required line missing: \"{line}\"", "regenerate the clip that carries it")
    # reference rhythm
    if a.ref:
        rf = json.load(open(a.ref, encoding="utf-8"))
        rows = []
        for k, cv in (("cuts_per_min", R["cuts_per_min"]),):
            rv = rf.get(k)
            if rv: rows.append((k, rv, cv, abs(cv - rv) / rv <= 0.35))
        lens = [e - s for s, e in shots]
        if rf.get("shot_len_median_s") and lens:
            cv = float(np.median(lens)); rows.append(("shot_len_median_s", rf["shot_len_median_s"], round(cv, 2), abs(cv - rf["shot_len_median_s"]) / rf["shot_len_median_s"] <= 0.35))
        R["reference"] = rows
        for k, rv, cv, ok in rows:
            if not ok: add("WARN", "reference", f"{k} {cv} vs reference {rv}", "match the reference rhythm (see analyze_reference --compare for the full table)")
    return R

def write(R, out):
    os.makedirs(out, exist_ok=True)
    json.dump(R, open(os.path.join(out, "report.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    n = {k: sum(1 for c in R["checks"] if c["severity"] == k) for k in ("FAIL", "WARN", "INFO")}
    L = [f"# Quality gate - {os.path.basename(R['file'])}", "",
         f"- Duration {R['streams']['format']:.1f} s, {R['streams']['w']}x{R['streams']['h']} @ {R['streams']['fps']} fps; shots {R.get('shots')} ({R.get('cuts_per_min')}/min)",
         f"- Hook change {R.get('hook')}, still share {R.get('life', {}).get('still_share')}, longest silence {R.get('longest_silence', 0)} s, loudness {R.get('loudness', {}).get('lufs')} LUFS",
         f"- Speech coverage {R.get('speech_coverage', '-')}, script adherence {R.get('script_adherence', '-')}, OCR {R.get('ocr', 'off')}", "",
         f"## Findings: FAIL {n['FAIL']} · WARN {n['WARN']} · INFO {n['INFO']}"]
    for c in sorted(R["checks"], key=lambda c: ({"FAIL": 0, "WARN": 1, "INFO": 2}[c["severity"]], c["t"] or 0)):
        L.append(f"- **{c['severity']}** [{c['check']}] {c['msg']}" + (f" -> {c['fix']}" if c["fix"] else ""))
    L += ["", "## A human must still check"] + [f"- {x}" for x in R["human_must_check"]]
    open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(L))
    return n

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video"); ap.add_argument("--out"); ap.add_argument("--script"); ap.add_argument("--speech", action="store_true")
    ap.add_argument("--brief"); ap.add_argument("--ref"); ap.add_argument("--lang", default=""); ap.add_argument("--lufs", type=float, default=TARGET_LUFS)
    ap.add_argument("--no-ocr", action="store_true"); ap.add_argument("--allow-text", action="store_true", help="on-screen text is intended (captions, titles): report it as INFO")
    ap.add_argument("--json")
    ap.add_argument("--profile", default="vlog", choices=list(PROFILES), help="format profile: vlog (AI/filmed), board, motion, layers")
    a = ap.parse_args()
    R = gate(a.video, a)
    out = a.out or os.path.splitext(a.video)[0] + ".qa"
    n = write(R, out)
    if a.json: shutil.copy(os.path.join(out, "report.json"), a.json)
    top = [c for c in R["checks"] if c["severity"] == "FAIL"][:2] or [c for c in R["checks"] if c["severity"] == "WARN"][:2]
    print(f"GATE {'FAIL' if n['FAIL'] else 'PASS'}  fail={n['FAIL']} warn={n['WARN']}  shots={R.get('shots')} still={R.get('life', {}).get('still_share')} hook={R.get('hook')} lufs={R.get('loudness', {}).get('lufs')}")
    for c in top: print(f"  {c['severity']} {c['check']}: {c['msg']}")
    print(f"  report: {os.path.join(out, 'report.md')}")
    sys.exit(1 if n["FAIL"] else 0)

if __name__ == "__main__":
    main()
