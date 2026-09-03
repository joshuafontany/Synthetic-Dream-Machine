#!/usr/bin/env bash
# witness-all — run every witness, then report. Never short-circuit.
#
# Chaining them with `&&` would let a red in the first HIDE the second entirely, so a long-standing
# failure anywhere would quietly shrink the check to nothing — the same silence these witnesses exist to
# break. Each runs, each reports, and the exit is the worst of them.
#
# ── THE ROSTER IS GLOBBED, AND ITS EXCLUSIONS ARE NAMED ─────────────────────────────────────────
# A hand-kept list of witnesses cannot notice a witness it was never told about. Measured: this file
# named nineteen while `tools/` held twenty-five, and one of the six left out — mesh-coverage — needs
# nothing but a shell and had simply never been added, so it ran in no gate at all. A new witness now
# enrols itself by existing; leaving one out is a DECLARED act with its reason beside it.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Witnesses that stand real containers or drive a real browser. They are entry points of their own
# (`tools/civic-witness.sh`, `tools/browser-weld-witness.sh`) because they need a runtime this script
# must not assume — not because they matter less.
declare -A HELD_OUT=(
  [civic-witness]="stands containerized vessels — run it directly"
  [crossing-witness]="stands a docker-compose crossing matrix"
  [herm-mesh-witness]="stands the docker-compose relay mesh"
  [browser-weld-witness]="drives a real browser against a standing app"
  [witness-all]="this script"
)

status=0
held=()
for path in tools/*witness*.sh; do
  w="$(basename "$path" .sh)"
  if [ -n "${HELD_OUT[$w]:-}" ]; then held+=("$w — ${HELD_OUT[$w]}"); continue; fi
  echo "── $w ──"
  if ! "$path"; then status=1; fi
done

if [ "${#held[@]}" -gt 0 ]; then
  echo "── held out of this run ──"
  printf '  %s\n' "${held[@]}"
fi
[ "$status" -eq 0 ] && echo "witness-all: every witness clean"
exit "$status"
