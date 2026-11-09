#!/usr/bin/env python3
"""Checks everything the pipeline needs. Run: python3 doctor.py"""
import shutil, subprocess, sys, time
from pathlib import Path

ok = True


def check(name, good, hint=""):
    global ok
    print(("  OK   " if good else "  FAIL ") + name + ("" if good else f"  -> {hint}"))
    ok &= bool(good)


print("Vidbucks Flow Bridge - doctor")
check("Python >= 3.9", sys.version_info >= (3, 9), "install Python 3.9 or newer")
try:
    import yaml  # noqa
    check("pyyaml installed", True)
except ImportError:
    check("pyyaml installed", False, "run: python3 setup.py")
for tool in ("ffmpeg", "ffprobe"):
    check(f"{tool} on PATH", shutil.which(tool), "macOS: brew install ffmpeg | Windows: winget install ffmpeg")
import make_video as m  # noqa: E402

check(f"downloads_dir exists ({m.DOWNLOADS})", m.DOWNLOADS.exists(), "set downloads_dir in config.yaml to Chrome's download folder")
print("  ...waiting up to 45 s for the Chrome extension (open a flow.google.com project tab)")
from bridge import Bridge  # noqa: E402

try:
    br = Bridge()
except OSError as e:
    check("port 8765 free", False, f"another process uses it ({e}); close the other make_video/doctor run")
    sys.exit(1)
try:
    br.wait_connected(45)
    check("extension connected", True)
    info = br.call("ping", timeout=60)
    check("Flow tab answers", info.get("ok"), "open https://flow.google.com and a project, then reload the tab")
    if info.get("ok"):
        print(f"       tab language: {info['lang']} (tr verified, en untested), url: {info['url']}")
        check("inside a project", "/project/" in info["url"], "open or create a Flow project first")
except Exception as e:
    check("extension connected", False, f"{e}")
print("  (optional) claude CLI for QA:", "found" if shutil.which("claude") else "not found - QA stays off, that is fine")
print("\nALL GOOD" if ok else "\nFix the FAIL lines above and run doctor.py again.")
sys.exit(0 if ok else 1)
