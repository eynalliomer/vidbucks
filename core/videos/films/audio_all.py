"""Per film: sound cues from the visual treatment in the film's own SOUND PALETTE, a mood bed, and the mix.
visuals.json may carry  "sound": {"palette": "...", "mood": "calm|dark|bright", "bpm": 84, "music_db": -14}  and any act
"direction": {"sound": "<palette>"}; without them the palette comes from the act's style. One hit per meaningful change."""
import json, pathlib, subprocess, sys
C = pathlib.Path(__file__).resolve().parents[2]; F = C / "videos/films"
# palette: scene -> (kind, gain). "_enter" = a picture arriving in a boxed frame, "_act" = act change, "_default" = anything else
PAL = {
 "paper":      {"_act": ("paper", .6), "_default": ("slide", .3), "document": ("paper", .55), "typed": ("keys", .5), "stamp": ("stamp", .7), "board": ("thud", .5), "collage": ("thud", .45), "timeline": ("pencil", .45), "map": ("pencil", .5), "number": ("ticks", .4), "quote": ("paper", .4), "detail": ("pencil", .4), "title": ("thud", .4)},
 "archive":    {"_act": ("projector", .5), "_default": ("shutter", .4), "filmstrip": ("projector", .55), "document": ("paper", .5), "stamp": ("stamp", .75), "title": ("bell", .3), "map": ("slide", .4), "timeline": ("ticks", .35), "number": ("ticks", .4), "typed": ("keys", .5), "board": ("thud", .5)},
 "digital":    {"_act": ("blipup", .5), "_default": ("blip", .35), "number": ("ticks", .4), "bars": ("blipup", .4), "chart": ("riser", .3), "pictos": ("ticks", .35), "gauge": ("riser", .35), "versus": ("snap", .4), "steps": ("blip", .4), "title": ("impact", .3), "bigword": ("impact", .4), "ratio": ("blipup", .4), "diagram": ("blip", .4)},
 "poster":     {"_act": ("zip", .55), "_default": ("snap", .4), "bigword": ("impact", .5), "title": ("impact", .45), "stamp": ("stamp", .7), "number": ("impact", .4), "collage": ("pop", .45), "map": ("whoosh", .5), "compare": ("knife", .45), "bars": ("pop", .4)},
 "comedy":     {"_act": ("boing", .5), "_default": ("pop", .45), "title": ("bell", .35), "stamp": ("stamp", .7), "compare": ("boing", .45), "bigword": ("boing", .5), "detail": ("glock", .3), "collage": ("pop", .5), "number": ("glock", .35)},
 "classroom":  {"_act": ("chalk", .6), "_default": ("chalk", .4), "list": ("chalk", .45), "steps": ("chalk", .45), "stamp": ("stamp", .6), "number": ("chalk", .45), "diagram": ("pencil", .45), "title": ("chalk", .5)},
 "soft":       {"_act": ("swell", .45), "_default": ("pop", .3), "title": ("chime", .3), "number": ("chime", .3), "list": ("pop", .35), "map": ("whoosh", .4), "ratio": ("chime", .3), "bigword": ("swell", .4), "steps": ("pop", .35)},
 "thriller":   {"_act": ("riser", .5), "_default": ("knife", .35), "stamp": ("stamp", .8), "title": ("boom", .4), "bigword": ("boom", .45), "board": ("thud", .5), "document": ("paper", .5), "typed": ("keys", .5), "map": ("whoosh", .5), "number": ("heartbeat", .5), "detail": ("snip", .5)},
}
STYLE_PAL = {"engraving": "paper", "woodcut": "paper", "art-deco": "archive", "silent-film": "archive", "newsreel": "archive", "kino-montage": "archive", "halftone-dossier": "thriller", "spy-titles": "thriller",
             "pop-art": "poster", "silkscreen-poster": "poster", "risograph": "soft", "swiss-motion": "poster", "bauhaus-shapes": "poster", "pictogram-motion": "soft", "caption-news": "digital", "news-package": "digital",
             "dataviz": "digital", "spreadsheet": "digital", "whiteboard": "classroom", "chalkboard": "classroom", "blueprint": "paper", "flat-space-explainer": "soft", "dark-keynote": "digital", "hologram-hud": "digital",
             "circuit-board": "digital", "oscilloscope-math": "digital", "neon-tubes": "digital", "ascii-crt": "digital", "one-bit-dither": "digital", "text-flash-cuts": "poster", "transit-map": "soft"}
MOOD = {"paper": ("calm", 76), "archive": ("calm", 72), "digital": ("dark", 96), "poster": ("bright", 104), "comedy": ("bright", 116), "classroom": ("calm", 82), "soft": ("calm", 88), "thriller": ("dark", 80)}
run = lambda *c: subprocess.run([sys.executable, *c], cwd=C, check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1]
if __name__ == "__main__":
    slugs = sys.argv[1:] or sorted(d.name for d in F.iterdir() if (d / "visuals.json").exists())
    for s in slugs:
        d = F / s; V = json.loads((d / "visuals.json").read_text()); T = json.loads((d / "timing.json").read_text()); snd = V.get("sound", {})
        start = {l["id"]: l["start"] for l in T["lines"]}; act_of = {ln: a for a in V["acts"] for ln in a["lines"]}
        pal_of = lambda a: (a.get("direction") or {}).get("sound") or snd.get("palette") or STYLE_PAL.get(a["style"], "soft")
        cues, prev = [], None
        for L in V["lines"]:
            a = act_of[L["line"]]; P = PAL[pal_of(a)]; t = max(0.05, start[L["line"]] - 0.15)
            if prev is not None and a["id"] != prev: k, g = P["_act"]; cues.append({"kind": k, "t": round(max(0.05, t - 0.3), 3), "gain": g, "dur": 0.9})
            k, g = P.get(L["shot"], P["_default"]); cues.append({"kind": k, "t": round(t, 3), "gain": g}); prev = a["id"]
            n = len(L.get("extra") or []); TL = next(x for x in T["lines"] if x["id"] == L["line"]); W = TL.get("words") or []
            nw = max(1, len(TL["text"].split())); wt = lambda wi: W[min(len(W) - 1, int(wi * len(W) / nw))][1] if W else TL["start"]   # script word index -> heard time
            if L["shot"] == "montage":                                      # a hit on every cut of a montage, at the cut itself
                for wi in (L.get("data") or {}).get("cuts", [])[1:]: k2, g2 = P["_default"]; cues.append({"kind": k2, "t": round(wt(wi) - 0.05, 3), "gain": g2 * 0.9})
            else:                                                           # every extra picture that lands gets its own soft hit
                for i in range(n): k2, g2 = P.get("collage", P["_default"]); cues.append({"kind": k2, "t": round(t + 0.45 * (i + 1) if L["shot"] != "board" else t + 0.6 * (i + 1), 3), "gain": g2 * 0.8})
            for pp in L.get("pops") or []: k2, g2 = P.get("number", P["_default"]); cues.append({"kind": "impact" if k2 == "ticks" else k2, "t": round(wt(pp["word"]) - 0.03, 3), "gain": 0.45})
            if L.get("tag"): cues.append({"kind": "whoosh", "t": round(t + 0.35, 3), "gain": 0.35})
            if L.get("after"): cues.append({"kind": "swell", "t": round(TL["end"] + 0.1, 3), "gain": 0.5, "dur": 2.0})
        (d / "cues.json").write_text(json.dumps(cues, indent=0))
        dur = T["duration"]; main = pal_of(V["acts"][0]) if len(V["acts"]) == 1 else max((pal_of(a) for a in V["acts"]), key=lambda p: sum(len(a["lines"]) for a in V["acts"] if pal_of(a) == p))
        mood, bpm = snd.get("mood", MOOD[main][0]), snd.get("bpm", MOOD[main][1])
        run("tools/sfx_synth.py", "--cues", str(d / "cues.json"), "--duration", f"{dur:.2f}", "--out", str(d / "sfx.wav"))
        run("tools/make_pulse_track.py", "--bpm", str(bpm), "--dur", f"{dur:.2f}", "--mood", mood, "--out", str(d / "music.wav"))
        print(s, f"[{main} · {mood} {bpm} bpm · {len(cues)} cues]", run("tools/mix_film.py", "--voice", str(d / "narration.wav"), "--sfx", str(d / "sfx.wav"), "--music", str(d / "music.wav"),
              "--out", str(d / "mix.m4a"), "--lead", str(T.get("lead", 0.4)), "--lufs", "-16", "--music-db", str(snd.get("music_db", -14)), "--sfx-db", "-8"))
