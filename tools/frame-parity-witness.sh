#!/usr/bin/env bash
# frame-parity-witness — the carrier frame the spec declares, against the frame the code recognises.
#
# The grammar is the one seam in this tree where a declaration can run ahead of its implementation
# with nothing to say so: the spec states which control marks stand, the readers scan for their own
# set by hand, and no single-artifact witness can see between them.
#
# Exit 0 = every mark the spec stands, some reader scans for.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD" node tools/frame-parity.mjs
