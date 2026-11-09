#!/usr/bin/env python3
"""Build a shareable zip (no outputs, logs, caches or personal config): python3 make_zip.py"""
import zipfile
from pathlib import Path

here = Path(__file__).resolve().parent
skip_dirs = {"out", "__pycache__", ".git"}
skip_files = {"config.yaml", "qa_test.py", "dbg.py", ".flow_block"}  # personal briefs/project URLs and dev-only files stay out
out = here.parent / "vidbucks-flow-bridge.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(here.rglob("*")):
        rel = p.relative_to(here)
        personal_brief = rel.parts[0] == "briefs" and p.name != "example.yaml"  # test briefs carry our own Flow project URLs
        if p.is_dir() or any(part in skip_dirs for part in rel.parts) or p.name in skip_files or personal_brief or p.suffix in {".log", ".pyc"}:
            continue
        z.write(p, Path("flow-bridge") / rel)
print("wrote", out)
