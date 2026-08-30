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
  # LIT AGAINST THIS ISLAND'S OWN STORE, never against the mesh. Lighting a face MINTS four planes and
  # writes the PersonaGroup id into a bootstrap this container already holds — every doc it touches lives
  # on local disk. With LAR_PEERS set, the repo reaches for peers that have not yet stood and the mint
  # answers `Document … is unavailable`: a resolution failure standing in for a dependency that was never
  # real. So the lift runs peerless and the SERVER carries the peers, which also reads right — a face is
  # what this vessel holds, never what the mesh grants it.
  LAR_PEERS= node packages/lares-cli/dist/src/bin/lares.js persona new 0 --name "$LAR_STAND_FACE" \
    || echo "[boot] the face did NOT light (see the error above) — serving faceless, at the waking floor"
fi

# A HEARTH THAT CARRIES IS NOT YET A HEARTH THAT TENDS. A single face lifts a vessel off the floor and
# leaves the Nexus ungoverned: the roster forms from personas that declared a HANDLE and took a CHAIR,
# so a face minted with neither seats nobody and `nexus seal show` reads an empty quorum with a
# fail-closed threshold. `LAR_STAND_KAHU` names the chairs, comma-separated, and this container seats
# them before it serves.
#
# THE SEAL IS FILE-LOCAL, so it lands before the exec below rather than against a running daemon —
# `seal reserve` and `seal seat` read and write this vessel's own nexus home. A container seats its
# own founding quorum for the same reason it founds its own identity: nothing in the mesh grants it.
if [ -n "${LAR_STAND_KAHU:-}" ]; then
  echo "[boot] seating the founding kahu: ${LAR_STAND_KAHU}"
  _i=0
  # THREE ACTS PER COMMAND, never one: --name labels privately, --handle declares outward, --seat
  # stands for a chair. Only the last two reach the roster.
  printf '%s' "$LAR_STAND_KAHU" | tr ',' '\n' | while IFS= read -r _handle; do
    [ -z "$_handle" ] && continue
    LAR_PEERS= node packages/lares-cli/dist/src/bin/lares.js persona new "$_i" \
      --name "kahu-$_i" --handle "$_handle" --seat \
      || echo "[boot] kahu $_i ('$_handle') did NOT stand — the roster will read short"
    _i=$((_i + 1))
  done
  # `rite cabal` composes seal reserve · seal seat · seal show — the reserve arms the next epoch, the
  # seat writes the roster from what stood, and the threshold derives majority over it.
  LAR_PEERS= node packages/lares-cli/dist/src/bin/lares.js nexus rite cabal \
    || echo "[boot] the cabal did NOT seat (see above) — this hearth carries but does not tend"
fi

echo "[boot] serving…"
exec node packages/lararium-node/dist/src/main.js
