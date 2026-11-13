#!/usr/bin/env python
"""mix_film.py - voice + effects + optional music into one master: compressed voice, music ducked under it, two-pass loudnorm.

  python tools/mix_film.py --voice narration.wav --sfx sfx.wav [--music score.wav] --out mix.m4a [--lufs -16] [--lead 0.15]
                           [--sfx-db -4] [--music-db -6] [--duck 10]

Voice: high-pass 70 Hz, gentle compression, placed at --lead. Music: side-chain ducked by the voice (~--duck dB) so it
swells in the gaps. Effects ride on top. The whole mix is measured, then normalised to --lufs with a -1.5 dBTP ceiling
(ffmpeg loudnorm, two passes), so nothing pumps. --stems also writes the ducked music for checking its level."""
import argparse, json, re, subprocess

ap = argparse.ArgumentParser()
ap.add_argument("--voice", required=True); ap.add_argument("--sfx"); ap.add_argument("--music"); ap.add_argument("--out", required=True)
ap.add_argument("--lufs", type=float, default=-16); ap.add_argument("--lead", type=float, default=0.0)
ap.add_argument("--sfx-db", type=float, default=-4); ap.add_argument("--music-db", type=float, default=-6); ap.add_argument("--duck", type=float, default=10)
a = ap.parse_args()

ins = ["-i", a.voice] + (["-i", a.sfx] if a.sfx else []) + (["-i", a.music] if a.music else [])
ms = int(a.lead * 1000)
f = [f"[0:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,adelay={ms}|{ms}[v0]"]
mixin = ["[v]"]; k = 1
if a.sfx:
    f.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,volume={a.sfx_db}dB[s]"); mixin.append("[s]"); k += 1
if a.music:
    f.append("[v0]asplit=2[v][vk]")
    f.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,volume={a.music_db}dB[m0]")
    ratio = max(2, a.duck / 2)
    f.append(f"[m0][vk]sidechaincompress=threshold=0.03:ratio={ratio}:attack=40:release=400[m]"); mixin.append("[m]")
if not a.music: f.append("[v0]anull[v]")
f.append(f"{''.join(mixin)}amix=inputs={len(mixin)}:normalize=0:duration=longest[mx]")
graph = ";".join(f)


def run(extra_filter, out, pre=False):
    cmd = ["ffmpeg", "-v", "info" if pre else "error", "-y", *ins, "-filter_complex", graph + ";[mx]" + extra_filter + "[o]", "-map", "[o]"]
    cmd += ["-f", "null", "-"] if pre else ["-c:a", "aac", "-b:a", "256k", out]
    return subprocess.run(cmd, capture_output=True, text=True)


r = run(f"loudnorm=I={a.lufs}:TP=-1.5:LRA=11:print_format=json", None, pre=True)
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S).group(0))
second = (f"loudnorm=I={a.lufs}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,alimiter=limit=0.84:level=false")
r2 = run(second, a.out)
if r2.returncode: raise SystemExit(r2.stderr[-800:])
print(f"mix: {a.out} (measured {float(m['input_i']):.2f} LUFS -> {a.lufs})")
