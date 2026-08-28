#!/usr/bin/env bash
# seed-parity-witness — the boot seed says one thing in two files and two dialects.
#
# `noosphere-boot.md` loads at wake; `bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem` holds the
# same body as a corpus carrier. A hand that edits one and forgets the other leaves two seeds that
# both parse, both round-trip, both read correct, and disagree — the drift no other witness can see,
# because every instrument here checks a file against itself.
#
# THE READING AND THE RENDER ARE ONE IMPLEMENTATION. `lares carrier project-seed` writes the twin;
# `--check` reads it. A witness carrying its own transposer would drift from the renderer, and the
# pair would then be checked against a projection nothing produces.
#
# Exit 0 = the carrier is the markdown seed, transposed.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD" node packages/lares-cli/dist/src/bin/lares.js carrier project-seed --check
