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
# ── THE ONE DIVERGENCE LEFT, NAMED ───────────────────────────────────────────────────────────────
# `wake --install` once ALSO pip-installed the mempalace library and stood the sensorium organs — writes
# OUTSIDE LAR_ROOT that made any isolated founding impossible. Those moved to their own doors
# (`lares mempalace install`, `lares sense setup`, operator ruling 2026-08-08), so founding now stands the
# VESSEL and nothing else and this harness can run the rite AS WRITTEN.
#
# What remains outside the tree: `wake --init` still fans out to the AI-surface wires (~/.claude, ~/.codex,
# ~/.copilot). This harness therefore uses `--install`, never `--init`, and the harness-wiring leg goes
# un-exercised here — a machine-setup concern rather than a founding one.
#
# The vault seals from the env pair, so the no-echo TTY prompt leg goes un-exercised — a harness cannot type
# at a prompt. The Erisian STAMP does run (every seal records one), into a tree that burns minutes later.
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
# BOTH vars, and the pair is the point: `vault seal` mints a NEW passphrase and reads
# LARES_ARCHIVE_PASSPHRASE_NEW, while every later open reads LARES_ARCHIVE_PASSPHRASE. Exporting only the
# second is what the first rehearsal did, and the CLI said so plainly — twice, once per cycle.
export LARES_ARCHIVE_PASSPHRASE="rehearsal-only-$(basename "$ROOT")"
export LARES_ARCHIVE_PASSPHRASE_NEW="$LARES_ARCHIVE_PASSPHRASE"
# Surface where a node warning is BORN rather than only that it fired — the first rehearsal reported a
# negative setTimeout with no origin, and a warning without a stack costs more to chase than to capture.
export NODE_OPTIONS="${NODE_OPTIONS:-} --trace-warnings"
# LAR_ROOT ISOLATES THE FILESYSTEM, NOT THE PORT. Nine resolvers root off it — data, state, seal, library,
# bags, genesis, the UDS socket — and the TCP port roots off LAR_PORT alone. A throwaway on the default 8080
# collides with the operator's REAL node, which is what the first two rehearsals actually reported. The
# tenth resource needs naming too.
export LAR_PORT="${LAR_PORT:-8099}"

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
  HOLDER=$(lsof -ti ":${LAR_PORT:-8099}" 2>/dev/null | head -1)
  if [ -n "$HOLDER" ]; then kill "$HOLDER" 2>/dev/null || true; sleep 1; fi
  # SALVAGE BEFORE THE BURN, and only when something failed. A rehearsal exists to be diagnosed, and the
  # burn destroyed the one artifact that carries a diagnosis — so a red run measured twice as little as it
  # appeared to. The logs leave the tree; the identity, the seal and the keys burn with it.
  if [ "$FAILED" -gt 0 ]; then
    SALVAGE="${TMPDIR:-/tmp}/lares-keeper-salvage-$$"
    if find "$ROOT" -name '*.log' -type f 2>/dev/null | head -1 | grep -q .; then
      mkdir -p "$SALVAGE"
      find "$ROOT" -name '*.log' -type f -exec cp {} "$SALVAGE/" \; 2>/dev/null
      say "SALVAGED the boot logs to $SALVAGE — secrets stay in the tree and burn with it."
    fi
  fi
  if [ "$KEEP" -eq 0 ]; then rm -rf "$ROOT"; say "BURNED $ROOT — the clear IS the burn.";
  else say "KEPT $ROOT (--keep) — burn it yourself when done."; fi
}
trap cleanup EXIT

say "rehearse-keeper — the KEEPER sequence, ${CYCLES} cycle(s), throwaway at:"
echo "  $ROOT"
echo "  founding with \`wake --install\` — the rite AS WRITTEN. The mempalace sidecar left the boot"
echo "  (2026-08-08), so founding no longer reaches outside LAR_ROOT. Un-exercised here: the AI-surface"
echo "  wiring that still rides \`--init\`, which this harness never passes."

# ── ⓪′ PREFLIGHT — once, ahead of everything irreversible ────────────────────────────────────────
say "⓪′ preflight"
run "pnpm -r build (the dist must match its source)" sh -c "cd '$REPO_ROOT' && pnpm -r build"
run "the binary loads and answers"                    node "$LARES" help

while [ "$CYCLE" -lt "$CYCLES" ]; do
  CYCLE=$((CYCLE + 1))
  say "═══ CYCLE $CYCLE of $CYCLES ═══"

  # ── CLEAR BETWEEN CYCLES. Cycle 2 must re-run the RITE, never inherit cycle 1's warm tree and its still-
  #    running daemon — which is what the earlier runs actually measured (a 0s socket that was never
  #    re-stood). The burn IS the clear, applied per cycle.
  if [ "$CYCLE" -gt 1 ]; then
    say "clear between cycles (the rite re-runs from void, never from a warm tree)"
    step "free port $LAR_PORT + pare the tree"
    HOLDER=$(lsof -ti ":$LAR_PORT" 2>/dev/null | head -1)
    [ -n "$HOLDER" ] && { kill "$HOLDER" 2>/dev/null; sleep 2; }
    rm -rf "${ROOT:?}"/{bags,genesis,data,state,wikis} 2>/dev/null
    ok
  fi

  # ── SEED THE CORPUS. LAR_ROOT isolates AND empties bags/, so a faithful run copies the approved
  #    seed set in.
  say "seed the corpus (${SEED_BAGS[*]})"
  mkdir -p "$ROOT/bags"
  for bag in "${SEED_BAGS[@]}"; do
    step "copy bags/$bag"
    if cp -r "$REPO_ROOT/bags/$bag" "$ROOT/bags/" 2>/dev/null; then ok; else bad "cp"; fi
  done
  run "copy genesis/" cp -r "$REPO_ROOT/genesis" "$ROOT/genesis"

  # ── ② FOUND ────────────────────────────────────────────────────────────────────────────────────
  say "② found — the device + the three kahu"
  run "wake --install (founds the vessel)"   lares wake --install
  run "persona new 0 (label ⊥ Handle ⊥ seat)" lares persona new 0 --name rehearsal-0 --handle 'Kahu Alpha' --seat
  run "persona new 1"                        lares persona new 1 --name rehearsal-1 --handle 'Kahu Beta'  --seat
  run "persona new 2"                        lares persona new 2 --name rehearsal-2 --handle 'Kahu Gamma' --seat
  run "persona list reads three"             sh -c "node '$LARES' persona list | grep -q 'Kahu Gamma'"

  # ── ③ RESERVE + SEAT ───────────────────────────────────────────────────────────────────────────
  say "③ reserve — forge the pre-rotation, then seat the genesis epoch"
  # PLACEHOLDER LABELS, never real people. A guardian label names a living person, and this harness rides a
  # checked-in tree — so the flags exercise the PATH while the names stay the operator's to type at the CLI.
  # A rehearsal proves that a label reaches the card; it has no business knowing whose label it is.
  step "nexus seal reserve"
  if RESERVE=$(lares nexus seal reserve --guardian-a 'guardian-a' --guardian-b 'guardian-b' 2>&1); then
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
  # POLL TO A DEADLINE, never a fixed sleep. A cold first cycle boots empty caches and a fresh genesis; the
  # second rides what the first warmed, so a constant tuned on the warm case fails the cold one.
  # THE DEADLINE COMES FROM THE CLI'S OWN CONTRACT, never from a number this harness picked. `wake`
  # budgets 120s for the socket and says why in its source: the UDS binds LATER than `vessel-ready` and
  # later than the WS port — "on a cold boot (post-regenesis), tens of seconds later". An earlier 60s here
  # sat at HALF that budget, so two cycles reported a dead node while the node was alive and still booting;
  # the TCP port answered the whole time, which let every movement after it pass. A harness that
  # out-waits the thing it measures reports on its own patience.
  step "the node from ② answers"
  SOCK="$ROOT/data/vessel/lares.sock"
  WAKE_LOG="$ROOT/data/vessel/wake-serve.log"
  WAITED=0
  while [ ! -S "$SOCK" ] && [ "$WAITED" -lt 120 ]; do sleep 1; WAITED=$((WAITED + 1)); done
  if [ -S "$SOCK" ]; then
    printf '\033[32mok\033[0m (%ss)\n' "$WAITED"
  else
    bad "no socket after ${WAITED}s"
    # SAY WHAT THE NODE SAID. The boot log is the one artifact that answers "stalled, faulted, or slow",
    # and the burn destroys it — so it speaks HERE, while it still stands.
    if [ -f "$WAKE_LOG" ]; then
      printf '      ── wake-serve.log (tail) ──\n'
      tail -12 "$WAKE_LOG" | sed 's/^/      /'
    else
      printf '      (no wake-serve.log at %s — the node never wrote one)\n' "$WAKE_LOG"
    fi
  fi

  run "④ vault seal (NEW passphrase)"       sh -c "node '$LARES' vault seal --yes"
  run "④ vault status"                      lares vault status
  run "⑤ regenesis --force"                 lares regenesis --force
  run "⑥ status — LIVE"                     lares node status
  run "bag list — declarations survive"     sh -c "node '$LARES' bag list | grep -q '@lares'"

  # The node runs DETACHED from `wake`, so no pid file names it. Free the port by whoever holds it — scoped
  # to THIS throwaway's port, never a pattern that could reach the operator's real daemon.
  step "stop the throwaway node (port $LAR_PORT)"
  HOLDER=$(lsof -ti ":$LAR_PORT" 2>/dev/null | head -1)
  if [ -n "$HOLDER" ]; then kill "$HOLDER" 2>/dev/null; sleep 2; ok; else printf '\033[32mok\033[0m (already down)\n'; fi
done

say "═══ RESULT ═══"
if [ "$FAILED" -eq 0 ]; then
  echo "  every movement stood, across $CYCLES cycle(s)."
  echo "  cycle 2 re-ran the rite from the top on the same tree — the idempotency claim, tested."
else
  echo "  $FAILED step(s) FAILED — read the movement above each failure; the rite names which one."
fi
exit "$FAILED"
