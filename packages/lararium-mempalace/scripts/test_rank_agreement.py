#!/usr/bin/env python3
"""test_rank_agreement — the tie-aware rank instruments and the crossing spectrum."""
from __future__ import annotations

import math
import random

from rank_agreement import (
    affine_centrality,
    agreement,
    crossing_spectrum,
    fagin_distance,
    kendall_tau_c,
    pair_census,
    somers_d,
    spearman,
    spectrum_rungs,
)

# ── the census ────────────────────────────────────────────────────────────────────────────


def test_census_counts_every_pair_exactly_once():
    x = [1, 1, 2, 3]
    y = [1, 1, 5, 4]
    ce = pair_census(x, y)
    assert ce["pairs"] == 6
    assert (ce["concordant"] + ce["discordant"] + ce["tied_x_only"]
            + ce["tied_y_only"] + ce["double_tied"]) == 6
    assert ce["double_tied"] == 1          # the (0,1) pair ties in BOTH arms
    assert ce["discordant"] == 1           # (2,3) orders 2<3 against 5>4


def test_census_names_the_double_tie_mass_of_a_coarse_arm():
    # a 3-class arm against a 12-class one: most pairs tie in the coarse arm, and the
    # pairs tied in BOTH carry zero ordering information.
    coarse = [0] * 4 + [1] * 4 + [2] * 4
    fine = list(range(12))
    ce = pair_census(coarse, fine)
    assert ce["distinct_x"] == 3 and ce["distinct_y"] == 12
    assert ce["tied_x_only"] == 3 * (4 * 3 // 2)   # 18 pairs the coarse arm cannot order
    assert ce["double_tied"] == 0                  # the fine arm ties nothing


# ── tau-c, Somers' D, Fagin ───────────────────────────────────────────────────────────────


def test_tau_c_reaches_plus_one_on_a_coarse_predictor_where_spearman_cannot():
    coarse = [0] * 4 + [1] * 4 + [2] * 4
    fine = list(range(12))
    tc = kendall_tau_c(coarse, fine)
    rho = spearman(coarse, fine)
    assert tc is not None and rho is not None
    assert tc > rho                    # the min-granularity correction lifts the ceiling
    assert somers_d(coarse, fine) == 1.0   # the coarse arm orders every pair it CAN order


def test_tau_c_and_somers_flip_sign_under_reversal():
    x = [0, 0, 1, 1, 2, 2]
    y = list(range(6))
    assert kendall_tau_c(x, y) > 0
    assert kendall_tau_c(x, list(reversed(y))) < 0
    assert somers_d(x, list(reversed(y))) == -1.0


def test_somers_d_asymmetry_shows_which_arm_predicts():
    coarse = [0] * 3 + [1] * 3
    fine = list(range(6))
    d_fine_given_coarse = somers_d(coarse, fine)
    d_coarse_given_fine = somers_d(fine, coarse)
    assert d_fine_given_coarse == 1.0          # coarse orders every pair it distinguishes
    assert d_coarse_given_fine < 1.0           # the fine arm carries pairs coarse ties


def test_fagin_metric_at_half_penalty():
    total = [0, 1, 2, 3]
    assert fagin_distance(total, list(total)) == 0.0
    assert fagin_distance(total, list(reversed(total))) == 1.0
    bucket = [0, 0, 1, 1]
    # the two pairs the bucket order leaves unordered charge p; the rest agree.
    assert fagin_distance(bucket, total) == 2 * 0.5 / 6


def test_fagin_charges_nothing_for_a_double_tie():
    a = [0, 0, 1, 1]
    b = [0, 0, 5, 5]
    assert fagin_distance(a, b) == 0.0
    # ... and Spearman scores the same pairing at a full +1, having ordered nothing:
    assert spearman(a, b) == 1.0


def test_fagin_triangle_inequality_holds_at_p_half():
    rng = random.Random(1729)                  # seeded — deterministic law (constraint 4)
    for _ in range(200):
        n = 7
        a = [rng.randrange(3) for _ in range(n)]
        b = [rng.randrange(4) for _ in range(n)]
        c = [rng.randrange(7) for _ in range(n)]
        ab = fagin_distance(a, b)
        bc = fagin_distance(b, c)
        ac = fagin_distance(a, c)
        assert ac <= ab + bc + 1e-12


# ── the bundle ────────────────────────────────────────────────────────────────────────────


def test_agreement_flags_an_unsafe_spearman_and_carries_the_census():
    coarse = {f"k{i}": (i // 6) for i in range(18)}     # 3 classes
    fine = {f"k{i}": i for i in range(18)}              # 18 classes
    out = agreement(coarse, fine)
    assert out["spearman_safe"] is False
    assert out["granularity_ratio"] == 6.0
    assert out["census"]["tied_x_only"] > 0
    assert out["tau_c"] is not None and out["fagin_kp"] is not None


def test_agreement_licenses_spearman_at_matched_granularity():
    a = {f"k{i}": i for i in range(10)}
    b = {f"k{i}": (i * 7) % 10 for i in range(10)}
    out = agreement(a, b)
    assert out["spearman_safe"] is True
    assert out["census"]["double_tied"] == 0


# ── the crossing spectrum ─────────────────────────────────────────────────────────────────


def _toy_metrics():
    """Two channels over four keys, each an explicit distance table."""
    red = {("a", "b"): 0.1, ("a", "c"): 0.9, ("a", "d"): 0.5,
           ("b", "c"): 0.4, ("b", "d"): 0.2, ("c", "d"): 0.7}
    black = {("a", "b"): 0.8, ("a", "c"): 0.2, ("a", "d"): 0.6,
             ("b", "c"): 0.5, ("b", "d"): 0.9, ("c", "d"): 0.1}

    def _m(tbl):
        def f(x, y):
            return 0.0 if x == y else tbl[tuple(sorted((x, y)))]
        return f

    return ["a", "b", "c", "d"], _m(red), _m(black)


def test_centrality_runs_exactly_affine_in_lambda():
    keys, d_red, d_black = _toy_metrics()
    coeffs = affine_centrality(keys, d_red, d_black)
    for lam in (0.0, 0.17, 0.5, 0.83, 1.0):
        for k in keys:
            direct = sum(1.0 - (lam * d_red(k, o) + (1 - lam) * d_black(k, o))
                         for o in keys if o != k) / (len(keys) - 1)
            a, b = coeffs[k]
            assert math.isclose(a + lam * b, direct, abs_tol=1e-15)


def test_crossing_spectrum_finds_the_rank_changes_and_nothing_else():
    keys, d_red, d_black = _toy_metrics()
    coeffs = affine_centrality(keys, d_red, d_black)
    spec = crossing_spectrum(coeffs)
    cuts = sorted({round(r["lambda"], 9) for r in spec})

    def order_at(lam):
        return tuple(sorted(keys, key=lambda k: coeffs[k][0] + lam * coeffs[k][1]))

    # the order stands CONSTANT strictly inside each interval the cuts carve out ...
    bounds = [0.0] + cuts + [1.0]
    for left, right in zip(bounds, bounds[1:]):
        mid = (left + right) / 2.0
        assert order_at(mid) == order_at((left + mid) / 2.0 + (right - mid) / 4.0)
    # ... and CHANGES across every cut the spectrum names.
    for cut in cuts:
        lo = order_at(max(0.0, cut - 1e-6))
        hi = order_at(min(1.0, cut + 1e-6))
        assert lo != hi


def test_spectrum_rungs_visit_every_interval_and_merge_a_confluence():
    # three lines meeting at one lam* — the degenerate confluence — must cut ONCE.
    spec = [{"lambda": 0.4, "a": "x", "b": "y"},
            {"lambda": 0.4, "a": "x", "b": "z"},
            {"lambda": 0.4, "a": "y", "b": "z"}]
    rungs = spectrum_rungs(spec)
    assert rungs[0] == 0.0 and rungs[-1] == 1.0
    interior = [r for r in rungs if 0.0 < r < 1.0]
    assert len(interior) == 2                     # one rung either side of the single cut
    assert interior[0] < 0.4 < interior[1]


def test_empty_spectrum_collapses_to_the_endpoints():
    assert spectrum_rungs([]) == [0.0, 0.5, 1.0]
