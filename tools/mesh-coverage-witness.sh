#!/usr/bin/env bash
# mesh-coverage-witness — every reachable mesh state has a scenario, or is declared unreachable.
#
# ⚠ IT READS CLAIMS, NEVER PASSES. A `# COVERS:` line says a scenario MEANS to walk a cell; whether the
# walk stands green is what running the scenario answers. Measured the hard way: four ladder steps
# claimed their cells while carrying a realm id outside 0-9a-f, so the verb refused at usage on every
# run and this witness still reported the cells walked. Read it beside a green run, never instead of one.
#
# ── WHY THE MATRIX IS DERIVED AND NOT WRITTEN ───────────────────────────────────────────────────
# This tree's own record names the failure six times: a hand-written enumeration cannot notice what
# it missed. A scenario list maintained by hand drifts the moment the code grows a state, and drifts
# SILENTLY — every listed scenario still passes, so nothing reports the hole.
#
# So the axes come from the code's own unions. `federationPosture`, `nexusPhase` and `realmStanding`
# each declare their states in one place, this reads them there, and a new state appears in the
# matrix the day it is added rather than the day somebody remembers.
#
# ── AND THE AXIS LIST IS ITSELF HAND-WRITTEN ────────────────────────────────────────────────────
# A new STATE on an existing axis appears here on its own. A new DIMENSION does not: the three
# `union(...)` calls below are chosen by hand, so this reports 18/18 green while whole dimensions sit
# unmeasured. That is the same failure one level up, and naming it here is cheaper than rediscovering
# it from a green run.
#
# WHAT THESE AXES DO NOT REACH, measured: every cell holds ONE cabal (the harness carries a single
# `REALM=`), one principal class (every vessel a full-caps founder or joiner — never an independent
# operator running a node without caps on the base grammar), one cap tier, and one crossing direction.
# Those are TOPOLOGY, not vessel state, so they do not belong on these axes — they want an instrument
# beside this one. A Nexus is defined by many cabals sharing hardware, and nothing here varies that.
#
# ── WHAT A SCENARIO CLAIMS ──────────────────────────────────────────────────────────────────────
# Each scenario in `mesh-scenarios.sh` declares the cell it walks with a `# COVERS:` line. The
# witness compares claims against the derived space and reports what nothing claims.
#
# UNREACHABLE CELLS ARE DECLARED, NEVER SILENTLY SKIPPED — the same idiom `surface-parity` uses for
# its exemptions: a reason that prints every run, where the next reader meets it, rather than an
# absence somebody has to rediscover.
#
# ── AND IT STANDS OUTSIDE `witness-all`, DELIBERATELY ───────────────────────────────────────────
# Ten cells are UNBUILT rather than unreachable, so this exits non-zero today. Folding that into the
# suite would leave a permanently-red witness, and this house names that failure explicitly: "a
# permanently-red witness trains a reader to skip it." Declaring the gap exempt would be the other
# half of the same failure — a silent allow-list nobody audits.
#
# So it runs on its own and prints the work list. It joins `witness-all` the day the list empties,
# and it is the thing that will say when.
set -uo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import pathlib, re, sys, itertools

MESH = pathlib.Path("packages/lararium-mesh/src")
SCEN = pathlib.Path("tools/mesh-scenarios.sh")

def union(path: str, pattern: str) -> list[str]:
    """Read a closed string union from the module that declares it — never transcribed here."""
    src = (MESH / path).read_text()
    m = re.search(pattern, src)
    if not m:
        print(f"[mesh-coverage] cannot read the state union from {path} — the matrix is underivable")
        sys.exit(1)
    return re.findall(r'"([a-z-]+)"', m.group(1))

phases  = union("nexus-phase.ts",    r'export type NexusPhaseName\s*=\s*([^;]+);')
realms  = union("realm-standing.ts", r'export type RealmStandingName\s*=\s*([^;]+);')
posture = union("federation-gate.ts", r'FederationPosture\s*=\s*([^;]+);') if (MESH / "federation-gate.ts").exists() else []
if not posture:
    posture = union("cap-tier.ts", r'FederationPosture\s*=\s*([^;]+);') if "FederationPosture" in (MESH / "cap-tier.ts").read_text() else ["private", "open"]

cells = [f"{p}/{ph}/{r}" for p, ph, r in itertools.product(posture, phases, realms)]

text  = SCEN.read_text()
claims = set(re.findall(r'#\s*COVERS:\s*([a-z-]+/[a-z-]+/[a-z-]+)', text))

# A cell nothing can reach states WHY, and prints every run. An absence with no reason is how a gap
# becomes permanent: the next reader cannot tell "impossible" from "nobody got to it".
UNREACHABLE: dict[str, str] = {
    # EMPTY, and it stays a table rather than a deleted idea. The quorum cells sat here on a reading
    # that a Nexus counts one relation per operator a vessel ADMITS, so two operators could never
    # make two.
    #
    # THE FLOOR IS PERSONAS, AND THAT IS A KEY-LAYER LAW RATHER THAN A HARNESS CONVENIENCE. Neither a
    # human's base VEIL key nor the vessel-veil-dyad root signs anything above the PersonaGroup layer,
    # so a face is the only thing that CAN take a seat — a quorum counts faces because it has nothing
    # else to count. Quorum wants 2 operators and 4 personas, which `lararium-a` (three) and
    # `lararium-b` (one) reach between them, so `run_quorum_realm` walks all six on the two vessels
    # the fleet already stands. A third vessel would add operators, never seats.
    #
    # A cell belongs here when nothing CAN reach it, never when nobody has.
    # Adding one costs a reason a later reader can check and overturn, exactly as this was overturned.
}

# A SCENARIO THAT DECLARES NOTHING IS AMBIGUOUS, and the ambiguity is the hazard: a reader cannot
# tell "walks a cell somebody else already claimed" from "nobody ever wrote the claim". Duplicate
# claims are fine and expected — several scenarios legitimately walk the same cell from different
# directions — so this asks only that every scenario SAY which one.
scenarios = re.findall(r'^run_([a-z_]+)\(\)', text, re.M)
declared  = re.findall(r'#\s*COVERS:[^\n]*\n(?:#[^\n]*\n)*run_([a-z_]+)\(\)', text, re.M)
silent    = sorted(set(scenarios) - set(declared))

unknown = sorted(c for c in claims if c not in cells)
missing = sorted(c for c in cells if c not in claims and c not in UNREACHABLE)

print(f"[mesh-coverage] axes: posture {posture} · phase {phases} · realm {realms}")
print(f"[mesh-coverage] {len(cells)} reachable cell(s) · {len(claims)} claimed · {len(UNREACHABLE)} declared unreachable "
      f"· {len(scenarios)} scenario(s)")
for c, why in UNREACHABLE.items():
    print(f"      unreachable {c}: {why}")

if unknown:
    print("[mesh-coverage] a scenario CLAIMS a cell the axes do not contain:")
    for c in unknown: print(f"      {c}")
if missing:
    print("[mesh-coverage] NO SCENARIO WALKS THESE:")
    for c in missing: print(f"      {c}")
    print("      Add a scenario with `# COVERS: <cell>`, or declare the cell unreachable with its reason.")
if silent:
    print("[mesh-coverage] a scenario DECLARES NO CELL — say which one it walks, even if another scenario shares it:")
    for s in silent: print(f"      run_{s}")
if unknown or missing or silent:
    sys.exit(1)
print("[mesh-coverage] every reachable cell is walked")
PY
