#!/bin/bash
# mux picture + mix, then the measured gate (board profile: text is part of the design), per film
cd "$(dirname "$0")/../.."
for s in "$@"; do
  d=videos/films/$s
  ffmpeg -v error -y -i out/films/$s-video.mp4 -i $d/mix.m4a -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/films/$s.mp4
  echo "== $s"; python3 tools/quality_gate.py out/films/$s.mp4 --profile board --script $d/script.txt --speech --lang tr --allow-text --json $d/gate.json 2>&1 | tail -6
done
