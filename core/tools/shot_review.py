#!/usr/bin/env python3
"""shot_review.py - turn a measured reference into a VERIFIED shot-by-shot breakdown (the agent is the vision model).

Measuring finds cuts, colour, motion and speech. What a shot IS (selfie, third-person, B-roll; its size; what happens;
how it was made; how to prompt it) needs eyes. This tool makes that look disciplined and checkable:

  python tools/shot_review.py build  <ref_dir> <video>      # per-shot sheets + measured camera class + the words in the shot
                                                             #  -> <ref_dir>/review/tasks.json, answers.json (to fill), shots/*.jpg
  python tools/shot_review.py check  <ref_dir>              # validates answers.json: enums, coverage, contradictions
  python tools/shot_review.py apply  <ref_dir>              # merges answers -> review.md, prompt_formula.md, fingerprint["review"]

How the agent fills answers.json (one entry per shot; leave a shot's "shot_type" empty if you did not look at it):
  shot_type   selfie | third_person | hidden_observer | broll | insert | title | other
  size        ECU | CU | MCU | MS | WS | EWS          (face height: ECU > 60 % of frame, CU 35-60, MCU 20-35, MS 10-20, WS < 10)
  camera      static | handheld | pan_tilt | push | walk | orbit | fast   (what you SEE; the tool's measured class is beside it)
  method      ai_video | live_action | cg_3d | code_render | screen | still_motion | stock | unknown
  subject, action, place, light            short plain words
  on_screen_text   the words you can read, "" if none (burned text is a production fact, not decoration)
  prompt      the prompt structure you would use to remake this shot's FORM with new content
  confidence  0..1, and "evidence": what in the frames made you decide (never "looks like")

`check` refuses: unknown enum values, a reviewed shot without evidence, "static" where the measured camera moves a lot
(or the reverse) unless the evidence explains it, and coverage under 80 % of the runtime.
`apply` reports: screen-time mix by shot type and by size, the opening (hook) structure, adjacent repeats, the share of
talking shots, the prompt formula per shot type, and the agreement between measured and reviewed camera.
"""
import argparse, json, os, subprocess, sys
from collections import Counter, defaultdict
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import analyze_reference as AR

SHOT_TYPES = {"selfie", "third_person", "hidden_observer", "broll", "insert", "title", "other"}
SIZES = ["ECU", "CU", "MCU", "MS", "WS", "EWS"]
CAMERAS = {"static", "handheld", "pan_tilt", "push", "walk", "orbit", "fast"}
METHODS = {"ai_video", "live_action", "cg_3d", "code_render", "screen", "still_motion", "stock", "unknown"}

def phase_shift(a, b):
    """translation (dx, dy) between two grey frames by phase correlation (sub-pixel not needed)."""
    A, B = np.fft.fft2(a - a.mean()), np.fft.fft2(b - b.mean())
    R = A * np.conj(B); R /= np.abs(R) + 1e-9
    r = np.fft.ifft2(R).real
    y, x = np.unravel_index(np.argmax(r), r.shape)
    if y > a.shape[0] // 2: y -= a.shape[0]
    if x > a.shape[1] // 2: x -= a.shape[1]
    return float(x), float(y), float(r.max())

def camera_class(g):
    """measured camera character of one shot from grey frames at 12 fps, 96x54."""
    if len(g) < 4: return {"class": "static", "drift_px_s": 0, "jitter_px": 0, "change": 0}
    v = np.array([phase_shift(g[i], g[i + 1])[:2] for i in range(len(g) - 1)])
    change = float(np.abs(np.diff(g, axis=0)).mean())
    drift = float(np.linalg.norm(v.sum(0))) / (len(v) / 12.0)            # px per second of net travel
    jit = float(np.linalg.norm(np.diff(v, axis=0), axis=1).mean()) if len(v) > 2 else 0.0
    speed = float(np.linalg.norm(v, axis=1).mean())
    if speed > 3.0: c = "fast"
    elif drift > 4.0: c = "pan_tilt"
    elif jit > 0.6: c = "handheld"
    elif change > 2.5: c = "push"          # picture changes without translation: zoom/push-in or subject motion
    else: c = "static"
    return {"class": c, "drift_px_s": round(drift, 2), "jitter_px": round(jit, 2), "change": round(change, 2)}

def sheet(video, s, e, out):
    ims = []
    for t in (s + 0.15, (s + e) / 2, max(s + 0.2, e - 0.15)):
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1", "-vf", "scale=-2:200", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
        if r.stdout:
            import io; ims.append(Image.open(io.BytesIO(r.stdout)).convert("RGB"))
    if not ims: return
    w = sum(i.width for i in ims) + 8 * (len(ims) - 1); im = Image.new("RGB", (w, ims[0].height + 22), "black")
    x = 0
    for k, i in enumerate(ims):
        im.paste(i, (x, 22)); x += i.width + 8
    ImageDraw.Draw(im).text((6, 4), f"{s:.1f}-{e:.1f}s  first / middle / last", fill="white")
    im.save(out, quality=85)

def build(ref, video):
    fp = json.load(open(os.path.join(ref, "fingerprint.json")))
    shots = fp["shots"]; words = fp.get("words", [])
    kinds = {round(t["t"], 2): t["kind"] for t in fp.get("transition_list", [])}
    rd = os.path.join(ref, "review"); os.makedirs(os.path.join(rd, "shots"), exist_ok=True)
    fr, fps = AR.read_frames(video, fps=12, w=96, h=54)
    g = fr.astype(np.float32).mean(3)
    tasks, answers = [], []
    for k, s in enumerate(shots, 1):
        i0, i1 = int(s["start"] * fps), max(int(s["start"] * fps) + 2, int(s["end"] * fps))
        cam = camera_class(g[i0:i1])
        sid = f"shot_{k:03d}"; img = os.path.join("shots", sid + ".jpg")
        sheet(video, s["start"], s["end"], os.path.join(rd, img))
        said = " ".join(w for t, w in words if s["start"] <= t < s["end"])
        cut_in = "start" if k == 1 else next((v for t, v in kinds.items() if abs(t - s["start"]) <= 0.1), "cut")
        tasks.append({"id": sid, "start": s["start"], "end": s["end"], "dur": s["dur"], "sheet": img, "cut_in": cut_in, "measured": {"camera": cam, "brightness": s.get("brightness"), "motion": s.get("motion"), "palette": s.get("palette")}, "words": said,
                      "priority": "high" if s["dur"] >= 4 or k <= 3 else "normal"})
        answers.append({"id": sid, "shot_type": "", "size": "", "camera": "", "method": "", "subject": "", "action": "", "place": "", "light": "", "on_screen_text": "", "prompt": "", "confidence": None, "evidence": ""})
    json.dump({"video": os.path.abspath(video), "how_to": __doc__.split("How the agent fills")[1].split("`check`")[0].strip(), "tasks": tasks}, open(os.path.join(rd, "tasks.json"), "w"), indent=1, ensure_ascii=False)
    ap = os.path.join(rd, "answers.json")
    if not os.path.exists(ap): json.dump(answers, open(ap, "w"), indent=1, ensure_ascii=False)
    hi = sum(1 for t in tasks if t["priority"] == "high")
    print(f"REVIEW {len(tasks)} shots ({hi} high priority) -> {rd}/tasks.json; look at review/shots/*.jpg and fill review/answers.json, then: shot_review.py check {ref}")

def load(ref):
    rd = os.path.join(ref, "review")
    return json.load(open(os.path.join(rd, "tasks.json"))), json.load(open(os.path.join(rd, "answers.json"))), rd

def check(ref, quiet=False):
    T, A, rd = load(ref)
    task = {t["id"]: t for t in T["tasks"]}; total = sum(t["dur"] for t in T["tasks"])
    errs, warns, seen = [], [], 0.0
    for a in A:
        if not a.get("shot_type"): continue
        t = task.get(a["id"])
        if not t: errs.append(f"{a['id']}: no such shot"); continue
        seen += t["dur"]
        if a["shot_type"] not in SHOT_TYPES: errs.append(f"{a['id']}: shot_type '{a['shot_type']}' not in {sorted(SHOT_TYPES)}")
        if a.get("size") and a["size"] not in SIZES: errs.append(f"{a['id']}: size '{a['size']}' not in {SIZES}")
        if a.get("camera") and a["camera"] not in CAMERAS: errs.append(f"{a['id']}: camera '{a['camera']}' not in {sorted(CAMERAS)}")
        if a.get("method") and a["method"] not in METHODS: errs.append(f"{a['id']}: method '{a['method']}' not in {sorted(METHODS)}")
        if not a.get("evidence") or len(a["evidence"]) < 12: errs.append(f"{a['id']}: no evidence (say what in the frames decided it)")
        if a.get("confidence") is None or not 0 <= float(a["confidence"]) <= 1: errs.append(f"{a['id']}: confidence must be 0..1")
        m = t["measured"]["camera"]["class"]
        if a.get("camera") == "static" and m in ("pan_tilt", "fast") and "measured" not in a.get("evidence", ""):
            warns.append(f"{a['id']}: you say static, the frames travel ({m}, drift {t['measured']['camera']['drift_px_s']} px/s) - look again or explain in evidence")
        if a.get("camera") in ("pan_tilt", "fast", "walk") and m == "static" and "measured" not in a.get("evidence", ""):
            warns.append(f"{a['id']}: you say {a['camera']}, the frames barely move - look again or explain in evidence")
        if t["words"] and a["shot_type"] in ("broll", "insert", "title") and "voice" not in a.get("evidence", "").lower() and "vo" not in a.get("evidence", "").lower():
            warns.append(f"{a['id']}: words are spoken during this {a['shot_type']} - mark it as voice-over in evidence or re-check the type")
        if a["shot_type"] in ("selfie", "third_person") and not a.get("prompt"):
            warns.append(f"{a['id']}: a talking shot without a prompt structure")
    cov = seen / total if total else 0
    if cov < 0.8: errs.append(f"coverage {cov:.0%} of the runtime < 80 % - review more shots (high-priority first)")
    if not quiet:
        for e in errs: print("ERROR", e)
        for w in warns: print("WARN ", w)
        print(f"CHECK {'OK' if not errs else 'FAIL'}  coverage {cov:.0%}  errors {len(errs)}  warnings {len(warns)}")
    return errs, warns, cov

def apply(ref):
    errs, warns, cov = check(ref, quiet=True)
    if errs:
        for e in errs: print("ERROR", e)
        sys.exit("apply refused: fix the errors first (shot_review.py check)")
    T, A, rd = load(ref)
    task = {t["id"]: t for t in T["tasks"]}
    rows = [(task[a["id"]], a) for a in A if a.get("shot_type")]
    total = sum(t["dur"] for t, _ in rows)
    by_type, by_size, by_method = defaultdict(float), defaultdict(float), defaultdict(float)
    for t, a in rows:
        by_type[a["shot_type"]] += t["dur"]; by_size[a.get("size") or "?"] += t["dur"]; by_method[a.get("method") or "?"] += t["dur"]
    pct = lambda d: {k: round(v / total, 3) for k, v in sorted(d.items(), key=lambda x: -x[1])}
    # agreement only counts cameras the reviewer judged by eye (an answer copied from the measurement proves nothing)
    judged = [(t, a) for t, a in rows if a.get("camera") and "measured class" not in a.get("evidence", "")]
    agree = [a["camera"] == t["measured"]["camera"]["class"] or (a["camera"] in ("walk", "handheld") and t["measured"]["camera"]["class"] in ("handheld", "pan_tilt")) for t, a in judged]
    # takes: edit-shots joined by jump cuts / AI seams are one take for the viewer
    takes = []
    for t, a in rows:
        if takes and str(t.get("cut_in", "")).startswith("jump") and takes[-1]["type"] == a["shot_type"]:
            takes[-1]["dur"] += t["dur"]; takes[-1]["ids"].append(a["id"])
        else:
            takes.append({"type": a["shot_type"], "size": a.get("size"), "dur": t["dur"], "ids": [a["id"]], "action": a.get("action"), "start": t["start"]})
    rep = [(takes[i]["ids"][-1], takes[i + 1]["ids"][0]) for i in range(len(takes) - 1) if takes[i].get("size") and takes[i]["size"] == takes[i + 1].get("size") and takes[i]["type"] == takes[i + 1]["type"]]
    talking = sum(t["dur"] for t, a in rows if t["words"] and a["shot_type"] in ("selfie", "third_person"))
    hook = takes[0] if takes else None
    res = {"coverage": round(cov, 3), "screen_time_by_type": pct(by_type), "screen_time_by_size": pct(by_size), "method_mix": pct(by_method),
           "talking_share": round(talking / total, 3) if total else 0, "camera_agreement": round(sum(agree) / len(agree), 3) if agree else None,
           "takes": len(takes), "take_len_median_s": round(float(np.median([x["dur"] for x in takes])), 2) if takes else None, "camera_judged_by_eye": len(judged),
           "adjacent_repeats": rep, "hook": {"type": hook["type"], "size": hook["size"], "dur": round(hook["dur"], 2), "action": hook["action"]} if hook else None,
           "burned_text_shots": [a["id"] for _, a in rows if a.get("on_screen_text")], "warnings": warns}
    fpp = os.path.join(ref, "fingerprint.json"); fp = json.load(open(fpp)); fp["review"] = res; json.dump(fp, open(fpp, "w"), indent=1, ensure_ascii=False)
    L = [f"# Verified shot review - {os.path.basename(T['video'])}", "", f"Coverage {cov:.0%} of the runtime; {res['takes']} takes (median {res['take_len_median_s']} s) from {len(rows)} edit-shots; camera agreement (measured vs judged by eye, {res['camera_judged_by_eye']} shots) {res['camera_agreement']}", "",
         "## Screen time", "- by type: " + ", ".join(f"{k} {v:.0%}" for k, v in res["screen_time_by_type"].items()),
         "- by size: " + ", ".join(f"{k} {v:.0%}" for k, v in res["screen_time_by_size"].items()), "- method: " + ", ".join(f"{k} {v:.0%}" for k, v in res["method_mix"].items()),
         f"- talking shots carry {res['talking_share']:.0%} of the runtime", "", "## Hook", f"- {res['hook']}", "",
         "## Adjacent repeats (same type and size in consecutive TAKES)", *(f"- {x} -> {y}" for x, y in rep), "" if rep else "- none", "",
         "## Shots with words burned into the picture", *(f"- {x}" for x in res["burned_text_shots"]), "" if res["burned_text_shots"] else "- none", "", "## Review warnings", *(f"- {w}" for w in warns)]
    open(os.path.join(rd, "review.md"), "w", encoding="utf-8").write("\n".join(L))
    F = ["# Prompt formula per shot type (from the verified review)", ""]
    for st in sorted(by_type, key=lambda k: -by_type[k]):
        ps = [a for t, a in rows if a["shot_type"] == st]
        F += [f"## {st} - {by_type[st] / total:.0%} of screen time, {len(ps)} shots", f"- sizes: {dict(Counter(a.get('size') for a in ps))}; cameras: {dict(Counter(a.get('camera') for a in ps))}"]
        F += [f"- example ({a['id']}): {a['prompt']}" for a in ps if a.get("prompt")][:3] + [""]
    open(os.path.join(rd, "prompt_formula.md"), "w", encoding="utf-8").write("\n".join(F))
    print(f"APPLIED {len(rows)} shots, coverage {cov:.0%}: " + ", ".join(f"{k} {v:.0%}" for k, v in res["screen_time_by_type"].items()) + f" -> {rd}/review.md, prompt_formula.md")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    b = sp.add_parser("build"); b.add_argument("ref"); b.add_argument("video")
    c = sp.add_parser("check"); c.add_argument("ref")
    p = sp.add_parser("apply"); p.add_argument("ref")
    a = ap.parse_args()
    if a.cmd == "build": build(a.ref, a.video)
    elif a.cmd == "check": e, _, _ = check(a.ref); sys.exit(1 if e else 0)
    else: apply(a.ref)

if __name__ == "__main__":
    main()
