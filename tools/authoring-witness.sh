#!/usr/bin/env bash
# authoring-witness — an operator authors a meme; the disk projection reads back schema-correct.
#
# The reciprocal of `round-trip`, and the leg the corpus cannot supply. `round-trip` proves canon stays
# canon over files that were already canonical when they landed; this proves a HAND-AUTHORED file
# BECOMES canon — the shape an operator writes in an editor, the shape a wiki VM hands the projector,
# the shape an older session still emits.
#
# The parse happens in a live wiki, for the reason `round-trip-witness` records.
set -uo pipefail
cd "$(dirname "$0")/.."
pnpm -s --filter @lararium/tw5 test grammar-in-a-wiki 2>&1 | grep -E "mints a schema-correct|Tests |×|FAIL" || true
pnpm -s --filter @lararium/tw5 test grammar-in-a-wiki >/dev/null 2>&1
