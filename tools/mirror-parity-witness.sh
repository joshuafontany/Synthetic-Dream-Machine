#!/usr/bin/env bash
# mirror-parity-witness — the isomorphism fixture names the verb table the CLI actually carries.
#
# ── WHY A WITNESS AND NOT A TEST ────────────────────────────────────────────────────────────────
# `fixtures/cli-verbs.json` is GENERATED from the live command table, and three green checks stand
# around it that cannot see it go stale:
#   · the python three-way guard asserts `mirror_hosts ∪ not_yet_mirrored == verbs` — the fixture's
#     INTERNAL coherence, which a stale snapshot satisfies perfectly because staleness moves both sides;
#   · `surface-projection.test.ts` compares the projection to `COMMAND_NAMES` — live against live;
#   · `surface-parity-witness` walks MCP tools to CLI doors, and never opens the fixture at all.
#
# Nothing WELDS the fixture to the table. Measured: a verb landed at the top level and the fixture kept
# naming the set without it while every one of those checks reported agreement. A unit test on either
# side of a pairing passes while the two disagree — the pairing is the thing, and only this run asks it.
#
# The generator already carries the comparison; it simply ran nowhere. Exit 0 = fixture current.
set -uo pipefail
cd "$(dirname "$0")/.."
node packages/lararium-sensorium/scripts/gen_cli_verbs.mjs --check
