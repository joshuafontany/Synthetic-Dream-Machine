#!/usr/bin/env bash
# round-trip-witness — every carrier renders back to the bytes the WIKI parsed it from.
#
# ── WHY THIS IS THE LOAD-BEARING CHECK FOR bags/ ────────────────────────────────────────────────
# `bags/` is CANON, and the ingest loop compares each carrier against `render(parse(disk))`. When the
# two disagree, the carrier reads "changed" on every scan forever: it never converges, the merge seat
# never settles, and a projection that writes back rewrites the operator's authored source.
#
# The drift does not announce itself. A carrier reads perfectly to a human and still fails to
# round-trip, because the failure lives in the FRAME or in a fence that swallows the rest of the file.
# The sharpest one found: a fenced EXAMPLE containing its own ```toml meta fence closed the outer block,
# so the example's SOH became the file's, and 965 lines of a sprint log stopped parsing.
#
# ── THE PARSE HAPPENS IN A LIVE WIKI ────────────────────────────────────────────────────────────
# A sigil's meaning lives in the tiddler that defines it, so a reader standing outside a wiki holds a
# second opinion about the grammar. This witness runs the spec that parses inside one; the shell stays
# the operator's door and the wiki does the reading.
set -uo pipefail
cd "$(dirname "$0")/.."
pnpm -s --filter @lararium/tw5 test grammar-in-a-wiki 2>&1 | grep -E "renders back|strands content|Tests |×|FAIL" || true
pnpm -s --filter @lararium/tw5 test grammar-in-a-wiki >/dev/null 2>&1
