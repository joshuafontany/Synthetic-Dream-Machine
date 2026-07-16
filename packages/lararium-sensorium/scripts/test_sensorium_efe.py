"""test_sensorium_efe — the py EFE keystone holds its contract.

Guards the scorer's three terms, the DERIVED reversibility (sign of the option-loss,
never a declared grid), the argmin selection + margin seam, and the H1-first gate fork.
"""
import math

import pytest

from plane_base import BASE_RECORD

from sensorium_efe import (
    _FIXTURE_VERBS,
    _seeded_series,
    efe_gate,
    efe_select,
    gaussian_kl,
    predict_next,
    score_efe,
    surface_disagreement,
)


def _reads():
    return {
        "content": _seeded_series(24, 0.9, 0x0EFE1),
        "structure": _seeded_series(24, 0.6, 0x0EFE2),
        "form": _seeded_series(24, 0.3, 0x0EFE3),
    }


_C = {"mu": {"content": 0, "structure": 0, "form": 0}}


def _sheaf(plane, value, base=BASE_RECORD):
    """The synthetic units name records; the base rides with the value (plane_base)."""
    return {"plane": plane, "base": base, "variance": "sheaf", "value": value}


def _hollow(gap=0.2):
    return {
        "restrictions": [
            _sheaf("content", {"a": 0.5, "b": 0.5}),
            _sheaf("structure", {"b": 0.5 + gap, "c": 0.5}),
            _sheaf("form", {"c": 0.5 + gap, "a": 0.5 + gap}),
        ],
        "stalk": {"units": ["a", "b", "c"]},
    }


class TestForwardModel:
    def test_the_identity_verb_passes_the_baseline_through(self):
        fwd = predict_next(_reads(), {"verb": "hold"})
        assert fwd["mu"] == fwd["muBaseline"]
        assert fwd["precision"] == fwd["precisionBaseline"]

    def test_a_gain_collapses_or_opens_the_precision(self):
        reads = _reads()
        collapse = predict_next(reads, {"verb": "collapse", "precisionGain": 1e4})
        expand = predict_next(reads, {"verb": "expand", "precisionGain": 1e-3})
        for i in range(len(collapse["planes"])):
            assert collapse["precision"][i] >= collapse["precisionBaseline"][i]
            assert expand["precision"][i] <= expand["precisionBaseline"][i]

    def test_per_plane_overrides_steer_one_island(self):
        fwd = predict_next(_reads(), {"verb": "uneven",
                                      "perPlane": {"structure": {"shift": 5.0}}})
        i = fwd["planes"].index("structure")
        assert fwd["mu"][i] == pytest.approx(fwd["muBaseline"][i] + 5.0)


class TestScorer:
    def test_collapse_reads_irreversible_and_sinks(self):
        reads = _reads()
        collapse = score_efe(reads, _FIXTURE_VERBS[2], _C)
        align = score_efe(reads, _FIXTURE_VERBS[1], _C)
        assert collapse["optionLoss"] > 0
        assert collapse["reversible"] is False
        assert collapse["efe"] > align["efe"]

    def test_expand_reads_reversible(self):
        s = score_efe(_reads(), _FIXTURE_VERBS[3], _C)
        assert s["optionLoss"] < 0
        assert s["reversible"] is True

    def test_hold_spends_no_options(self):
        s = score_efe(_reads(), _FIXTURE_VERBS[0], _C)
        assert s["optionLoss"] == pytest.approx(0.0, abs=1e-12)
        assert s["reversible"] is True

    def test_gamma_scales_the_epistemic_and_option_terms(self):
        reads = _reads()
        g1 = score_efe(reads, _FIXTURE_VERBS[3], _C, gamma=1.0)
        g0 = score_efe(reads, _FIXTURE_VERBS[3], _C, gamma=0.0)
        assert g0["efe"] == pytest.approx(g0["pragmatic"])
        assert g1["efe"] == pytest.approx(
            g1["pragmatic"] + g1["epistemic"] + g1["optionLoss"])

    def test_gaussian_kl_vanishes_reflexively(self):
        assert gaussian_kl(0.3, 1.0, 0.3, 1.0) == pytest.approx(0.0)


class TestSelection:
    def test_argmin_picks_the_c_reaching_verb(self):
        sel = efe_select(_reads(), _FIXTURE_VERBS, _C)
        assert sel["chosen"]["verb"] == "align"
        efes = [s["efe"] for s in sel["ranked"]]
        assert efes == sorted(efes)

    def test_a_single_verb_carries_infinite_margin(self):
        sel = efe_select(_reads(), [_FIXTURE_VERBS[0]], _C)
        assert math.isinf(sel["margin"])
        assert sel["needsReview"] is False

    def test_no_verbs_raises(self):
        with pytest.raises(ValueError, match="at least one verb"):
            efe_select(_reads(), [], _C)


class TestKeystoneGate:
    def test_strict_tolerance_selects(self):
        g = efe_gate(_hollow(), _reads(), _FIXTURE_VERBS, _C, agreement_tolerance=0.05)
        assert g["verdict"] == "select"
        assert g["selection"]["chosen"]["verb"] == "align"

    def test_loose_tolerance_surfaces_with_r_sem(self):
        g = efe_gate(_hollow(), _reads(), _FIXTURE_VERBS, _C, agreement_tolerance=0.3)
        assert g["verdict"] == "surface-disagreement"
        assert g["disagreement"]["dimH1"] == 1
        assert "SURFACE" in g["disagreement"]["message"]

    def test_surfacing_never_reconciles(self):
        move = surface_disagreement({"dimH1": 4})
        assert move["cost"] == pytest.approx(2.0)
        assert "Talk-Story" in move["message"]
