#!/usr/bin/env python3
"""worldline_ffz — the PER-WORLDLINE FFZ leg: membership stamps + per-braid rhythm testimony.

The demux (worldline_io) partitions the captured turns into braids; this leg walks each braid and
serves the MEMBERSHIP-TREE address model (`ffz_address` — a band answers WHICH, never HOW MANY; the
sequence rides the edge-DAG, never the address):

  1. THE EVENT-SIGNAL. Per worldline, order its content turns (down the spawn-tree, parents before
     children — worldline_io.branch_keys), then read each turn's vector and compute the per-turn
     CONTENT-DRIFT `1 - cos(turn_vector, running_centroid)`. Event-INDEXED (the turn ordinal
     indexes it), NEVER host-time (Face-III, clock-purity).

  2. THE STAMP — membership enrichment. The capture path (mesh build-patch → ffzMembershipAddress)
     already mints `lar_ffz` as a membership address (`profile/theme.arc.measure.beat.pulse`, `_`
     naming an absent cell). This leg ENRICHES: it fills the absent BEAT cell with the turn's own
     identity (the grounding-ratchet label — same-turn drawers share a beat cell, so the ultrametric
     reads them adjacent), minting a fresh `worldline/` address only where no membership stamp
     stands. A cell LABELS; nothing tallies.

  3. THE RHYTHM TESTIMONY. `ffz_clock.recover_clock(drift_signal)` still runs per braid — as
     REPORT-ONLY testimony (beat period, lock quality, holdover) for the operator's read. The
     recovered period never enters an address: a count that entered the address would harden into
     the global-now anti-pattern the membership tree exists to refuse.

  4. THE DESYNC WITNESS. Each braid draws a `desync.roberts_phase` off a stable per-root hash;
     `phase_spread` witnesses the braids' mutual incommensurability. Report-only.

CLOCK-PURITY (the sighting ward, no-global-now): the stamp path imports NO host clock. A re-run
over the same braids mints the same addresses → an idempotent stamp. The worldline stays LOCAL —
it never federates.

Meme: lar:///ha.ka.ba/lararium/sensorium/worldline-ffz
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

import numpy as np

from desync import min_pairwise_gap, roberts_phase
from ffz_clock import recover_clock

# The metadata slot the whole stack reads for the membership address (drawer_io projects it, the
# mesh capture path mints it). This per-worldline leg ENRICHES the same shape under the same key.
FFZ_META = "lar_ffz"

# The profile this leg mints where NO membership stamp stands (a capture-time stamp keeps its own
# profile — "session" — through enrichment; only a stamp-less drawer takes this one).
FFZ_PROFILE = "worldline"

#: The membership tree's absent-cell sentinel (mesh FFZ_ABSENT / ffz_address NULL_BAND).
ABSENT = "_"

#: The five bands, coarse→fine — the address tuple's fixed arity (mesh FFZ_ADDRESS_ORDER).
N_BANDS = 5

#: The beat band's index in the coarse→fine tuple (theme.arc.measure.BEAT.pulse).
BEAT_INDEX = 3


# ---------------------------------------------------------------------------
# 1. the event-signal — order the braid's turns + read the content-drift
# ---------------------------------------------------------------------------


def worldline_turn_order(worldline_store, root, as_of=None) -> list:
    """The braid's turn-keys in causal order — the root PLUS its spawn-tree descendants (parents
    before children; worldline_io.branch_keys already walks fork+linear breadth-first). This orders
    the event-signal the clock consumes."""
    return worldline_store.branch_keys(root, as_of)


def _iter_turn_vectors(content_stores, wanted):
    """Yield (turn_key, vector) pairs. SCOPED when `wanted` (a turn-key set) rides in — a targeted
    chroma $in read pulls ONLY the braids being stamped (never the whole corpus, so a kapae'd/idle
    tail of unrelated drawers never gets scanned). `wanted=None` keeps the full `scan` (back-compat)."""
    from content_io import TURN_KEY_META

    for store in content_stores:
        if wanted is not None:
            for tk, vecs in store.vectors_for_turns(wanted).items():
                for emb in vecs:
                    yield tk, emb
            continue
        offset = 0
        while True:
            page = store.scan(offset, 256)
            recs = page.get("records") or []
            for r in recs:
                tk = str((r.get("metadata") or {}).get(TURN_KEY_META, "")).strip()
                emb = r.get("embedding")
                if tk and emb is not None:
                    yield tk, emb
            nxt = page.get("next")
            if nxt is None:
                break
            offset = nxt


def collect_turn_vectors(content_stores, wanted=None) -> dict:
    """A `turn_key -> mean vector` map. A turn lands as one-or-more drawers (chunks) sharing a
    `lar_turn_key`; this AVERAGES a turn's chunk vectors into one turn vector (the turn's centroid in
    embedding space). When `wanted` (a turn-key set) rides in, the pull SCOPES to those braids via a
    chroma $in read; else it full-scans (back-compat). Skips a drawer with no key or no vector."""
    sums: dict = {}
    counts: dict = {}
    for tk, emb in _iter_turn_vectors(content_stores, wanted):
        v = np.asarray(emb, dtype=float)
        if tk in sums:
            sums[tk] = sums[tk] + v
            counts[tk] += 1
        else:
            sums[tk] = v
            counts[tk] = 1
    return {tk: sums[tk] / counts[tk] for tk in sums}


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity, guarded — a zero-norm vector reads 0 similarity (no direction to compare),
    so its drift falls to the max (a null turn moved maximally away from the running centroid)."""
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na <= 0.0 or nb <= 0.0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def drift_signal(vectors: list) -> list:
    """The per-turn CONTENT-DRIFT `1 - cos(v_i, running_centroid(v_0..v_{i-1}))` — the event-indexed
    signal recover_clock consumes. The first turn carries no history, so it reads drift 0 (the braid
    opens at rest). The running centroid accumulates the mean of the turns SEEN SO FAR (a turn drifts
    against the braid's past, never against itself)."""
    sig: list = []
    running_sum: "np.ndarray | None" = None
    count = 0
    for v in vectors:
        if running_sum is None:
            sig.append(0.0)  # no past → no drift; the braid opens at rest
        else:
            centroid = running_sum / count
            sig.append(1.0 - _cosine(v, centroid))
        running_sum = v.copy() if running_sum is None else running_sum + v
        count += 1
    return sig


# ---------------------------------------------------------------------------
# 3. the desync-phase — mutually non-resonant braid grid-origins
# ---------------------------------------------------------------------------


def _stable_phase_index(root: str) -> int:
    """A STABLE integer keyed off the root STRING (the C1b veiled `wl-<hash>` root turn-key), NOT the
    sorted-enumeration position — so a later braid whose root sorts EARLIER never shifts every other
    braid's index and re-stamps the whole corpus (the idempotence break YANG's stress-lens named). A
    12-hex slice of sha256 feeds roberts_phase's `frac(index/ρ)`, which stays low-discrepancy for any int."""
    return int(hashlib.sha256(root.encode("utf-8")).hexdigest()[:12], 16)


def worldline_phases(worldline_store, as_of=None) -> dict:
    """Draw each braid's desync PHASE off a STABLE per-root hash — `root -> roberts_phase(hash(root))`,
    the plastic-ρ low-discrepancy offset. Keyed by the root's own identity (not its sorted-enumeration
    index), so adding a braid never re-stamps the others (idempotent under a new join). The braids still
    hold mutually non-resonant phases with zero coordination (the incommensurability tool);
    `desync.min_pairwise_gap` witnesses the spread. `desync_relax` composes behind the SAME interface."""
    return {root: roberts_phase(_stable_phase_index(root)) for root in worldline_store.roots(as_of)}


# ---------------------------------------------------------------------------
# 4. the stamp — membership enrichment (the beat cell fills; nothing tallies)
# ---------------------------------------------------------------------------


def _label(text: str) -> str:
    """A stable 8-hex LABEL off a string identity — names WHICH cell, never how many."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:8]


def membership_stamp(turn_key: str, root: str, existing: "str | None" = None) -> str:
    """The drawer's membership address, ENRICHED: the beat cell takes the turn's own identity label
    (the grounding-ratchet — same-turn drawers share the cell), every other cell keeps whatever the
    capture path minted. Where no membership stamp stands, a fresh `worldline/_.<arc>._.<beat>`
    mints with arc = the braid root's label. Idempotent: enriching an already-enriched address
    returns it unchanged."""
    beat = _label(turn_key)
    if existing and "/" in existing:
        profile, _, tail = existing.partition("/")
        segs = tail.split(".") if tail else []
        segs += [ABSENT] * (N_BANDS - len(segs))
        if segs[BEAT_INDEX] == ABSENT:
            segs[BEAT_INDEX] = beat
        while segs and segs[-1] == ABSENT:
            segs.pop()
        return f"{profile}/" + ".".join(segs)
    segs = [ABSENT, _label(root), ABSENT, beat]
    return f"{FFZ_PROFILE}/" + ".".join(segs)


# ---------------------------------------------------------------------------
# the orchestrator — recover a clock per braid + stamp the addresses
# ---------------------------------------------------------------------------


@dataclass
class WorldlineClock:
    """One braid's report: the stamp tally + the rhythm TESTIMONY (report-only — the recovered
    period never enters an address)."""

    root: str
    #: TESTIMONY: the recovered fundamental period in turn-ordinal units (0 on holdover).
    beat: int
    lock_quality: float
    locked: bool
    holdover: bool
    #: The braid's mutually-non-resonant desync phase-offset ∈ [0, 1). Witness-only.
    phase: float
    #: The count of content turns the signal read.
    turns: int
    #: The count of drawers whose lar_ffz stamp landed or enriched.
    stamped: int
    #: TESTIMONY: the recovered band names (empty on holdover).
    bands: tuple = field(default_factory=tuple)


def assign_worldline_ffz(worldline_store, content_stores, *, as_of=None,
                         lock_threshold: float = 0.3) -> dict:
    """Enrich `lar_ffz` membership stamps across every braid, and testify each braid's rhythm.

    Per root: order the content turns, read their vectors, and ENRICH each turn's drawers — the beat
    cell takes the turn's identity label; capture-minted cells stand untouched; a stamp-less
    drawer mints fresh. The drift-signal feeds `recover_clock`, whose reading rides
    the report as TESTIMONY only. LOCAL only; the stamp rides content_io.patch_metadata
    (vector-safe). Returns `{root: WorldlineClock}` — deterministic and idempotent (the same braid
    enriches to the same address; an unchanged address still merge-writes the same value)."""
    # Order every braid's turns FIRST, then pull vectors SCOPED to exactly those turn-keys — never a
    # whole-corpus scan (a store may hold far more drawers than the braids being stamped).
    roots = worldline_store.roots(as_of)
    ordered_by_root = {root: worldline_turn_order(worldline_store, root, as_of) for root in roots}
    wanted = {tk for keys in ordered_by_root.values() for tk in keys}
    vecmap = collect_turn_vectors(content_stores, wanted)
    phases = worldline_phases(worldline_store, as_of)
    report: dict = {}

    for root in roots:
        ordered_keys = ordered_by_root[root]
        # Keep only the turns that carry content (the events the signal can read), in braid order.
        content_keys = [k for k in ordered_keys if k in vecmap]
        vectors = [vecmap[k] for k in content_keys]
        signal = drift_signal(vectors)
        rec = recover_clock(signal, lock_threshold=lock_threshold)
        phase = phases.get(root, 0.0)

        stamped = 0
        for tk in content_keys:
            for store in content_stores:
                for cid in store.cids_for_turn(tk):
                    current = (store.get(cid) or {}).get("metadata", {}).get(FFZ_META)
                    addr = membership_stamp(tk, root, current)
                    res = store.patch_metadata(cid, {FFZ_META: addr})
                    if res.get("ok"):
                        stamped += 1

        report[root] = WorldlineClock(
            root=root, beat=rec.beat, lock_quality=rec.lock_quality, locked=rec.locked,
            holdover=rec.holdover, phase=phase, turns=len(content_keys), stamped=stamped,
            bands=tuple(b.name for b in rec.bands),
        )
    return report


def phase_spread(worldline_store, as_of=None) -> float:
    """The incommensurability WITNESS — the min circular gap between the braids' drawn phases (>0 when
    the cadences stay apart; 0 when two braids' grids coincide, the lock this leg averts)."""
    return min_pairwise_gap(list(worldline_phases(worldline_store, as_of).values()))


# ---------------------------------------------------------------------------
# the CLI face — `enrich`: fill absent beat cells across every braid
# ---------------------------------------------------------------------------


def main() -> None:
    """`worldline_ffz.py enrich --palace <content-dir> [--worldline <dir>]` — run the
    membership enrichment over a standing palace + its worldline store, and print the
    per-run JSON report (braids · turns · stamps · rhythm testimony tallies). Idempotent:
    a re-run enriches to the same addresses and reports the same stamp count."""
    import argparse
    import json
    import os
    import sys

    import content_io as cio
    import worldline_io as wl

    ap = argparse.ArgumentParser(
        description="worldline_ffz — enrich lar_ffz membership stamps (the beat cell fills; nothing tallies).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("enrich", help="fill absent beat cells across every braid (idempotent)")
    e.add_argument("--palace", required=True, help="the content palace dir (the chroma plane)")
    e.add_argument("--worldline", default=None,
                   help="the worldline dir (default: the `.worldline` beside the palace's parent)")
    args = ap.parse_args()

    palace = os.path.abspath(args.palace)
    root = os.path.dirname(palace)

    # DECLARATION-CARRIES-AUTHORITY: the sensorium's manifest names which cells its mood can EARN
    # and the provider that earns each. The beat leg runs only where `apertures.beat` declares the
    # worldline-dag provider; an undeclared fill refuses loud. Declared-but-unprovided apertures
    # (e.g. a corpus's `measure: boundary-changepoint`) get NAMED in the report, never silently
    # skipped — a seat with no provider speaks.
    manifest_path = os.path.join(root, "manifest.json")
    apertures = {}
    if os.path.isfile(manifest_path):
        with open(manifest_path, encoding="utf-8") as fh:
            apertures = (json.load(fh).get("apertures") or {})
    if apertures.get("beat") != "worldline-dag":
        sys.stderr.write(
            "worldline_ffz: this sensorium declares no `apertures.beat: worldline-dag` — "
            f"the beat cell stays unearnable here (manifest: {manifest_path}). "
            "Geology earns measure, never beat; declare the aperture to license the fill.\n")
        raise SystemExit(3)
    unprovided = sorted(k for k in apertures if k != "beat")

    wdir = args.worldline or os.path.join(root, ".worldline")
    if not os.path.isdir(wdir):
        sys.stderr.write(f"worldline_ffz: no worldline store at {wdir!r} — nothing to enrich\n")
        raise SystemExit(3)

    report = assign_worldline_ffz(wl.WorldlineStore(wdir), [cio.ContentStore(palace)])
    out = {
        "braids": len(report),
        "turns": sum(c.turns for c in report.values()),
        "stamped": sum(c.stamped for c in report.values()),
        "locked": sum(1 for c in report.values() if c.locked),
        "holdover": sum(1 for c in report.values() if c.holdover),
        "phase_spread": phase_spread(wl.WorldlineStore(wdir)),
        "unprovided_apertures": unprovided,
    }
    sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
