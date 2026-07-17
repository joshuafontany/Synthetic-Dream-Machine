#!/usr/bin/env bash
# crossing-witness — the civic-protocol CROSSING matrix across a real container boundary. Runs each
# scenario through docker-compose.crossing.yml (a real DaemonAuthGate daemon + a browser-shaped leaf),
# asserting the gate does the RIGHT thing: crosses the admitted, denies the rest, and lets a denied
# anon still stand whole on its own floor. The client's EXIT CODE is the verdict (0 = correct).
#
#   admitted    (X1/X5)  an admitted leaf crosses + syncs the doc both ways.
#   anon        (X2/A1)  a valid-but-ungranted leaf is denied, then founds its own island standalone.
#   impostor    (X3)     a leaf that signs with the wrong seed (forged proof) is denied.
#   wrong-bind  (X4)     a leaf binding the wrong audience is denied.
#
# Usage:  tools/crossing-witness.sh
# Meme:   lar:///ha.ka.ba/lares/api/pono/the-veil-ladder + browser-crossing

set -u
COMPOSE="docker compose -f docker-compose.crossing.yml"
PASS=0; FAIL=0; FAILED=""

run() {  # run <role> <admit-policy>
  local role="$1" admit="$2"
  echo "── scenario: ${role} (admit=${admit}) ─────────────────────────────"
  # The handshake rides a named volume that `down -v` (below) wipes between scenarios — no host cleanup.
  LAR_CROSS_ROLE="$role" LAR_CROSSING_ADMIT="$admit" \
    $COMPOSE up --abort-on-container-exit --exit-code-from crossing-client \
    2>&1 | grep -E "crossing-(client|daemon).*(✓|✗|CROSSING|DENIED|denied|admit policy|SECURITY|WHOLE)" || true
  local ec="${PIPESTATUS[0]}"
  $COMPOSE down -v >/dev/null 2>&1
  if [ "$ec" -eq 0 ]; then echo "   ✓ ${role} — the gate did the right thing"; PASS=$((PASS+1));
  else echo "   ✗ ${role} — exit ${ec}"; FAIL=$((FAIL+1)); FAILED="${FAILED} ${role}"; fi
  echo
}

echo "═══ CROSSING MATRIX — the civic-protocol gate, across containers ═══"
run admitted   from-file
run anon       none
run impostor   from-file
run wrong-bind from-file

echo "═══ RESULT: ${PASS} passed, ${FAIL} failed ═══"
if [ "$FAIL" -ne 0 ]; then echo "   failed:${FAILED}"; exit 1; fi
echo "   ✓ the crossing contract holds at the wire — pre-browser gate GREEN"
