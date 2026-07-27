#!/usr/bin/env bash
# rehearse-founding — the REHEARSAL branch of the founding rite, run as a repeatable cycle.
#
# The rite forks (founding-runbook#the-rite): a KEEPER founding runs once, irreversibly, on the real
# hearth; a REHEARSAL founding runs in containers, disposably, as many times as it takes. This script
# stands the rehearsal branch, and the burn IS the clear — where the keeper branch opens on `rm -rf`,
# this one opens on a command whose whole virtue reads repeatable.
#
#   BURN → FOUND → WITNESS carry → WITNESS partition → BURN,  × CYCLES
#
# Each container mints its OWN identity in-container (tools/lararium-container-boot.sh → `lares init`),
# so every cycle founds genuinely fresh sovereign hearths — never a restored snapshot of a prior run.
#
# WHAT A CYCLE WITNESSES (each by exit code, no metaphysics):
#   · FOUND      three vessels found from void and serve — a full Lararium + two Herm crossroads.
#   · CARRY      the source Herm's announced dial crosses source → relay-1 → relay-2, DECODED and
#                signature-verified at each hop (herm-mesh-witness.mjs — a plaintext grep of the
#                Automerge-saved snapshot could never match, so the witness reads through a real client).
#   · PARTITION  relay-1 is CUT. relay-2's only configured peer dies, yet its pointer keeps ADVANCING
#                while still carrying the dial — proving it learned the source's endpoint from the
#                carried dial and now pulls DIRECTLY. Federation rides carried dials, never a
#                hardcoded peer list. Then relay-1 returns and the mesh restores.
#
# WHAT A CYCLE DOES NOT WITNESS — stated so a green run never reads as more than it proves:
#   · two OS hosts (this runs containers on one kernel, one clock, one disk).
#   · the browser vessel, the secure-context wall, or any glass surface.
#   · remote @cad CAS transit to a holder outside this process tree (#83 stays field-open).
#   · bilateral genesis between two operator-sovereign hearths signing each other in.
#   · a CONTRACTED founding (a vessel standing under a root it does not hold).
#
# THE RUN AMENDS THE RITE, never the reverse. Where a cycle contradicts a movement in
# founding-runbook, the run wins and the movement gets rewritten. The rite earns `status = live` only
# after a rehearsal completes end-to-end without an amendment.
#
# Usage:
#   tools/rehearse-founding.sh              # 2 cycles, burn after each
#   CYCLES=5 tools/rehearse-founding.sh     # run until it bores
#   KEEP=1 tools/rehearse-founding.sh       # leave the final mesh standing for inspection
#
# Prereq: the host builds first (`pnpm -r build`) — the containers trust the mounted dist.
# Meme: lar:///ha.ka.ba/lararium/mesh/founding-runbook#rehearse

set -u

CYCLES="${CYCLES:-2}"
KEEP="${KEEP:-0}"
COMPOSE_FILE="docker-compose.mesh.yml"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGDIR="$(mktemp -d)"
cd "$ROOT" || exit 1

green=0; red=0; FAILED_CYCLES=""

say()  { printf "%s\n" "$*"; }
rule() { say "═══════════════════════════════════════════════════════════════"; }

burn() {  # burn — the rehearsal's clear. Idempotent: a mesh that never stood burns clean.
  docker compose -f "$COMPOSE_FILE" down -v >/dev/null 2>&1 || true
}

step() {  # step <label> <log> <command...> — run, capture, report, return the command's exit code
  #
  # CAPTURE THE STATUS BEFORE ANY BRANCH. An `if cmd; then …; fi` whose condition FAILS and carries no
  # `else` yields status 0 for the whole statement, so a `$?` read AFTER it reports the IF, never the
  # command — which turns a failing step into a silent pass. This runner shipped that bug on its first
  # flight: both witnesses failed and it declared `cycles green: 1/1`. Run, capture, THEN branch.
  local label="$1" log="$2"; shift 2
  printf "   %-26s " "$label"
  local t0 t1 ec
  t0=$(date +%s)
  "$@" >"${LOGDIR}/${log}.log" 2>&1
  ec=$?                                   # ← immediately, before any control flow
  t1=$(date +%s)
  if [ "$ec" -eq 0 ]; then
    say "✓ ($((t1 - t0))s)"; return 0
  fi
  say "✗ exit ${ec} ($((t1 - t0))s)"
  grep -iE "✗|fail|fatal|error|refus" "${LOGDIR}/${log}.log" | tail -4 | sed 's/^/        /'
  return "$ec"
}

self_test() {  # prove the detector DETECTS — an instrument that cannot fail certifies nothing
  #
  # The house method, turned on this runner: force a step to fail and assert the runner reports it.
  # A green suite whose detector cannot go red measures the detector's silence, never the system.
  local out
  out="$(step "self-test (must fail)" "selftest" sh -c 'exit 3' 2>&1)"; local got=$?
  printf "   %-26s " "self-test"
  if [ "$got" -eq 3 ] && printf "%s" "$out" | grep -q "✗ exit 3"; then
    say "✓ the detector detects (a failing step returns 3 and prints ✗)"; return 0
  fi
  say "✗ THE DETECTOR IS BLIND — a failing step reported ${got}. Every verdict below reads void."
  return 1
}

# ── PREFLIGHT — the two things a cycle cannot supply for itself ───────────────────────────────────
rule; say "  REHEARSAL FOUNDING — the rite's ⓪ movement, ${CYCLES} cycle(s)"; rule

if ! command -v docker >/dev/null 2>&1; then
  say "✗ PREFLIGHT: docker absent — the rehearsal branch needs it. (The rite's keeper branch does not.)"
  exit 2
fi
if ! docker compose version >/dev/null 2>&1; then
  say "✗ PREFLIGHT: 'docker compose' unavailable (v2 plugin missing?)."
  exit 2
fi
if [ ! -f "packages/lares-cli/dist/src/bin/lares.js" ] || [ ! -f "packages/lararium-node/dist/src/main.js" ]; then
  say "✗ PREFLIGHT: host dist absent — the containers trust the mounted build."
  say "             run: pnpm -r build"
  exit 2
fi
say "   preflight                  ✓ docker + host dist stand"
self_test || exit 2
say ""

# ── THE CYCLE ─────────────────────────────────────────────────────────────────────────────────────
c=1
while [ "$c" -le "$CYCLES" ]; do
  say "── cycle ${c}/${CYCLES} ──────────────────────────────────────────────"
  ok=1

  burn                                                   # start from void, every cycle
  step "found (3 vessels, void)" "found-${c}" \
       docker compose -f "$COMPOSE_FILE" up -d || ok=0

  if [ "$ok" -eq 1 ]; then
    step "witness: carry" "carry-${c}"     node tools/herm-mesh-witness.mjs   || ok=0
  fi
  if [ "$ok" -eq 1 ]; then
    step "witness: partition" "part-${c}"  node tools/herm-mesh-partition.mjs || ok=0
  fi

  if [ "$c" -lt "$CYCLES" ] || [ "$KEEP" != "1" ]; then
    step "burn" "burn-${c}" bash -c 'docker compose -f '"$COMPOSE_FILE"' down -v'
  else
    say "   (mesh left standing — KEEP=1)"
  fi

  if [ "$ok" -eq 1 ]; then
    green=$((green + 1)); say "   cycle ${c}: GREEN"
  else
    red=$((red + 1)); FAILED_CYCLES="${FAILED_CYCLES} ${c}"; say "   cycle ${c}: RED"
  fi
  say ""
  c=$((c + 1))
done

# ── THE VERDICT ───────────────────────────────────────────────────────────────────────────────────
rule
say "  cycles green: ${green}/${CYCLES}"
if [ "$red" -gt 0 ]; then
  say "  cycles red:  ${red} →${FAILED_CYCLES}"
  say "  logs:        ${LOGDIR}"
  rule
  say "  A RED CYCLE AMENDS THE RITE. Read the log, then rewrite the movement it contradicts"
  say "  (founding-runbook) — the run wins, never the document."
  exit 1
fi
rule
say "  Every cycle founded from void, carried the dial through two hops with the signature"
say "  verified at each, survived the relay cut on a learned dial, and burned clean."
say ""
say "  BOUND, stated: one kernel · one clock · one disk. No second OS host, no browser vessel,"
say "  no remote @cad transit, no bilateral genesis, no CONTRACTED founding. A green rehearsal"
say "  buys confidence in the SEQUENCE, never in the field."
say ""
say "  next: repeat until it bores (CYCLES=…) — boredom names the readiness the keeper needs."
rule
exit 0
