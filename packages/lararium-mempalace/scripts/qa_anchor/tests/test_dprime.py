"""Synthetic tests for the SDT core — known-d' inputs recover within tolerance,
the loglinear correction keeps z finite at the extremes, and the KUE-1 verdict
reads the four stories. No palace, no detector, no human: pure math.

    PYTHONPATH=<scripts> python -m pytest qa_anchor/tests/test_dprime.py -q
"""

from __future__ import annotations

from statistics import NormalDist

import pytest

from qa_anchor import dprime as dp

_N = NormalDist(0.0, 1.0)


def _cm_from_rates(h: float, fa: float, n_signal: int, n_noise: int) -> dp.ConfusionMatrix:
    """A confusion matrix realizing target hit/false-alarm rates at a given n."""
    hits = round(h * n_signal)
    fa_n = round(fa * n_noise)
    return dp.ConfusionMatrix(
        hits=hits,
        misses=n_signal - hits,
        false_alarms=fa_n,
        correct_rejections=n_noise - fa_n,
    )


# ---------------------------------------------------------------------------
# z / phi
# ---------------------------------------------------------------------------


def test_z_is_probit():
    assert dp.z(0.5) == pytest.approx(0.0, abs=1e-12)
    assert dp.z(0.975) == pytest.approx(1.959963, abs=1e-5)


def test_phi_roundtrips_z():
    for p in (0.05, 0.3, 0.5, 0.84, 0.97):
        assert dp.phi(dp.z(p)) == pytest.approx(p, abs=1e-9)


# ---------------------------------------------------------------------------
# known-d' recovery
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "h,fa",
    [(0.93, 0.31), (0.84, 0.16), (0.99, 0.50), (0.70, 0.30), (0.50, 0.50)],
)
def test_recovers_known_dprime_at_large_n(h, fa):
    # large n so the loglinear correction is negligible vs the true rates.
    cm = _cm_from_rates(h, fa, n_signal=5000, n_noise=5000)
    est = dp.compute_sdt(cm)
    true_d = _N.inv_cdf(h) - _N.inv_cdf(fa)
    true_c = -0.5 * (_N.inv_cdf(h) + _N.inv_cdf(fa))
    assert est.d_prime == pytest.approx(true_d, abs=0.05)
    assert est.criterion == pytest.approx(true_c, abs=0.05)


def test_zero_dprime_when_no_discrimination():
    # detector fires at the same rate on present and absent -> d' ~ 0.
    cm = dp.ConfusionMatrix(hits=500, misses=4500, false_alarms=500, correct_rejections=4500)
    est = dp.compute_sdt(cm)
    assert est.d_prime == pytest.approx(0.0, abs=0.02)


def test_criterion_sign_conventions():
    # conservative detector: low overall fire rate, fires only when sure -> c > 0.
    conservative = dp.ConfusionMatrix(hits=40, misses=60, false_alarms=2, correct_rejections=898)
    assert dp.compute_sdt(conservative).criterion > 0
    # liberal detector: fires often, many FAs -> c < 0.
    liberal = dp.ConfusionMatrix(hits=95, misses=5, false_alarms=600, correct_rejections=300)
    assert dp.compute_sdt(liberal).criterion < 0


# ---------------------------------------------------------------------------
# zero-cell / loglinear (Hautus 1995)
# ---------------------------------------------------------------------------


def test_loglinear_keeps_z_finite_at_extremes():
    # perfect hits, zero false alarms: raw rates would be 1 and 0 -> z = +/-inf.
    cm = dp.ConfusionMatrix(hits=50, misses=0, false_alarms=0, correct_rejections=50)
    est = dp.compute_sdt(cm)
    import math

    assert math.isfinite(est.d_prime)
    assert math.isfinite(est.criterion)
    assert est.d_prime > 0


def test_raw_rates_undefined_at_extremes():
    # extreme raw rates (1.0 / 0.0) send z to +/-inf -> the uncorrected estimate
    # is undefined; this is exactly why the rig corrects unconditionally.
    cm = dp.ConfusionMatrix(hits=50, misses=0, false_alarms=0, correct_rejections=50)
    with pytest.raises(ValueError):
        dp.compute_sdt(cm, correction="none")


def test_raw_rates_undefined_when_a_class_is_empty():
    # no noise trials at all -> raw rates have no denominator.
    cm = dp.ConfusionMatrix(hits=5, misses=5, false_alarms=0, correct_rejections=0)
    with pytest.raises(ValueError):
        dp.raw_rates(cm)
    # loglinear still yields a finite estimate.
    import math

    assert math.isfinite(dp.compute_sdt(cm).d_prime)


def test_loglinear_formula_exact():
    cm = dp.ConfusionMatrix(hits=7, misses=3, false_alarms=1, correct_rejections=9)
    h, fa = dp.loglinear_rates(cm)
    assert h == pytest.approx((7 + 0.5) / (10 + 1))
    assert fa == pytest.approx((1 + 0.5) / (10 + 1))


def test_loglinear_applied_unconditionally():
    # even with no empty cell, the correction is still applied (not just at 0/1).
    cm = dp.ConfusionMatrix(hits=7, misses=3, false_alarms=1, correct_rejections=9)
    h_corrected, _ = dp.loglinear_rates(cm)
    assert h_corrected != pytest.approx(7 / 10)  # differs from the raw rate


# ---------------------------------------------------------------------------
# confusion_from_labels
# ---------------------------------------------------------------------------


def test_confusion_from_labels_counts_cells():
    fired = [True, True, False, False, True]
    present = [True, False, True, False, True]
    cm = dp.confusion_from_labels(fired, present)
    assert (cm.hits, cm.false_alarms, cm.misses, cm.correct_rejections) == (2, 1, 1, 1)
    assert cm.n_signal == 3 and cm.n_noise == 2


def test_confusion_rejects_misaligned():
    with pytest.raises(ValueError):
        dp.confusion_from_labels([True], [True, False])


def test_confusion_rejects_negative_cells():
    with pytest.raises(ValueError):
        dp.ConfusionMatrix(hits=-1, misses=0, false_alarms=0, correct_rejections=0)


# ---------------------------------------------------------------------------
# the KUE-1 verdict — the four stories
# ---------------------------------------------------------------------------


def test_kue1_sensitivity_story():
    # rare fires AND no discrimination -> SENSITIVITY (blindness, not caution).
    cm = dp.ConfusionMatrix(hits=10, misses=90, false_alarms=90, correct_rejections=810)
    est = dp.compute_sdt(cm)
    assert est.fire_rate <= 0.20
    verdict = dp.kue1_verdict(est)
    assert verdict.story is dp.Kue1Story.SENSITIVITY


def test_kue1_criterion_story():
    # rare fires BUT high d' AND conservative c -> CRITERION (catches, cautious).
    cm = dp.ConfusionMatrix(hits=40, misses=60, false_alarms=2, correct_rejections=898)
    est = dp.compute_sdt(cm)
    assert est.fire_rate <= 0.20
    assert est.d_prime >= 1.0 and est.criterion >= 0.5
    verdict = dp.kue1_verdict(est)
    assert verdict.story is dp.Kue1Story.CRITERION


def test_kue1_ambiguous_story():
    # rare fires, high d', but NOT conservative -> AMBIGUOUS (look upstream).
    cm = dp.ConfusionMatrix(hits=48, misses=2, false_alarms=30, correct_rejections=920)
    est = dp.compute_sdt(cm)
    assert est.fire_rate <= 0.20
    assert est.d_prime >= 1.0 and est.criterion < 0.5
    verdict = dp.kue1_verdict(est)
    assert verdict.story is dp.Kue1Story.AMBIGUOUS


def test_kue1_not_rare_story():
    # detector fires plenty -> the rarity question does not arise.
    cm = dp.ConfusionMatrix(hits=80, misses=20, false_alarms=400, correct_rejections=500)
    est = dp.compute_sdt(cm)
    assert est.fire_rate > 0.20
    verdict = dp.kue1_verdict(est)
    assert verdict.story is dp.Kue1Story.NOT_RARE


def test_kue1_ci_sharpens_rationale():
    cm = dp.ConfusionMatrix(hits=40, misses=60, false_alarms=2, correct_rejections=898)
    est = dp.compute_sdt(cm)
    v_above = dp.kue1_verdict(est, d_prime_ci=(1.5, 3.5))
    assert "above the d' threshold" in v_above.rationale
    v_straddle = dp.kue1_verdict(est, d_prime_ci=(0.5, 3.5))
    assert "straddles" in v_straddle.rationale


def test_kue1_thresholds_are_tunable():
    cm = dp.ConfusionMatrix(hits=40, misses=60, false_alarms=2, correct_rejections=898)
    est = dp.compute_sdt(cm)
    # raise the d' bar above the recovered value -> the story flips to sensitivity.
    strict = dp.Kue1Thresholds(d_prime_high=est.d_prime + 1.0)
    verdict = dp.kue1_verdict(est, thresholds=strict)
    assert verdict.story is dp.Kue1Story.SENSITIVITY
