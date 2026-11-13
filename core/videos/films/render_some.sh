#!/bin/bash
cd "$(dirname "$0")/../.."
for s in "$@"; do echo "== $s $(date +%T)"; npx remotion render src/index.ts Film-$s out/films/$s-video.mp4 --codec h264 --crf 16 --concurrency=4 --log=error || echo "RENDERFAIL $s"; done
