#!/usr/bin/env bash
# rendezvous-parity-witness — the TS and PY sides resolve the SAME meeting place.
#
# TWO LANGUAGES DERIVE ONE ADDRESS. The daemon binds it from TypeScript; the MCP holder and every
# py-side verb dial it from `lares_uds`. Nothing but agreement joins them: no import crosses the
# seam, no type spans it, and the typechecker cannot see one half of it at all.
#
# Measured, that gap ran live. The socket moved out of `<dataDir>/lares.sock` and onto the rendezvous
# — `/tmp/lares-<uid>/<sha256(root)[0:12]>.sock`, which holds a fixed 40 bytes however deep the root
# runs — and the py side kept the retired spelling. The daemon served throughout. Every MCP verb met
# a socket nothing had created since the move, and 20 witnesses stayed green over it.
#
# So this collides the two derivations directly, under BOTH root branches: the XDG default and an
# isolated `LAR_ROOT`. A drift in either one is the whole surface going dark.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0

# ── THE THIRD SPELLING ──────────────────────────────────────────────────────────────────────────
# TS and python were gated against each other while the E2E HARNESS carried a third derivation
# nobody checked — it walked an instance root hunting a file named `lares.sock`, found nothing, and
# nine vectors across the join ceremony and the herm floor reported broken CEREMONIES for a rig that
# never reached them. A shared address needs one derivation used by EVERY side, harnesses included.
harness_check() {
  local root="$1"
  local from_harness from_connector
  from_harness=$(node --input-type=module -e '
    import { rendezvousPath } from "./packages/lararium-mesh/dist/rendezvous-path.js";
    import { join } from "node:path";
    const root = process.argv[1];
    // The harness derivation: substrate dir = <LAR_ROOT>/data/lares/vessel (tests/harness/instance.ts).
    process.stdout.write(rendezvousPath({ root: join(root, "data", "lares", "vessel"), uid: process.getuid() }));
  ' "$root")
  from_connector=$(env LAR_ROOT="$root" node --input-type=module -e '
    import { rendezvousPath } from "./packages/lararium-mesh/dist/rendezvous-path.js";
    import { larDataDir }     from "./packages/lararium-node/dist/src/vessel-paths.js";
    process.stdout.write(rendezvousPath({ root: larDataDir(), uid: process.getuid() }));
  ')
  printf '  %-30s %s\n' "harness (staged root)" "$from_harness"
  if [ "$from_harness" = "$from_connector" ]; then
    printf '  %-30s agree\n' "harness vs connector"
  else
    printf '  %-30s DRIFT — connector says %s\n' "harness vs connector" "$from_connector"; fail=1
  fi
}

check() {
  local label="$1" root_env="$2"
  local ts py
  ts=$(env ${root_env:+LAR_ROOT="$root_env"} node --input-type=module -e '
    import { rendezvousPath } from "./packages/lararium-mesh/dist/rendezvous-path.js";
    import { larDataDir }     from "./packages/lararium-node/dist/src/vessel-paths.js";
    process.stdout.write(rendezvousPath({ root: larDataDir(), uid: process.getuid() }));
  ')
  py=$(env ${root_env:+LAR_ROOT="$root_env"} python3 -c '
import sys; sys.path.insert(0, "packages/lararium-sensorium/scripts")
import lares_uds as uds; sys.stdout.write(uds.socket_path())
  ')
  if [[ "$ts" == "$py" ]]; then
    echo "  ok    $label  $ts"
  else
    echo "  DRIFT $label"
    echo "        ts: $ts"
    echo "        py: $py"
    fail=1
  fi
}

echo "rendezvous-parity: the daemon binds it, the py holder dials it"
check "xdg default   " ""
check "isolated root " "/tmp/lares-rendezvous-parity-probe"

# THE BUDGET IS PART OF THE AGREEMENT. A path both sides spell identically still fails to bind if it
# outruns `sun_path`, and the whole point of the rendezvous is that it cannot.
deep="/tmp/$(printf 'd%.0s' {1..60})/nested/root"
len=$(env LAR_ROOT="$deep" python3 -c '
import sys; sys.path.insert(0, "packages/lararium-sensorium/scripts")
import lares_uds as uds; print(len(uds.socket_path().encode("utf-8")))
')
if (( len < 104 )); then
  echo "  ok    sun_path budget  ${len} bytes under a 60-deep root"
else
  echo "  OVER  sun_path budget  ${len} bytes — a deep root takes the rendezvous down"
  fail=1
fi

harness_check "/tmp/lares-staged-parity-probe"

if (( fail == 0 )); then echo "rendezvous-parity: clean"; else echo "rendezvous-parity: DRIFT"; fi
exit $fail
