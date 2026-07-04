"""test_ffz_clock — witnesses for the py FFZ rhythm clock + the nalu-gate physics.

The load-bearing anti-fabrication guards (these GATE Phase 3):
  · static-corpus NULL — a frozen corpus (no temporal transitions) recovers NO beat (holdover), never
    a rhythm fabricated from read-order. THE guard: a naive synthetic test passes; this must catch it.
  · holdover — a below-threshold (noise) feed damps to holdover, never asserts a beat.
  · lock — a synthetic RHYTHMIC stream locks + emits nested subharmonic bands.
  · TS↔py parity — the py recover_clock matches the committed fixture the canonical TS twin generated.

Run:
    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_ffz_clock.py -q

Regenerate the parity fixture from the canonical TS twin:
    packages/lararium-mesh/node_modules/.bin/tsx packages/lararium-mesh/scripts/clock_recovery_fixture.ts
"""
import json
import math
import os

import numpy as np

import ffz_clock as fc
from nalu_gate import CoalesceGate, LockState, SchmittLock, WindowServo, adapt_window


# ── The logical clock ────────────────────────────────────────────────────────

def test_logical_clock_tick_rolls_and_carries():
    clk = fc.ffz_zero("w1", bounds=(4, 4, 4, 4, math.inf))
    for _ in range(4):  # L0 hits its bound of 4 → resets, carries into L1
        clk = fc.ffz_tick(clk)
    assert clk.levels == (0, 1, 0, 0, 0)


def test_logical_clock_compare_epoch_dominates():
    lo = fc.FfzClock(levels=(9, 9, 9, 9, 1), actor_id="a")
    hi = fc.FfzClock(levels=(0, 0, 0, 0, 2), actor_id="b")
    assert fc.ffz_compare(lo, hi) == -1  # higher epoch wins despite lower sub-levels
    assert fc.ffz_compare(hi, lo) == 1


def test_logical_clock_merge_same_epoch_takes_max():
    a = fc.FfzClock(levels=(3, 1, 0, 0, 5), actor_id="a")
    b = fc.FfzClock(levels=(1, 4, 0, 0, 5), actor_id="b")
    assert fc.ffz_merge(a, b).levels == (3, 4, 0, 0, 5)


def test_logical_clock_serialize_roundtrips():
    clk = fc.ffz_zero("worldline-xyz")
    clk = fc.ffz_tick(clk)
    wire = fc.ffz_serialize(clk)
    back = fc.ffz_deserialize(wire, "worldline-xyz")
    assert back is not None and back.levels == clk.levels
    assert fc.ffz_deserialize("bad:wire", "x") is None


# ── WITNESS 1: the static-corpus NULL (THE guard) ────────────────────────────

def test_witness_static_corpus_recovers_no_beat():
    """A frozen corpus carries no temporal transitions — the clock must NOT assert a beat from
    read-order (the Reference-Fusion-in-time trap)."""
    flat = [1.0] * 64                       # no variation at all
    ramp = list(range(64))                  # monotone structural cadence, no oscillation
    for note, sig in (("flat", flat), ("ramp", ramp)):
        rec = fc.recover_clock(sig)
        assert rec.beat == 0, note
        assert rec.locked is False, note
        assert rec.holdover is True, note
        assert rec.bands == (), note


# ── WITNESS 2: holdover (below-threshold feed damps, never asserts) ───────────

def test_witness_noise_feed_holds_over():
    rng = np.random.default_rng(7)
    noise = (rng.standard_normal(64) * 0.0 + rng.random(64) - 0.5).tolist()
    rec = fc.recover_clock(noise, lock_threshold=0.6)  # a strict line: weak noise cannot cross it
    assert rec.locked is False
    assert rec.holdover is True
    assert rec.beat == 0


# ── WITNESS 3: a rhythmic stream LOCKS + the bands emerge as subharmonics ─────

def test_witness_rhythmic_stream_locks_and_emits_bands():
    period = 8
    sig = [math.sin(2 * math.pi * i / period) for i in range(96)]
    rec = fc.recover_clock(sig)
    assert rec.locked is True
    assert rec.holdover is False
    assert rec.beat == period
    assert rec.lock_quality >= 0.3
    # the bands ride as nested dyadic subharmonics of the one beat: 8, 16, 32, 64, 128
    assert [b.period for b in rec.bands] == [8, 16, 32, 64, 128]
    assert [b.name for b in rec.bands] == list(fc.FFZ_BANDS_FINE_TO_COARSE)
    # a band resolves only if its cycle fits (≤ n/2 = 48): 8,16,32 resolve; 64,128 fall to holdover
    assert [b.resolved for b in rec.bands] == [True, True, True, False, False]


# ── WITNESS 4: TS↔py parity across the committed fixture ──────────────────────

def _load_fixture():
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "fixtures", "clock-recovery-parity.json")
    with open(path) as f:
        return json.load(f)


def test_witness_parity_dominant_period_matches_ts():
    fx = _load_fixture()
    for c in fx["cases"]:
        period, lq = fc.dominant_period(c["signal"])
        assert period == c["dominant"]["period"], c["note"]
        assert lq == c["dominant"]["lockQuality"] or abs(lq - c["dominant"]["lockQuality"]) < 1e-9, c["note"]


def test_witness_parity_recover_clock_matches_ts():
    fx = _load_fixture()
    d = fx["defaults"]
    for c in fx["cases"]:
        rec = fc.recover_clock(
            c["signal"], n_bands=d["nBands"], nest_ratio=d["nestRatio"], lock_threshold=d["lockThreshold"]
        )
        exp = c["recovery"]
        assert rec.beat == exp["beat"], c["note"]
        assert rec.locked == exp["locked"], c["note"]
        assert rec.holdover == exp["holdover"], c["note"]
        assert abs(rec.lock_quality - exp["lockQuality"]) < 1e-9, c["note"]
        assert len(rec.bands) == len(exp["bands"]), c["note"]
        for got, want in zip(rec.bands, exp["bands"]):
            assert got.name == want["name"], c["note"]
            assert abs(got.period - want["period"]) < 1e-9, c["note"]
            assert got.resolved == want["resolved"], c["note"]


# ── The SchmittLock streaming detector (PLL lock + hysteresis + quorum) ───────

def test_schmitt_static_never_asserts():
    """A static feed reads lock_quality 0 forever → the detector stays UNLOCKED, never asserts."""
    lock = SchmittLock(lock_hi=0.3, lock_lo=0.15, quorum=2)
    for _ in range(10):
        r = lock.step(0.0, beat=0)
    assert r.state == LockState.UNLOCKED
    assert r.asserted is False
    assert r.beat == 0


def test_schmitt_locks_after_quorum_then_holds_over():
    lock = SchmittLock(lock_hi=0.3, lock_lo=0.15, quorum=2, holdover_grace=2)
    # one strong read — quorum not yet met
    assert lock.step(0.9, beat=8).state == LockState.UNLOCKED
    # second strong read — quorum met, LOCK asserts on the beat
    r = lock.step(0.9, beat=8)
    assert r.state == LockState.LOCKED and r.asserted and r.beat == 8
    # the feed goes weak: the grace holds the lock for one read, then drops to holdover (free-run beat)
    assert lock.step(0.05, beat=0).state == LockState.LOCKED   # grace #1
    r = lock.step(0.05, beat=0)                                # grace spent
    assert r.state == LockState.HOLDOVER
    assert r.asserted is False          # the bands never assert on a free-run holdover beat
    assert r.beat == 8                  # but the last-known beat free-runs


def test_schmitt_hysteresis_holds_in_the_deadband():
    """Between the two lines the phase HOLDS — no chatter. A locked clock riding the deadband stays
    locked; an unlocked one stays unlocked."""
    lock = SchmittLock(lock_hi=0.3, lock_lo=0.15, quorum=1)
    lock.step(0.9, beat=8)                       # LOCK (quorum 1)
    assert lock.step(0.2, beat=8).state == LockState.LOCKED   # 0.2 sits in the deadband → holds lock
    fresh = SchmittLock(lock_hi=0.3, lock_lo=0.15, quorum=1)
    assert fresh.step(0.2, beat=8).state == LockState.UNLOCKED  # deadband from cold → still unlocked


# ── The coalesce-window servo (AIMD) + the coalesce gate ─────────────────────

def test_adapt_window_grows_on_overload_shrinks_on_headroom():
    servo = WindowServo(target_ms=100, min_ms=10, max_ms=1000, hysteresis=0.25, grow_factor=1.5)
    assert adapt_window(100, 200, servo) == 150       # overload (200 > 100+25%) → grow ×1.5
    assert adapt_window(100, 40, servo) == 90         # headroom (40 < 100-25%) → shrink by min_ms
    assert adapt_window(100, 105, servo) == 100       # inside the deadband → hold


def test_coalesce_gate_collapses_a_burst_to_one_flush():
    gate = CoalesceGate(window=5)
    gate.mark(now=0)      # arm the window [0, 5)
    gate.mark(now=1)      # a burst — coalesces into the same window
    gate.mark(now=2)
    assert gate.tick(now=3) is None       # window still open
    assert gate.tick(now=5) == 1          # window closes → ONE flush, rev 1
    assert gate.tick(now=6) is None       # nothing dirty
    gate.mark(now=7)
    assert gate.tick(now=12) == 2         # a fresh burst → the next flush, rev 2
