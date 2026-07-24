#!/usr/bin/env python3
"""test_rhythm_phase — the planted-truth witness for the rhythm-phase plane.

Three planted cases, each a truth the instrument must recover from data alone:

  1. A PLANTED periodic signal — the phase advances ~linearly within each period, the envelope
     amplitude stands high and steady, and the LOCK saturates high at the planted scale.
  2. WHITE NOISE — no steady rhythm: the lock stays LOW (incoherent) and the envelope jitters,
     read comparatively against the planted signal at the same scale (a narrowband slice of
     noise still rings, so the honest witness reads the GAP, never an absolute floor).
  3. A TWO-STRATUM signal where B = A DELAYED by a fixed lag — the cross-stratum phase-lead
     recovers that lag, SIGN and MAGNITUDE (positive when A leads B; flips when B leads A).

Run (from this directory):
  PYTHONPATH=/home/joshu/Synthetic-Dream-Machine/mempalace \
    /home/joshu/.venv/bin/python3 -m pytest test_rhythm_phase.py -v
"""
from __future__ import annotations

import numpy as np

from rhythm_phase import (
    cross_stratum_lead,
    lens_from_coord,
    lens_from_streams,
    phase_encode,
    phase_linearity,
    tick_coordinate,
)

PERIOD = 32          # the planted period (ticks) — lands near the scale-32 detail band
N = 4096             # a long enough pour for ≥ CYCLES cycles at the planted scale


def _planted(n=N, period=PERIOD, phase0=0.0, amp=1.0):
    """A clean planted sinusoid — the instrument's own positive control."""
    t = np.arange(n, dtype=float)
    return amp * np.sin(2.0 * np.pi * t / period + phase0)


def _nearest_band(enc, target=PERIOD):
    """The band whose scale sits nearest the planted period."""
    return min(enc["bands"], key=lambda b: abs(b["scale"] - target))


# ── case 1 — a planted period: phase advances linearly, amplitude + lock high ──────────────


def test_planted_period_phase_advances_and_locks():
    enc = phase_encode(_planted())
    band = _nearest_band(enc)
    # The planted band's phase advances ~linearly within each period.
    assert phase_linearity(band) > 0.999, phase_linearity(band)
    # The lock saturates high at the planted scale (a steady beat).
    assert band["mean_lock"] > 0.9, band["mean_lock"]
    # The envelope stands HIGH and STEADY — the unit-amplitude tone's energy concentrates in
    # this band (the rest rides the adjacent octave), and its coefficient of variation stays low.
    assert band["mean_amplitude"] > 0.4, band["mean_amplitude"]
    assert band["amp_cv"] < 0.15, band["amp_cv"]
    # The instrument names the planted scale as the DOMINANT rhythm (or an adjacent octave).
    assert enc["dominant"]["scale"] in (16, 32, 64), enc["dominant"]["scale"]
    # The stacked encoding carries [(phase, amplitude) per scale] at every position.
    assert enc["encoding"].shape == (N, len(enc["bands"]), 2)


# ── case 2 — white noise: phase incoherent, amplitude low (read comparatively) ─────────────


def test_white_noise_incoherent_versus_planted():
    rng = np.random.default_rng(4241)
    noise = rng.standard_normal(N)
    enc_noise = phase_encode(noise)
    enc_signal = phase_encode(_planted())
    b_noise = _nearest_band(enc_noise)
    b_signal = _nearest_band(enc_signal)
    # The noise band's lock falls FAR below the planted band's at the same scale (incoherent).
    assert b_noise["mean_lock"] < b_signal["mean_lock"] - 0.3, (
        b_noise["mean_lock"], b_signal["mean_lock"])
    # NOTE — phase LINEARITY does NOT discriminate here, and the witness must not pretend it
    # does: a narrowband db4 detail imposes its OWN centre frequency, so a white-noise slice
    # advances its phase near-linearly (≈1.0) exactly as the planted tone does. Linearity
    # certifies the band is narrowband (true by construction), never that a real rhythm lives
    # there. The ENVELOPE steadiness carries the discrimination — the noise envelope JITTERS
    # (a far higher coefficient of variation than the steady beat).
    assert b_noise["amp_cv"] > b_signal["amp_cv"] + 0.3, (b_noise["amp_cv"], b_signal["amp_cv"])
    # No band in the noise pour locks the way the planted beat does.
    assert max(b["mean_lock"] for b in enc_noise["bands"]) < 0.85, (
        max(b["mean_lock"] for b in enc_noise["bands"]))


# ── case 3 — two strata, B = A delayed by a fixed lag: recover the lag (sign + magnitude) ──


def test_cross_stratum_lead_recovers_delay():
    lag = 5  # B lags A by 5 ticks → A leads B → the read should recover +5
    a = _planted()
    b = _planted(phase0=-2.0 * np.pi * lag / PERIOD)  # a phase delay of `lag` ticks
    out = cross_stratum_lead(a, b)
    dom = out["dominant"]
    # The highest-coherence band names the planted scale and holds a tight relation.
    assert dom["scale"] in (16, 32, 64), dom["scale"]
    assert dom["coherence"] > 0.9, dom["coherence"]
    # A leads B → the recovered lag is POSITIVE and lands near the planted 5 ticks.
    assert dom["lag_ticks"] > 0, dom["lag_ticks"]
    assert abs(dom["lag_ticks"] - lag) < 2.0, dom["lag_ticks"]


def test_cross_stratum_lead_sign_flips():
    lag = 5
    a = _planted()
    b = _planted(phase0=-2.0 * np.pi * lag / PERIOD)
    # Swapping the pair flips the sign: now B is passed first, so B leads → negative lag.
    out = cross_stratum_lead(b, a)
    dom = out["dominant"]
    assert dom["lag_ticks"] < 0, dom["lag_ticks"]
    assert abs(dom["lag_ticks"] + lag) < 2.0, dom["lag_ticks"]


# ── the lens faces — coordinate-driven, not role-hardwired ─────────────────────────────────


def test_lens_from_streams_carries_both_strata_and_the_lead():
    lag = 4
    a = _planted()
    b = _planted(phase0=-2.0 * np.pi * lag / PERIOD)
    # A two-stream lens keyed on stream-id — one instance of the tunable coordinate.
    out = lens_from_streams({"streamA": a, "streamB": b})
    assert set(out["strata"]) == {"streamA", "streamB"}
    assert out["strata"]["streamA"]["dominant"]["scale"] in (16, 32, 64)
    lead = out["cross_lead"]["streamA->streamB"]["dominant"]
    assert abs(lead["lag_ticks"] - lag) < 2.0, lead["lag_ticks"]


def test_lens_from_coord_splits_disjoint_strata():
    # An interleaved single stream, a per-position coordinate ∈ {operator, agent} — the role
    # lens instance. The coordinate is a #has cap the caller supplies, never a presupposed key.
    a = _planted()
    coord = np.array(["operator" if (i // 64) % 2 == 0 else "agent" for i in range(N)],
                     dtype=object)
    out = lens_from_coord(a, coord)
    assert set(out["strata"]) == {"operator", "agent"}
    for lab in ("operator", "agent"):
        enc = out["strata"][lab]
        assert "encoding" in enc  # each stratum decoupled to its own rhythm
        assert enc["positions"].size > 0


def test_tick_coordinate_reads_the_has_cap_off_metadata():
    # The coordinate provenance — a per-tick label array read off a chosen block metadata key,
    # aligned char-for-char with a pour's tick count.
    frames = [
        {"text": "hello", "metadata": {"lar_speaker": "operator"}},
        {"text": "worldd", "metadata": {"lar_speaker": "agent"}},
        {"text": "!!", "metadata": {}},  # a block missing the key reads the `missing` sentinel
    ]
    coord = tick_coordinate(frames, "lar_speaker")
    assert coord.size == 5 + 6 + 2
    assert list(coord[:5]) == ["operator"] * 5
    assert list(coord[5:11]) == ["agent"] * 6
    assert list(coord[11:]) == ["_", "_"]
