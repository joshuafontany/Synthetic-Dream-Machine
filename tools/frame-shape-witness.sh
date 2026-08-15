#!/usr/bin/env bash
# frame-shape-witness — a frame mark on the speaking head names a malformed carrier, and an opened
# carrier closes. `round-trip` finds the same faults and reports them as a line diff against a render;
# this names the mark and the carrier, so a repair reads off the finding.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD" node tools/frame-shape.mjs
