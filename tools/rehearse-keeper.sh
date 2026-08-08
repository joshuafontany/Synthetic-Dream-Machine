#!/usr/bin/env bash
# rehearse-keeper — run the KEEPER founding sequence against a throwaway tree, twice, and burn it.
#
# THE GAP THIS CLOSES. `rehearse-founding.sh` stands the MESH branch — it founds vessels with `lares init`
# and witnesses Herm carry + partition. Movements ②–⑥ of the rite (persona → nexus seal → vault →
# regenesis → live) have never been run end-to-end by any harness, so the keeper branch has no green
# baseline to diff a failure against. This gives it one.
#
#   CYCLE 1  fresh tree → seed corpus → ⓪′ → ② → ③ → ④ → ⑤ → ⑥      (the rite, performed)
#   CYCLE 2  the SAME tree, re-run from the top                       (the idempotency claim, tested)
#   BURN     rm -rf the tree                                          (the clear IS the burn)
#
# ── WHY LAR_ROOT ALONE ISOLATES ──────────────────────────────────────────────────────────────────
# Every resolver roots off it — data, state, the Nexus seal, the acquired library, bags, genesis, and the
# UDS socket. Measured 2026-08-08: nine of nine isolated. So a throwaway costs one env var and destroys
# nothing real, and the container harness stays for what containers actually buy (rude sockets, real disks,
# a drop that drops).
#
# ── ONE DELIBERATE DIVERGENCE FROM THE RITE, NAMED ───────────────────────────────────────────────
# Movement ② says `lares wake --install`. That ALSO runs the mempalace library install (submodule + pip)
# and re-aims the AI-surface wires under ~/.claude — both of which write OUTSIDE LAR_ROOT. A rehearsal that
# reaches into the operator's real tooling is not a rehearsal, so this harness founds with `lares init` and
# says so. What it therefore does NOT exercise: the mempalace install leg and the harness wiring.
#
# ── THE GUARD ────────────────────────────────────────────────────────────────────────────────────
# A rehearsal harness that can eat the hearth is not a rehearsal harness. This REFUSES any root that sits
# under the operator's home, names the repo, or already carries an identity — before it writes anything.
#
# Canon: lar:///ha.ka.ba/lararium/mesh/founding-runbook

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LARES="$REPO_ROOT/packages/lares-cli/dist/src/bin/lares.js"

CYCLES=2
KEEP=0
ROOT=""
# The seed set the operator approved for throwaway runs — the two system bags plus the public plane.
# Deliberately NOT the whole corpus: a founding needs the doctrine and the public floor, and a smaller
# copy keeps a cycle cheap enough to run until it bores.
SEED_BAGS=(@lares @lararium @crossroads)

while [ $# -gt 0 ]; do
  case "$1" in
    --cycles) CYCLES="$2"; shift 2 ;;
    --root)   ROOT="$2";   shift 2 ;;
    --keep)   KEEP=1;      shift ;;
    -h|--help)
      sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
      exit 0 ;;
    *) echo "rehearse-keeper: unknown argument $1" >&2; exit 2 ;;
  esac
done

# ── The guard, before a single byte moves ────────────────────────────────────────────────────────
if [ -z "$ROOT" ]; then
  ROOT="$(mktemp -d "${TMPDIR:-/tmp}/lares-keeper-XXXXXX")"
else
  case "$ROOT" in
    "$HOME"|"$HOME"/|"$HOME"/.local*|"$HOME"/.lares*|"$REPO_ROOT"|"$REPO_ROOT"/*)
      echo "REFUSED: --root $ROOT sits under the operator's home or names the repo." >&2
      echo "  A rehearsal harness that can eat the hearth is not a rehearsal harness." >&2
      exit 3 ;;
  esac
  if [ -e "$ROOT/state/identity" ]; then
    echo "REFUSED: $ROOT already carries an identity — this harness founds from void, never over a vessel." >&2
    exit 3
  fi
  mkdir -p "$ROOT"
fi

export LAR_ROOT="$ROOT"
# A throwaway seals its vault with a throwaway secret. The rite's own ④ uses a no-echo TTY prompt; a
# harness cannot, so it supplies one and NAMES that the prompt leg goes un-exercised here.
export LARES_ARCHIVE_PASSPHRASE="rehearsal-only-$(basename "$ROOT")"

FAILED=0
CYCLE=0
say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
step() { printf '  %-46s' "$*"; }
ok()   { printf '\033[32mok\033[0m\n'; }
bad()  { printf '\033[31mFAILED (%s)\033[0m\n' "$1"; FAILED=$((FAILED + 1)); }
run()  { step "$1"; shift; if out=$("$@" 2>&1); then ok; else bad "$?"; printf '%s\n' "$out" | tail -6 | sed 's/^/      /'; fi; }
lares(){ node "$LARES" "$@"; }

cleanup() {
  # The pid file is the ONLY handle on the throwaway node. A `pkill -f` matching the root would not
  # work (LAR_ROOT rides the environment, never the command line) and a broader pattern could reach
  # the operator's REAL daemon — precisely the reach this harness exists to refuse.
  if [ -f "$ROOT/serve.pid" ]; then kill "$(cat "$ROOT/serve.pid")" 2>/dev/null || true; sleep 1; fi
  if [ "$KEEP" -eq 0 ]; then rm -rf "$ROOT"; say "BURNED $ROOT — the clear IS the burn.";
  else say "KEPT $ROOT (--keep) — burn it yourself when done."; fi
}
trap cleanup EXIT

say "rehearse-keeper — the KEEPER sequence, ${CYCLES} cycle(s), throwaway at:"
echo "  $ROOT"
echo "  founding with \`lares init\` rather than \`wake --install\`: the install leg writes OUTSIDE LAR_ROOT"
echo "  (mempalace pip + ~/.claude wires), and a rehearsal must not reach the operator's real tooling."

# ── ⓪′ PREFLIGHT — once, ahead of everything irreversible ────────────────────────────────────────
say "⓪′ preflight"
run "pnpm -r build (the dist must match its source)" sh -c "cd '$REPO_ROOT' && pnpm -r build"
run "the binary loads and answers"                    node "$LARES" help

while [ "$CYCLE" -lt "$CYCLES" ]; do
  CYCLE=$((CYCLE + 1))
  say "═══ CYCLE $CYCLE of $CYCLES ═══"

  # ── SEED THE CORPUS. LAR_ROOT isolates AND empties bags/, so a faithful run copies the approved
  #    seed set in. Re-copied each cycle so cycle 2 tests the RITE's idempotency, never a warm tree's.
  say "seed the corpus (${SEED_BAGS[*]})"
  mkdir -p "$ROOT/bags"
  for bag in "${SEED_BAGS[@]}"; do
    step "copy bags/$bag"
    if cp -r "$REPO_ROOT/bags/$bag" "$ROOT/bags/" 2>/dev/null; then ok; else bad "cp"; fi
  done
  run "copy genesis/" cp -r "$REPO_ROOT/genesis" "$ROOT/genesis"

  # ── ② FOUND ────────────────────────────────────────────────────────────────────────────────────
  say "② found — the device + the three kahu"
  run "lares init"                          lares init
  run "persona new 0 (label ⊥ Handle ⊥ seat)" lares persona new 0 --name rehearsal-0 --handle 'Kahu Alpha' --seat
  run "persona new 1"                        lares persona new 1 --name rehearsal-1 --handle 'Kahu Beta'  --seat
  run "persona new 2"                        lares persona new 2 --name rehearsal-2 --handle 'Kahu Gamma' --seat
  run "persona list reads three"             sh -c "node '$LARES' persona list | grep -q 'Kahu Gamma'"

  # ── ③ RESERVE + SEAT ───────────────────────────────────────────────────────────────────────────
  say "③ reserve — forge the pre-rotation, then seat the genesis epoch"
  step "nexus seal reserve"
  if RESERVE=$(lares nexus seal reserve 2>&1); then
    ok
    COMMIT=$(printf '%s' "$RESERVE" | grep -oE '"nextKeyCommit":"[0-9a-f]+"' | head -1 | cut -d'"' -f4)
    [ -n "$COMMIT" ] || COMMIT=$(printf '%s' "$RESERVE" | grep -oE '[0-9a-f]{64}' | head -1)
  else
    bad "$?"; printf '%s\n' "$RESERVE" | tail -6 | sed 's/^/      /'; COMMIT=""
  fi
  if [ -n "$COMMIT" ]; then
    run "nexus seal seat --next-key-commit"  lares nexus seal seat --next-key-commit "$COMMIT"
  else
    step "nexus seal seat"; bad "no commit captured from reserve"
  fi
  run "nexus seal show — the quorum STANDS"  sh -c "node '$LARES' nexus seal show | grep -q '\"quorumSeated\":true'"

  # ── ④–⑥ need the node breathing. The operator's own hand starts it; this harness runs inside the
  #    operator's invocation, so it may — but it says what it is doing, every time.
  say "④–⑥ — these need the node breathing (throwaway socket at \$LAR_ROOT/data/vessel)"
  step "lares serve (background, throwaway)"
  ( lares serve >"$ROOT/serve.log" 2>&1 & echo $! >"$ROOT/serve.pid" )
  sleep 6
  if [ -S "$ROOT/data/vessel/lares.sock" ]; then ok; else bad "no socket after 6s"; tail -8 "$ROOT/serve.log" 2>/dev/null | sed 's/^/      /'; fi

  run "④ vault seal"                        sh -c "node '$LARES' vault seal --yes"
  run "④ vault status"                      lares vault status
  run "⑤ regenesis --force"                 lares regenesis --force
  run "⑥ status — LIVE"                     lares node status
  run "bag list — declarations survive"     sh -c "node '$LARES' bag list | grep -q '@lares'"

  step "stop the throwaway node"
  if [ -f "$ROOT/serve.pid" ]; then kill "$(cat "$ROOT/serve.pid")" 2>/dev/null; sleep 2; ok; else bad "no pid"; fi
done

say "═══ RESULT ═══"
if [ "$FAILED" -eq 0 ]; then
  echo "  every movement stood, across $CYCLES cycle(s)."
  echo "  cycle 2 re-ran the rite from the top on the same tree — the idempotency claim, tested."
else
  echo "  $FAILED step(s) FAILED — read the movement above each failure; the rite names which one."
fi
exit "$FAILED"
