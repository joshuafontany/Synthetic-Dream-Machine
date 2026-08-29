#!/usr/bin/env bash
# mesh-scenarios — the three readings the mesh harness owes, each standing on its own.
#
# ── WHY THREE AND NOT ONE ───────────────────────────────────────────────────────────────────────
# A mesh that only ever runs whole cannot say which half broke. Two of these stand ONE operator with
# nothing to carry from — a sovereign hearth and its browser vessel, alone — so a fault there belongs
# to that operator's own boot rather than to the federation. The third stands everything and is the
# only reading that can speak about carriage at all.
#
#   operator-a   lararium-a + browser-a, PEERLESS      the founder's own setup, standing alone
#   operator-b   lararium-b + browser-b, PEERLESS      the joiner's own setup, standing alone
#   nexus        every class, wired                    hearths + herms + browsers, carrying
#
# ── HOW A LONE OPERATOR STANDS ──────────────────────────────────────────────────────────────────
# `--no-deps` withholds the herms `depends_on` would otherwise drag in, and `LAR_x_PEERS=` blanks the
# bootstrap list. `peers` filters empty away, so a vessel with none is a supported shape rather than a
# broken one — which is the point: an operator who cannot stand alone has no sovereignty to federate.
#
# The browser vessel shares its operator's network namespace, so both names ride together, always.
#
# Usage:  tools/mesh-scenarios.sh [operator-a | operator-b | nexus | all]
# Green:  every named scenario's browser vessel exits 0 and its hearth answers.
set -uo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.mesh.yml"
WANT="${1:-all}"
FAILED=0

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
step() { printf '  %-46s' "$*"; }
ok()   { printf '\033[32mok\033[0m\n'; }
bad()  { printf '\033[31mFAILED (%s)\033[0m\n' "$1"; FAILED=$((FAILED + 1)); }

# Every scenario burns its own volumes. A hearth that founded in a previous reading would let the next
# one report a founding it never performed.
#
# AND IT WAITS FOR THE TEARDOWN TO LAND. `down -v` returns before the network is released, so the next
# `up` raced it and failed — a harness fault that reads exactly like a mesh that cannot stand.
clear_all() {
  $COMPOSE down -v >/dev/null 2>&1 || true
  local deadline=$((SECONDS + 60))
  while docker network ls --format '{{.Name}}' | grep -q '^dreamnet-mesh_mesh$' && [ "$SECONDS" -lt "$deadline" ]; do
    sleep 1
  done
}

# The browser vessel is the verdict: it refuses at the floor unless the origin can actually mint, so a
# zero here means a real engine held a real secure context against that operator's own namespace.
browser_verdict() {
  local svc="$1"
  docker inspect -f '{{.State.ExitCode}}' "dreamnet-mesh-${svc}-1" 2>/dev/null || echo "absent"
}

run_operator() {          # $1 = a|b
  local who="$1" hearth="lararium-$1" browser="browser-$1"
  say "OPERATOR ${who^^} — standing alone, nothing to carry from"
  clear_all
  step "$hearth + $browser (peerless, --no-deps)"
  # The peers var for the OTHER operator stays untouched; only this one blanks.
  if env "LAR_$(echo "$who" | tr a-z A-Z)_PEERS=" \
       $COMPOSE up -d --no-deps "$hearth" "$browser" >/dev/null 2>&1; then ok; else bad "up"; return; fi

  step "the browser vessel mints at the floor"
  local code deadline=$((SECONDS + 180))
  while [ "$(browser_verdict "$browser")" = "" ] && [ "$SECONDS" -lt "$deadline" ]; do sleep 3; done
  code=$(browser_verdict "$browser")
  if [ "$code" = "0" ]; then ok; else
    bad "browser exit $code"
    $COMPOSE logs "$browser" 2>&1 | tail -6 | sed 's/^/      /'
  fi

  # POLL, NEVER READ ONCE. The browser probe exits in seconds and the hearth founds for far longer, so
  # a single read after the browser lands catches a vessel mid-boot and calls it dead. Measured: the
  # first form failed here while the log said "lighting the face" one line down.
  step "the hearth stood without a peer"
  deadline=$((SECONDS + 240))
  while ! $COMPOSE logs "$hearth" 2>&1 | grep -q "\[lararium\]" && [ "$SECONDS" -lt "$deadline" ]; do sleep 3; done
  if $COMPOSE logs "$hearth" 2>&1 | grep -q "\[lararium\]"; then ok; else
    bad "no lararium standing"
    $COMPOSE logs "$hearth" 2>&1 | tail -6 | sed 's/^/      /'
  fi
  clear_all
}

run_nexus() {
  say "NEXUS — every class, carrying"
  clear_all
  step "the whole mesh up"
  if UPLOG=$($COMPOSE up -d 2>&1); then ok; else
    bad "up"; printf '%s\n' "$UPLOG" | tail -6 | sed 's/^/      /'; return
  fi

  step "both browser vessels mint"
  local deadline=$((SECONDS + 240)) a b
  while { [ "$(browser_verdict browser-a)" = "" ] || [ "$(browser_verdict browser-b)" = "" ]; } \
        && [ "$SECONDS" -lt "$deadline" ]; do sleep 3; done
  a=$(browser_verdict browser-a); b=$(browser_verdict browser-b)
  if [ "$a" = "0" ] && [ "$b" = "0" ]; then ok; else bad "browser-a=$a browser-b=$b"; fi

  # CARRIAGE IS THE ONLY THING THIS READING ADDS. Both hearths bootstrap from a Herm, so a merge line
  # names the federation actually moving records rather than two vessels standing near each other.
  # ⚠ THIS STEP CURRENTLY FAILS, AND IT IS REPORTING A REAL FAULT.
  # On a cold seven-service mesh ONE of the two hearths loses the `@daemon` resolve race and exits —
  # which one varies between runs, and raising `on-failure` from 3 to 8 did not settle it. `herm-relay-2`
  # loses the same way. The lone-operator scenarios above stand green, so the fault belongs to the COLD
  # START ORDER rather than to either operator's boot: a hearth starts when its herm's container starts,
  # and a started herm is not yet a carrying one. The cure is a readiness condition, not more retries.
  #
  # POLL. Carriage runs on its own cadence, well after the browsers have exited — a single read here
  # times the harness rather than the federation.
  step "the hearths carry from the herm"
  deadline=$((SECONDS + 240))
  while ! $COMPOSE logs lararium-a lararium-b 2>&1 | grep -q "carriage: merged" && [ "$SECONDS" -lt "$deadline" ]; do
    sleep 5
  done
  if $COMPOSE logs lararium-a lararium-b 2>&1 | grep -q "carriage: merged"; then ok; else
    bad "no carriage"
    $COMPOSE logs lararium-a 2>&1 | tail -5 | sed 's/^/      /'
  fi
  clear_all
}

case "$WANT" in
  operator-a) run_operator a ;;
  operator-b) run_operator b ;;
  nexus)      run_nexus ;;
  all)        run_operator a; run_operator b; run_nexus ;;
  *) echo "mesh-scenarios: unknown scenario \"$WANT\" (operator-a | operator-b | nexus | all)" >&2; exit 2 ;;
esac

say "═══ RESULT ═══"
if [ "$FAILED" -eq 0 ]; then
  echo "  every scenario stood: each operator alone, and the mesh carrying."
  exit 0
fi
echo "  $FAILED step(s) FAILED — a lone-operator failure belongs to that boot, never to the federation."
exit 1
