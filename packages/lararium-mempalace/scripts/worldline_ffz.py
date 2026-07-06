#!/usr/bin/env python3
"""worldline_ffz — the PER-WORLDLINE FFZ gate: each braid recovers its OWN local rhythm clock.

The demux (worldline_io) partitions the captured turns into braids; this step gives each braid its
own FFZ clock — the rhythm the nalu-gate RECOVERS from that braid's content-drift — and stamps every
drawer with `lar_ffz`, the rhythmic POSITION (a membership coordinate, WHERE-in-the-cadence), never a
decay scalar (manaoio serves decay; this clock serves position — agent-worldline Face-III).

The four legs compose the ALREADY-BUILT pieces (this module reinvents none of the physics):

  1. THE EVENT-SIGNAL. Per worldline, order its content turns (down the spawn-tree, parents before
     children — worldline_io.branch_keys), then read each turn's vector and compute the per-turn
     CONTENT-DRIFT `1 - cos(turn_vector, running_centroid)` — the ffz-orchestrator's Measure-band
     signal. Event-INDEXED (the turn ordinal indexes it), NEVER host-time (Face-III, clock-purity).

  2. THE CLOCK. `ffz_clock.recover_clock(drift_signal)` infers the braid's beat + nested subharmonic
     bands, or HOLDS OVER when the braid reads too sparse/flat to lock (the static-corpus-null: a
     braid with no rhythm recovers no beat, it never fabricates one from read-order).

  3. THE DESYNC-PHASE. Each worldline draws a `desync.roberts_phase` off its `roots()` index —
     mutually NON-RESONANT across braids (the plastic-ρ low-discrepancy phase, coordination-free), so
     no two braids' cadences lock into a manufactured global-now. The phase shifts the braid's grid
     ORIGIN, so two braids sharing a beat still land in different cells.

  4. THE STAMP. `content_io.patch_metadata` writes `lar_ffz` onto every drawer of the braid's turns —
     the vector-safe metadata update (no re-embed, no vector clobber). The address serializes
     COARSE→FINE and nests dyadically, so it stays prefix-truncatable exactly like
     bands_sidecar.ffz_cells / mesh ffzMembershipAddress (a coarser read drops trailing fine bands).

CLOCK-PURITY (the sighting ward, no-global-now): the recover + stamp path imports NO host clock. The
turn ORDINAL indexes the signal; the recovered beat rides in ordinal units; the address encodes a
position, not a time. A re-run over the same drift recovers the same clock → the same address → an
idempotent stamp. The worldline stays LOCAL — it never federates.

Meme: lar:///ha.ka.ba/@lararium/sensorium/worldline-ffz
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from desync import min_pairwise_gap, roberts_phase
from ffz_clock import recover_clock

# The metadata slot the whole stack already reads for the rhythmic address (drawer_io projects it,
# bands_sidecar mints the corpus form). This per-worldline leg mints the SAME shape under the SAME key.
FFZ_META = "lar_ffz"

# The address family this leg mints (bands_sidecar rides "corpus"; a braid rides "worldline"). The
# braid IDENTITY lives in the drawer's worldline binding (lar_turn_key → worldline_of), so the address
# stays PURELY positional — it names where-in-the-cadence, not which braid.
FFZ_PROFILE = "worldline"

# A braid too sparse/flat to lock holds over — it carries no cadence, so the address names the
# free-run position honestly (never a fabricated numeric grid). Prefix-truncates to the profile.
FFZ_HOLDOVER = "holdover"


# ---------------------------------------------------------------------------
# 1. the event-signal — order the braid's turns + read the content-drift
# ---------------------------------------------------------------------------


def worldline_turn_order(worldline_store, root, as_of=None) -> list:
    """The braid's turn-keys in causal order — the root PLUS its spawn-tree descendants (parents
    before children; worldline_io.branch_keys already walks fork+linear breadth-first). This orders
    the event-signal the clock consumes."""
    return worldline_store.branch_keys(root, as_of)


def collect_turn_vectors(content_stores) -> dict:
    """Scan every content store into a `turn_key -> mean vector` map. A turn lands as one-or-more
    drawers (chunks) sharing a `lar_turn_key`; this AVERAGES a turn's chunk vectors into one turn
    vector (the turn's centroid in embedding space). content_io.get carries no embedding, so the read
    rides `scan` (the embedding-bearing page leg). Skips a drawer with no `lar_turn_key` or no vector."""
    from content_io import TURN_KEY_META

    sums: dict = {}
    counts: dict = {}
    for store in content_stores:
        offset = 0
        while True:
            page = store.scan(offset, 256)
            recs = page.get("records") or []
            for r in recs:
                tk = str((r.get("metadata") or {}).get(TURN_KEY_META, "")).strip()
                emb = r.get("embedding")
                if not tk or emb is None:
                    continue
                v = np.asarray(emb, dtype=float)
                if tk in sums:
                    sums[tk] = sums[tk] + v
                    counts[tk] += 1
                else:
                    sums[tk] = v
                    counts[tk] = 1
            nxt = page.get("next")
            if nxt is None:
                break
            offset = nxt
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


def worldline_phases(worldline_store, as_of=None) -> dict:
    """Draw each braid's desync PHASE off its `roots()` index — `root -> roberts_phase(index)`, the
    plastic-ρ low-discrepancy offset. Keyed by index alone, the braids hold mutually non-resonant
    phases with zero coordination (the incommensurability tool); `desync.min_pairwise_gap` witnesses
    the spread. `desync_relax` composes behind the SAME interface when active repulsion gets wired."""
    roots = worldline_store.roots(as_of)
    return {root: roberts_phase(i) for i, root in enumerate(roots)}


# ---------------------------------------------------------------------------
# 4. the stamp — the rhythmic POSITION address (COARSE→FINE, prefix-truncatable)
# ---------------------------------------------------------------------------


def ffz_address(ordinal: int, beat: int, phase: float = 0.0, *, n_bands: int = 5,
                nest_ratio: int = 2, profile: str = FFZ_PROFILE) -> str:
    """The turn's membership address on the recovered grid — WHERE the ordinal sits in each nested
    band, COARSE→FINE. The phase shifts the grid ORIGIN by `phase * beat` (up to one beat), so two
    braids sharing a beat but drawing different phases land in different cells (the desync leg folds in
    here). Dyadic nesting makes each finer digit `g_k mod nest_ratio ∈ [0, nest_ratio)`, so dropping a
    trailing digit reads the coarser membership (the ultrametric holds — bands_sidecar's invariant).

    A held-over braid (beat 0) carries no grid → the free-run position `<profile>/holdover`, never a
    fabricated numeric address."""
    if beat <= 0:
        return f"{profile}/{FFZ_HOLDOVER}"
    t = ordinal + phase * beat
    # Periods COARSE→FINE — the recovered beat's nested subharmonics (theme = coarsest, pulse = beat).
    periods = [beat * (nest_ratio ** level) for level in range(n_bands - 1, -1, -1)]
    cycles = [int(t // p) for p in periods]  # the global cycle-index in each band
    # The coarsest digit grows unbounded (the epoch-like count); each finer digit nests mod the ratio.
    digits = [cycles[0]] + [c % nest_ratio for c in cycles[1:]]
    return f"{profile}/" + ".".join(str(d) for d in digits)


# ---------------------------------------------------------------------------
# the orchestrator — recover a clock per braid + stamp the addresses
# ---------------------------------------------------------------------------


@dataclass
class WorldlineClock:
    """One braid's recovered rhythm + the stamp tally — the per-worldline report."""

    root: str
    #: The recovered fundamental beat in turn-ordinal units (0 on holdover).
    beat: int
    lock_quality: float
    locked: bool
    holdover: bool
    #: The braid's mutually-non-resonant desync phase-offset ∈ [0, 1).
    phase: float
    #: The count of content turns the signal read.
    turns: int
    #: The count of drawers stamped with lar_ffz.
    stamped: int
    #: The recovered band names (empty on holdover).
    bands: tuple = field(default_factory=tuple)


def assign_worldline_ffz(worldline_store, content_stores, *, as_of=None,
                         lock_threshold: float = 0.3, n_bands: int = 5,
                         nest_ratio: int = 2, profile: str = FFZ_PROFILE) -> dict:
    """Recover a local FFZ clock per braid and stamp `lar_ffz` on every drawer of the braid's turns.

    Per root: order the content turns, read their vectors, compute the drift-signal, recover the clock,
    draw the desync phase, and stamp each turn's drawers with its COARSE→FINE membership address (a
    held-over braid stamps the free-run position — no fabricated beat). LOCAL only; the stamp rides
    content_io.patch_metadata (vector-safe). Returns `{root: WorldlineClock}` — deterministic and
    idempotent (same drift → same clock → same address → the same merge-write)."""
    vecmap = collect_turn_vectors(content_stores)
    phases = worldline_phases(worldline_store, as_of)
    report: dict = {}

    for root in worldline_store.roots(as_of):
        ordered_keys = worldline_turn_order(worldline_store, root, as_of)
        # Keep only the turns that carry content (the events the clock can read), in braid order.
        content_keys = [k for k in ordered_keys if k in vecmap]
        vectors = [vecmap[k] for k in content_keys]
        signal = drift_signal(vectors)
        rec = recover_clock(signal, n_bands=n_bands, nest_ratio=nest_ratio, lock_threshold=lock_threshold)
        phase = phases.get(root, 0.0)

        stamped = 0
        for ordinal, tk in enumerate(content_keys):
            addr = ffz_address(ordinal, rec.beat, phase, n_bands=n_bands,
                               nest_ratio=nest_ratio, profile=profile)
            for store in content_stores:
                for cid in store.cids_for_turn(tk):
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
