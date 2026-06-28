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

if [ ! -f "$LAR_ROOT/genesis/social-bootstrap.json" ]; then
  echo "[boot] founding this container's own Lararium (own vessel identity)…"
  node packages/lares-cli/dist/src/bin/lares.js init
fi

echo "[boot] serving…"
exec node packages/lararium-node/dist/src/main.js
