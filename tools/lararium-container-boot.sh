#!/bin/sh
# lararium-container-boot — found THIS container's OWN Lararium, then serve. Per the per-vessel
# identity model, each vessel mints its own identity (separate from the operator identity), so a
# containerized Lararium founds its own (own vessel key + operator + binding edge) into its own
# volume — an independent sovereign hearth. The engine island is built host-side and carried in via
# the repo mount (the CAS substrate); this root gets its own copy so `lares vessel found` can read the CID.
set -e
: "${LAR_ROOT:?LAR_ROOT must be set}"

mkdir -p "$LAR_ROOT/genesis"
cp /app/genesis/island.* "$LAR_ROOT/genesis/" 2>/dev/null || true
cp -r /app/genesis/cas  "$LAR_ROOT/genesis/" 2>/dev/null || true   # the CAS substrate (engine/plugin blobs by CID — re-genesis)
# The genesis seed carries the ISLAND ALONE. The social bootstrap — one vessel's address book — lives
# in that vessel's own store (<lares>/vessel), so no copy of a seed can hand a container someone
# else's identity. Each container founds its own below.
#
# THE STORE SITES BY HOUSE, NOT BY KIND. Under LAR_ROOT each directory names an XDG kind — data, state,
# cache, config, run — and the two houses nest inside the data kind exactly as they do under XDG, so the
# spirits' substrate stands at `<root>/data/lares/vessel` beside the house's `<root>/data/lararium`.
# A probe reading one segment short finds nothing and re-founds a container that already stands.

if [ ! -f "$LAR_ROOT/data/lares/vessel/social-bootstrap.json" ]; then
  echo "[boot] founding this container's own Lararium (own vessel identity)…"
  # --skip-build: the container trusts the HOST's mounted dist (the dev builds before `up`); it cannot
  # run the full-workspace fresh-build itself (the TW5 submodule isn't populated in the bind mount).
  node packages/lares-cli/dist/src/bin/lares.js vessel found --skip-build
fi

# A PLACE IS NOT YET A HEARTH. `vessel found` stands the place FACELESS, and `standAs` reads a faceless
# vessel as a herm however the compose file labels it — so a container meant to serve as a full Lararium
# must LIGHT A FACE before it serves, or it stands the crossroads instead and announces no node dial.
# A Herm container leaves this unset on purpose: staying faceless IS its standing (Lares Viales).
if [ -n "${LAR_STAND_FACE:-}" ]; then
  # NEVER FATAL. Lighting a face seeds four planes through the repo, and a cold container whose peers have
  # not yet answered reports the plane doc unavailable — a vessel that then EXITS serves nothing at all,
  # where a faceless one still carries and routes. So the lift is attempted and its refusal is named, and
  # the container serves either way; `standAs` reads whatever actually stands.
  echo "[boot] lighting the face '${LAR_STAND_FACE}' — this container serves as a hearth, never a crossroads…"
  node packages/lares-cli/dist/src/bin/lares.js persona new 0 --name "$LAR_STAND_FACE" \
    || echo "[boot] the face did NOT light (see the error above) — serving faceless, at the waking floor"
fi

echo "[boot] serving…"
exec node packages/lararium-node/dist/src/main.js
