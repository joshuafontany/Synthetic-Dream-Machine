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

# DOES A SERVICE'S LOG CARRY THIS LINE — and why this is never a bare `grep -q`.
#
# `set -o pipefail` + `grep -q` over a LONG producer is a trap: `grep -q` exits at the FIRST match and
# closes the pipe, the producer takes SIGPIPE and returns non-zero, and the pipeline reads as FAILURE
# precisely when the pattern MATCHED. Measured: a hearth that had stood in 13 seconds reported "never
# stood", and the failure dump printed the very line the check was looking for.
#
# IT BITES BY OUTPUT SIZE, WHICH IS WHY IT READS AS A FLAKE. A short log finishes before grep exits and
# the pipeline passes; the same check over a longer log fails. Every wait here reads a container log
# that grows with the run, so "intermittent" is the shape this bug wears.
#
# `grep -c` reads its input to the end, so nothing is signalled and the count is the answer. A short
# producer (`printf` into grep) is unaffected and stays as it is.
logs_have() {
  local pattern="$1"; shift
  local n
  n=$($COMPOSE logs "$@" 2>&1 | grep -cF "$pattern")
  [ "${n:-0}" -gt 0 ]
}

# WHETHER A HEARTH'S VERB SOCKET ANSWERS — which is not the same as having stood.
#
# `[lararium]` in the log proves the boot printed; it does not prove the UDS verb-channel is taking
# calls. Measured: a scenario that trusted the log line fired three verbs into a socket that was not
# yet listening, and read the empty results as failures of the thing it was testing.
#
# The founding rite carries the same law for its own LIVE movement — "⑥ ASSERTS BY CONNECTING, never
# by inspecting" — because local facts (a file, a port, a log line) all read true while the vessel
# answers nothing.
# THE PROBE MUST CROSS THE SOCKET. A first draft used `vessel read` — "the pure inspection that starts
# nothing", which reads local files and answers true while the verb channel is still deaf. The probe
# rides a DAEMON-ROUTED verb, so a pass means a verb actually completed.
answers() {
  $COMPOSE exec -T "$1" node packages/lares-cli/dist/src/bin/lares.js bag stats --json >/dev/null 2>&1
}

# Wait until a hearth both STANDS and ANSWERS. Either alone is a half-truth.
up_and_answering() {
  local svc="$1" deadline=$(( SECONDS + ${2:-300} ))
  while ! { stood "$svc" && answers "$svc"; } && [ "$SECONDS" -lt "$deadline" ]; do sleep 3; done
  stood "$svc" && answers "$svc"
}

# whether a hearth has stood — the boot line every lararium prints.
stood() { logs_have "[lararium]" "$1"; }

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
  while ! stood "$hearth" && [ "$SECONDS" -lt "$deadline" ]; do sleep 3; done
  if stood "$hearth"; then ok; else
    bad "no lararium standing"
    $COMPOSE logs "$hearth" 2>&1 | tail -6 | sed 's/^/      /'
  fi
  clear_all
}

# ── THE QUORUM SCENARIO ─────────────────────────────────────────────────────────────────────────
# A HEARTH THAT CARRIES IS NOT YET A HEARTH THAT TENDS. Every reading above proves motion — browsers
# mint, hearths stand, records merge — and none of them proves that a founding operator seated the
# kahu who govern the Nexus those records cross. A mesh can be fully green with no quorum anywhere.
#
# The roster forms from what STOOD: a persona that declared a Handle AND took a chair. So this reads
# the seal's own show, not a persona count — three faces that never sat leave an empty roster while
# `persona list` reads three, and that gap is exactly what the reading is for.
# COVERS: private/seed/unfed
run_quorum() {
  say "QUORUM — the founding kahu seat, and the seal reads them"
  clear_all
  step "lararium-a up, alone"
  if LAR_A_PEERS= $COMPOSE up -d --no-deps lararium-a >/dev/null 2>&1; then ok; else bad "up"; return; fi

  step "the hearth stands"
  local deadline=$((SECONDS + 240))
  while ! stood lararium-a && [ "$SECONDS" -lt "$deadline" ]; do sleep 3; done
  if stood lararium-a; then ok; else bad "no lararium standing"; clear_all; return; fi

  # THE SEAL'S OWN WORD. `nexus seal show` reports the seated roster and the threshold derived from
  # it — majority over what stood. A hearth with no cabal answers honestly and names nobody.
  step "the seal reads a seated quorum"
  local SHOW
  SHOW=$($COMPOSE exec -T lararium-a node packages/lares-cli/dist/src/bin/lares.js nexus seal show --json 2>&1)
  # ASSERT THE SEATS, NOT ONLY THE THRESHOLD. Majority over TWO is also two, so a threshold check
  # alone passed a roster that had silently lost a chair. The count of seated keys is what names the
  # roster; the threshold is what derives from it.
  # AND THE QUORUM MUST SURVIVE A LOSS. Three chairs over a threshold of two tolerate one seat going
  # dark; two over two tolerate none, and lock the Nexus the day one is lost — including for the
  # rotation that would repair it. A civic roster that cannot lose a kahu is not seated, it is armed.
  if printf '%s' "$SHOW" | grep -q '"seatedKeys":3' \
     && printf '%s' "$SHOW" | grep -q '"threshold":2' \
     && printf '%s' "$SHOW" | grep -q '"fragile":false'; then ok; else
    bad "no quorum seated"
    printf '%s\n' "$SHOW" | tail -3 | sed 's/^/      /'
  fi
  clear_all
}

# ── THE RELATION SCENARIO ───────────────────────────────────────────────────────────────────────
# EVERY READING ABOVE PROVES STANDING AND CARRYING — vessels up, browsers minting at the floor,
# hearths merging from a Herm. None of them proves two operators entering a RELATION, which is the
# act a Nexus IS: "the Nexus begins when a second operator contracts in" (genesis-doc's keeper
# ladder). A hearth that seats its own quorum and never contracts stands a SEED, however green.
#
# The charter travels by its own doors here rather than by `cp` — `seal export` hands A's public
# material over, `seal import` places it on B, refusing to land on a founding. That is the handoff
# the runbook instructs ("B cannot consent to a charter it has never seen"), performed rather than
# simulated.
# ── THE REALM AXIS ──────────────────────────────────────────────────────────────────────────────
# A REALM IS CONSTITUTED BY FEEDING, never created — "the first offering IS the founding of the realm,
# never a step after it". Nothing in this harness has ever fed one, so `realmStanding` has run only in
# unit tests and the `cabal feed` / `cabal clock` doors have never been walked in a container.
#
# The reading it proves is the one that must NOT over-claim: one face feeding is a VISIT, and several
# faces of ONE operator are MANY-FACES rather than a mutual hold — the slots carry faces, and a human
# running several of their own reads as the Sybil-of-one this plane prices socially.
# ── THE OPEN POSTURE ────────────────────────────────────────────────────────────────────────────
# POSTURE IS THE ONE-WAY, LEAST-GATED ACT IN THE DESIGN: `cap-tier` makes loosening a ratchet that
# runs one way under no-global-now, and nothing but the operator's hand gates the flip. It had never
# been walked in a container, so the claim that it "applies on a node bounce" stood untested.
#
# WHAT THIS PROVES is narrow on purpose: the flip lands in the charter, SURVIVES a bounce, and moves
# NOTHING else — the phase still reads what the relations say. Posture governs what the public shelf
# CARRIES; it never admits an operator, and a scenario that let those two blur would teach the wrong
# thing about the least-reversible act here.
# COVERS: open/seed/unfed
run_open() {
  say "OPEN — the posture flips, survives a bounce, and moves nothing else"
  clear_all
  local LARES="node packages/lares-cli/dist/src/bin/lares.js"

  step "lararium-a up, alone"
  if LAR_A_PEERS= $COMPOSE up -d --no-deps lararium-a >/dev/null 2>&1; then ok; else bad "up"; return; fi

  step "the hearth stands AND answers"
  if up_and_answering lararium-a; then ok; else
    bad "no lararium answering"; $COMPOSE logs lararium-a 2>&1 | tail -4 | sed 's/^/      /'; clear_all; return
  fi

  # FAIL-CLOSED IS THE DEFAULT, and it earns an assertion: a Nexus develops in isolation until the
  # operator opens it, so a harness that only ever saw `open` could not tell a default from a flip.
  step "posture reads PRIVATE by default"
  if $COMPOSE exec -T lararium-a $LARES nexus posture --json 2>&1 | grep -q '"posture":"private"'; then ok
  else bad "the default was not private"; fi

  step "the flip lands in the charter"
  if $COMPOSE exec -T lararium-a $LARES nexus posture open --json 2>&1 | grep -q '"posture":"open"'; then ok
  else bad "the flip did not land"; fi

  # THE CLAIM THE DOOR MAKES — "a node bounce applies it" — and nothing had tested it.
  step "OPEN survives a node bounce"
  $COMPOSE restart lararium-a >/dev/null 2>&1
  if up_and_answering lararium-a \
     && $COMPOSE exec -T lararium-a $LARES nexus posture --json 2>&1 | grep -q '"posture":"open"'; then ok
  else bad "the posture did not survive the bounce"; fi

  step "and the phase is UNMOVED — posture carries, it never admits"
  if $COMPOSE exec -T lararium-a $LARES nexus seal show --json 2>&1 | grep -q '"phase":{"phase":"seed"'; then ok
  else bad "opening the posture moved the phase"; fi
  clear_all
}

# COVERS: private/seed/visit
# COVERS: private/seed/many-faces
run_realm() {
  say "REALM — fed once is a visit; fed by a second face is many-faces, never belonging"
  clear_all
  local LARES="node packages/lares-cli/dist/src/bin/lares.js"
  local REALM; REALM=$(printf 'a%.0s' $(seq 1 64))

  step "lararium-a up, alone"
  if LAR_A_PEERS= $COMPOSE up -d --no-deps lararium-a >/dev/null 2>&1; then ok; else bad "up"; return; fi

  step "the hearth stands AND answers"
  if up_and_answering lararium-a; then ok; else
    bad "no lararium answering"
    $COMPOSE logs lararium-a 2>&1 | tail -4 | sed 's/^/      /'; clear_all; return
  fi

  step "an unfed realm reads UNFED"
  if $COMPOSE exec -T lararium-a $LARES cabal clock --realm "$REALM" --json 2>&1 \
     | grep -q '"standing":"unfed"'; then ok; else
    bad "an unfed realm did not read unfed"
    $COMPOSE exec -T lararium-a $LARES cabal clock --realm "$REALM" --json 2>&1 | tail -2 | sed 's/^/      /'
  fi

  step "ONE face feeds — a VISIT, and depth changes nothing"
  $COMPOSE exec -T lararium-a $LARES cabal feed --realm "$REALM" --as 0 >/dev/null 2>&1
  $COMPOSE exec -T lararium-a $LARES cabal feed --realm "$REALM" --as 0 >/dev/null 2>&1
  if $COMPOSE exec -T lararium-a $LARES cabal clock --realm "$REALM" --json 2>&1 \
     | grep -q '"standing":"visit"'; then ok; else bad "one face twice did not read as a visit"; fi

  # THE READING THAT MUST NOT OVER-CLAIM. A second FACE of the same operator is a second writer id
  # and not a second hand; naming it belonging would manufacture the reciprocity the model requires
  # be earned.
  step "a SECOND face feeds — MANY-FACES, and never belonging"
  $COMPOSE exec -T lararium-a $LARES cabal feed --realm "$REALM" --as 1 >/dev/null 2>&1
  local CLK
  CLK=$($COMPOSE exec -T lararium-a $LARES cabal clock --realm "$REALM" --json 2>&1)
  if printf '%s' "$CLK" | grep -q '"standing":"many-faces"' \
     && ! printf '%s' "$CLK" | grep -q '"standing":"belonging"'; then ok; else
    bad "the second face did not read as many-faces"
    printf '%s\n' "$CLK" | tail -2 | sed 's/^/      /'
  fi
  clear_all
}

# COVERS: private/multisig/unfed
run_relation() {
  say "RELATION — two operators contract, and the phase moves off SEED"
  clear_all
  step "both hearths up, peerless"
  if LAR_A_PEERS= LAR_B_PEERS= $COMPOSE up -d --no-deps lararium-a lararium-b >/dev/null 2>&1; then ok
  else bad "up"; return; fi

  step "both hearths stand"
  local deadline=$((SECONDS + 300))
  while ! { stood lararium-a && stood lararium-b; } && [ "$SECONDS" -lt "$deadline" ]; do sleep 3; done
  if stood lararium-a && stood lararium-b; then ok
  else
    # A STEP THAT REFUSES MUST SHOW ITS EVIDENCE. A bare verdict here sent three runs chasing the
    # wait loop while the cause sat in the boot log.
    bad "a hearth never stood"
    for s in lararium-a lararium-b; do
      printf '      --- %s\n' "$s"; $COMPOSE logs "$s" 2>&1 | tail -4 | sed 's/^/      /'
    done
    clear_all; return
  fi

  # A HEARTH THAT SEATED ITS OWN QUORUM IS STILL A SEED. This is the reading the whole scenario
  # exists to move, so it gets asserted BEFORE the contract as well as after — a phase that read
  # "multisig" here would mean the reading, not the relation, had done the work.
  step "A stands a SEED before any relation"
  local LARES="node packages/lares-cli/dist/src/bin/lares.js"
  if $COMPOSE exec -T lararium-a $LARES nexus seal show --json 2>&1 | grep -q '"phase":{"phase":"seed"'; then ok
  else bad "A did not read as a seed"; fi

  step "A's charter travels to B by its own doors"
  local CHARTER
  CHARTER=$($COMPOSE exec -T lararium-a $LARES nexus seal export --no-json 2>/dev/null)
  if [ -z "$CHARTER" ]; then bad "A exported no charter"; clear_all; return; fi
  if printf '%s' "$CHARTER" | $COMPOSE exec -T lararium-b sh -c 'cat > /tmp/a-charter.mem' \
     && $COMPOSE exec -T lararium-b $LARES nexus seal import /tmp/a-charter.mem >/dev/null 2>&1; then ok
  else bad "B could not take A's charter"; fi

  step "B signs her contract-in, A's quorum admits her"
  local NYM SIG ACC
  ACC=$($COMPOSE exec -T lararium-b $LARES nexus accept-carriage --json 2>/dev/null)
  NYM=$(printf '%s' "$ACC" | grep -oE '"nym":"[a-f0-9]{64}"' | head -1 | cut -d'"' -f4)
  SIG=$(printf '%s' "$ACC" | grep -oE '"contractSig":"[a-f0-9]+"' | head -1 | cut -d'"' -f4)
  if [ -z "$NYM" ] || [ -z "$SIG" ]; then
    bad "B minted no contract-in"; printf '%s\n' "$ACC" | tail -2 | sed 's/^/      /'; clear_all; return
  fi
  if $COMPOSE exec -T lararium-a $LARES nexus contract "$NYM" --sig "$SIG" >/dev/null 2>&1; then ok
  else bad "A's quorum refused the admit"; fi

  # THE READING THE SCENARIO EXISTS FOR. A relation stands, so the phase leaves SEED — and the
  # members board folds a key A has never held.
  step "the phase leaves SEED — a Nexus stands"
  if $COMPOSE exec -T lararium-a $LARES nexus seal show --json 2>&1 | grep -q '"isNexus":true'; then ok
  else bad "the phase never moved off seed"; fi

  step "A's members board folds B IN"
  if $COMPOSE exec -T lararium-a $LARES nexus members --list 2>&1 | grep -qi "$NYM"; then ok
  else bad "B never landed on the board"; fi
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
  # ⚠ THIS STEP IS INTERMITTENT, and the flake is the finding.
  # Measured 2 green in 3 runs after the catalog-pointer fix, against 0 in 3 before it — so that fix
  # reached this and did not close it. What remains: on a cold seven-service mesh a hearth can still
  # lose the `@daemon` resolve, and which one varies. Raising `on-failure` from 3 to 8 changed nothing,
  # so it is not patience. The lone-operator scenarios above stay green, which places the residue in the
  # COLD START ORDER — a hearth starts when its herm's CONTAINER starts, and a started herm is not yet a
  # carrying one. A readiness condition is the open cure.
  #
  # A red here is worth re-running once before chasing: this step reports a race, and a race reports
  # itself differently each time.
  #
  # POLL. Carriage runs on its own cadence, well after the browsers have exited — a single read here
  # times the harness rather than the federation.
  step "the hearths carry from the herm"
  deadline=$((SECONDS + 240))
  while ! logs_have "carriage: merged" lararium-a lararium-b && [ "$SECONDS" -lt "$deadline" ]; do
    sleep 5
  done
  if logs_have "carriage: merged" lararium-a lararium-b; then ok; else
    bad "no carriage"
    $COMPOSE logs lararium-a 2>&1 | tail -5 | sed 's/^/      /'
  fi
  clear_all
}

case "$WANT" in
  operator-a) run_operator a ;;
  operator-b) run_operator b ;;
  nexus)      run_nexus ;;
  quorum)     run_quorum ;;
  relation)   run_relation ;;
  realm)      run_realm ;;
  open)       run_open ;;
  all)        run_operator a; run_operator b; run_quorum; run_relation; run_realm; run_open; run_nexus ;;
  *) echo "mesh-scenarios: unknown scenario \"$WANT\" (operator-a | operator-b | nexus | quorum | relation | realm | open | all)" >&2; exit 2 ;;
esac

say "═══ RESULT ═══"
if [ "$FAILED" -eq 0 ]; then
  echo "  every scenario stood: each operator alone, and the mesh carrying."
  exit 0
fi
echo "  $FAILED step(s) FAILED — a lone-operator failure belongs to that boot, never to the federation."
exit 1
