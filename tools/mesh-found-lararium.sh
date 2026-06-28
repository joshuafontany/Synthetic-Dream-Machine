#!/usr/bin/env bash
# mesh-found-lararium — found a self-contained, isolated Lararium into <dir> for the Docker mesh
# harness. Builds the genesis island (idempotent), gives <dir> its OWN genesis copy (init reads the
# engine CID from LAR_ROOT/genesis), then founds identity + social-bootstrap. The result is fully
# self-contained under <dir> (genesis/ + .lararium-identity/ + .lararium/), mountable into a container
# as LAR_ROOT. Secrets stay local (gitignore .mesh-test/).
#
# Usage: tools/mesh-found-lararium.sh .mesh-test/lararium-a
set -euo pipefail
DIR="${1:?usage: mesh-found-lararium.sh <dir>}"
cd "$(dirname "$0")/.."
REPO="$(pwd)"

# 1. Build the genesis island (the TW5 engine CID) if absent.
if [ ! -f "$REPO/genesis/island.cid-engine" ]; then
  echo "[found] building genesis island…"
  pnpm --filter @lararium/node build:genesis
fi

# 2. Give the isolated root its own genesis — init reads the island from LAR_ROOT/genesis.
mkdir -p "$DIR/genesis"
cp "$REPO"/genesis/island.* "$DIR/genesis/"

# 3. Found identity + social-bootstrap into the isolated root (non-interactive, idempotent).
echo "[found] founding Lararium into $DIR…"
LAR_ROOT="$DIR" lares init

echo "[found] ✓ self-contained Lararium at $DIR — mount as LAR_ROOT in the mesh compose."
