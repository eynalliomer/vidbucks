#!/usr/bin/env python3
"""brief.yaml -> scenes generated in Google Flow (your account/credits, via the extension) -> one MP4.

    python make_video.py brief.yaml --plan
    python make_video.py brief.yaml --max-credits 60 --yes [--only 2,3]
"""
import argparse, json, os, random, re, subprocess, sys, threading, time
from pathlib import Path
import yaml
from bridge import Bridge

HERE = Path(__file__).resolve().parent


def load_config():
    """Per-machine settings from config.yaml next to this file (all optional)."""
    p = HERE / "config.yaml"
    cfg = yaml.safe_load(p.read_text(encoding="utf-8")) if p.exists() else {}
    return cfg or {}


CFG = load_config()
DOWNLOADS = Path(os.path.expanduser(CFG.get("downloads_dir", "~/Downloads")))
OUTPUT = Path(os.path.expanduser(CFG.get("output_dir", str(HERE / "out"))))

# Models, durations and credit prices as reported by Flow's own agent for a Pro account on 2026-10-24
# (Omni 360p/10s = 7 verified in real runs; the other prices were NOT charged by us). Override in config.yaml `credits:`.
MODELS = {
    "omni-flash": {"label": "Omni 1.1 Flash", "durations": [4, 6, 8, 10], "qualities": ["360p", "720p"],
                   "cost": {"360p": {4: 4, 6: 5, 8: 6, 10: 7}, "720p": {4: 7, 6: 10, 8: 12, 10: 15}}},
    "veo-lite": {"label": "Veo 3.1 Lite", "durations": [8], "qualities": ["720p"], "cost": {"720p": {8: 10}}},
    "veo-fast": {"label": "Veo 3.1 Fast", "durations": [8], "qualities": ["720p"], "cost": {"720p": {8: 20}}},
    "veo-quality": {"label": "Veo 3.1 Quality", "durations": [8], "qualities": ["720p"], "cost": {"720p": {8: 100}}},
}
for _k, _v in (CFG.get("credits") or {}).items():  # e.g. credits: {omni-flash: {360p: {10: 7}}}
    for _q, _t in _v.items():
        MODELS[_k]["cost"][_q].update({int(d): int(c) for d, c in _t.items()})

STOP = threading.Event()


class RunError(Exception):
    pass


class FlowBlocked(RunError):
    """Flow flagged the session ('unusual activity') or kept answering with its generic error. Never retried: more sends make it worse."""


class AgentBusy(RunError):
    """Flow's agent answered 'high demand, try later' instead of starting the job (nothing was charged)."""


BUSY = re.compile(r"yoğun talep|lütfen daha sonra|high demand|try again later|too many requests", re.I)


def agent_busy(br):
    """True when the newest agent reply (text after our last 'Generation settings' prompt) is a busy/try-later notice."""
    txt = br.call("dump").get("text", "")
    tail = txt[txt.rfind("Generation settings"):] if "Generation settings" in txt else txt[-600:]
    return bool(BUSY.search(tail))


def check_stop():
    if STOP.is_set():
        raise RunError("stopped by user")


def sleep(s):
    for _ in range(int(s * 2)):
        check_stop()
        time.sleep(0.5)


# ---------- brief helpers ----------
def scene_settings(brief, sc):
    """Effective generation settings for one scene (scene value > brief value > default)."""
    model = sc.get("model", brief.get("model", "omni-flash"))
    if model not in MODELS:
        raise RunError(f"unknown model {model!r}; choose one of {list(MODELS)}")
    m = MODELS[model]
    dur = int(sc.get("duration", brief.get("duration", 10 if model == "omni-flash" else 8)))
    quality = sc.get("quality", brief.get("quality", m["qualities"][0]))
    if dur not in m["durations"]:
        raise RunError(f"scene {sc['id']}: {m['label']} supports durations {m['durations']}, not {dur}")
    if quality not in m["qualities"]:
        raise RunError(f"scene {sc['id']}: {m['label']} supports {m['qualities']}, not {quality}")
    aspect = sc.get("aspect", brief.get("aspect", "16:9"))
    if aspect not in ("16:9", "9:16"):
        raise RunError(f"scene {sc['id']}: aspect must be 16:9 or 9:16")
    return {"model": model, "label": m["label"], "duration": dur, "quality": quality, "aspect": aspect,
            "credits": m["cost"][quality][dur]}


def settings_line(s):
    return (f"Generation settings: use {s['label']}, duration exactly {s['duration']} seconds, "
            f"resolution {s['quality']}, aspect ratio {s['aspect']}, one video.")


def estimate(brief, only=()):
    scenes = [sc for sc in brief["scenes"] if not only or sc["id"] in only]
    sets = [scene_settings(brief, sc) for sc in scenes]
    aspects = {s["aspect"] for s in sets}
    if len(aspects) > 1:
        raise RunError("all scenes must share one aspect ratio (16:9 or 9:16) so they can be joined")
    return {"scenes": len(scenes), "characters": len(brief.get("characters", [])),
            "credits": sum(s["credits"] for s in sets), "seconds": sum(s["duration"] for s in sets), "settings": sets}


def plan_text(brief, only=()):
    e = estimate(brief, only)
    lines = [f"{brief['name']}: {e['characters']} characters (image generation), {e['scenes']} scenes, ~{e['seconds']} s of video",
             f"estimated video credits: ~{e['credits']} (price table: Flow agent's answer, see make_video.py MODELS); QA mode: {brief.get('qa', {}).get('mode', 'off')}"]
    for sc, s in zip([sc for sc in brief['scenes'] if not only or sc['id'] in only], e["settings"]):
        lines.append(f"  scene {sc['id']}: {s['label']} {s['duration']}s {s['quality']} {s['aspect']} ~{s['credits']} credits")
    return "\n".join(lines)


# ---------- Flow steps ----------
def sh(*a, **k):
    return subprocess.run(a, check=True, capture_output=True, text=True, encoding="utf-8", errors="replace", **k).stdout


def video_tiles(br):
    return [t for t in br.call("tiles").get("tiles", []) if t["kind"] == "video"]


def tile_sig(br):
    """(count, newest title): the grid is virtualised so the count alone can stay flat when a clip is added."""
    vt = video_tiles(br)
    return (len(vt), vt[0]["title"] if vt else "")


def is_new(vt, sig):
    return bool(vt) and (len(vt) > sig[0] or vt[0]["title"] != sig[1])


def wait_new_tile(br, before_count, log=print, timeout=1800):
    """Newest tile is first in Flow's grid. Wait until there is one more video tile and it has finished generating."""
    end = time.time() + timeout
    beat = last_check = time.time()
    while time.time() < end:
        if time.time() - last_check > 60:
            check_flow_block(br, log)  # 'unusual activity' / repeated Flow error: stop instead of waiting 30 minutes
            last_check = time.time()
        if time.time() - beat > 30:
            vt0 = video_tiles(br)
            log(f"  ...generating (tiles {len(vt0)}; newest: {(vt0[0]['title'] if vt0 else '')[:40]!r})")
            beat = time.time()
        check_stop()
        vt = video_tiles(br)
        if not vt and not br.call("tiles").get("tiles"):
            goto_all_media(br, log)  # wrong view: no tiles at all
        t = vt[0]["title"] if vt else ""
        if is_new(vt, before_count) and t.strip().lower() in FAILED_TITLES and not vt[0]["generating"]:
            raise RunError("Flow marked this generation as failed (retry button)")
        # While queued, Flow can show the raw prompt as the title: only a short, real title means "finished".
        if is_new(vt, before_count) and t and len(t) <= 80 and "keyboard_return" not in t and not vt[0]["generating"]:
            sleep(5)  # let Flow finish attaching the media
            return vt[0]["title"]
        sleep(5)
    raise RunError("no new finished video tile after 30 minutes (Flow queue under high demand?)")


def agent_tail(br, n=300):
    txt = br.call("dump").get("text", "")
    return (txt[txt.rfind("Generation settings"):] if "Generation settings" in txt else txt)[-n:].replace("\n", " ")


def approve_credits(br, max_credits, spent, expected, log, before, auto_yes=True):
    """The Flow agent asks before spending credits. Approve only inside the budget.
    If no gate shows up within 90 s: a new tile means the agent started without asking, otherwise it did not start."""
    end = time.time() + 90
    last_beat = time.time()
    while time.time() < end:
        check_stop()
        a = br.call("approval").get("approval")
        if not a and agent_busy(br):
            raise AgentBusy("Flow agent is busy (high demand)")
        if a:
            m = re.findall(r"(\d+)\s*(?:kredi|credit)", a["text"], re.I)
            cost = int(m[0]) if m else None
            log(f"  Flow asks approval: {a['text'][:120]!r} (cost parsed: {cost}, expected ~{expected})")
            if cost is None or spent + cost > max_credits:
                raise RunError(f"approval cost {cost} unknown or over budget ({spent}+{cost}>{max_credits}); not approving")
            if cost != expected:
                log(f"  NOTE: Flow's price {cost} differs from the table ({expected}); the settings line may not have been followed")
            if not auto_yes and input("  approve? [y/N] ").strip().lower() != "y":
                raise RunError("not approved")
            for _ in range(4):  # the click can miss (scrolling chat); confirm the gate is really gone
                br.call("approve")
                sleep(3)
                if not br.call("approval").get("approval"):
                    return cost
                log("  approval still pending, retrying click")
            raise RunError("approval click did not go through after 4 tries")
        if is_new(video_tiles(br), before):
            log("  no approval gate, but a new clip appeared (agent started without asking)")
            return 0
        if time.time() - last_beat > 25 or (time.time() > end - 70 and int(time.time()) % 6 < 2):
            if check_flow_block(br, log):
                raise AgentBusy("Flow's agent answered with an error instead of a credit question")
        if time.time() - last_beat > 25:
            log("  ...waiting for Flow's credit question")
            last_beat = time.time()
        sleep(2)
    raise AgentBusy("agent did not start the job (no credit question in 90 s). Agent said: " + agent_tail(br))


def wait_download(t0, timeout=300):
    """Flow's own download lands in downloads_dir as <title>_720p_<stamp>.mp4 (or <id>_720p_upsampled.mp4)."""
    end = time.time() + timeout
    while time.time() < end:
        check_stop()
        if not list(DOWNLOADS.glob("*.crdownload")):
            new = [p for p in DOWNLOADS.glob("*720p*.mp4") if p.stat().st_mtime >= t0]
            if new:
                sleep(2)
                return max(new, key=lambda p: p.stat().st_mtime)
        sleep(2)
    raise RunError("720p file never appeared in downloads_dir (is Chrome allowed to download from flow.google.com, and is downloads_dir in config.yaml Chrome's download folder?)")


def probe(path):
    j = json.loads(sh("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,duration", "-show_entries", "format=duration", "-of", "json", str(path)))
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    # Use the VIDEO stream's length: Flow's 720p files have audio ~0.013 s longer than video, and xfade offsets built from
    # the container length drift past the video's end, which silently drops the picture after a few clips.
    dur = float(v.get("duration") or j["format"]["duration"])
    return int(v["width"]), int(v["height"]), dur, any(s["codec_type"] == "audio" for s in j["streams"])


def frames(path, outdir, n=3):
    outdir.mkdir(parents=True, exist_ok=True)
    dur = probe(path)[2]
    pics = []
    for i in range(n):
        p = outdir / f"{path.stem}_{i}.jpg"
        sh("ffmpeg", "-y", "-v", "error", "-ss", f"{dur * (i + 0.5) / n:.2f}", "-i", str(path), "-frames:v", "1", "-vf", "scale=640:-1", str(p))
        pics.append(p)
    return pics


def qa(pics, checks, log=print):
    """Vision QA through the local `claude -p` CLI (uses your Claude plan = tokens). Returns problems (empty = pass)."""
    q = ("Look at these frames from a generated video. Reply with only 'OK' or a short list of problems. "
         f"Problems to look for: {checks}. Files: " + " ".join(str(p) for p in pics))
    r = subprocess.run(["claude", "-p", q, "--allowedTools", "Read"], capture_output=True, text=True, timeout=240)
    ans = (r.stdout or "").strip()
    if r.returncode != 0 or not ans or "authenticate" in ans.lower() or "login" in ans.lower():
        log("  QA unavailable (claude CLI not logged in?); keeping the clip, check the frames by hand: " + ans[:100])
        return []
    return [] if ans.upper().startswith("OK") else [ans[:300]]


TRANSITIONS = {"none", "fade", "dissolve", "fadeblack", "fadewhite", "wipeleft", "wiperight", "slideleft", "slideright", "circleopen", "smoothleft"}


def transition_for(brief, sc):
    """(name, seconds) of the transition INTO scene sc: scene.transition_in > brief.transition > fade 0.4 s."""
    name = sc.get("transition_in", brief.get("transition", "fade"))
    if name not in TRANSITIONS:
        raise RunError(f"unknown transition '{name}' (use one of {sorted(TRANSITIONS)})")
    return name, float(sc.get("transition_duration", brief.get("transition_duration", 0.4)))


def concat(files, out, lufs, trans=None):
    """Join clips with xfade/acrossfade transitions (trans[i] = (name, seconds) into clip i) and normalise loudness."""
    w, h, _, _ = probe(files[0])
    durs = [probe(f)[2] for f in files]
    trans = trans or [("none", 0)] * len(files)
    cmd, parts = ["ffmpeg", "-y", "-v", "error"], []
    for i, f in enumerate(files):
        cmd += ["-i", str(f)]
        parts.append(f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v{i}]")
        parts.append(f"[{i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a{i}]")
    vl, al, total = "v0", "a0", durs[0]
    for i in range(1, len(files)):
        name, d = trans[i]
        if name == "none" or d <= 0:
            name, d = "fade", 0.04  # effectively a hard cut
        d = min(d, durs[i] / 2, total / 2)
        parts.append(f"[{vl}][v{i}]xfade=transition={name}:duration={d:.3f}:offset={total - d:.3f}[vx{i}]")
        parts.append(f"[{al}][a{i}]acrossfade=d={d:.3f}[ax{i}]")
        vl, al, total = f"vx{i}", f"ax{i}", total + durs[i] - d
    parts.append(f"[{al}]loudnorm=I={lufs}:TP=-1.5:LRA=9,alimiter=limit=0.85:level=false[aout]")
    cmd += ["-filter_complex", ";".join(parts), "-map", f"[{vl}]", "-map", "[aout]", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", str(out)]
    sh(*cmd)


def goto_all_media(br, log=print, wait_tiles=True):
    """Character creation leaves Flow on the Characters view, which has no video tiles. A fresh load of the project URL is the 'All media' view."""
    info = br.call("ping")
    m = re.match(r"(https://flow\.google\.com/project/[0-9a-f-]+)", info.get("url", ""))
    if m:
        br.call("navigate", url=m.group(1))
        for _ in range(30 if wait_tiles else 1):  # the project page can take a while to render its tiles (a brand-new project has none)
            sleep(3)
            try:
                if br.call("tiles", timeout=10).get("tiles"):
                    break
            except Exception:
                pass
    log("  back on the project's All media view")


def ensure_project(br, brief, log):
    info = br.call("ping")
    if brief.get("project") and "/project/" not in info.get("url", ""):
        log(f"  Flow tab is not on the project ({info.get('url')}); going back to it")
        br.call("navigate", url=brief["project"])
        sleep(6)
    if not video_tiles(br):  # e.g. left on the Characters view: no video tiles, and the prompt box differs
        goto_all_media(br, log)


# ---------- self-healing ----------
def heal(br, brief, log, why=""):
    """Bring Flow back to a known state: extension answering, Flow tab open, menus closed, project page reloaded on All media."""
    log(f"  recovering: {why[:100]}")
    for step in range(3):
        try:
            if not br.connected():
                log("  extension not polling the bridge; waiting up to 100 s (it restarts itself)")
                br.wait_connected(timeout=100)
            info = br.call("ping", timeout=25)
            if not info.get("ok"):
                log("  no Flow tab answered; opening the project")
                br.call("open_flow", timeout=40, url=brief["project"])
                continue
            try:
                br.call("dismiss", timeout=10)
            except Exception:
                pass
            br.call("navigate", url=brief["project"], timeout=30)
            sleep(5)
            goto_all_media(br, log)
            return
        except RunError:
            raise
        except Exception as e:
            log(f"  recovery step {step + 1} failed: {str(e)[:80]}")
            sleep(5)
    raise RunError("could not recover Flow automatically (is Chrome open with the extension loaded?)")


def retrying(br, brief, log, what, fn, tries=3):
    """Run fn(); on a failure heal the Flow page and run it again. Budget/stop errors are never retried."""
    for i in range(tries):
        try:
            return fn()
        except FlowBlocked:
            raise
        except RunError as e:
            if i == tries - 1 or "budget" in str(e) or "stopped" in str(e):
                raise
            err = str(e)
        except Exception as e:
            if i == tries - 1:
                raise RunError(f"{what}: {e!r}")
            err = repr(e)
        log(f"  {what} failed ({err[:90]}); retry {i + 2}/{tries}")
        heal(br, brief, log, err)
        pause(40, 90)  # cool off before sending the same thing again


def ensure_characters(br, brief, log, fresh=False):
    """Create missing characters without waiting for their images (Flow renders them in the background), then make sure they are named."""
    for _ in range(1 if fresh else 30):  # right after a reload the project page has no tiles yet: do not mistake that for "no characters"
        if br.call("tiles", timeout=10).get("tiles"):
            break
        sleep(3)
    have = {t["title"].upper() for t in br.call("chars_list", timeout=30).get("tiles", [])}
    goto_all_media(br, log, wait_tiles=not fresh)
    created = False
    for ch in brief.get("characters", []):
        if ch["name"].upper() in have:
            log(f"character {ch['name']}: exists")
            continue
        log(f"character {ch['name']}: creating")
        r = br.call("create_character", timeout=300, name=ch["name"], description=ch["description"])
        if not r.get("ok"):
            raise RunError(f"character creation failed: {r}")
        created = True
        pause(5, 12)
    if created:
        missing = [ch["name"] for ch in brief["characters"]]
        for i in range(4):  # Flow updates the tile name with a delay: reload and look again before concluding it did not stick
            goto_all_media(br, log)
            chars = [t for t in br.call("tiles").get("tiles", []) if t["kind"] == "character"]
            have_now = {t["title"].upper() for t in chars}
            missing = [ch["name"] for ch in brief["characters"] if ch["name"].upper() not in have_now]
            if not missing:
                break
            log(f"  character name(s) {missing} not shown yet; waiting")
            sleep(10)
        if missing:
            raise RunError(f"character(s) {missing} were created but not named; rename the unnamed character tile(s) in Flow to exactly that name, then start again")
    end = time.time() + 300  # references need finished character images
    while time.time() < end and any(t["generating"] for t in br.call("tiles").get("tiles", []) if t["kind"] == "character"):
        log("  waiting for character images to finish")
        sleep(8)


# ---------- agent batch mode ----------
def batch_prompt(brief, group, tag, take):
    lines = [brief.get("lock", "").strip(), "",
             f"Create {len(group)} separate videos, one generation per scene below, in this order. Use the character references. "
             f"Do not merge scenes. IMPORTANT: every video's title must be exactly its tag, for example {tag}-S{group[0]['id']:02d}; do not invent descriptive titles.", ""]
    for sc in group:
        lines += [f"Video {tag}-S{sc['id']:02d} (title: {tag}-S{sc['id']:02d}): {settings_line(scene_settings(brief, sc))} {sc['prompt'].strip()}", ""]
    if take:
        lines.append(f"This is a NEW take (take {take + 1}). Generate all of these videos now, even if similar ones already exist in this chat.")
    return "\n".join(lines).strip()


def run_batch(brief, br, group, clips_dir, max_credits, spent, log, take=0, no_qa=True):
    """One agent message for several scenes. Clips are downloaded as soon as each finishes. Returns {scene id: path}."""
    import random, string
    tag = "".join(random.choices(string.ascii_uppercase, k=2)) + str(random.randint(1, 9))
    want = {f"{tag}-S{sc['id']:02d}": sc for sc in group}
    expected = sum(scene_settings(brief, sc)["credits"] for sc in group)
    log(f"batch {tag}: scenes {[sc['id'] for sc in group]} in one agent message (~{expected} credits)")

    def send_and_approve():
        ensure_project(br, brief, log)
        before = tile_sig(br)
        text = batch_prompt(brief, group, tag, take)
        for busy_try in range(3):
            r = br.call("send", timeout=300, text=text, refs=brief.get("refs", []))
            if not r.get("ok"):
                raise RunError(f"send failed: {r.get('error')}")
            try:
                return before, approve_credits(br, max_credits, spent[0], expected, log, before)
            except AgentBusy as e:
                log(f"  {e}; waiting 2-4 minutes, then sending again ({busy_try + 2}/3)")
                pause(120, 240)
        raise RunError("Flow agent did not start the batch in 3 tries (nothing was charged); try again later")

    before_titles = [t["title"] for t in video_tiles(br)]
    before, cost = retrying(br, brief, log, "batch send", send_and_approve)
    spent[0] += cost
    done, taken = {}, set()  # done: scene id -> path; taken: tile titles/indices already handled
    t_start, beat, end = time.time(), time.time(), time.time() + 900 + 90 * len(group)
    ref_title = before_titles[0] if before_titles else None
    while len(done) < len(group) and time.time() < end:
        check_stop()
        a = br.call("approval").get("approval")  # the agent may ask again for later videos
        if a:
            m_ = re.findall(r"(\d+)\s*(?:kredi|credit)", a["text"], re.I)
            c = int(m_[0]) if m_ else None
            if c is None or spent[0] + c > max_credits:
                raise RunError(f"extra approval cost {c} unknown or over budget; not approving")
            log(f"  agent asks again: {c} credits; approving")
            for _ in range(4):
                br.call("approve"); sleep(3)
                if not br.call("approval").get("approval"):
                    break
            spent[0] += c
        vt = video_tiles(br)
        # newest tiles come first: everything before the previous newest tile is new
        k = next((i for i, t in enumerate(vt) if ref_title is not None and t["title"] == ref_title and i >= 1), len(vt) if ref_title is None else None)
        new = vt[:k] if k is not None else []
        ready = [t["title"] for t in new if t["title"] in want and not t["generating"] and t["title"] not in taken]
        if ready:  # tiles that carry our tag are mapped exactly; every finished one is downloaded in parallel
            taken.update(ready)
            log(f"  finished: {', '.join(ready)}; downloading {len(ready)} in parallel")
            done.update(fetch_parallel(br, brief, [(tt, want[tt]) for tt in ready], clips_dir, log))
        # a failed generation shows a retry button as its title: never download it as a scene (the scene is redone)
        rest = [(i, t) for i, t in enumerate(new) if t["title"] not in want and t["title"].strip().lower() not in FAILED_TITLES]
        failed = [t for t in new if t["title"].strip().lower() in FAILED_TITLES and not t["generating"]]
        left = [sc for sc in group if sc["id"] not in done]
        settled = not any(t["generating"] for t in new) and time.time() - t_start > 90 and (len(new) >= len(group) or bool(failed))
        if not new and time.time() - t_start > 240 and check_flow_block(br, log):  # raises FlowBlocked for 'unusual activity' / a repeated error
            log("  Flow's agent started nothing; giving up this batch (its scenes are retried later in smaller batches)")
            break
        if rest and settled:
            # the agent chose its own titles for some clips: match them to the remaining scenes by wording
            pairs = match_scenes([t["title"] for _, t in rest], left)
            for (i, t), sc in zip(rest, pairs):
                if sc is None:
                    continue
                log(f"  untagged clip {t['title']!r} -> scene {sc['id']} (matched by title wording; check it)")
                done[sc["id"]] = fetch_clip(br, brief, None, sc, clips_dir, log, index=i)
            break
        if settled and failed and not rest:
            log(f"  Flow marked {len(failed)} generation(s) as failed (retry button); not waiting for them, those scenes are retried next round")
            break
        if time.time() - beat > 45:
            log(f"  ...{len(done)}/{len(group)} clips downloaded; new tiles {len(new)}")
            beat = time.time()
        if not br.call("tiles").get("tiles"):
            goto_all_media(br, log)
        sleep(4)
    missing = [sc["id"] for sc in group if sc["id"] not in done]
    if missing:
        log(f"  batch {tag}: scenes {missing} did not arrive")
    return done


def flow_error_text(br):
    """Flow's agent sometimes answers with a generic error ('visit the Help Center', retry button) instead of starting the videos."""
    try:
        tail = br.call("dump", timeout=20).get("text", "")[-900:]
    except Exception:
        return ""
    low = tail.lower()
    return tail[-200:].replace("\n", " ") if ("support.google.com/flow" in low or "yardım merkezi" in low or "help center" in low) else ""


BLOCK_RE = re.compile(r"ola[ğg]an\s*d[ıi][şs][ıi]|unusual\s+(activity|traffic)|suspicious|[şs][üu]pheli\s+etkinlik", re.I)
BLOCK_FILE = HERE / ".flow_block"
BLOCK_COOLDOWN = 45 * 60  # seconds a flagged account is left alone
ERRORS_SEEN = [0]


def check_flow_block(br, log):
    """Call while waiting for Flow. Hard block ('unusual activity') stops the run at once; Flow's generic error stops it the second time."""
    txt = flow_error_text(br)
    try:
        full = br.call("dump", timeout=20).get("text", "")  # the whole page: the message can sit in a toast or a failed tile, not only at the end
    except Exception:
        full = ""
    if BLOCK_RE.search(full):
        raise_block(log, "Flow reported unusual activity: " + (full[-220:].replace("\n", " ")))
    if txt:
        ERRORS_SEEN[0] += 1
        log(f"  Flow's agent answered with its generic error ({ERRORS_SEEN[0]}/2): {txt[-120:]!r}")
        if ERRORS_SEEN[0] >= 2:
            raise_block(log, "Flow's agent returned its error twice in a row: " + txt[-200:])
        return txt
    return ""


def raise_block(log, detail):
    try:
        BLOCK_FILE.write_text(json.dumps({"time": time.time(), "detail": detail}), encoding="utf-8")
    except Exception:
        pass
    msg = ("STOPPED so the account is not pushed further. " + detail[:240] + "  -> Do not retry now: open Flow in the browser, do one generation by hand to see "
           "whether it works, wait ~45 minutes, then run again with batch: 1 (one clip at a time) and fewer runs per day. "
           "(Start anyway: delete the file .flow_block or run with --force.)")
    log("  " + msg)
    raise FlowBlocked(msg)


def check_cooldown(force=False):
    if force or not BLOCK_FILE.exists():
        return
    try:
        d = json.loads(BLOCK_FILE.read_text(encoding="utf-8"))
        left = BLOCK_COOLDOWN - (time.time() - d["time"])
    except Exception:
        return
    if left > 0:
        raise FlowBlocked(f"Flow flagged this session {int((BLOCK_COOLDOWN - left) // 60)} min ago ({d.get('detail', '')[:120]}). Wait {int(left // 60) + 1} more minutes, "
                          "try one generation by hand in Flow first, then run again (or run with --force / delete .flow_block).")
    BLOCK_FILE.unlink(missing_ok=True)


STD_LAST = {}


def apply_std(br, brief, sc, s, log):
    """mode: standard = Flow's own generation box (agent off). Set Video / aspect / quality / seconds in its settings chip and read the price Flow shows."""
    if brief.get("model", "omni-flash") != "omni-flash":
        raise RunError("mode: standard supports model omni-flash only for now (use the agent mode for the Veo models)")
    refs = sc.get("refs", brief.get("refs", []))
    want = (s["quality"], s["duration"], s["aspect"], bool(refs))
    if STD_LAST.get("k") == want:
        return STD_LAST["credits"]
    br.call("agent_mode", timeout=20, on=False)
    sleep(1)

    def click_rect(**q):
        for attempt in range(4):
            r = br.call("std_rect", timeout=20, **q)
            if r.get("ok"):
                br.call("click_at", timeout=20, x=r["x"], y=r["y"])  # trusted click
                sleep(0.8)
                return r
            if attempt == 3:
                raise RunError(f"could not set Flow's generation settings: {r.get('error')}")
            sleep(1.0)  # the popover may still be drawing, or it closed: make sure it is open, then look again
            if not q.get("chip") and not br.call("std_rect", timeout=20, chip=True).get("open"):
                br.call("click_at", timeout=20, **{k: v for k, v in br.call("std_rect", timeout=20, chip=True).items() if k in ("x", "y")})
                sleep(0.8)

    chip = br.call("std_rect", timeout=20, chip=True)
    if not chip.get("ok"):
        raise RunError(f"could not set Flow's generation settings: {chip.get('error')}")
    if not chip.get("open"):
        click_rect(chip=True)
    for pat in [r"video$"] + ([r"(erik [öo][ğg]eleri|ingredients)$"] if refs else []) + [re.escape(s["aspect"]) + "$", "^x1$"]:
        click_rect(pat=pat)
    # a new project often starts on Veo (20 credits x2): switch the model to Omni 1.1 Flash first, only then 360p / seconds appear
    trig = br.call("std_rect", timeout=20, pat="^(veo|omni)")
    if not trig.get("ok"):
        raise RunError(f"could not find Flow's model dropdown: {trig.get('error')}")
    if "omni 1.1 flash" not in trig.get("text", ""):
        click_rect(pat="^(veo|omni)")
        click_rect(pat="omni 1\\.1 flash$")
    for pat in ["^" + re.escape(s["quality"]), rf"^{s['duration']}\s*(sn|s|sec|saniye)", "^x1$"]:
        click_rect(pat=pat)
    r = br.call("std_read", timeout=20)
    try:
        br.call("dismiss", timeout=10)
    except Exception:
        pass
    cr = r.get("credits") or s["credits"]
    log(f"  standard box set to: {r.get('label')} ({cr} credits per clip)")
    if cr != s["credits"]:  # never send at a price we did not expect (e.g. Veo x2 = 20 credits instead of Omni 4-7)
        raise RunError(f"Flow's standard box shows {cr} credits per generation, expected {s['credits']} (settings: {r.get('label')}); nothing was sent")
    STD_LAST.update(k=want, credits=cr)
    return cr


def pause(lo, hi):
    """Random think-time between actions: a person does not fire the next request the instant the last one ends."""
    sleep(random.uniform(lo, hi))


RISKY = [(r"\\b(kill|killed|murder|blood|bloody|gun|knife|weapon|corpse|dead body|suicide|rape|abuse|bomb|terror\\w*)\\b", "violence word (Flow's filters may refuse it)"),
         (r"\\b(naked|nude|sex\\w*|bikini|lingerie)\\b", "adult word"),
         (r"\\b(president|prime minister|celebrity|nike|adidas|coca[- ]?cola|pepsi|iphone|samsung|jumia|kenwood|philips|hisense|mcdonald\\w*|youtube|google)\\b", "real person or brand name (use a generic description)"),
         (r"\\b(caption|subtitle|sign reads|text reads|label reads|written on)\\b", "asks for on-screen text (Flow burns it into the picture)")]


def lint_brief(brief, only=()):
    """Free, local check of every prompt BEFORE any credit is spent. Returns [(level, scene id or 0, message)]."""
    out, seen = [], {}
    names = {c["name"].upper() for c in brief.get("characters", [])}
    if not re.search(r"no (on-screen text|subtitles)", brief.get("lock", ""), re.I):
        out.append(("warn", 0, "lock has no 'no subtitles / no on-screen text' line: Flow tends to burn labels into clips"))
    for r in brief.get("refs", []):
        if r.upper() not in names:
            out.append(("error", 0, f"refs lists {r!r} but it is not in characters"))
    for sc in brief["scenes"]:
        if only and sc["id"] not in only:
            continue
        txt = sc["prompt"].strip()
        if len(txt) > 1100:
            out.append(("warn", sc["id"], f"prompt is {len(txt)} characters; long prompts are more often ignored or rejected"))
        if txt in seen:
            out.append(("error", sc["id"], f"same prompt as scene {seen[txt]}"))
        seen[txt] = sc["id"]
        for pat, why in RISKY:
            m = re.search(pat, txt, re.I)
            if m:
                out.append(("warn", sc["id"], f"'{m.group(0)}': {why}"))
        if names and not any(n in txt.upper() for n in names):
            out.append(("warn", sc["id"], "no character name in the prompt: the references may not be used"))
    return out


FAILED_TITLES = {"yeniden dene", "try again", "retry", "failed", "başarısız"}
STOP_WORDS = set("a an the and of in on at to with for by from is are was her his their its girl boy man woman scene video".split())


def _words(s):
    return {w.rstrip("s") for w in re.findall(r"[a-z]+", s.lower()) if w not in STOP_WORDS and len(w) > 2}


def match_scenes(titles, scenes):
    """Assign each title to a scene by shared wording with the scene prompt (greedy, best score first)."""
    sw = [_words(sc["prompt"]) for sc in scenes]
    scored = sorted(((len(_words(t) & sw[j]) / (1 + len(_words(t))), i, j) for i, t in enumerate(titles) for j in range(len(scenes))), reverse=True)
    out, used_t, used_s = [None] * len(titles), set(), set()
    for sc_, i, j in scored:
        if i in used_t or j in used_s or sc_ <= 0:  # no shared word = no evidence: leave the scene for the retry round
            continue
        out[i] = scenes[j]
        used_t.add(i); used_s.add(j)
    return out


def fetch_parallel(br, brief, items, clips_dir, log):
    """Start all downloads at once, then match each new 720p file to its scene by the tag in the file name (serial fallback)."""
    t0 = time.time() - 2
    started = []
    for title, sc in items:
        d = br.call("download", timeout=60, title=title, kind="video")
        if d.get("ok"):
            started.append((title, sc))
        else:
            log(f"  download click for {title} failed ({d.get('error')}); will retry serially")
        pause(3, 7)  # downloads start one after another, not ten in five seconds
    key = lambda s: re.sub(r"[^A-Z0-9]", "", s.upper())
    got, seen = {}, set()
    end = time.time() + 120 + 45 * len(started)
    while time.time() < end and len(got) < len(started):
        check_stop()
        if not list(DOWNLOADS.glob("*.crdownload")):
            for p in DOWNLOADS.glob("*720p*.mp4"):
                if p.stat().st_mtime < t0 or p in seen:
                    continue
                for title, sc in started:
                    if sc["id"] not in got and key(title) in key(p.name):
                        sleep(1)
                        target = clips_dir / f"s{sc['id']:02d}.mp4"
                        p.replace(target)
                        w, h, dur, aud = probe(target)
                        want = scene_settings(brief, sc)["duration"]
                        log(f"  {target.name}: {w}x{h} {dur:.1f}s audio={aud}" + (f"  WARNING: asked {want}s" if abs(dur - want) > 1.0 else ""))
                        got[sc["id"]] = target
                        seen.add(p)
                        break
        sleep(2)
    for title, sc in items:  # anything not matched by file name: one by one
        if sc["id"] not in got:
            log(f"  scene {sc['id']} not matched by file name; downloading it on its own")
            got[sc["id"]] = fetch_clip(br, brief, title, sc, clips_dir, log)
    return got


def pending_file(clips_dir):
    return clips_dir.parent / "pending.json"


def save_pending(clips_dir, items):
    """Clips that exist in Flow but are not downloaded yet: remembered on disk so a rerun fetches them FIRST instead of paying for them again."""
    f = pending_file(clips_dir)
    if items:
        f.write_text(json.dumps([{"id": sc["id"], "title": t} for t, sc in items]), encoding="utf-8")
    else:
        f.unlink(missing_ok=True)


def resume_pending(br, brief, clips_dir, log):
    f = pending_file(clips_dir)
    if not f.exists():
        return
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        f.unlink(missing_ok=True)
        return
    by_id = {sc["id"]: sc for sc in brief["scenes"]}
    items = [(d["title"], by_id[d["id"]]) for d in data if d["id"] in by_id and not (clips_dir / f"s{d['id']:02d}.mp4").exists()]
    if not items:
        f.unlink(missing_ok=True)
        return
    log(f"  {len(items)} clip(s) were generated earlier but never downloaded: downloading them first (no new credits)")
    for i in range(0, len(items), 5):
        chunk = items[i:i + 5]
        try:
            fetch_parallel(br, brief, chunk, clips_dir, log)
        except Exception as e:
            log(f"  could not download scene(s) {[sc['id'] for _, sc in chunk]} ({str(e)[:90]}); they will be generated again")
    f.unlink(missing_ok=True)


def flush_downloads(br, brief, pending, clips_dir, log):
    """Scenes generated one after another sit at the top of Flow's grid (newest first). Take their CURRENT titles by position (Flow renames tiles a little
    after they finish), then download them spaced out; 720p upscaling runs while we move on. pending = [(scene, title)], oldest first."""
    k = len(pending)
    vt = video_tiles(br)
    fresh = [t["title"] for t in vt[:k]][::-1]
    ok_pos = len(fresh) == k and not any(t["generating"] for t in vt[:k]) and len(set(fresh)) == k and not any(t.strip().lower() in FAILED_TITLES for t in fresh)
    items = [(fresh[i], pending[i][0]) for i in range(k)] if ok_pos else [(title, sc) for sc, title in pending]
    save_pending(clips_dir, items)  # stays on disk until every one of them is downloaded
    keys = [re.sub(r"[^A-Z0-9]", "", t.upper()) for t, _ in items]
    if any(i != j and a in b for i, a in enumerate(keys) for j, b in enumerate(keys)):  # one title inside another: file names would be ambiguous
        log("  titles overlap; downloading this batch one by one")
        got = {sc["id"]: fetch_clip(br, brief, t, sc, clips_dir, log) for t, sc in items}
    else:
        log(f"  downloading {k} finished clip(s) together (720p upscale runs in Flow while we continue)")
        got = fetch_parallel(br, brief, items, clips_dir, log)
    pending.clear()
    save_pending(clips_dir, [])
    return got


def fetch_clip(br, brief, title, sc, clips_dir, log, index=None):
    target = clips_dir / f"s{sc['id']:02d}.mp4"

    def go():
        t0 = time.time() - 2
        args = {"index": index} if index is not None else {"title": title, "kind": "video"}
        d = br.call("download", timeout=60, **args)
        if not d.get("ok"):
            raise RunError(f"download failed: {d}")
        wait_download(t0).replace(target)

    retrying(br, brief, log, f"download scene {sc['id']}", go)
    w, h, dur, aud = probe(target)
    want = scene_settings(brief, sc)["duration"]
    log(f"  {target.name}: {w}x{h} {dur:.1f}s audio={aud}" + (f"  WARNING: asked {want}s" if abs(dur - want) > 1.0 else ""))
    return target


# ---------- the run ----------
def run(brief, br, max_credits=0, only=(), auto_yes=True, no_qa=False, adopt_latest=False, log=print):
    only = set(only)
    check_cooldown(force=bool(os.environ.get("FLOW_FORCE")))
    ERRORS_SEEN[0] = 0
    estimate(brief, only)  # validates durations/models/aspect before anything is spent
    issues = lint_brief(brief, only)  # free prompt check: fix these first, a rejected prompt costs minutes or hours
    for lvl, sid, msg in issues:
        log(f"  prompt check {lvl.upper()}{' scene ' + str(sid) if sid else ''}: {msg}")
    if any(l == "error" for l, _, _ in issues):
        raise RunError("prompt check found errors (see the log); nothing was sent and no credit was spent")
    work = OUTPUT / brief["name"]
    clips_dir = work / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    for old in work.glob("s[0-9][0-9].mp4"):  # older runs kept the clips next to the final video
        old.replace(clips_dir / old.name)
    fresh = False
    if str(brief.get("project") or "").lower() in ("", "new", "auto"):
        fresh = True  # every new video gets its own Flow project
        r = br.call("new_project", timeout=100)
        if not r.get("ok"):
            raise RunError(f"could not create a new Flow project: {r}")
        brief["project"] = r["url"]
        log(f"new Flow project: {r['url']}")
        bp = HERE / "briefs" / f"{brief['name']}.yaml"
        if bp.exists():  # remember it so a rerun/resume uses the same project (characters and clips live there)
            saved = yaml.safe_load(bp.read_text(encoding="utf-8"))
            saved["project"] = r["url"]
            bp.write_text(yaml.dump(saved, allow_unicode=True, sort_keys=False, width=1000), encoding="utf-8")
    info = br.call("ping")
    log(f"connected: {info}")
    if not info.get("ok"):
        raise RunError("Flow tab does not answer; open flow.google.com/project/... and reload it")
    if brief.get("project") and brief["project"].split("?")[0] != info.get("url", "").split("?")[0]:
        br.call("navigate", url=brief["project"])
        sleep(6)
        log(f"project: {br.call('ping')}")

    ensure_characters(br, brief, log, fresh=fresh)
    STD_LAST.clear()
    lock = brief.get("lock", "").strip()
    batch_n = int(brief.get("batch", 1))  # 1 = one clip at a time (safest); raise to 3-5 only if Flow never flags the account
    # one clip at a time on Omni 1.1 Flash = Flow's own generation box, no agent (default); several scenes per message or Veo models need the agent
    mode = brief.get("mode") or ("standard" if batch_n <= 1 and brief.get("model", "omni-flash") == "omni-flash" else "agent")
    standard = mode == "standard"
    if batch_n > 1 and not adopt_latest and not standard:
        spent = [0]
        todo = [sc for sc in brief["scenes"] if sc["id"] in only or (not only and not (clips_dir / f"s{sc['id']:02d}.mp4").exists())]
        for sc in brief["scenes"]:
            f = clips_dir / f"s{sc['id']:02d}.mp4"
            if sc not in todo:
                log(f"scene {sc['id']}: have {f.name}, skipping")
            elif f.exists():  # regenerating this scene: keep the old clip aside
                f.replace(clips_dir / f"s{sc['id']:02d}_prev.mp4")
        for attempt in range(3):  # a second/third round only for scenes the agent did not deliver
            if not todo:
                break
            check_stop()
            step = batch_n if attempt == 0 else (max(1, batch_n // 3) if attempt == 1 else 1)  # round 2: small groups, round 3: one scene per message
            if attempt:
                log(f"round {attempt + 1}: scenes {[sc['id'] for sc in todo]} again, {step} per message")
            for i in range(0, len(todo), step):
                if i or attempt:
                    pause(25, 60)  # breathe between agent messages
                run_batch(brief, br, todo[i:i + step], clips_dir, max_credits, spent, log, take=attempt + (1 if only else 0))
            todo = [sc for sc in todo if not (clips_dir / f"s{sc['id']:02d}.mp4").exists()]
        if todo:
            raise RunError(f"scenes {[sc['id'] for sc in todo]} could not be generated after 3 rounds (Flow kept failing them, usually a prompt its filters dislike: rewrite those scenes; finished clips stay in clips/ and a rerun redoes only these)")
        final = work / f"{brief['name']}.mp4"
        concat([clips_dir / f"s{sc['id']:02d}.mp4" for sc in brief["scenes"]], final, brief.get("lufs", -16), [transition_for(brief, sc) for sc in brief["scenes"]])
        log(f"DONE {final}  credits approved this run: {spent[0]}")
        return final
    resume_pending(br, brief, clips_dir, log)
    spent, clips, pending = 0, [], []
    every = int(brief.get("download_every", 5))  # download finished clips in groups of this many (1 = right after each clip)
    defer = every > 1 and not adopt_latest and not (brief.get("qa", {}).get("mode", "off") == "claude" and not no_qa)
    try:
        for sc in brief["scenes"]:
            check_stop()
            sid, s = sc["id"], scene_settings(brief, sc)
            target = clips_dir / f"s{sid:02d}.mp4"
            if adopt_latest and sid not in only:
                continue
            if target.exists() and sid not in only:
                log(f"scene {sid}: have {target.name}, skipping")
                clips.append(target)
                continue
            for attempt in range(1 + brief.get("qa", {}).get("retries", 1)):
                log(f"scene {sid}: generating {s['label']} {s['duration']}s {s['quality']} {s['aspect']} (attempt {attempt + 1})")
                ensure_project(br, brief, log)
                if clips or attempt:
                    pause(8, 20)  # one clip at a time with a random 8-20 s gap, like the VEO3 extension (generate -> download -> next)
                before = tile_sig(br)
                if standard:
                    cr = apply_std(br, brief, sc, s, log)
                    if spent + cr > max_credits:
                        raise RunError(f"budget: {spent}+{cr} credits would pass the limit {max_credits}")
                    text = f"{lock}\n\n{sc['prompt'].strip()}"
                else:
                    text = f"{lock}\n\n{settings_line(s)}\n\n{sc['prompt'].strip()}"
                if attempt:
                    text += "\n\nFix: " + brief["qa"].get("fix", "no camera, tripod, crew or on-screen text visible.")
                if adopt_latest:
                    title = video_tiles(br)[0]["title"]
                    log(f"  adopting newest tile: {title!r}")
                else:
                    for busy_try in range(4):
                        take = (1 if sid in only else 0) + attempt + busy_try
                        send_text = text if (standard or not take) else (
                            text + f"\n\nThis is a NEW take (take {take + 1}). Generate a new video now, even if a similar one already exists earlier in this chat.")
                        for send_try in range(3):  # a send can hang or leave the submit button disabled; reload the project page and retry
                            try:
                                r = br.call("send", timeout=240, text=send_text, refs=sc.get("refs", brief.get("refs", [])), agent=not standard)
                            except Exception as e:
                                r = {"ok": False, "error": repr(e)}
                            if r.get("ok") or send_try == 2:
                                break
                            log(f"  send failed ({str(r.get('error'))[:80]}); reloading the project page and sending again ({send_try + 2}/3)")
                            sleep(3)
                            br.call("navigate", url=brief["project"])
                            sleep(6)
                            goto_all_media(br, log)
                        if not r.get("ok"):
                            raise RunError(f"send failed: {r}")
                        if standard:  # Flow's own box has no credit question: the price was read from its settings before sending
                            spent += cr
                            break
                        try:
                            spent += approve_credits(br, max_credits, spent, s["credits"], log, before, auto_yes)
                            break
                        except AgentBusy as e:
                            log(f"  {e}")
                            if busy_try == 3:
                                raise RunError("Flow agent did not start the job in 4 tries (nothing was charged); try again later")
                            log(f"  waiting 60 s, then sending again ({busy_try + 2}/4)")
                            sleep(60)
                            ensure_project(br, brief, log)
                    title = wait_new_tile(br, before, log)
                if defer:
                    pending.append((sc, title))
                    log(f"  scene {sid} generated; its download waits for the group ({len(pending)}/{every})")
                    break
                t0 = time.time() - 2
                d = br.call("download", timeout=60, title=title, kind="video")
                if not d.get("ok"):
                    raise RunError(f"download failed: {d}")
                wait_download(t0).replace(target)
                w, h, dur, aud = probe(target)
                log(f"  {target.name}: {w}x{h} {dur:.1f}s audio={aud}")
                if abs(dur - s["duration"]) > 1.0:
                    log(f"  WARNING: asked {s['duration']}s but got {dur:.1f}s (the agent may have ignored the settings line)")
                problems = []
                if not no_qa and brief.get("qa", {}).get("mode", "off") == "claude" and brief["qa"].get("checks"):
                    problems = qa(frames(target, work / "qa"), brief["qa"]["checks"], log)
                    log(f"  QA: {problems or 'OK'}")
                if not problems or adopt_latest:
                    break
            clips.append(target)
            if pending and (len(pending) >= every or sc is brief["scenes"][-1]):
                flush_downloads(br, brief, pending, clips_dir, log)

    except BaseException as e:  # a failure must not strand finished clips inside Flow (a rerun would pay for them again)
        if pending and isinstance(e, FlowBlocked):  # Flow is refusing requests: do not poke it with downloads, remember the clips for the rerun
            save_pending(clips_dir, [(t, sc) for sc, t in pending])
            log(f"  Flow is blocking requests: {len(pending)} finished clip(s) stay in Flow; the next run downloads them first")
        elif pending and not (isinstance(e, RunError) and "stopped" in str(e)):
            try:
                log(f"  saving {len(pending)} finished clip(s) before stopping")
                flush_downloads(br, brief, pending, clips_dir, log)
            except Exception as e2:
                log(f"  could not save them: {e2!r}")
        raise
    if pending:
        flush_downloads(br, brief, pending, clips_dir, log)
    missing = [sc["id"] for sc in brief["scenes"] if not (clips_dir / f"s{sc['id']:02d}.mp4").exists() and not adopt_latest]
    if missing:
        raise RunError(f"scenes {missing} have no clip file after the downloads; rerun to redo only those")
    if adopt_latest:
        log(f"adopted scene(s) {sorted(only)}; run again without --adopt-latest to generate the remaining scenes")
        return None
    final = work / f"{brief['name']}.mp4"
    concat(clips, final, brief.get("lufs", -16), [transition_for(brief, sc) for sc in brief["scenes"]])
    log(f"DONE {final}  credits approved this run: {spent}")
    return final


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("brief")
    ap.add_argument("--max-credits", type=int, default=0, help="hard budget; 0 = refuse to approve anything")
    ap.add_argument("--force", action="store_true", help="ignore the 45-minute cool-down after Flow flagged the session")
    ap.add_argument("--lint", action="store_true", help="only check the prompts (free), do not run")
    ap.add_argument("--only", default="", help="comma list of scene ids to (re)generate")
    ap.add_argument("--no-qa", action="store_true", help="force QA off (QA is off unless the brief sets qa.mode: claude)")
    ap.add_argument("--plan", action="store_true", help="print what would be generated and the credit estimate, then exit")
    ap.add_argument("--adopt-latest", action="store_true", help="do not generate: download the newest finished video tile as the scene in --only")
    ap.add_argument("--yes", action="store_true", help="auto-approve credit gates inside --max-credits")
    a = ap.parse_args(argv)
    brief = yaml.safe_load(Path(a.brief).read_text(encoding="utf-8"))
    if a.force:
        os.environ["FLOW_FORCE"] = "1"
    only = {int(x) for x in a.only.split(",") if x}
    try:
        if a.plan:
            print(plan_text(brief, only))
            return
        if a.lint:
            issues = lint_brief(brief, only)
            for lvl, sid, msg in issues:
                print(f"{lvl.upper():5} {'scene ' + str(sid) if sid else 'brief':9} {msg}")
            print(f"{len(issues)} finding(s)" if issues else "prompt check: no findings")
            return
        br = Bridge()
        print("waiting for the Chrome extension...")
        br.wait_connected()
        run(brief, br, a.max_credits, only, a.yes, a.no_qa, a.adopt_latest, lambda m: print(m, flush=True))
    except RunError as e:
        sys.exit(f"ERROR: {e}")


if __name__ == "__main__":
    main()
