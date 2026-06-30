#!/usr/bin/env bash
# herm-mesh-witness — the live witness for docker-compose.mesh.yml: confirm the source Herm's
# announced dial (lar:///ha.ka.ba/@oracle/node/alpha) crossed the relay chain to relay-2, served at
# its content-addressed snapshot. Dependency-free (curl only) — the in-process tests cover the full
# pointer-signature/hash/freshness verify rule; this proves the CONTAINER-TO-CONTAINER relay.
#
#   source (HERM_SEED=alpha) → relay-1 (pulls source) → relay-2 (pulls relay-1, exposed :18080)
#
# Usage: docker compose -f docker-compose.mesh.yml up -d && ./tools/herm-mesh-witness.sh
set -euo pipefail
URL="${WITNESS_URL:-http://localhost:18080}"
NEEDLE="node/alpha"

for i in $(seq 1 30); do
  cid=$(curl -s --max-time 5 "$URL/oracle/pointer" 2>/dev/null | grep -o '"cid":"[0-9a-f]*"' | head -1 | cut -d'"' -f4 || true)
  if [ -n "$cid" ]; then
    if curl -s --max-time 5 "$URL/oracle/$cid.bin" 2>/dev/null | grep -aq "$NEEDLE"; then
      echo "✓ WITNESS: relay-2 serves \"$NEEDLE\" (carried source → relay-1 → relay-2)."
      echo "  the mesh-palace is a mesh across the astral space — the map relayed blind, three hops."
      exit 0
    fi
    echo "  attempt $i: relay-2 ok (cid=${cid:0:12}…) but \"$NEEDLE\" not yet propagated — waiting…"
  else
    echo "  attempt $i: relay-2 not ready — waiting…"
  fi
  sleep 1
done

echo "✗ WITNESS FAILED: \"$NEEDLE\" never reached relay-2 on $URL." >&2
exit 1
