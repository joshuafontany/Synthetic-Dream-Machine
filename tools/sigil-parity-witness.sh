#!/usr/bin/env bash
# sigil-parity-witness — every sigil declares what a cold parse does with it, and the scanner agrees.
set -uo pipefail
cd "$(dirname "$0")/.."
[ -f packages/lararium-tw5/dist/deserializer.js ] || { echo "[sigil-parity] @lararium/tw5 is not built — run \`pnpm -r build\`"; exit 1; }
REPO="$PWD" node tools/sigil-parity.mjs
