#!/usr/bin/env bash
# authoring-witness — an operator authors a meme; the disk projection reads back schema-correct.
#
# The reciprocal of `round-trip`, and the leg the corpus cannot supply. `round-trip` proves canon stays
# canon over files that were already canonical when they landed; this proves a HAND-AUTHORED file
# BECOMES canon — the shape an operator writes in an editor, the shape a wiki VM hands the projector,
# the shape an older session still emits.
#
# Exit 0 = every authored shape mints a schema-correct carrier and settles on the second pass.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ ! -f packages/lararium-tw5/dist/deserializer.js ]; then
  echo "[authoring] @lararium/tw5 is not built — run \`pnpm -r build\`"; exit 1
fi
node tools/authoring-probe.mjs
