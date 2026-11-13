cd /Users/eyna/vb-test/vidbucks/core
for s in galata petek nova enflasyon kehribar culluk kahve deprem kedi curie; do
  python3 tools/media_hunt.py hunt --visuals videos/films/$s/visuals.json > videos/films/$s/hunt.log 2>&1
  echo "$s: $(grep -c candidates videos/films/$s/hunt.log) lines with candidates, $(grep -c 'no usable' videos/films/$s/hunt.log) empty"
done
