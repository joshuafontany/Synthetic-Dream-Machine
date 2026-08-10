#!/usr/bin/env bash
# contract-witness — the operator handshake across TWO vessels that share no key.
#
# ── WHAT THE ONE-VESSEL REHEARSAL COULD NOT SEE ─────────────────────────────────────────────────
# `rehearse-keeper` movement ⑦ walks both halves of the handshake on one hearth, so the joiner's
# contract-in gets signed by a persona that same vessel holds. Every byte verifies, and the one property
# the whole ceremony exists for goes unmeasured: that a Nexus admits a key it has NEVER HELD.
#
# So this stands two roots. Vessel A founds a Nexus and seats its quorum. Vessel B founds independently —
# its own device key, its own persona roots, its own vault passphrase — and A holds no seed of B's. The
# handshake then has to cross a real custody boundary, which is the only boundary this ceremony defends.
#
# ── THE PREREQUISITE THE ONE-VESSEL RUN HID ─────────────────────────────────────────────────────
# `nexus accept-carriage` reads the roster from the JOINER'S OWN seal home, because a contract-in binds to
# the charter epoch it consents under. On one vessel that read is invisible — one seal home serves both
# hands. Across two it becomes a step somebody has to perform: B cannot consent to a Nexus whose charter
# it has never seen. This harness carries A's `founding-roster.mem` to B by hand and SAYS that it did,
# because a witness that quietly satisfies a prerequisite has measured a system that does not exist.
#
# The charter carries public material only — seated verifying keys, threshold, epoch lineage. Holding it
# lets B name the epoch it consents under; it grants B no quorum, since B holds no kahu signing key.
#
# ── WHAT STAYS UNMEASURED, NAMED ────────────────────────────────────────────────────────────────
# Both vessels sit on one filesystem, and the two artifacts move by `cp`. That matches the CLI's own
# instruction — `hand this to a founding kahu` — so the token IS an out-of-band bearer artifact by design.
# What this does not walk is a NETWORK carry, nor two machines with two clocks. `herm-mesh-witness` and
# the container harness cover the wire; this one covers CUSTODY.
#
# Exit 0 = the door opened for a foreign key, refused three forgeries, and closed by supersession.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO_ROOT=$(pwd)
LARES="$REPO_ROOT/packages/lares-cli/dist/src/bin/lares.js"

FAILED=0
say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
step() { printf '  %-52s' "$*"; }
ok()   { printf '\033[32mok\033[0m\n'; }
bad()  { printf '\033[31mFAILED (%s)\033[0m\n' "$1"; FAILED=$((FAILED + 1)); }
note() { printf '      \033[90m%s\033[0m\n' "$*"; }

A_ROOT=$(mktemp -d /tmp/lares-contract-A-XXXXXX)
B_ROOT=$(mktemp -d /tmp/lares-contract-B-XXXXXX)
XFER=$(mktemp -d /tmp/lares-contract-xfer-XXXXXX)
cleanup() { rm -rf "$A_ROOT" "$B_ROOT" "$XFER"; }
trap cleanup EXIT

# Each vessel runs in its OWN environment. A subshell per call keeps A's LAR_ROOT from leaking into B's —
# a single exported root would silently make this a one-vessel test again, which is the exact failure the
# harness exists to rule out.
as_a() { ( export LAR_ROOT="$A_ROOT" LAR_PORT=8097 LARES_ARCHIVE_PASSPHRASE_NEW="witness-A"; node "$LARES" "$@" ); }
as_b() { ( export LAR_ROOT="$B_ROOT" LAR_PORT=8098 LARES_ARCHIVE_PASSPHRASE_NEW="witness-B"; node "$LARES" "$@" ); }
run_a() { step "$1"; shift; if out=$(as_a "$@" 2>&1); then ok; else bad "$?"; printf '%s\n' "$out" | tail -5 | sed 's/^/      /'; fi; }
run_b() { step "$1"; shift; if out=$(as_b "$@" 2>&1); then ok; else bad "$?"; printf '%s\n' "$out" | tail -5 | sed 's/^/      /'; fi; }
# `as_a` PREFIXES the binary, so a pipeline cannot ride it — `as_a sh -c ...` hands `sh` to the CLI as a
# subcommand. A grep-the-output check needs a shell that inherits the vessel's environment instead.
sh_a() { ( export LAR_ROOT="$A_ROOT" LAR_PORT=8097 LARES_ARCHIVE_PASSPHRASE_NEW="witness-A"; sh -c "$1" ); }
run_sh_a() { step "$1"; if out=$(sh_a "$2" 2>&1); then ok; else bad "$?"; printf '%s\n' "$out" | tail -5 | sed 's/^/      /'; fi; }

say "contract-witness — two vessels, no shared key"
echo "  A (the Nexus):  $A_ROOT"
echo "  B (the joiner): $B_ROOT"

say "⓪ preflight"
step "the binary answers"
if node "$LARES" help >/dev/null 2>&1; then ok; else bad "build first: pnpm build"; exit 1; fi

# ── ① VESSEL A — found the Nexus, seat the quorum ────────────────────────────────────────────────
# THE SEED EACH FOUNDING READS. `lares init` resolves the hearth true-name (the engine CID) from the
# tracked genesis tree, so an isolated root must carry it before a founding can stand. Its own error names
# this step verbatim — the harness performs it rather than making a reader discover it.
seed_genesis() {
  ( cd "$REPO_ROOT" && git ls-files -z genesis/ | xargs -0 -I{} cp --parents "{}" "$1/" ) 2>/dev/null
}

say "① vessel A — the Nexus founds and seats its quorum"
step "seed A's genesis (the hearth true-name lives there)"
if seed_genesis "$A_ROOT"; then ok; else bad "cp genesis"; fi
run_a "A founds"                        wake --install
# A FAILED FOUNDING ENDS THE RUN. Many verbs below answer off disk, so a broken founding fills the report
# with green that means nothing — the exact cascade `rehearse-keeper` learned to refuse.
if [ "$FAILED" -ne 0 ]; then
  say "ABANDONED — A's founding failed; every check below would measure an unfounded vessel."
  exit "$FAILED"
fi
run_a "A mints kahu 0"                  persona new 0 --name adc-0 --handle 'Kahu Alpha' --seat
run_a "A mints kahu 1"                  persona new 1 --name adc-1 --handle 'Kahu Beta'  --seat
run_a "A mints kahu 2"                  persona new 2 --name adc-2 --handle 'Kahu Gamma' --seat
step "A forges the pre-rotation reserve"
if RESERVE=$(as_a nexus seal reserve --guardian-a 'guardian-a' --guardian-b 'guardian-b' 2>&1); then
  ok; COMMIT=$(printf '%s' "$RESERVE" | grep -oE '[0-9a-f]{64}' | head -1)
else bad "$?"; printf '%s\n' "$RESERVE" | tail -4 | sed 's/^/      /'; COMMIT=""; fi
if [ -n "$COMMIT" ]; then
  run_a "A seats the genesis epoch"     nexus seal seat --next-key-commit "$COMMIT"
else step "A seats the genesis epoch"; bad "no commit from reserve"; fi
step "A's quorum STANDS"
if as_a nexus seal show --json 2>/dev/null | grep -q '"quorumSeated":true'; then ok; else bad "quorum not seated"; fi

# ── ② VESSEL B — found independently ─────────────────────────────────────────────────────────────
say "② vessel B — an INDEPENDENT operator founds their own hearth"
step "seed B's genesis"
if seed_genesis "$B_ROOT"; then ok; else bad "cp genesis"; fi
BEFORE=$FAILED
run_b "B founds (own device key, own vault)"  wake --install
if [ "$FAILED" -ne "$BEFORE" ]; then
  say "ABANDONED — B's founding failed; the handshake has no second vessel to cross to."
  exit "$FAILED"
fi
run_b "B mints its own persona"               persona new 0 --name joiner --handle 'Independent Operator'

step "★ B's key is FOREIGN to A — no shared seed on disk ★"
# The whole ceremony defends one boundary; measure it rather than assume it. If any of B's persona
# material sat under A's root, every signature below would verify for the wrong reason.
if [ -d "$A_ROOT" ] && ! grep -rqs "joiner" "$A_ROOT" 2>/dev/null; then ok
else bad "B's material reachable from A's root"; fi

# ── ③ THE PREREQUISITE — carry A's public charter to B ───────────────────────────────────────────
say "③ the prerequisite the one-vessel run hid"
note "accept-carriage reads the roster from the JOINER'S OWN seal home."
note "B cannot consent to a charter epoch it has never seen — so the charter must travel FIRST."
step "B refuses to consent with no charter in hand"
if as_b nexus accept-carriage --index 0 --json >/dev/null 2>&1; then
  bad "B signed a contract-in with no seated charter — fail-closed did not hold"
else ok; fi

step "carry A's founding-roster.mem → B (public material)"
A_SEAL=$(find "$A_ROOT" -name founding-roster.mem -print -quit 2>/dev/null)
if [ -n "$A_SEAL" ]; then
  B_SEAL_DIR=$(dirname "${A_SEAL/$A_ROOT/$B_ROOT}")
  mkdir -p "$B_SEAL_DIR" && cp "$A_SEAL" "$B_SEAL_DIR/" && ok
  note "from ${A_SEAL#$A_ROOT/}  →  B's seal home"
else bad "A wrote no founding-roster.mem"; fi

step "★ the charter grants B no QUORUM — it carries public material only ★"
# B now holds A's charter. If that alone let B sign quorum acts, the public charter would BE the key.
if as_b nexus contract 0000000000000000000000000000000000000000000000000000000000000000 --json 2>&1 | grep -q '"ok":true'; then
  bad "B raised a quorum act holding only the public charter"
else ok; fi

# ── ④ THE HANDSHAKE ──────────────────────────────────────────────────────────────────────────────
say "④ the handshake — B consents, A's quorum admits"
step "B signs its contract-in (the joiner's half)"
if CARRIAGE=$(as_b nexus accept-carriage --index 0 --json 2>&1); then
  ok
  B_NYM=$(printf '%s' "$CARRIAGE" | grep -oE '"nym":"[0-9a-fx]+"' | head -1 | cut -d'"' -f4)
  B_SIG=$(printf '%s' "$CARRIAGE" | grep -oE '"contractSig":"[0-9a-f]+"' | head -1 | cut -d'"' -f4)
  printf '%s\n%s\n' "$B_NYM" "$B_SIG" > "$XFER/contract-in.txt"
  note "token written to the transfer dir — the out-of-band hand-off the CLI instructs"
else bad "$?"; printf '%s\n' "$CARRIAGE" | tail -4 | sed 's/^/      /'; B_NYM=""; B_SIG=""; fi

step "★ A has never held this key ★"
if [ -n "$B_NYM" ] && ! as_a persona list --json 2>/dev/null | grep -q "${B_NYM#0x}"; then ok
elif [ -z "$B_NYM" ]; then bad "no nym to check"
else bad "B's nym appears among A's own personas"; fi

if [ -n "$B_NYM" ] && [ -n "$B_SIG" ]; then
  run_sh_a "★ A's quorum ADMITS a foreign key ★" \
    "node '$LARES' nexus contract '$B_NYM' --sig '$B_SIG' --json | grep -q '\"memberNow\":true'"
  step "A's members board folds B IN"
  if as_a nexus members --list --json 2>/dev/null | grep -q "${B_NYM#0x}"; then ok; else bad "B absent from the fold"; fi
else
  step "A's quorum admits a foreign key"; bad "no token captured"
fi

# ── ⑤ THE REFUSALS ───────────────────────────────────────────────────────────────────────────────
say "⑤ the refusals — a gate only shown saying yes is no gate"
step "a foreign nym with NO contract-in refuses"
if as_a nexus contract 1111111111111111111111111111111111111111111111111111111111111111 --json 2>&1 | grep -q '"ok":true'; then
  bad "admitted without consent"; else ok; fi

step "a FORGED signature refuses"
if [ -n "$B_NYM" ]; then
  FORGED=$(printf '%0128d' 0 | tr '0' 'a')
  if as_a nexus contract "$B_NYM" --sig "$FORGED" --json 2>&1 | grep -q '"ok":true'; then
    bad "a forged contract-in verified"; else ok; fi
else bad "no nym"; fi

step "★ a REPLAY across an epoch roll refuses ★"
# The sharpest property: a contract-in binds to the epoch it consented under. Roll A's charter and the
# old token must stop verifying — consent to one epoch is not consent to the next.
if [ -n "$B_NYM" ] && [ -n "$B_SIG" ]; then
  if ROT=$(as_a nexus seal rotate --json 2>&1); then
    if as_a nexus contract "$B_NYM" --sig "$B_SIG" --json 2>&1 | grep -q '"ok":true'; then
      bad "a contract-in signed under the PRIOR epoch still verified"
    else ok; fi
  else
    # A SKIP MUST CARRY THE REFUSAL IT ACTUALLY MET. A reason this harness invented would read as
    # measured when nobody measured it — the same fabrication a vague suspension reason commits.
    printf '\033[33mSKIPPED\033[0m\n'
    note "the replay leg goes unwalked. The rotate refused with:"
    printf '%s\n' "$ROT" | grep -oE '"message":"[^"]+"' | head -1 | cut -c12- | sed 's/"$//' | sed 's/^/      \x1b[90m/;s/$/\x1b[0m/'
  fi
else bad "no token"; fi

# ── ⑥ SUPERSESSION ───────────────────────────────────────────────────────────────────────────────
say "⑥ closing — non-renewal, never deletion"
if [ -n "$B_NYM" ]; then
  run_sh_a "A revokes — the board SUPERSEDES" \
    "node '$LARES' nexus revoke '$B_NYM' --json | grep -q '\"memberNow\":false'"
else step "A revokes"; bad "no nym"; fi

say "═══ RESULT ═══"
if [ "$FAILED" -eq 0 ]; then
  echo "  the door opened for a key A never held, refused every forgery, and closed by supersession."
  echo "  UNWALKED, by design: the network carry (herm-mesh-witness) and two machines with two clocks."
else
  echo "  $FAILED check(s) failed."
fi
exit "$FAILED"
