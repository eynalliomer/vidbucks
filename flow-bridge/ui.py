#!/usr/bin/env python3
"""Local web UI for the Flow Bridge:  python3 ui.py   ->  http://127.0.0.1:8770
Edit a brief (characters, scenes, per-scene duration), see the credit estimate, run it, watch the log, play the result.
Everything stays on 127.0.0.1; the only paid thing is the optional 'draft with Claude' button (uses your claude CLI)."""
import json, mimetypes, re, subprocess, sys, threading, time, urllib.parse, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import yaml

import make_video as mv
from bridge import Bridge

HERE = Path(__file__).resolve().parent
BRIEFS = HERE / "briefs"
PORT = 8770
BR = Bridge()
S = {"running": False, "log": [], "result": None, "error": None, "name": None}
LOCK = threading.Lock()


def log(msg):
    with LOCK:
        S["log"].append(f"{time.strftime('%H:%M:%S')}  {msg}")


class Dumper(yaml.SafeDumper):
    pass


Dumper.add_representer(str, lambda d, v: d.represent_scalar("tag:yaml.org,2002:str", v, style="|" if "\n" in v else None))


def dump_yaml(brief):
    return yaml.dump(brief, Dumper=Dumper, allow_unicode=True, sort_keys=False, width=1000)


def safe_name(n):
    n = re.sub(r"[^A-Za-z0-9_-]+", "-", str(n)).strip("-")
    if not n:
        raise mv.RunError("brief needs a name (letters, digits, - or _)")
    return n


def save_brief(brief):
    BRIEFS.mkdir(exist_ok=True)
    brief["name"] = safe_name(brief["name"])
    (BRIEFS / f"{brief['name']}.yaml").write_text(dump_yaml(brief), encoding="utf-8")
    return brief


def worker(brief, max_credits, only):
    try:
        S["result"] = None
        final = mv.run(brief, BR, max_credits, only, True, False, False, log)
        S["result"] = f"/files/{brief['name']}/{Path(final).name}"
    except mv.RunError as e:
        S["error"] = str(e)
        log(f"ERROR: {e}")
    except Exception as e:  # keep the UI alive whatever happens
        S["error"] = repr(e)
        log(f"ERROR: {e!r}")
    finally:
        S["running"] = False


def draft_with_claude(topic, scenes, duration, language):
    skill = (HERE / "skills/flow-brief/SKILL.md").read_text(encoding="utf-8")
    schema = (HERE / "BRIEF.md").read_text(encoding="utf-8")
    prompt = (f"{skill}\n\n{schema}\n\nWrite ONLY the YAML for a brief (no commentary, no code fences). Topic/story: {topic}\n"
              f"Scenes: {scenes}, each {duration} seconds (set duration: {duration} at brief level). Dialogue language: {language}. "
              "Use model omni-flash, quality 360p, aspect 16:9 unless the topic says otherwise.")
    r = subprocess.run(["claude", "-p", prompt], capture_output=True, text=True, timeout=300)
    out = (r.stdout or "").strip()
    out = re.sub(r"^```(?:ya?ml)?\s*|\s*```$", "", out).strip()
    if r.returncode != 0 or "authenticate" in out.lower()[:200]:
        raise mv.RunError("claude CLI not available/logged in: " + out[:150])
    return yaml.safe_load(out)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send_json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def body(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path == "/":
            return self.file(HERE / "ui" / "index.html")
        if u.path == "/api/models":
            return self.send_json({k: {"label": v["label"], "durations": v["durations"], "qualities": v["qualities"], "cost": {qq: {str(d): c for d, c in t.items()} for qq, t in v["cost"].items()}} for k, v in mv.MODELS.items()})
        if u.path == "/api/state":
            since = int(q.get("since", ["0"])[0])
            info = None
            if not S["running"] and BR.connected():
                try:
                    info = BR.call("ping", timeout=6)
                except Exception:
                    info = None
            with LOCK:
                lines = S["log"][since:]
                total = len(S["log"])
            return self.send_json({"connected": BR.connected(), "tab": info, "running": S["running"], "log": lines, "next": total,
                                   "result": S["result"], "error": S["error"], "outdir": str(mv.OUTPUT)})
        if u.path == "/api/call":  # debugging aid: run one extension command (localhost only); every other query value is passed as an argument
            args = {k: (float(v[0]) if k in ("x", "y") else (v[0] not in ("0", "false", "") if k in ("on", "chip") else v[0])) for k, v in q.items() if k != "cmd"}
            if "text" in args:
                args["refs"] = []
            return self.send_json(BR.call(q["cmd"][0], timeout=60, **args))
        if u.path == "/api/briefs":
            return self.send_json(sorted(p.stem for p in BRIEFS.glob("*.yaml")))
        if u.path == "/api/brief":
            return self.send_json(yaml.safe_load((BRIEFS / f"{safe_name(q['name'][0])}.yaml").read_text(encoding="utf-8")))
        if u.path.startswith("/files/"):
            p = (mv.OUTPUT / urllib.parse.unquote(u.path[7:])).resolve()
            if mv.OUTPUT.resolve() not in p.parents or not p.is_file():
                return self.send_error(404)
            return self.file(p, ranged=True)
        self.send_error(404)

    def do_POST(self):
        try:
            d = self.body()
            if self.path == "/api/save":
                return self.send_json({"ok": True, "name": save_brief(d["brief"])["name"]})
            if self.path == "/api/plan":
                return self.send_json({"ok": True, "text": mv.plan_text(d["brief"], set(d.get("only", [])))})
            if self.path == "/api/run":
                if S["running"]:
                    return self.send_json({"ok": False, "error": "a run is already in progress"}, 409)
                brief = save_brief(d["brief"])
                only = set(d.get("only", []))
                mv.estimate(brief, only)  # validate now so errors show immediately
                mv.STOP.clear()
                S.update(running=True, log=[], result=None, error=None, name=brief["name"])
                threading.Thread(target=worker, args=(brief, int(d.get("max_credits", 0)), only), daemon=True).start()
                return self.send_json({"ok": True})
            if self.path == "/api/stop":
                mv.STOP.set()
                return self.send_json({"ok": True})
            if self.path == "/api/draft":
                brief = draft_with_claude(d["topic"], d.get("scenes", 6), d.get("duration", 10), d.get("language", "Turkish"))
                return self.send_json({"ok": True, "brief": brief})
        except mv.RunError as e:
            return self.send_json({"ok": False, "error": str(e)}, 400)
        except Exception as e:
            return self.send_json({"ok": False, "error": repr(e)}, 500)
        self.send_error(404)

    def file(self, p, ranged=False):
        data = p.read_bytes()
        ctype = mimetypes.guess_type(str(p))[0] or "application/octet-stream"
        start, end, code = 0, len(data) - 1, 200
        rng = self.headers.get("Range")
        if ranged and rng and (m := re.match(r"bytes=(\d*)-(\d*)", rng)):
            start = int(m.group(1) or 0)
            end = int(m.group(2)) if m.group(2) else len(data) - 1
            code = 206
        chunk = data[start:end + 1]
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(len(chunk)))
        if code == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{len(data)}")
        self.end_headers()
        try:
            self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print(f"Vidbucks Flow Bridge UI: http://127.0.0.1:{PORT}  (Ctrl-C to quit)")
    if "--no-open" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(f"http://127.0.0.1:{PORT}")).start()
    srv.serve_forever()
