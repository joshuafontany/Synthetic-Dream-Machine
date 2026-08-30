#!/usr/bin/env bash
# rehearse-keeper — run the KEEPER founding sequence against a throwaway tree, twice, and burn it.
#
# WHAT IT COVERS. `rehearse-founding.sh` stands the MESH branch — it founds vessels with `lares vessel found` and
# witnesses Herm carry + partition. This one stands the KEEPER branch: movements ②–⑥ of the rite (persona →
# nexus seal → vault → seed → live), end to end, so a failure has a green baseline to diff against.
#
# It exists because the keeper founding runs ONCE, irreversibly, on the real hearth. Every property it can
# be made to prove cheaply here is a property nobody has to discover there.
#
#   CYCLE 1  fresh tree → seed corpus → ⓪′ → ② → ③ → ④ → ⑤ → ⑥      (the rite, performed)
#   CYCLE 2  the SAME tree, re-run from the top                       (the idempotency claim, tested)
#   BURN     rm -rf the tree                                          (the clear IS the burn)
#
# ── WHY LAR_ROOT ALONE ISOLATES ──────────────────────────────────────────────────────────────────
# Every resolver roots off it — the vessel store, the identity, the Nexus seal, the acquired library, the
# repo registry, the hearth bags, genesis, the watermarks, the config, the runtime spool, the social
# bootstrap and the UDS socket — TWELVE of twelve, measured. So a throwaway costs one env var and destroys
# nothing real, and the container harness stays for what containers actually buy (rude sockets, real disks,
# a drop that drops).
#
# RE-MEASURE THE COUNT WHENEVER A RESOLVER MOVES, never carry it forward. An isolation claim that ages is
# an isolation claim that lies — a resource added or re-homed after the last count sits outside the
# isolation while the header still promises it, and the TCP port was found exactly that way.
#
# ── WHAT THIS HARNESS DOES NOT WALK, NAMED ───────────────────────────────────────────────────────
# FOUNDING STANDS THE VESSEL AND NOTHING ELSE, which is what makes an isolated rehearsal possible at all: a
# founding that reached outside LAR_ROOT could never be rehearsed without touching the operator's machine.
# The two sidecar lanes carry their own doors (`lares mempalace install`, `lares sense setup`).
#
# `lares vessel stand --init` fans out to the AI-surface wires (`lares vessel wire` is that act's own
# door), so this harness passes
# `--install` and never `--init` — the wiring leg stays un-walked, a machine-setup concern rather than a
# founding one.
#
# The vault seals from _NEW rather than a typed secret, so the no-echo TTY prompt stays un-walked — a
# harness cannot type at a prompt, and a keeper founding meets that leg for the first time on the day it
# matters. Everything AROUND the prompt does get walked: the archive founds unsealed, ④ performs a real
# seal, and the base var arrives only afterward, so ⑤ meets the same boot gate an operator will. The
# Erisian STAMP runs too (every seal records one), into a tree that burns minutes later.
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
SEED_BAGS=(lares lararium crossroads)

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
  # THE SOVEREIGN ROOT STANDS IN THE SPIRITS' HOUSE, beside the seal — a Lar's keys ARE that Lar, so no
  # rite re-makes them. Under LAR_ROOT each directory names an XDG kind and the two houses nest inside
  # the data kind, so identity sites at `<root>/data/lares/identity`. This guard must name that exact
  # address: a probe one segment short finds nothing and waves a founded vessel straight through.
  if [ -e "$ROOT/data/lares/identity" ]; then
    echo "REFUSED: $ROOT already carries an identity — this harness founds from void, never over a vessel." >&2
    exit 3
  fi
  mkdir -p "$ROOT"
fi

export LAR_ROOT="$ROOT"
# THE TWO VARS ANSWER DIFFERENT QUESTIONS, AND THE ORDER BETWEEN THEM IS THE RITE'S.
#   _NEW  — "the passphrase to move TO". Read by ONE place: the vault verbs that write one
#           (seal · rotate · export · repair). A CLI-only input.
#   base  — "the passphrase that OPENS this vault". Read by the whole system: it decides whether the
#           archive seals AT ALL (resolveSealPolicy), and a sealed vessel refuses to boot without it
#           (assertSealReady). It is the vessel's operating condition, never a command's argument.
#
# So only _NEW rides from the start. Exporting the base HERE would seal the archive during founding,
# leaving ④ with nothing to do — a movement reporting green over a no-op — and would carry ⑤ past the
# boot gate the keeper founding actually meets. The base gets exported AFTER ④ seals, exactly where the
# rite tells an operator to export it.
PASS_DRILL="rehearsal-only-$(basename "$ROOT")"
export LARES_ARCHIVE_PASSPHRASE_NEW="$PASS_DRILL"
# Surface where a node warning is BORN rather than only that it fired. A negative-timeout warning with no
# origin costs far more to chase than to capture, and the capture is one env var.
export NODE_OPTIONS="${NODE_OPTIONS:-} --trace-warnings"
# LAR_ROOT ISOLATES THE FILESYSTEM, NOT THE PORT. Every home roots off it — the two data houses (lares
# and lararium), state, cache, config, run, plus bags, genesis and the UDS socket — and the TCP port roots off LAR_PORT alone. A throwaway on the default 8080
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
echo "  founding with \`lares vessel stand --install\` — the rite AS WRITTEN. Founding stands the VESSEL and nothing"
echo "  else, so every byte it writes lands inside LAR_ROOT."
echo "  NOT exercised here: the AI-surface wiring (rides \`--init\`), and the vault's TTY prompt (this"
echo "  harness supplies the passphrase by env, so the no-echo leg goes unwalked)."

# ── ⓪′ PREFLIGHT — once, ahead of everything irreversible ────────────────────────────────────────
say "⓪′ preflight"
# `pnpm build`, never `pnpm -r build`: the root script STAMPS the source digest after building, and the
# freshness gate reads that stamp. Building without stamping leaves the tree reading stale, so the first
# lifecycle verb rebuilds MID-RUN, and a build cleans dist — so a probe can delete the modules out from
# under the very node it set out to measure.
run "pnpm build (dist matches source, and says so)" sh -c "cd '$REPO_ROOT' && pnpm build"
run "the binary loads and answers"                    node "$LARES" help
# A BUILD THAT EXITS 0 HAS NOT TYPECHECKED. `pnpm build` compiles per package and a package whose build
# is not wired into the recursive run — or whose errors arrive colorized, with ANSI bytes sitting between
# the word "error" and its code — passes a green exit and a naive grep alike. The witness reports REAL
# errors per package and exits non-zero on any, so a type error cannot ride into a founding behind a
# clean-looking build.
run "the tree typechecks (not merely builds)"         sh -c "cd '$REPO_ROOT' && tools/typecheck-witness.sh"

while [ "$CYCLE" -lt "$CYCLES" ]; do
  CYCLE=$((CYCLE + 1))
  say "═══ CYCLE $CYCLE of $CYCLES ═══"

  # EACH CYCLE FOUNDS FROM VOID, INCLUDING THE VAULT'S CONDITION. The base var arrives at ④ and would
  # otherwise ride into the next cycle, sealing that founding at ② and turning its ④ back into the no-op
  # this ordering exists to catch. A cycle that inherits the previous cycle's environment re-runs the
  # commands without re-running the RITE.
  unset LARES_ARCHIVE_PASSPHRASE

  # ── CLEAR BETWEEN CYCLES. Cycle 2 must re-run the RITE, never inherit cycle 1's warm tree and its still-
  #    running daemon: a warm tree answers instantly and proves nothing, because the socket it answers on
  #    was never re-stood. The burn IS the clear, applied per cycle.
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
  # SEED THE TRACKED GENESIS ALONE — never a per-founding artifact.
  #
  # The genesis seed carries the ISLAND ALONE, and copying the TRACKED set is how this stays true: whatever
  # git refuses to carry, a rehearsal refuses to seed, so a future per-founding artifact drops out of the
  # seed the day it lands in .gitignore.
  #
  # The guard below refuses a per-founding address book in this directory. One there would hand a fresh
  # vessel ANOTHER vessel's doc URLs: `init` reads a bootstrap present and skips re-seeding exactly as its
  # idempotence promises, then the boot resolves @daemon to a doc no local store holds — hearth-private, so
  # no peer will ever carry it. The bootstrap lives in the vessel's own store precisely so a seed directory
  # can be copied freely; nothing should put one here, and the guard says so if anything does.
  step "copy genesis/ (tracked files only)"
  if (cd "$REPO_ROOT" && git ls-files -z genesis/ | xargs -0 -I{} cp --parents "{}" "$ROOT/") 2>/dev/null; then
    if [ -e "$ROOT/genesis/social-bootstrap.json" ]; then
      bad "a per-founding artifact reached the seed"
    else ok; fi
  else bad "cp"; fi

  # ── ② FOUND ────────────────────────────────────────────────────────────────────────────────────
  say "② found — the device + the three kahu"
  # A FAILED FOUNDING ENDS THE CYCLE. Everything below stands ON the vessel this step creates, so running
  # it anyway measures a tree that was never founded — and the CLI answers many of those verbs off disk,
  # so the run fills with `ok` that means nothing. Cycle 2 did exactly that: the founding died on a build
  # and five later steps still reported green. A cascade of green under a red foundation reads worse than
  # a failure, because it invites belief.
  BEFORE=$FAILED
  run "stand --install (founds the vessel)" lares vessel stand --install
  if [ "$FAILED" -ne "$BEFORE" ]; then
    say "CYCLE $CYCLE ABANDONED — the founding failed; every movement below would measure an unfounded tree."
    continue
  fi
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
  say "④–⑥ — these need the node breathing (throwaway socket at \$LAR_ROOT/data/lares/vessel)"
  # POLL TO A DEADLINE, never a fixed sleep. A cold first cycle boots empty caches and a fresh genesis; the
  # second rides what the first warmed, so a constant tuned on the warm case fails the cold one.
  # THE DEADLINE COMES FROM THE CLI'S OWN CONTRACT, never from a number this harness picked. `wake`
  # budgets 120s for the socket and says why in its source: the UDS binds LATER than `vessel-ready` and
  # later than the WS port — "on a cold boot (post-rebirth), tens of seconds later". An earlier 60s here
  # sat at HALF that budget, so two cycles reported a dead node while the node was alive and still booting;
  # the TCP port answered the whole time, which let every movement after it pass. A harness that
  # out-waits the thing it measures reports on its own patience.
  step "the node from ② answers"
  # THE SOCKET DOES NOT LIVE UNDER THE DATA DIR. It stands at the RENDEZVOUS — `/tmp/lares-<uid>/<digest>.sock`,
  # where the digest is sha256 of the substrate dir, first 12 hex (`rendezvousPath`). A lararium serves as
  # civic infrastructure, so the socket sits where a logout cannot reach it. Watching the old
  # `<dataDir>/lares.sock` waits on a path nothing creates: the full 120s budget, every run, and the vessel
  # breathing the whole time.
  SOCK_DIGEST=$(printf '%s' "$ROOT/data/lares/vessel" | sha256sum | cut -c1-12)
  SOCK="/tmp/lares-$(id -u)/${SOCK_DIGEST}.sock"
  STAND_LOG="$ROOT/data/lares/vessel/stand.log"
  WAITED=0
  while [ ! -S "$SOCK" ] && [ "$WAITED" -lt 120 ]; do sleep 1; WAITED=$((WAITED + 1)); done
  if [ -S "$SOCK" ]; then
    printf '\033[32mok\033[0m (%ss)\n' "$WAITED"
  else
    bad "no socket after ${WAITED}s"
    # SAY WHAT THE NODE SAID. The boot log is the one artifact that answers "stalled, faulted, or slow",
    # and the burn destroys it — so it speaks HERE, while it still stands.
    if [ -f "$STAND_LOG" ]; then
      printf '      ── stand.log (tail) ──\n'
      tail -12 "$STAND_LOG" | sed 's/^/      /'
    else
      printf '      (no stand.log at %s — the node never wrote one)\n' "$STAND_LOG"
    fi
  fi

  # ④ MUST DO REAL WORK. A seal that finds every carrier already sealed exits 0, so an exit-code check
  # reads a no-op as success — which is what this step did while the base var rode from the start.
  step "④ vault seal — carriers actually seal"
  if out=$(node "$LARES" vault seal --yes 2>&1) && ! printf '%s' "$out" | grep -q "sealed NOTHING"; then ok
  else bad "sealed nothing"; printf '%s\n' "$out" | tail -4 | sed 's/^/      /'; fi

  # THE STANDING CONDITION BEGINS HERE. Sealing writes sealExpected into the config, which the clear does
  # not remove, so every later daemon boot wants the base var. ⑤ boots nothing — it plants content into
  # the vessel already standing from ② — and the var still rides from this point, because that is what a
  # sealed vessel commits its operator to and the harness walks the operator's own order.
  export LARES_ARCHIVE_PASSPHRASE="$PASS_DRILL"
  run "④ vault status"                      lares vault status

  # ⚠ ⑤ CANNOT FULLY CONVERGE YET, AND THE CAUSE SITS OUTSIDE THIS HARNESS.
  # The daemon from ② booted before any persona existed and before the seal, so it stands at the WAKING
  # FLOOR — faceless, serving the public shelf, every sovereign act waiting. `lares` and `lararium` land
  # anyway (INGEST asks no face); `crossroads` needs one and comes back "holds no face", so 2 of 3
  # holdings converge and the movement reads half-green.
  #
  # A restart is the obvious cure and it does NOT work: `vessel stand --restart` dies on
  # `@catalog — the store holds it and no peer carries it`, the same verdict a mesh hearth dies on
  # beside its siblings. A vessel that stands clean COLD fails to re-stand, so the cure has to land in
  # the boot resolver rather than in another verb here.
  # ⑤ SEEDS, and does not rebirth. Rebirth composes stop · clear · bake · stand · seed, which on a fresh
  # founding tears down what ② built and re-bakes a genesis nothing touched. Only the seeding belongs here.
  # THE FACES CAME AFTER THE STANDING, SO THE STANDING HAS TO MOVE. ② stood the vessel before any
  # persona existed, which is a WAKING FLOOR by design — the daemon decided its class from the face it
  # found, and it found none. Minting three kahu afterward changes the disk and not the running daemon,
  # so every persona-scoped act below refuses until the vessel stands again. Measured: ⑤ failed here
  # with `crossroads (load) → exit 4`, the daemon counselling `persona new 0` to an operator holding
  # three. The vessel door's own arc names this step; the rehearsal skipped it and the rite could not
  # seed its own corpus.
  run "the lift — stand again, now that faces stand"  lares vessel stand
  run "⑤ seed --apply"                      lares vessel seed --apply --yes
  # ⑥ ASSERTS BY CONNECTING, never by inspecting. `node status` reads local facts alone — bootstrap
  # present, storage size, port in use — and the label "LIVE" claimed far more than the verb answers. A
  # node that fataled mid-boot keeps its port bound, so `portInUse` stayed true over a dead vessel and the
  # movement reported LIVE across two cycles that never served anything. `stand --observe` REPORTS without
  # standing, and its `up` reads a connection, so this asks the one question that means live.
  run "⑥ LIVE — the daemon ANSWERS" \
    sh -c "node '$LARES' vessel stand --json --observe | grep -q '\"up\":true'"
  run "bag list — declarations survive"     sh -c "node '$LARES' bag list | grep -q '\"bag\":\"lares\"'"

  # ── ⑦ READY TO CONTRACT ────────────────────────────────────────────────────────────────────────
  say "⑦ ready — the door a second operator walks through"
  # THE END-STATE THE ARC IS FOR. Everything above stands ONE hearth; a Nexus that cannot admit a second
  # operator is a private vessel wearing a charter. This walks BOTH halves of the real handshake:
  #   `nexus accept-carriage`  the JOINER's half — mints their nym + a signed contract-in
  #   `nexus contract --sig`   the KAHU's half   — the quorum counter-signs it onto the members board
  # A held persona stands in for the joining operator, so both halves run on one machine. What that does
  # NOT prove is the two vessels being genuinely separate islands — the token crosses a function call here
  # rather than a wire — and that stays NAMED rather than implied.
  step "⑦ accept-carriage (the joiner's half)"
  if CARRIAGE=$(lares nexus accept-carriage --index 2 --json 2>&1); then
    ok
    PEER_NYM=$(printf '%s' "$CARRIAGE" | grep -oE '"nym":"[0-9a-fx]+"' | head -1 | cut -d'"' -f4)
    PEER_SIG=$(printf '%s' "$CARRIAGE" | grep -oE '"contractSig":"[0-9a-f]+"' | head -1 | cut -d'"' -f4)
  else
    bad "$?"; printf '%s\n' "$CARRIAGE" | tail -4 | sed 's/^/      /'; PEER_NYM=""; PEER_SIG=""
  fi

  if [ -n "$PEER_NYM" ] && [ -n "$PEER_SIG" ]; then
    run "⑦ contract (the kahu's half) — MEMBER" \
      sh -c "node '$LARES' nexus contract '$PEER_NYM' --sig '$PEER_SIG' --json | grep -q '\"memberNow\":true'"
    run "the members board folds them IN" \
      sh -c "node '$LARES' nexus members --list --json | grep -q '$PEER_NYM'"
    run "revoke SUPERSEDES — never deletes" \
      sh -c "node '$LARES' nexus revoke '$PEER_NYM' --json | grep -q '\"memberNow\":false'"
  else
    step "⑦ contract"; bad "no nym/sig captured from accept-carriage"
  fi

  # THE REFUSAL, measured. A gate only ever shown saying yes has not been shown to be a gate — and this
  # one must FAIL CLOSED on a nym carrying no contract-in at all.
  run "a nym with NO contract-in refuses, and writes nothing" \
    sh -c "! node '$LARES' nexus contract 0000000000000000000000000000000000000000000000000000000000000000 --json 2>&1 | grep -q '\"ok\":true'"

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
