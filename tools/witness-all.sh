#!/usr/bin/env bash
# witness-all — run every witness, then report. Never short-circuit.
#
# Chaining them with `&&` would let a red in the first HIDE the second entirely, so a long-standing
# failure anywhere would quietly shrink the check to nothing — the same silence these witnesses exist to
# break. Each runs, each reports, and the exit is the worst of them.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
status=0
for w in typecheck-witness bcc-witness exact-deps-witness meme-coordinates-witness domain-registry-witness surface-parity-witness mirror-parity-witness frame-parity-witness frame-shape-witness rite-commands-witness round-trip-witness ahu-sections-witness authoring-witness type-parity-witness rendezvous-parity-witness rite-commands-witness doctype-witness founding-witness contract-witness; do
  echo "── $w ──"
  if ! "tools/$w.sh"; then status=1; fi
done
[ "$status" -eq 0 ] && echo "witness-all: every witness clean"
exit "$status"
