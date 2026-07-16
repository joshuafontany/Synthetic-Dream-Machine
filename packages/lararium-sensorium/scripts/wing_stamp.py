#!/usr/bin/env python3
"""wing_stamp — the wing-routing semantics the Phase-7 strangle must not lose (py twin).

The TS engine's makeWingStampFlush (node-capture-engine.ts) carries three laws this
module preserves on the py side, byte-for-byte in behavior:

  1. THE RECORD'S OWN WING WINS. A record already carrying metadata["wing"] passes
     untouched — stamping never overrules an explicit designation.
  2. THE PREFIX DECODES, OR NOTHING DOES. A `<wing_...>/…` head on source_file names
     the wing; any other head (or no path at all) decodes to nothing. No guessing —
     a guessed wing is the confused deputy wearing a routing hat.
  3. NOTHING POOLS SILENTLY. An undecodable record routes to QUARANTINE_WING — an
     honestly-NAMED holding wing — with ONE loud warn per offending source_file, so
     a producer bug surfaces instead of hiding a misroute inside a default.

Meme: lar:///ha.ka.ba/lararium/capture/wing-stamp
"""
from __future__ import annotations

import sys

#: The honestly-named holding wing for records arriving without a decodable `<wing>/` prefix.
QUARANTINE_WING = "wing_quarantine"


def wing_from_source_file(source_file: str) -> "str | None":
    """Decode a `<wing>/…` routing prefix off a capture source_file, else None
    (no prefix → no wing; only a `wing_`-headed first segment counts)."""
    normalized = source_file.replace("\\", "/")
    slash = normalized.find("/")
    if slash <= 0:
        return None
    head = source_file[:slash]
    return head if head.startswith("wing_") else None


def stamp_wing(
    records: "list[dict]", *, warned: "set[str] | None" = None, warn=None
) -> "list[dict]":
    """Stamp every record's metadata["wing"] — the record's own wing wins, a decodable
    prefix routes, and everything else lands in QUARANTINE_WING with one loud warn per
    offending source_file. Returns NEW records; the inputs stay unmutated.

    `warned` carries the once-per-source memory across batches (the caller owns it, so
    a long drain warns once per source, not once per call); `warn` defaults to stderr."""
    if warned is None:
        warned = set()
    if warn is None:
        warn = lambda msg: print(msg, file=sys.stderr)  # noqa: E731

    out = []
    for rec in records:
        metadata = dict(rec.get("metadata") or {})
        if metadata.get("wing"):
            out.append({**rec, "metadata": metadata})
            continue
        source_file = rec.get("source_file", "")
        wing = wing_from_source_file(source_file)
        if wing is None and source_file not in warned:
            warned.add(source_file)
            warn(
                f'[capture] wing quarantine: source_file "{source_file}" carries no '
                f"wing_ prefix — routing to {QUARANTINE_WING}"
            )
        metadata["wing"] = wing or QUARANTINE_WING
        out.append({**rec, "metadata": metadata})
    return out
