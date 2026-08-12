#!/usr/bin/env bash
# round-trip-witness — every meme carrier renders back to the bytes it was parsed from.
#
# ── WHY THIS IS THE LOAD-BEARING CHECK FOR bags/ ────────────────────────────────────────────────
# `bags/` is CANON, and the ingest loop compares each carrier against `render(parse(disk))`. When the
# two disagree, the carrier reads "changed" on every scan forever: it never converges, the merge seat
# never settles, and a projection that writes back rewrites the operator's authored source.
#
# The drift does not announce itself. A carrier reads perfectly to a human and still fails to
# round-trip, because the failure lives in the FRAME (a missing section sigil, a fused `<<^ N ahu #x >>`,
# a namespace echoed as an entity where the SOH wants the decoded character) or in a fence that
# swallows the rest of the file.
#
# The sharpest one found: a fenced EXAMPLE containing its own ```toml iam fence closed the outer block,
# so the example's SOH became the file's, and 965 lines of a sprint log stopped parsing. A longer outer
# fence fixed it. Nothing about that is visible by reading.
#
# THE IAM BLOCK IS EXEMPT. Key realignment and added metadata (`origin-bag`) are the renderer's business
# and the operator has ruled them acceptable; only BODY drift fails here.
#
# Exit 0 = every carrier round-trips.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ ! -f packages/lararium-tw5/dist/ingest-gate.js ]; then
  echo "[round-trip] @lararium/tw5 is not built — run \`pnpm -r build\`"; exit 1
fi

OUT="$(mktemp -t round-trip-XXXXXX.json)"
trap 'rm -f "$OUT"' EXIT
REPO="$PWD" OUT="$OUT" node tools/round-trip-probe.mjs >/dev/null || { echo "[round-trip] probe failed"; exit 1; }

REPO="$PWD" OUT="$OUT" python3 - <<'PY'
import json, os, re, sys, difflib
data = json.load(open(os.environ["OUT"]))
def strip_iam(t):
    return re.sub(r'```toml iam\n.*?\n```\n', '```toml iam\n<IAM>\n```\n', t, flags=re.S)

drift = []
for x in data:
    if x.get("same") is not False: continue
    a, b = strip_iam(x["disk"]), strip_iam(x["canonical"])
    if a == b: continue                      # iam-only churn: accepted, not body drift
    n = sum(1 for l in difflib.unified_diff(a.split("\n"), b.split("\n"), n=0, lineterm="")
            if l[:1] in "+-" and l[:3] not in ("---", "+++"))
    drift.append((n, x["f"]))

total = len(data)
print(f"[round-trip] {total} carriers parsed · {len(drift)} whose BODY does not render back")
if drift:
    for n, f in sorted(drift, reverse=True):
        print(f"    {n:5d} lines  {f}")
    print("  Repair the CARRIER, never the renderer's output — adopting a render can encode a")
    print("  malformed frame back into canon. `tools/round-trip-probe.mjs` prints the per-file diff.")
    sys.exit(1)
print("  every carrier renders back to the bytes it was parsed from")
PY
