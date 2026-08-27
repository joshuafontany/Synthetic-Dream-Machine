#!/usr/bin/env bash
# ahu-sections-witness — every named ahu section becomes an addressable tiddler.
#
# A carrier's `<<~ ahu #name >>` children become tiddlers, and the section's address
# (`lar:///<uri-path>#name`, or `#parent/child` where a section nests) resolves to one. A section
# that never becomes a tiddler is a name pointing at nothing.
#
# NO OTHER WITNESS SEES THIS. The block check verifies bytes; round-trip verifies the re-render;
# frame-parity verifies the marks. All three stay green on a carrier whose sections collapsed.
#
# Exit 0 = every open closes, and every open addresses.
set -uo pipefail
cd "$(dirname "$0")/../packages/lararium-tw5"
npx vitest run tests/ahu-sections-address.test.ts --reporter=dot 2>&1 | tail -12
exit "${PIPESTATUS[0]}"
