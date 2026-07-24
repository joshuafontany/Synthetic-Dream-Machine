"""test_predictive_coding_whiten — witnesses for the WHITENING cap's py twin.

The signed-innovation reduction (ε = actual − predicted, sign kept) mirrors mesh/signed-innovation.ts.
The load-bearing guards:
  · shape + edges — an empty/single-frame signal opens the innovation at 0 (no history to predict).
  · whitening — a strongly autocorrelated series collapses to small increments; white noise ~passes.
  · TS↔py parity — the py signed_innovation matches, element for element, the committed fixture the
    canonical TS twin (signedInnovation + whitenChildren) generated across the causal-island.

Run:
    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_predictive_coding_whiten.py -q

Regenerate the parity fixture from the canonical TS twin:
    packages/lararium-mesh/node_modules/.bin/tsx packages/lararium-mesh/scripts/whiten_parity.ts
"""
import json
import os

import numpy as np

import predictive_coding as pc


# ── shape + the no-history edges ─────────────────────────────────────────────

def test_empty_signal_whitens_to_empty():
    assert pc.signed_innovation([]) == []


def test_single_frame_opens_at_zero():
    # no history → the one frame's innovation reads 0, whatever its value
    assert pc.signed_innovation([[3.7]]) == [[0.0]]


def test_multivariate_shape_preserved():
    sig = [[float(a), float(b), float(c)] for a, b, c in np.random.default_rng(3).normal(size=(50, 3))]
    innov = pc.signed_innovation(sig)
    assert len(innov) == 50
    assert all(len(row) == 3 for row in innov)


# ── the whitening property ───────────────────────────────────────────────────

def _variance(xs):
    a = np.asarray(xs, dtype=float)
    return float(a.var())


def test_random_walk_whitens_to_small_increments():
    rng = np.random.default_rng(1)
    rw = [[0.0]]
    for _ in range(1, 800):
        rw.append([rw[-1][0] + float(rng.standard_normal())])
    innov = pc.signed_innovation(rw)
    raw_var = _variance([r[0] for r in rw])
    innov_var = _variance([r[0] for r in innov])
    assert innov_var < raw_var * 0.5  # the predictable part removed


def test_white_noise_passes_through():
    rng = np.random.default_rng(2)
    wn = [[float(rng.standard_normal())] for _ in range(800)]
    innov = pc.signed_innovation(wn)
    raw_var = _variance([r[0] for r in wn])
    innov_var = _variance([r[0] for r in innov])
    assert innov_var > raw_var * 0.6  # ~preserved


# ── TS↔py parity across the committed fixture ────────────────────────────────

def _load_fixture():
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "fixtures", "whiten-parity.json")) as f:
        return json.load(f)


def test_witness_parity_signed_innovation_matches_ts():
    fx = _load_fixture()
    for c in fx["cases"]:
        got = pc.signed_innovation(c["signal"], alpha=c["alpha"])
        want = c["innovation"]
        assert len(got) == len(want), c["note"]
        for g_row, w_row in zip(got, want):
            assert len(g_row) == len(w_row), c["note"]
            for g, w in zip(g_row, w_row):
                assert abs(g - w) < 1e-9, c["note"]


def test_witness_parity_whiten_children_matches_ts():
    fx = _load_fixture()
    ch = fx["children"]
    got = pc.whiten_children(ch["children"], alpha=ch["alpha"])
    want = ch["whitened"]
    assert [c["name"] for c in got] == [c["name"] for c in want]
    for g_child, w_child in zip(got, want):
        g_sig, w_sig = g_child["signal"], w_child["signal"]
        assert len(g_sig) == len(w_sig), g_child["name"]
        for g_row, w_row in zip(g_sig, w_sig):
            for g, w in zip(g_row, w_row):
                assert abs(g - w) < 1e-9, g_child["name"]
