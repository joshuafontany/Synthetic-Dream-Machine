#!/usr/bin/env bash
# mesh-coverage-witness — every reachable mesh state has a scenario, or is declared unreachable.
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
    # THE HARNESS STANDS TWO OPERATORS. `quorum` phase reads >= 2 CONTRACTED operators, and this
    # compose file carries exactly two lararium services — so A can hold at most one contracted
    # peer (B). Reaching these cells means a third operator in the mesh, not a new assertion.
    **{f"{p}/quorum/{r}": "the harness stands two operators; the quorum phase needs a third"
       for p in ("private", "open") for r in ("unfed", "visit", "many-faces")},
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
