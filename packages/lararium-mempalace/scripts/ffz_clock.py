"""ffz_clock — the Fontany-Fuller-Zelenka rhythm clock, ported to py (behind the causal-island).

Two concerns ride here, both pure caps the pipeline composes later:

  1. THE LOGICAL CLOCK (ffz_zero/tick/compare/merge/serialize) — a bounded 5-level hierarchical
     stamp (L0 sub-action → L4 epoch). It PACES rhythmic position (WHERE in session/day/epoch),
     never total causal order; the CRDT edge-DAG carries causality. L4 grows unbounded so an epoch
     never aliases when lower levels roll. Ports packages/lararium-mesh/src/ffz-clock.ts.

  2. THE CLOCK RECOVERY (dominant_period / recover_clock) — THE Phase-3 physics. The nalu-gate
     RECOVERS the beat FROM the fed stream the way a PLL locks to data transitions: it reads an
     EVENT-INDEXED signal (per-event drift/cohesion), NEVER a wall-clock timestamp, and infers the
     fundamental beat as the stream's dominant autocorrelation period. The 5 FFZ bands EMERGE as
     nested subharmonics of that one beat. Ports src/clock-recovery.ts + the dominant_period read
     from src/temporal-rigidity.ts.

CLOCK-PURITY (two-clocks law): the recovery path touches NO host wall-time (no time.time()). Event
ordinal indexes the signal; the recovered beat rides in event-ordinal units. A static corpus carries
no temporal transitions, so it recovers NO beat — the clock reads holdover/provisional, never asserts
a rhythm fabricated from read-order (the Reference-Fusion-in-time trap the null-witness guards).

Meme: lar:///ha.ka.ba/@lares/sensorium/ffz-clock (the rhythm clock; the pipeline consumes it later).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

import numpy as np

# ---------------------------------------------------------------------------
# The logical clock — bounded 5-level hierarchical stamp
# ---------------------------------------------------------------------------

#: Default bounds per level (exclusive rollover). L4 (epoch) stays unbounded (math.inf) so it never
#: aliases. Stubs until real rhythm data seats coprime-prime bounds [59, 251, 1021, 367, inf].
FFZ_DEFAULT_BOUNDS: tuple[float, ...] = (64, 256, 1024, 365, math.inf)

#: The five attention-scale register names, fine→coarse (Pulse/Beat/Measure/Arc/Theme).
FFZ_REGISTER_NAMES: tuple[str, ...] = ("Pulse", "Beat", "Measure", "Arc", "Theme")

#: The recovery bands, fine→coarse — the nested subharmonics the recovered beat expresses at.
FFZ_BANDS_FINE_TO_COARSE: tuple[str, ...] = ("pulse", "beat", "measure", "arc", "theme")


@dataclass(frozen=True)
class FfzClock:
    """A rhythm stamp: five level values, their bounds, and the worldline handle that ticks it.

    `actor_id` names the logical lineage-path (ITC-style, decoupled from the persisting replica),
    NOT a CRDT actor — it also breaks ties when two clocks carry identical level tuples.
    """

    levels: tuple[int, ...]
    bounds: tuple[float, ...] = FFZ_DEFAULT_BOUNDS
    actor_id: str = ""


def ffz_zero(actor_id: str, bounds: tuple[float, ...] = FFZ_DEFAULT_BOUNDS) -> FfzClock:
    """Stand a zero clock for a worldline handle at the given bounds."""
    return FfzClock(levels=(0, 0, 0, 0, 0), bounds=bounds, actor_id=actor_id)


def ffz_tick(clock: FfzClock, level: int = 0) -> FfzClock:
    """Tick at `level` (default L0); a level reaching its bound resets to 0 and carries into the one
    above. L4 (epoch) grows unbounded."""
    lv = list(clock.levels)
    bv = list(clock.bounds)
    i = level
    while i < 5:
        lv[i] += 1
        if i < 4 and lv[i] >= bv[i]:
            lv[i] = 0
            i += 1
        else:
            break
    return FfzClock(levels=tuple(lv), bounds=clock.bounds, actor_id=clock.actor_id)


def ffz_compare(a: FfzClock, b: FfzClock) -> int:
    """The RHYTHMIC read — a lexicographic total order from L4 down (epoch dominates), actor_id
    breaking ties. Returns -1 | 0 | 1. This paces the grain; it never renders the causal verdict
    (a total order cannot say 'concurrent' — causality rides the edge-DAG / ITC stamp)."""
    for i in range(4, -1, -1):
        if a.levels[i] != b.levels[i]:
            return -1 if a.levels[i] < b.levels[i] else 1
    if a.actor_id < b.actor_id:
        return -1
    if a.actor_id > b.actor_id:
        return 1
    return 0


def ffz_merge(a: FfzClock, b: FfzClock) -> FfzClock:
    """CRDT merge (LWW): the dominant epoch wins; sub-epoch levels take the per-level max ONLY when
    both share the epoch. The merge keeps a's actor_id and bounds (the caller owns the local actor)."""
    epoch_a = a.levels[4]
    epoch_b = b.levels[4]
    dominant_epoch = max(epoch_a, epoch_b)
    merged: list[int] = []
    for i in range(5):
        if i == 4:
            merged.append(dominant_epoch)
        elif epoch_a == epoch_b:
            merged.append(max(a.levels[i], b.levels[i]))
        elif epoch_a > epoch_b:
            merged.append(a.levels[i])
        else:
            merged.append(b.levels[i])
    return FfzClock(levels=tuple(merged), bounds=a.bounds, actor_id=a.actor_id)


def ffz_serialize(clock: FfzClock) -> str:
    """Compact wire form `L0:L1:L2:L3:L4:actorHash` (actorHash = first 8 chars of actor_id)."""
    return ":".join(str(v) for v in clock.levels) + ":" + clock.actor_id[:8]


def ffz_deserialize(
    wire: str, actor_id: str, bounds: tuple[float, ...] = FFZ_DEFAULT_BOUNDS
) -> FfzClock | None:
    """Read the wire form back; the caller supplies the full actor_id + bounds. Returns None on a
    parse failure (a non-6-part wire, or a non-integer level)."""
    parts = wire.split(":")
    if len(parts) != 6:
        return None
    try:
        levels = tuple(int(p) for p in parts[:5])
    except ValueError:
        return None
    return FfzClock(levels=levels, bounds=bounds, actor_id=actor_id)


# ---------------------------------------------------------------------------
# The clock recovery — the PLL beat-inference from an event-indexed signal
# ---------------------------------------------------------------------------

#: Absolute ceiling on the autocorrelation lag sweep — caps cost on a very long signal.
MAX_LAG = 512


def _autocorr_at(x: np.ndarray, lag: int, mean: float, denom: float) -> float:
    """Normalized autocorrelation at a lag (mean-centered, full-variance denom — the biased estimator
    that suppresses spurious high-lag peaks). Returns 0 for a flat signal."""
    if denom <= 0:
        return 0.0
    n = x.shape[0]
    num = float(np.dot(x[lag:] - mean, x[: n - lag] - mean))
    return num / denom


def _dominant_lock(x: np.ndarray, min_lag: int, max_lag: int) -> tuple[int, float]:
    """The dominant period + its lock-quality, READ AS the strongest LOCAL MAXIMUM of the
    autocorrelation over [min_lag, max_lag] — not the global argmax (which rides the monotone-decay
    shoulder at min_lag for any smooth rhythm, mis-reporting the period). Returns period 0 when no
    local maximum stands (no real rhythm)."""
    n = x.shape[0]
    if max_lag < min_lag or n < 4:
        return 0, 0.0
    mean = float(np.mean(x))
    denom = float(np.sum((x - mean) ** 2))
    if denom <= 0:
        return 0, 0.0
    # Read the autocorrelation over [min_lag-1 .. max_lag+1] so the endpoints survive the local-max test.
    lo = max(1, min_lag - 1)
    hi = min(n // 2, max_lag + 1)
    ac: dict[int, float] = {}
    for lag in range(lo, hi + 1):
        ac[lag] = _autocorr_at(x, lag, mean, denom)
    best_lag = 0
    best_ac = 0.0
    for lag in range(min_lag, max_lag + 1):
        a = ac.get(lag, 0.0)
        if a <= 0:
            continue
        prev = ac.get(lag - 1, -math.inf)
        nxt = ac.get(lag + 1, -math.inf)
        if a > prev and a >= nxt and a > best_ac:
            best_ac = a
            best_lag = lag
    return best_lag, max(0.0, min(1.0, best_ac))


def dominant_period(
    signal: Sequence[float], min_lag: int | None = None, max_lag: int | None = None
) -> tuple[int, float]:
    """The dominant period + lock-quality of an event-indexed signal (the first strong autocorrelation
    LOCAL maximum). Finite-guarded; returns (0, 0.0) for garbage / too-short. NO wall-clock — the
    event ordinal indexes the signal. Ports temporal-rigidity.dominantPeriod."""
    x = np.asarray(signal, dtype=float)
    n = x.shape[0]
    if n < 4 or not np.all(np.isfinite(x)):
        return 0, 0.0
    ml = max(1, 2 if min_lag is None else min_lag)
    default_max = n // 3 if max_lag is None else max_lag
    xl = min(default_max, n // 2, MAX_LAG)
    return _dominant_lock(x, ml, xl)


@dataclass(frozen=True)
class RecoveredBand:
    """One recovered band — an emergent subharmonic of the fundamental beat."""

    name: str
    #: The band's period in event-ordinal units = beat × nest_ratio ** level.
    period: float
    #: Resolves when the period fits the signal (≤ n/2, so its cycle shows); else it falls to holdover.
    resolved: bool


@dataclass(frozen=True)
class ClockRecovery:
    """The recovery verdict: the fundamental beat, its lock-quality, and the emergent bands."""

    #: The recovered fundamental beat (period in event-ordinal units; 0 when unlocked).
    beat: int
    #: The beat's autocorrelation lock-quality ∈ [0, 1].
    lock_quality: float
    #: Locks when the beat stands strong enough to trust (lock_quality ≥ threshold).
    locked: bool
    #: Holds over when lock drops (sparse/flat feed) → free-runs provisional; NEVER fabricates a beat.
    holdover: bool
    #: The emergent bands — the beat's nested subharmonics (empty on holdover).
    bands: tuple[RecoveredBand, ...] = field(default_factory=tuple)


def recover_clock(
    signal: Sequence[float],
    n_bands: int = 5,
    nest_ratio: float = 2,
    lock_threshold: float = 0.3,
) -> ClockRecovery:
    """Recover the FFZ clock from an event-indexed signal: infer the fundamental beat (the dominant
    autocorrelation period), then emit the nested subharmonic bands. Below the lock threshold →
    HOLDOVER (no bands asserted; the clock free-runs provisional, never fabricates a rhythm).

    A STATELESS snapshot, byte-parity with the TS recoverClock (the parity fixture pins it). The
    STREAMING lock decision — hysteresis, quorum, holdover-decay across successive snapshots — rides
    nalu_gate.SchmittLock on top of this pure read."""
    x = np.asarray(signal, dtype=float)
    n = x.shape[0]
    nb = max(1, n_bands)
    beat, lock_quality = dominant_period(signal)
    locked = beat > 0 and lock_quality >= lock_threshold

    if not locked:
        # No recoverable beat → holdover (free-run, provisional). Never fabricate a rhythm from read-order.
        return ClockRecovery(beat=0, lock_quality=lock_quality, locked=False, holdover=True, bands=())

    bands: list[RecoveredBand] = []
    for level in range(nb):
        period = beat * (nest_ratio ** level)
        name = FFZ_BANDS_FINE_TO_COARSE[level] if level < len(FFZ_BANDS_FINE_TO_COARSE) else f"band-{level}"
        bands.append(RecoveredBand(name=name, period=period, resolved=period <= n / 2))

    return ClockRecovery(beat=beat, lock_quality=lock_quality, locked=True, holdover=False, bands=tuple(bands))
