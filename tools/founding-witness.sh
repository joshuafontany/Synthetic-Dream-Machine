#!/usr/bin/env bash
# founding-witness — found a vessel in a throwaway root and prove the boot path reads back what the
# founding wrote — in BOTH halves, because a founding stands two things.
#
# ── WHY A WITNESS AND NOT A UNIT TEST ───────────────────────────────────────────────────────────
# The founding writes a plane's name; the boot path reads it back. Both sides derive it, so a unit test on
# either side passes while they disagree — the pairing is the thing, and only a real founding exercises it.
# Everything between them runs here too: the keyhive ceremony, the ordering that mints a PersonaGroup before
# seeding its plane, the genesis seed, the on-disk bootstrap artifact.
#
# ── TWO HALVES, TWO WITNESSES ───────────────────────────────────────────────────────────────────
# A founding stands a PLACE (`vessel found`) and later a FACE (`persona new 0`). One assertion cannot
# cover both: demanding a plane after the place alone fails a vessel that stands exactly as designed,
# and it fails identically whether the floor works or not — which makes it useless as a gate.
#
# So the PLACE half asserts a POSITIVE absence: @daemon named, and no persona pin anywhere. A place that
# quietly wrote a face would pass a looser check and break the facelessness the class rests on.
# The FACE half then lands and runs the pairing assertions, unchanged — the name the founding wrote
# against the name the boot path derives.
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

# ── HALF ONE — the PLACE stands, and stands FACELESS ────────────────────────────────────────────
LAR_ROOT="$TB" node --input-type=module -e '
import { readPersonaPlanes } from "'"$REPO"'/packages/lararium-mesh/dist/index.js";
import fs from "node:fs";
const path = process.argv[1] + "/data/lares/vessel/social-bootstrap.json";
const t = JSON.parse(JSON.parse(fs.readFileSync(path, "utf8")).text).tiddlers;
const entries = Object.entries(t).map(([title, v]) => ({ title, text: v.text ?? null }));
const fail = (m) => { console.error("  MISMATCH (place): " + m); process.exitCode = 1; };

if (!t["lar:///ha.ka.ba/bags/@daemon"]?.text?.startsWith("automerge:")) {
  fail("the place names no @daemon island — a founding that writes nothing else must still write this");
}
// FACELESS BY POSITIVE ASSERTION. A place that wrote a persona pin would pass any looser reading.
const planes = readPersonaPlanes(entries);
if (planes.length !== 0) fail(`the place wrote ${planes.length} persona plane(s); a place holds none until a face lands`);
if (t["lar:///ha.ka.ba/bags/@persona/sentinel/persona-group/doc-id"]) {
  fail("the place wrote a PersonaGroup sentinel — the cabal and the group ride with the FACE");
}
if (!process.exitCode) console.log("  ok (place) — @daemon stands, and nothing of a person");
' "$TB"

echo "founding-witness: lighting the face"
if ! LAR_ROOT="$TB" node "$REPO/packages/lares-cli/bin/lares.mjs" persona new 0 --name founding-witness >"$TB/face.log" 2>&1; then
  echo "  FACE FAILED — tail of the log:"; tail -15 "$TB/face.log" | sed 's/^/    /'; exit 1
fi

# ── HALF TWO — the FACE landed, and the boot path derives what it wrote ──────────────────────────
LAR_ROOT="$TB" node --input-type=module -e '
import { readPersonaPlanes, personaBagIdFor, mountedPlaneBagId } from "'"$REPO"'/packages/lararium-mesh/dist/index.js";
import fs from "node:fs";
const path = process.argv[1] + "/data/lares/vessel/social-bootstrap.json";
const t = JSON.parse(JSON.parse(fs.readFileSync(path, "utf8")).text).tiddlers;
const entries = Object.entries(t).map(([title, v]) => ({ title, text: v.text ?? null }));

const fail = (m) => { console.error("  MISMATCH (face): " + m); process.exitCode = 1; };
const planes = readPersonaPlanes(entries);
if (planes.length !== 1) fail(`the face wrote ${planes.length} readable planes, expected 1`);

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
