"""Synthetic tests for reliability — Krippendorff's alpha against HAND-COMPUTED
ground truths (nominal + interval), perfect/degenerate edges, missing data, the
classification bands, the alpha bootstrap CI, and the intra-rater fallbacks
(Cohen's kappa, ICC). No palace, no human: every truth is computed by hand.

    PYTHONPATH=<scripts> python -m pytest qa_anchor/tests/test_reliability.py -q
"""

from __future__ import annotations

import numpy as np
import pytest

from qa_anchor import reliability as rel

NAN = float("nan")


# ---------------------------------------------------------------------------
# Krippendorff's alpha — hand-computed ground truths
# ---------------------------------------------------------------------------


def test_alpha_perfect_agreement_is_one():
    data = np.array([[1, 1], [2, 2], [3, 3], [0, 0]], dtype=float)
    assert rel.krippendorff_alpha(data, level="nominal") == pytest.approx(1.0)


def test_alpha_nominal_hand_computed():
    # units x raters; hand worked: coincidence -> D_o=2, D_e_sum=30, n=8
    #   alpha = 1 - (n-1)*D_o / D_e_sum = 1 - 7*2/30 = 16/30 = 0.53333...
    data = np.array([[0, 0], [0, 1], [1, 1], [1, 1]], dtype=float)
    assert rel.krippendorff_alpha(data, level="nominal") == pytest.approx(16 / 30, abs=1e-9)


def test_alpha_nominal_and_interval_hand_computed():
    # values 1,2,3; hand worked on the SAME matrix:
    #   nominal:  alpha = 1 - 5*2/22 = 12/22 = 0.545454...
    #   interval: alpha = 1 - 5*2/58 = 48/58 = 0.827586...
    data = np.array([[1, 1], [2, 3], [3, 3]], dtype=float)
    assert rel.krippendorff_alpha(data, level="nominal") == pytest.approx(12 / 22, abs=1e-9)
    assert rel.krippendorff_alpha(data, level="interval") == pytest.approx(48 / 58, abs=1e-9)


def test_alpha_systematic_disagreement_is_negative():
    # raters invert each other -> worse than chance.
    data = np.array([[0, 1], [1, 0], [0, 1], [1, 0]], dtype=float)
    assert rel.krippendorff_alpha(data, level="nominal") < 0.0


def test_alpha_tolerates_missing_data():
    # the canonical shape: a 3-rater panel with skipped spans (np.nan).
    data = np.array(
        [
            [1, 1, NAN],
            [2, 2, 3],
            [3, 3, 3],
            [3, 3, 3],
            [2, 2, 2],
            [1, 2, 3],
            [4, 4, 4],
            [1, 1, 2],
            [2, 2, 2],
            [NAN, 5, 5],
        ],
        dtype=float,
    )
    a = rel.krippendorff_alpha(data, level="nominal")
    assert np.isfinite(a)
    assert -1.0 <= a <= 1.0


def test_alpha_ordinal_and_ratio_run_and_bound():
    data = np.array([[1, 1], [2, 3], [3, 3], [1, 2]], dtype=float)
    for lvl in ("ordinal", "ratio", "interval", "nominal"):
        a = rel.krippendorff_alpha(data, level=lvl)
        assert np.isfinite(a) and a <= 1.0
    # perfect agreement -> 1.0 at every level.
    perfect = np.array([[1, 1], [2, 2], [3, 3]], dtype=float)
    for lvl in ("ordinal", "ratio", "interval", "nominal"):
        assert rel.krippendorff_alpha(perfect, level=lvl) == pytest.approx(1.0)


def test_alpha_undefined_when_no_pairs():
    # every unit has a single rating -> nothing pairable -> NaN.
    data = np.array([[1, NAN], [2, NAN], [3, NAN]], dtype=float)
    assert np.isnan(rel.krippendorff_alpha(data))


# ---------------------------------------------------------------------------
# classification bands (Krippendorff 2004)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "alpha,label,ok",
    [
        (0.95, "satisfactory", True),
        (0.80, "satisfactory", True),
        (0.70, "tentative", False),
        (0.667, "tentative", False),
        (0.50, "unreliable", False),
        (float("nan"), "undefined", False),
    ],
)
def test_classify_alpha_bands(alpha, label, ok):
    band = rel.classify_alpha(alpha)
    assert band.label == label
    assert band.satisfactory is ok


# ---------------------------------------------------------------------------
# alpha bootstrap CI (shares the engine with d')
# ---------------------------------------------------------------------------


def test_bootstrap_alpha_brackets_point():
    rng = np.random.default_rng(0)
    # 60 units, 2 raters, mostly-agreeing binary labels.
    truth = (rng.random(60) < 0.5).astype(float)
    r1 = truth.copy()
    r2 = truth.copy()
    flip = rng.random(60) < 0.1  # 10% rater-2 disagreement
    r2[flip] = 1 - r2[flip]
    data = np.column_stack([r1, r2])

    point = rel.krippendorff_alpha(data, level="nominal")
    boot = rel.bootstrap_alpha(data, level="nominal", n_resamples=800, seed=3)
    assert boot.point == pytest.approx(point, abs=1e-9)
    assert boot.lower <= boot.point <= boot.upper
    assert boot.n_valid > 0


# ---------------------------------------------------------------------------
# Cohen's kappa (intra-rater test-retest, categorical)
# ---------------------------------------------------------------------------


def test_kappa_perfect_agreement():
    a = [1, 1, 0, 0, 1, 0]
    res = rel.cohens_kappa(a, a)
    assert res.kappa == pytest.approx(1.0)
    assert res.observed_agreement == pytest.approx(1.0)


def test_kappa_total_disagreement_is_minus_one():
    a = [1, 0, 1, 0]
    b = [0, 1, 0, 1]
    assert rel.cohens_kappa(a, b).kappa == pytest.approx(-1.0)


def test_kappa_chance_level_near_zero():
    rng = np.random.default_rng(7)
    a = (rng.random(2000) < 0.5).astype(int).tolist()
    b = (rng.random(2000) < 0.5).astype(int).tolist()
    assert abs(rel.cohens_kappa(a, b).kappa) < 0.1


def test_kappa_single_category_is_trivially_one():
    a = [1, 1, 1, 1]
    assert rel.cohens_kappa(a, a).kappa == pytest.approx(1.0)


def test_kappa_rejects_misaligned():
    with pytest.raises(ValueError):
        rel.cohens_kappa([1, 0], [1])


# ---------------------------------------------------------------------------
# Intraclass correlation (intra-rater test-retest, continuous)
# ---------------------------------------------------------------------------


def test_icc_perfect_agreement():
    data = np.array([[1.0, 1.0], [2.0, 2.0], [3.0, 3.0], [4.0, 4.0]])
    assert rel.intraclass_correlation(data, form="ICC(2,1)").icc == pytest.approx(1.0)
    assert rel.intraclass_correlation(data, form="ICC(3,1)").icc == pytest.approx(1.0)


def test_icc_constant_shift_consistency_vs_agreement():
    # session 2 = session 1 + 5 (a systematic re-judge drift):
    #   consistency ICC(3,1) ignores the shift -> ~1.0
    #   agreement   ICC(2,1) is penalized by it -> < 1.0
    data = np.array([[1.0, 6.0], [2.0, 7.0], [3.0, 8.0], [4.0, 9.0]])
    consistency = rel.intraclass_correlation(data, form="ICC(3,1)").icc
    agreement = rel.intraclass_correlation(data, form="ICC(2,1)").icc
    assert consistency == pytest.approx(1.0, abs=1e-9)
    assert agreement < consistency


def test_icc_independent_columns_low():
    rng = np.random.default_rng(2)
    data = rng.normal(size=(50, 2))
    assert rel.intraclass_correlation(data, form="ICC(2,1)").icc < 0.5


def test_icc_rejects_degenerate_shapes():
    with pytest.raises(ValueError):
        rel.intraclass_correlation(np.ones((1, 2)))
    with pytest.raises(ValueError):
        rel.intraclass_correlation(np.ones((5, 1)))
