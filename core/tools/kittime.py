"""Shared time-expression resolver for the kits (mirror of src/kits/time.ts), used by kit_cues.py and layer_check.py.

A time expression: 12.4 | {"line": 7, "dt": .2} | {"end": 7} | {"word": [7, "ceylan"], "nth": 0, "dt": -.1} | {"beat": 12}
Word matching is Unicode-aware (Turkish ı ş ğ ü ö ç İ count as letters)."""
import json, pathlib, unicodedata


def _fold(s):
    return unicodedata.normalize("NFC", s.replace("İ", "i").replace("I", "ı").lower())


def _letters(s):
    return [c for c in s if c.isalnum()]


class Clock:
    def __init__(self, timing):
        self.t = timing if isinstance(timing, dict) else json.loads(pathlib.Path(timing).read_text())
        self.lines = {l["id"]: l for l in self.t["lines"]}
        self.beat = 60 / self.t.get("bpm", 120)

    def L(self, i): return self.lines[i]["start"]
    def E(self, i): return self.lines[i]["end"]

    def W(self, i, word, nth=0):
        l = self.lines[i]; w = "".join(_letters(_fold(word)))
        n = 0
        for txt, a, _b in l.get("words") or []:
            if "".join(_letters(_fold(txt))).startswith(w):
                if n == nth: return a
                n += 1
        low = _fold(l["text"]); idx, start = -1, 0
        for _ in range(nth + 1):
            idx = low.find(_fold(word), start); start = idx + 1
            if idx < 0: raise ValueError(f"word {word!r} not in line {i}: {l['text']!r}")
        before = len(_letters(low[:idx])); allc = max(1, len(_letters(low)))
        return l["start"] + (l["end"] - l["start"]) * before / allc + 0.04

    def at(self, e, default=0.0):
        if e is None: return default
        if isinstance(e, (int, float)): return float(e)
        dt = e.get("dt", 0.0)
        if "line" in e: return self.L(e["line"]) + dt
        if "end" in e: return self.E(e["end"]) + dt
        if "word" in e: return self.W(e["word"][0], e["word"][1], e.get("nth", 0)) + dt
        if "beat" in e: return e["beat"] * self.beat + dt
        return default
