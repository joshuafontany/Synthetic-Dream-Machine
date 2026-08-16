#!/usr/bin/env bash
# type-parity-witness — one declaration of the carrier's media type; every dispatch key registers both
# names. A record whose type no reader admits stops projecting SILENTLY, so the fork gets caught at the
# literal rather than at the missing file.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD" node tools/type-parity.mjs
