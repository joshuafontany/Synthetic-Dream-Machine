"""deep_time — the deep-time seams the machina crosses on a centuries-long mesh run.

Two hedges live here, each a SINGLE named home so a 500-year drift never scatters the intent
across the codebase:

1. **island-local wall-time provenance** (`island_local_now`) — the ISLAND'S own wall clock,
   minted as a PROVENANCE note ONLY. Under no-global-now (FFZ / causal-islands) island clocks
   skew and NEVER compare across islands; this value orders NOTHING. Ordering rides the logical
   ticks (the CRDT-causal clock and the FFZ rhythm) — never this reading. Named to strip the
   false-clock authority: a rough "this node saw it around here", never a global truth.

2. **content-address / identity hash** (`content_hash`) — the algorithm's ONE home, so hash-agility
   can roll it forward later while old addresses stay valid. TODAY still sha256, BYTE-IDENTICAL to a
   bare `hashlib.sha256(data).hexdigest()`; a future roll adds a NEW algo without breaking the past.

Imports NOTHING from the sensorium modules — stdlib only — so the io/encoder/manifest sites route
through it with no circular import.

Meme: lar:///ha.ka.ba/lararium/sensorium/deep-time
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone


def island_local_now(*, millis: bool = False, z: bool = False) -> str:
    """Read the minting ISLAND'S local wall-time as an ISO-8601 string — a PROVENANCE note ONLY.

    NOT a global now, NOT a causal clock: under no-global-now island clocks skew, so this value
    NEVER compares across islands and orders NOTHING. Ordering authority rides the logical/FFZ
    ticks, never this reading (two-clocks: neither the CRDT-causal clock nor the FFZ rhythm).

    Format flags preserve each caller's existing on-disk shape byte-for-byte:
    - default (`millis=False, z=False`): `datetime.now(utc).isoformat()` → `...+00:00`.
    - `millis=True`: seconds carry exactly three fractional digits (`timespec="milliseconds"`).
    - `z=True`: the `+00:00` offset renders as a trailing `Z`.
    """
    timespec = "milliseconds" if millis else "auto"
    stamp = datetime.now(timezone.utc).isoformat(timespec=timespec)
    if z:
        stamp = stamp.replace("+00:00", "Z")
    return stamp


def content_hash(data: bytes) -> str:
    """The content-address / identity hash seam — the algorithm's SINGLE home (hash-agility).

    TODAY returns EXACTLY `hashlib.sha256(data).hexdigest()`, BYTE-IDENTICAL, so every existing
    content address stays valid. A future roll swaps the algorithm HERE (adding a new-algo path)
    while old sha256 addresses keep resolving — the seam that lets the hash move without breaking
    a centuries-old store."""
    return hashlib.sha256(data).hexdigest()
