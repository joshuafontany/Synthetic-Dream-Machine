#!/usr/bin/env bash
# founding-witness — found a vessel in a throwaway root and prove the boot path reads back what the
# founding wrote.
#
# ── WHY A WITNESS AND NOT A UNIT TEST ───────────────────────────────────────────────────────────
# The founding writes a plane's name; the boot path reads it back. Both sides derive it, so a unit test on
# either side passes while they disagree — the pairing is the thing, and only a real founding exercises it.
# Everything between them runs here too: the keyhive ceremony, the ordering that mints a PersonaGroup before
# seeding its plane, the genesis seed, the on-disk bootstrap artifact.
#
# It founds under LAR_ROOT in a temp dir, so it never touches the operator's own vessel state.
#
# Usage:  tools/founding-witness.sh          (exits non-zero on any disagreement)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
REPO=$PWD

TB=$(mktemp -d -t lares-founding-witness-XXXXXX)
trap 'rm -rf "$TB"' EXIT

# The genesis seed carries the hearth true-name; an isolated root needs its own copy.
git ls-files -z genesis/ | xargs -0 -I{} cp --parents "{}" "$TB/" 2>/dev/null

echo "founding-witness: founding under $TB"
if ! LAR_ROOT="$TB" node "$REPO/packages/lares-cli/bin/lares.mjs" vessel found >"$TB/init.log" 2>&1; then
  echo "  FOUNDING FAILED — tail of the log:"; tail -15 "$TB/init.log" | sed 's/^/    /'; exit 1
fi

LAR_ROOT="$TB" node --input-type=module -e '
import { readPersonaPlanes, personaBagIdFor, mountedPlaneBagId } from "'"$REPO"'/packages/lararium-mesh/dist/index.js";
import fs from "node:fs";
const path = process.argv[1] + "/data/vessel/social-bootstrap.json";
const t = JSON.parse(JSON.parse(fs.readFileSync(path, "utf8")).text).tiddlers;
const entries = Object.entries(t).map(([title, v]) => ({ title, text: v.text ?? null }));

const fail = (m) => { console.error("  MISMATCH: " + m); process.exitCode = 1; };
const planes = readPersonaPlanes(entries);
if (planes.length !== 1) fail(`the founding wrote ${planes.length} readable planes, expected 1`);

const active = t["lar:///ha.ka.ba/bags/@persona/sentinel/persona-group/doc-id"]?.text;
if (!active) fail("no active PersonaGroup sentinel — the boot path has no gesture to resolve");
else {
  // The pairing itself: the name the founding wrote, and the name the boot path derives.
  const derived = personaBagIdFor(active);
  if (!t[derived]) fail(`the boot path derives ${derived}, which the founding never wrote`);
  const mounted = mountedPlaneBagId(planes, active);
  if (mounted !== derived) fail(`mount resolves ${mounted}, derivation says ${derived}`);
  if (planes[0].personaGroupId !== active) fail("the plane read back belongs to another group");
  if (!planes[0].url?.startsWith("automerge:")) fail("the plane resolves to no document");
}
if (!process.exitCode) console.log("  ok — written, read back, derived and mounted all name one plane");
' "$TB"
