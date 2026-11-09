#!/usr/bin/env python3
"""One-time setup on a new machine: python3 setup.py"""
import shutil, subprocess, sys
from pathlib import Path

here = Path(__file__).resolve().parent
print("1/3 installing Python packages")
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "-r", str(here / "requirements.txt")])
print("2/3 config")
cfg = here / "config.yaml"
if not cfg.exists():
    shutil.copy(here / "config.example.yaml", cfg)
    print("   created config.yaml (edit downloads_dir if Chrome saves elsewhere)")
print("3/3 ffmpeg:", "found" if shutil.which("ffmpeg") else "MISSING -> macOS: brew install ffmpeg | Windows: winget install ffmpeg")
print(f"""
Now install the Chrome extension (once):
  1. In Chrome open  chrome://extensions  and switch on 'Developer mode' (top right)
  2. Click 'Load unpacked' and pick this folder:  {here / 'extension'}
  3. Chrome > Settings > Downloads: keep 'Ask where to save' OFF. When Chrome asks to allow multiple downloads
     from flow.google.com, choose Allow.
  4. Open https://flow.google.com, create or open a project, then run:  python3 doctor.py
""")
