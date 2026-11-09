#!/usr/bin/env python3
"""words_check.py - check a video's words BEFORE anything is generated or rendered (script lines, captions, prompts).

  python tools/words_check.py script.txt                  # narration / dialogue / captions (TR + EN)
  python tools/words_check.py prompts.md --prompts        # video-model prompts (adds generation-policy checks)
  python tools/words_check.py a.txt b.md --json out.json  # several files, JSON report
  python tools/words_check.py script.txt --line           # one summary line (for other tools)

What it flags (each finding has file:line, the rule and a fix):
  FAIL  dash used as a pause (em dash, en dash between words, double hyphen) - TTS and video models read them badly
  FAIL  (--prompts) a prompt asks for words/letters on screen without forbidding generated text
  WARN  cliches and lines that read as machine-written (Turkish and English lists below), filler intensifiers
  WARN  rhetorical questions to the viewer, "imagine..." openings, lists of three abstract nouns
  WARN  (--prompts) real-person names in a prompt (Flow/Veo refuse "recognised people"; describe the person instead)
  WARN  (--prompts) no "no subtitles / no writing" line (models burn names and captions into the picture)
  INFO  sentence length, repeated words, word count per scene (blank line = scene)

Exit code 1 when any FAIL. Standard library only. The lists are Vidbucks' own, written from our renders and reviews.
"""
import argparse, json, os, re, sys
from collections import Counter

# -------------------------------------------------------------- word lists (lowercase, matched on word boundaries)
CLICHES_TR = [
    "bir dünyada", "yolculuğa çık", "yolculuğuna çık", "gerisi tarih", "hiçbir şey eskisi gibi olmayacak", "her şey değişti",
    "tüm zorluklara rağmen", "kesin olan bir şey var", "aslında mesele", "sadece bir .* değil", "unutulmaz bir deneyim",
    "zamanın ötesinde", "kalbinin peşinden", "hayallerinin peşinden", "derinlerine dal", "kilidini aç", "sihir gerçekleşiyor",
    "umut dolu bir hikaye", "umut dolu bir hikâye", "cesaret dolu bir hikaye", "cesaret dolu bir hikâye", "ve sonra her şey",
    "nefes kesici", "göz kamaştırıcı", "büyüleyici bir", "hayal bile edemezsiniz", "inanılmaz ama gerçek", "şimdiye kadar hiç",
]
TELLS_TR = [
    r"\badeta\b", r"\bsanki\b.{0,40}\bgibi\b", r"\bpeki ya\b", r"hiç düşündünüz mü", r"\bfısıld(ı|ıyor|adı)", r"\bderin bir nefes",
    r"\binanılmaz\b", r"\bmuhteşem\b", r"\bkesinlikle\b", r"\bgerçekten de\b", r"\bdeğil,\s*\w+", r"\bbir düşünün\b", r"\bhayal edin\b",
]
CLICHES_EN = [
    "in a world where", "little did they know", "against all odds", "nothing would ever be the same", "the rest is history",
    "more than just a", "every moment counts", "one thing is certain", "and then everything changed", "a testament to",
    "a tapestry of", "embark on", "dive into", "unlock the", "where .* meets", "follow your dreams", "follow your heart",
    "timeless", "an unforgettable experience", "game changer", "game-changer", "in today's fast-paced world", "buckle up",
]
TELLS_EN = [
    r"\bdelve\b", r"\bnestled\b", r"\bseamless(ly)?\b", r"\bmeticulous(ly)?\b", r"\bit's not (just )?about\b", r"\bnot just\b.{0,40}\bbut\b",
    r"\blet's dive in\b", r"\bimagine\b", r"\bwhat if\b", r"\bincredible\b", r"\bliterally\b", r"\bvibrant\b", r"\bjourney\b",
]
# names video models treat as "recognised people"; extend in knowledge/policy_names.txt (one per line)
POLICY_NAMES = [
    "mehmed", "mehmet", "fatih", "selim", "yavuz", "süleyman", "suleiman", "osman", "orhan", "atatürk", "ataturk", "kemal",
    "elizabeth", "napoleon", "cleopatra", "caesar", "hitler", "stalin", "lincoln", "washington", "churchill", "einstein",
    "batman", "superman", "spiderman", "spider-man", "joker", "mickey", "pikachu", "harry potter",
]
GEN_TEXT_ASK = r"\b(caption|subtitle|writes|written|sign that says|text reading|letters?|calligraphy|map with labels|logo)\b"
NO_TEXT = r"no (subtitles|writing|text|letters|captions)|no readable|unreadable|without (text|writing|letters)"
DASH = re.compile(r"—|(?<=\w)\s–\s(?=\w)|(?<!-)--(?!-)")

def load_names(root):
    p = os.path.join(root, "knowledge", "policy_names.txt")
    extra = [l.strip().lower() for l in open(p, encoding="utf-8")] if os.path.exists(p) else []
    return [n for n in POLICY_NAMES + extra if n]

def lower_tr(s):
    return s.replace("I", "ı").replace("İ", "i").lower()

def check_text(path, prompts, names):
    out = []
    raw = open(path, encoding="utf-8").read()
    lines = raw.splitlines()
    # a prompt file may define the no-text guard once in a shared block that every prompt pastes in
    global_guard = prompts and any(re.search(NO_TEXT, lower_tr(l)) and re.search(r"global|lock|ortak|block|blok", lower_tr(l + " " + (lines[k - 1] if k else "")))
                                   for k, l in enumerate(lines))
    def add(sev, ln, rule, text, fix):
        out.append({"severity": sev, "file": path, "line": ln, "rule": rule, "text": text.strip()[:160], "fix": fix})
    for i, line in enumerate(lines, 1):
        if not line.strip(): continue
        if prompts and re.match(r"\s*(#|- |\* |\|)", line): continue   # markdown headers, notes, tables are not prompts
        low = lower_tr(line)
        spoken = re.findall(r'"([^"]+)"|“([^”]+)”', line) if prompts else [(line, "")]
        spoken_txt = " ".join(a or b for a, b in spoken)
        target = spoken_txt if prompts else line
        tlow = lower_tr(target)
        if target and DASH.search(target):
            add("FAIL", i, "dash", target, "use a comma, full stop or line break; models read dashes as noise")
        for c in CLICHES_TR + CLICHES_EN:
            if re.search(r"\b" + c + r"\b", tlow):
                add("WARN", i, "cliche", target, f"'{c}' says nothing: replace with a concrete image or fact")
        for t in TELLS_TR + TELLS_EN:
            if re.search(t, tlow):
                add("WARN", i, "generated-tell", target, f"reads as machine-written ({t.strip(chr(92) + 'b')}); rewrite plainly or keep with a reason")
        if not prompts:
            if re.search(r"\?\s*$", line.strip()) and re.search(r"\b(siz|sen|you)\b", low):
                add("WARN", i, "rhetorical-question", line, "a question to the viewer is a stall; state the fact or show it")
            words = re.findall(r"\w+", line)
            if len(words) > 28:
                add("INFO", i, "long-sentence", line, f"{len(words)} words in one sentence; split for TTS and captions")
        if prompts:
            for n in names:
                if re.search(r"\b" + re.escape(n) + r"\b", low):
                    add("WARN", i, "policy-name", line, f"'{n}' may trigger the model's recognised-people / IP filter: describe the person (age, face, clothes) and refer to the reference image")
                    break
            if re.search(GEN_TEXT_ASK, low) and not re.search(NO_TEXT, low):
                add("FAIL", i, "asks-for-text", line, "the prompt invites on-screen words; add 'no writing or letters anywhere' or describe it as unreadable")
            pasted_guard = global_guard and re.search(r"global block|ortak blok|ilk paragraf|\[lock\]", low)
            if len(line) > 200 and not re.search(NO_TEXT, low) and not pasted_guard:
                add("WARN", i, "no-text-guard", line, "add 'no subtitles, no writing or letters anywhere' - models burn names/captions in")
    # scene stats: blank line = scene
    if not prompts:
        scenes = [s for s in re.split(r"\n\s*\n", raw) if s.strip()]
        for k, s in enumerate(scenes, 1):
            n = len(re.findall(r"\w+", s))
            if n > 40: add("WARN", 0, "scene-too-long", s[:80], f"scene {k} has {n} words (> 40): split it")
        words = [lower_tr(w) for w in re.findall(r"\w{4,}", raw)]
        for w, c in Counter(words).most_common(5):
            if c >= 5 and len(words) > 60: add("INFO", 0, "repeated-word", w, f"'{w}' used {c} times")
    return out

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+"); ap.add_argument("--prompts", action="store_true"); ap.add_argument("--json"); ap.add_argument("--line", action="store_true")
    a = ap.parse_args()
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    names = load_names(root)
    found = []
    for f in a.files: found += check_text(f, a.prompts, names)
    n = Counter(x["severity"] for x in found)
    if a.json: json.dump(found, open(a.json, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    if a.line:
        print(f"WORDS fail={n['FAIL']} warn={n['WARN']} info={n['INFO']}" + (" -> fix the FAIL lines before generating" if n["FAIL"] else ""))
    else:
        for x in found:
            if x["severity"] == "INFO" and len(found) > 40: continue
            loc = f"{x['file']}:{x['line']}" if x["line"] else x["file"]
            print(f"{x['severity']:4} {loc}  [{x['rule']}] {x['text']}\n      -> {x['fix']}")
        print(f"\nWORDS  FAIL {n['FAIL']}  WARN {n['WARN']}  INFO {n['INFO']}")
    sys.exit(1 if n["FAIL"] else 0)

if __name__ == "__main__":
    main()
