"""CREDITS.md for the ten films: every picked picture (main + extra) with licence, creator and page."""
import html, json, pathlib
C = pathlib.Path(__file__).resolve().parents[2]; F = C / "videos/films"; out = ["# Credits - ten taught films", ""]
for d in sorted(p for p in F.iterdir() if (p / "visuals.json").exists()):
    V = json.loads((d / "visuals.json").read_text()); out.append(f"## {d.name}")
    for L in V["lines"]:
        for p in [L.get("picked")] + list(L.get("extra") or []):
            if not p: continue
            if p.get("source") == "procedural": out.append(f"- L{L['line']}: {p['title']} - original"); continue
            out.append(f"- L{L['line']}: \"{p['title']}\" by {html.unescape(p.get("creator") or "unknown")}, {p['license']}, {p.get('page', '')}")
    out.append("- Narration: Piper tr_TR-dfki-medium (voice dataset CC BY-NC-SA: test use only). Music and sound effects: synthesised locally.")
    out.append("")
(F / "CREDITS.md").write_text("\n".join(out)); print(len(out))
