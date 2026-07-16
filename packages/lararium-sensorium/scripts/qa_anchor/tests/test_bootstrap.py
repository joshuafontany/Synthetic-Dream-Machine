"""Synthetic tests for the bootstrap engine — determinism, sane CI coverage on a
known statistic, and d'/alpha CIs that bracket the truth. Fully reproducible via
the seed; no palace, no detector, no human.

    PYTHONPATH=<scripts> python -m pytest qa_anchor/tests/test_bootstrap.py -q
"""

from __future__ import annotations

from statistics import NormalDist

import numpy as np
import pytest

from qa_anchor import bootstrap as bs

_N = NormalDist(0.0, 1.0)


def _labels_from_rates(h, fa, n_signal, n_noise):
    """Build aligned (fired, present) span labels realizing target rates."""
    hits = round(h * n_signal)
    fa_n = round(fa * n_noise)
    fired, present = [], []
    # signal spans
    fired += [True] * hits + [False] * (n_signal - hits)
    present += [True] * n_signal
    # noise spans
    fired += [True] * fa_n + [False] * (n_noise - fa_n)
    present += [False] * n_noise
    return fired, present


# ---------------------------------------------------------------------------
# the generic engine
# ---------------------------------------------------------------------------


def test_engine_is_deterministic_under_seed():
    data = np.arange(100, dtype=float).reshape(-1, 1)
    r1 = bs.bootstrap_ci(data, lambda b: float(b.mean()), n_resamples=500, seed=7)
    r2 = bs.bootstrap_ci(data, lambda b: float(b.mean()), n_resamples=500, seed=7)
    assert r1.point == r2.point
    assert r1.lower == r2.lower and r1.upper == r2.upper


def test_engine_point_is_full_sample_statistic():
    data = np.array([1.0, 2.0, 3.0, 4.0]).reshape(-1, 1)
    r = bs.bootstrap_ci(data, lambda b: float(b.mean()), n_resamples=200, seed=1)
    assert r.point == pytest.approx(2.5)


def test_engine_ci_brackets_known_mean():
    rng = np.random.default_rng(0)
    data = rng.normal(loc=10.0, scale=2.0, size=400).reshape(-1, 1)
    r = bs.bootstrap_ci(data, lambda b: float(b.mean()), n_resamples=2000, seed=42)
    assert r.lower < 10.0 < r.upper
    assert r.lower < r.point < r.upper


def test_engine_ci_level_widens_interval():
    rng = np.random.default_rng(1)
    data = rng.normal(size=300).reshape(-1, 1)
    narrow = bs.bootstrap_ci(
        data, lambda b: float(b.mean()), ci_level=0.80, n_resamples=1500, seed=3
    )
    wide = bs.bootstrap_ci(data, lambda b: float(b.mean()), ci_level=0.99, n_resamples=1500, seed=3)
    assert (wide.upper - wide.lower) > (narrow.upper - narrow.lower)


def test_engine_rejects_bad_inputs():
    with pytest.raises(ValueError):
        bs.bootstrap_ci(np.empty((0, 1)), lambda b: 0.0)
    with pytest.raises(ValueError):
        bs.bootstrap_ci(np.ones((3, 1)), lambda b: 0.0, ci_level=1.5)


# ---------------------------------------------------------------------------
# d' bootstrap
# ---------------------------------------------------------------------------


def test_bootstrap_dprime_brackets_truth():
    h, fa = 0.85, 0.20
    fired, present = _labels_from_rates(h, fa, n_signal=400, n_noise=400)
    true_d = _N.inv_cdf(h) - _N.inv_cdf(fa)
    r = bs.bootstrap_dprime(fired, present, n_resamples=1500, seed=11)
    assert r.point == pytest.approx(true_d, abs=0.1)
    assert r.lower < true_d < r.upper
    assert r.lower < r.point < r.upper


def test_bootstrap_dprime_narrows_with_n():
    h, fa = 0.85, 0.20
    small = bs.bootstrap_dprime(*_labels_from_rates(h, fa, 50, 50), n_resamples=1500, seed=5)
    large = bs.bootstrap_dprime(*_labels_from_rates(h, fa, 1000, 1000), n_resamples=1500, seed=5)
    assert (large.upper - large.lower) < (small.upper - small.lower)


def test_bootstrap_dprime_stays_finite_on_separable_data():
    # near-perfect detector -> loglinear keeps every resample's d' finite.
    fired, present = _labels_from_rates(0.99, 0.01, n_signal=200, n_noise=200)
    r = bs.bootstrap_dprime(fired, present, n_resamples=1000, seed=9)
    assert r.n_valid == 1000
    assert np.isfinite(r.lower) and np.isfinite(r.upper)
    assert np.isfinite(r.std_error)


def test_bootstrap_dprime_coverage_is_sane():
    # over many independent synthetic corpora, a 95% CI should cover the truth
    # roughly 95% of the time (loose band — this is a sanity gate, not a proof).
    h, fa = 0.80, 0.25
    true_d = _N.inv_cdf(h) - _N.inv_cdf(fa)
    covered = 0
    trials = 60
    for t in range(trials):
        rng = np.random.default_rng(1000 + t)
        sig = rng.random(150) < h
        noi = rng.random(150) < fa
        fired = list(sig) + list(noi)
        present = [True] * 150 + [False] * 150
        r = bs.bootstrap_dprime(fired, present, n_resamples=600, seed=t)
        if r.lower <= true_d <= r.upper:
            covered += 1
    # expect ~0.95; allow a wide tolerance for the small trial count.
    assert 0.80 <= covered / trials <= 1.0
