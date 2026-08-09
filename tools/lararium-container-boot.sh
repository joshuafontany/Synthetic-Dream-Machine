#!/bin/sh
# lararium-container-boot — found THIS container's OWN Lararium, then serve. Per the per-vessel
# identity model, each vessel mints its own identity (separate from the operator identity), so a
# containerized Lararium founds its own (own vessel key + operator + binding edge) into its own
# volume — an independent sovereign hearth. The engine island is built host-side and carried in via
# the repo mount (the CAS substrate); this root gets its own copy so `lares init` can read the CID.
set -e
: "${LAR_ROOT:?LAR_ROOT must be set}"

mkdir -p "$LAR_ROOT/genesis"
cp /app/genesis/island.* "$LAR_ROOT/genesis/" 2>/dev/null || true
cp -r /app/genesis/cas  "$LAR_ROOT/genesis/" 2>/dev/null || true   # the CAS substrate (engine/plugin blobs by CID — re-genesis)
# The genesis seed carries the ISLAND ALONE. The social bootstrap — one vessel's address book — lives
# in that vessel's own store (<data>/vessel), so no copy of a seed can hand a container someone
# else's identity. Each container founds its own below.

if [ ! -f "$LAR_ROOT/data/vessel/social-bootstrap.json" ]; then
  echo "[boot] founding this container's own Lararium (own vessel identity)…"
  # --skip-build: the container trusts the HOST's mounted dist (the dev builds before `up`); it cannot
  # run the full-workspace fresh-build itself (the TW5 submodule isn't populated in the bind mount).
  node packages/lares-cli/dist/src/bin/lares.js init --skip-build
fi

echo "[boot] serving…"
exec node packages/lararium-node/dist/src/main.js
