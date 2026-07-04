"""nalu_gate — the reactive gate physics behind the capture stream, ported to py as pure caps.

The name tracks the BUILT mechanism, not the aspirational 'double-slit' metaphor: what actually
stands here reads as a **PLL lock-detector + a Schmitt-quorum servo + the coalesce window**. Three
composable caps the pipeline wires later:

  · SchmittLock  — THE streaming lock decision on top of the stateless recover_clock snapshot. It
                   holds LOCK / HOLDOVER / UNLOCKED across successive reads with DUAL thresholds
                   (hysteresis, so lock never chatters near one line) + a QUORUM (integrate-and-fire:
                   N reads above the line before it asserts LOCK) + a HOLDOVER grace (free-run on the
                   last beat before it drops). It NEVER fabricates a beat — below the low line long
                   enough, it damps to holdover and free-runs, marked provisional.
  · WindowServo / adapt_window — the COALESCE-family window servo (AIMD homeostat): grow the window
                   multiplicatively on overload (coalesce more, each flush carries a fresher state
                   for less work), shrink additively on headroom. Ports gate-tuning.adaptWindow.
  · CoalesceGate — the coalesce-family gate (a burst of marks collapses to ONE flush, newest wins,
                   intermediates fade, no reserve). Driven by an INJECTED ordinal clock — no host
                   wall-time — so it stays deterministic and honors clock-purity. Ports the physics
                   of projection-nalu.CoalesceGate.

CLOCK-PURITY: no cap here reads time.time(). The caller drives the ordinal (the recovered beat, or a
tick counter); the gate constitutes its timing FROM that drive, never fetches a global now.

Meme: lar:///ha.ka.ba/@lares/sensorium/nalu-gate (the gate physics; the pipeline composes it later).
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


# ---------------------------------------------------------------------------
# SchmittLock — the PLL lock-detector (hysteresis + quorum + holdover)
# ---------------------------------------------------------------------------

class LockState(str, Enum):
    """The three phases the lock detector holds across the stream."""

    UNLOCKED = "unlocked"   # no beat trusted yet — building quorum
    LOCKED = "locked"       # the beat stands and re-locks; the bands assert
    HOLDOVER = "holdover"   # lock dropped → free-run on the last beat, provisional


@dataclass(frozen=True)
class LockReading:
    """One step's verdict: the phase, the beat it stands on (last-known while HOLDOVER), and whether
    the bands may assert (LOCKED alone)."""

    state: LockState
    beat: int
    #: The bands assert ONLY while genuinely LOCKED — never on a free-run holdover beat.
    asserted: bool


class SchmittLock:
    """A Schmitt-trigger lock detector with quorum + holdover — the streaming wrapper over the
    stateless recover_clock read.

    Dual thresholds prevent lock-chatter: quality must climb to `lock_hi` (for `quorum` consecutive
    reads) to ASSERT lock, and fall below `lock_lo` (for `holdover_grace` consecutive reads) to DROP
    to holdover. Between the lines the current phase HOLDS. A static/flat feed never crosses `lock_hi`
    with quorum → the detector stays UNLOCKED (or damps to HOLDOVER), never asserting a fabricated beat.
    """

    def __init__(
        self,
        lock_hi: float = 0.3,
        lock_lo: float = 0.15,
        quorum: int = 2,
        holdover_grace: int = 2,
    ) -> None:
        if not (0.0 <= lock_lo <= lock_hi <= 1.0):
            raise ValueError("thresholds must satisfy 0 <= lock_lo <= lock_hi <= 1")
        self._lock_hi = lock_hi
        self._lock_lo = lock_lo
        self._quorum = max(1, quorum)
        self._grace = max(1, holdover_grace)
        self._state = LockState.UNLOCKED
        self._beat = 0          # the last-known beat (kept through holdover for free-run)
        self._hits = 0          # consecutive reads above lock_hi (building quorum)
        self._misses = 0        # consecutive reads below lock_lo (spending the holdover grace)

    @property
    def state(self) -> LockState:
        return self._state

    @property
    def beat(self) -> int:
        return self._beat

    def step(self, lock_quality: float, beat: int) -> LockReading:
        """Advance the detector one read. `lock_quality` + `beat` come from a recover_clock snapshot
        (or dominant_period). Returns the phase, the standing beat, and whether the bands may assert."""
        above = lock_quality >= self._lock_hi
        below = lock_quality < self._lock_lo

        # Count consecutive crossings — reset the opposite counter on any crossing.
        if above:
            self._hits += 1
            self._misses = 0
        elif below:
            self._misses += 1
            self._hits = 0
        else:
            # Inside the deadband — hold both counters' progress dormant (neither confirms).
            self._hits = 0
            self._misses = 0

        if self._state == LockState.LOCKED:
            if above or not below:
                # Re-lock (or stay inside the band): TRACK the fresh beat.
                self._beat = beat if beat > 0 else self._beat
            elif below and self._misses >= self._grace:
                # Long enough below the low line → drop to holdover, free-run on the last beat.
                self._state = LockState.HOLDOVER
        elif self._state == LockState.HOLDOVER:
            if above and self._hits >= self._quorum:
                self._state = LockState.LOCKED
                self._beat = beat if beat > 0 else self._beat
                self._misses = 0
        else:  # UNLOCKED
            if above and self._hits >= self._quorum and beat > 0:
                self._state = LockState.LOCKED
                self._beat = beat

        asserted = self._state == LockState.LOCKED
        return LockReading(state=self._state, beat=self._beat, asserted=asserted)


# ---------------------------------------------------------------------------
# WindowServo / adapt_window — the coalesce-window AIMD homeostat
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class WindowServo:
    """Self-regulation config for the coalesce window (the AIMD servo, see adapt_window)."""

    #: The flush/reconcile-latency set-point (ms) the window servos toward.
    target_ms: float
    #: Floor — the min coalesce window (responsiveness bound).
    min_ms: float
    #: Ceiling — the max staleness budget (beyond it, the window buys latency with no throughput).
    max_ms: float
    #: Deadband half-width (fraction of target): |error| within this HOLDS the window.
    hysteresis: float = 0.25
    #: Multiplicative GROW factor on overload (AIMD: back off fast).
    grow_factor: float = 1.5
    #: Additive shrink step (ms) on headroom (AIMD: recover slow); None → min_ms.
    shrink_step_ms: float | None = None


def adapt_window(current_ms: float, observed_latency_ms: float, servo: WindowServo) -> int:
    """One homeostatic servo step for a coalesce window — the DUAL of a lossless-batch depth servo.
    A lossy/newest-wins window GROWS when flush/reconcile latency runs high (rendering while the prior
    flush still drains wastes work, so spacing flushes wider makes each carry a fresher state for less
    work), and SHRINKS to probe responsiveness on headroom. AIMD (multiplicative back-off / additive
    recovery) converges where MIMD/AIAD oscillate; a deadband holds the window so noise stays unchased.
    The result clamps to [min_ms, max_ms]. Ports gate-tuning.adaptWindow."""
    if servo.target_ms <= 0:
        return round(current_ms)
    h = servo.hysteresis
    grow = servo.grow_factor
    shrink = servo.shrink_step_ms if servo.shrink_step_ms is not None else servo.min_ms
    error = (observed_latency_ms - servo.target_ms) / servo.target_ms  # >0 = too slow
    nxt = current_ms
    if error > h:
        nxt = current_ms * grow          # overload → multiplicative GROW (coalesce more)
    elif error < -h:
        nxt = current_ms - shrink        # headroom → additive shrink (probe responsiveness)
    return int(round(max(servo.min_ms, min(servo.max_ms, nxt))))


# ---------------------------------------------------------------------------
# CoalesceGate — the coalesce-family gate (injected ordinal clock, no wall-time)
# ---------------------------------------------------------------------------

class CoalesceGate:
    """The coalesce-family gate: a burst of marks within one window collapses to ONE flush, the newest
    SOURCE state wins, intermediates fade. No reserve, no backoff, no dead-letter — a dropped
    intermediate frame reads as the correct dual of the accumulate family's every-one-delivered.

    An INJECTED ordinal clock drives it (`mark(now)` / `tick(now)`) — never host wall-time — so it
    stays deterministic and honors clock-purity. `now` rides in whatever ordinal the caller drives
    (the recovered beat, a tick counter). `rev` is a monotone frame counter so a sink can drop a stale
    frame that overtakes a newer one. Ports the physics of projection-nalu.CoalesceGate."""

    family = "coalesce"

    def __init__(self, window: float) -> None:
        self._window = window
        self._dirty = False
        self._rev = 0
        self._deadline: float | None = None

    def mark(self, now: float) -> None:
        """The SOURCE moved — coalesce: a burst of marks arms a SINGLE deferred flush (the window runs
        from the first mark of the burst)."""
        self._dirty = True
        if self._deadline is None:
            self._deadline = now + self._window

    def tick(self, now: float) -> int | None:
        """Advance the ordinal clock. Fires the flush when the window closes over a dirty gate,
        returning the new (monotone) rev; returns None when nothing crests."""
        if self._deadline is None or now < self._deadline:
            return None
        self._deadline = None
        if not self._dirty:
            return None
        self._dirty = False
        self._rev += 1
        return self._rev

    @property
    def revision(self) -> int:
        return self._rev

    @property
    def armed(self) -> bool:
        return self._deadline is not None
