#!/usr/bin/env bash
# exact-deps-witness — every dependency this workspace declares names ONE version, never a range.
#
# ── WHY A RANGE COSTS SAFETY IN A MESH ──────────────────────────────────────────────────────────
# `^1.2.3` means "whatever 1.x npm serves the day someone installs." Two vessels founded a week apart
# from the same manifest then hold different bytes, and neither can say so — the manifest reads
# identical on both. For a local-first mesh standing a semi-permanent vessel, that is a divergence
# with no witness, which is the one kind this house refuses.
#
# It also erases an act. A dependency bump here is a NAMED motion — `vessel flow rebuild` exists as the
# identity-safe cure for exactly that skew — and a range performs that motion by itself, unrecorded,
# between two runs of a command nobody re-typed.
#
# So the version lives in the manifest, and a bump is a commit. `pnpm up` still moves them; it moves
# them where a reader can see it.
#
# EXEMPT: `workspace:` / `link:` / `file:` — those name a PLACE in this repo, never a version to
# resolve. Submodules (TiddlyWiki5, mempalace) carry their own upstream discipline and are not ours
# to rule.
#
# Exit 0 = every declared dependency is exact.
set -uo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import json, pathlib, re, sys

RANGE = re.compile(r'^[\^~]|[><*]|\|\||\s-\s')
LOCAL = ("workspace:", "link:", "file:")

manifests = [pathlib.Path("package.json"), pathlib.Path("tests/package.json")]
manifests += sorted(pathlib.Path("packages").glob("*/package.json"))

loose, counted = [], 0
for m in manifests:
    if not m.exists():
        continue
    d = json.loads(m.read_text())
    for sec in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        for name, spec in (d.get(sec) or {}).items():
            if spec.startswith(LOCAL):
                continue
            counted += 1
            # A PEER range stays legal and is the one place a range means something else: it declares
            # what a HOST may satisfy, not what this package installs. Pinning one would forbid hosts
            # that are perfectly compatible.
            if sec == "peerDependencies":
                continue
            if RANGE.search(spec):
                loose.append(f"{m}  {sec}.{name} = {spec}")

print(f"[exact-deps] {counted} declared dependencies across {len(manifests)} manifests")
if loose:
    print(f"  {len(loose)} declared as a RANGE rather than one version:")
    for x in loose:
        print(f"    {x}")
    print("  Pin each to the version already resolved:  pnpm why <name>   (or read pnpm-lock.yaml)")
    sys.exit(1)
print("  every version exact — a founding installs the same bytes whenever it runs")
PY
