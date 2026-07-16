"""Tests for the sealed-judge harness — the seal (empty CWD, no answer-key), the
per-facet reliability GATED ON THE BOOTSTRAP LOWER BOUND (never averaged), the MASI
set-valued metric, and the pre-registration freeze/verify. Built atop the COMPUTE
kernel; no live LLM judge runs.

    PYTHONPATH=<scripts> python -m pytest qa_anchor/tests/test_sealed.py -q
"""

from __future__ import annotations

import numpy as np
import pytest

from qa_anchor.reliability import ALPHA_TENTATIVE_FLOOR, krippendorff_alpha
from qa_anchor.sealed import prereg as pr
from qa_anchor.sealed import score_alpha as sa


# ---------------------------------------------------------------------------
# the seal — empty CWD, answer-key absent
# ---------------------------------------------------------------------------


def test_sealed_cwd_passes_when_empty(tmp_path):
    sa.assert_sealed_cwd(tmp_path)  # fresh tmp dir is empty -> no raise


def test_sealed_cwd_raises_when_not_empty(tmp_path):
    (tmp_path / "leak.txt").write_text("anything", encoding="utf-8")
    with pytest.raises(AssertionError, match="seal broken"):
        sa.assert_sealed_cwd(tmp_path)


def test_key_absent_passes_when_clean(tmp_path):
    (tmp_path / "notes.md").write_text("harmless", encoding="utf-8")
    sa.assert_key_absent(tmp_path)  # no answer-key-shaped file -> no raise


def test_key_absent_raises_on_answer_key(tmp_path):
    (tmp_path / "answer-key.tsv").write_text("gold labels", encoding="utf-8")
    with pytest.raises(AssertionError, match="answer-key leaked"):
        sa.assert_key_absent(tmp_path)


def test_key_absent_catches_gold_stem(tmp_path):
    (tmp_path / "gold.json").write_text("{}", encoding="utf-8")
    with pytest.raises(AssertionError):
        sa.assert_key_absent(tmp_path)


# ---------------------------------------------------------------------------
# MASI distance + the generic alpha (cross-checked against the kernel)
# ---------------------------------------------------------------------------


def test_masi_distance_cases():
    assert sa.masi_distance({1}, {1}) == pytest.approx(0.0)
    assert sa.masi_distance({1}, {2}) == pytest.approx(1.0)  # disjoint
    assert sa.masi_distance({1}, {1, 2}) == pytest.approx(2.0 / 3.0)  # subset
    assert sa.masi_distance({1, 2}, {2, 3}) == pytest.approx(8.0 / 9.0)  # overlap
    assert sa.masi_distance(set(), set()) == pytest.approx(0.0)


def test_alpha_general_matches_kernel_nominal():
    # the generic distance-form alpha must reproduce the kernel's nominal alpha.
    units = [[0, 0], [0, 1], [1, 1], [1, 1]]
    nominal = lambda a, b: 0.0 if a == b else 1.0  # noqa: E731
    ag = sa.alpha_general(units, nominal)
    kern = krippendorff_alpha(np.array(units, dtype=float), level="nominal")
    assert ag == pytest.approx(16 / 30, abs=1e-9)
    assert ag == pytest.approx(kern, abs=1e-9)


def test_alpha_general_masi_perfect_with_variance():
    # raters agree per item, items VARY -> D_o == 0, D_e > 0 -> alpha == 1.
    perfect = [
        [frozenset({1, 2}), frozenset({1, 2})],
        [frozenset({3}), frozenset({3})],
        [frozenset({1}), frozenset({1})],
        [frozenset({2, 4}), frozenset({2, 4})],
    ]
    assert sa.alpha_general(perfect, sa.masi_distance) == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# per-facet reliability, gated on the bootstrap LOWER bound
# ---------------------------------------------------------------------------


def test_score_facet_perfect_agreement_passes_gate():
    # 2 judges agree exactly across 6 spread items -> alpha == 1, lower == 1.
    m = np.array([[2, 6, 10, 14, 18, 4], [2, 6, 10, 14, 18, 4]], dtype=float)
    r = sa.score_facet(m, facet="philosopher", n_resamples=300, seed=0)
    assert r.alpha == pytest.approx(1.0)
    assert r.gate_pass is True
    assert r.lower >= r.floor
    assert r.band == "satisfactory"


def test_score_facet_inverted_judges_fails_gate():
    # judges invert each other -> alpha well below the floor.
    m = np.array([[2, 6, 10, 14, 18, 4], [18, 14, 10, 6, 2, 16]], dtype=float)
    r = sa.score_facet(m, facet="poet", n_resamples=300, seed=0)
    assert r.gate_pass is False
    assert r.lower < r.floor


def test_score_facet_gates_on_lower_not_point():
    # a high point alpha with a wide CI whose lower bound dips below the floor must
    # FAIL — the gate reads the lower bound, never the point.
    # near-agreement on most items, one inverted item -> point high, CI wide at small n.
    m = np.array([[2, 6, 10, 14, 18], [2, 6, 10, 14, 1]], dtype=float)
    r = sa.score_facet(m, facet="x", n_resamples=400, seed=0)
    assert r.lower <= r.alpha  # the lower bound never exceeds the point
    # gate_pass is decided by the lower bound, whatever the point reads.
    assert r.gate_pass == (r.lower >= r.floor)


def test_score_panel_is_per_facet_not_averaged():
    # philosopher: all judges agree (strong); poet: each judge constant & disagreeing
    # (floor). An AVERAGE would let philosopher mask poet; the per-facet gate must not.
    phil = {"i0": 2, "i1": 6, "i2": 10, "i3": 14, "i4": 18, "i5": 4}
    poet_by_judge = {"j0": 2, "j1": 18, "j2": 10}
    rows = []
    for item, base in phil.items():
        for judge, poet in poet_by_judge.items():
            rows.append((item, judge, {"philosopher": base, "poet": poet}))
    verdict = sa.score_panel(rows, facets=("philosopher", "poet"), n_resamples=300, seed=0)
    assert verdict.facets["philosopher"].gate_pass is True
    assert verdict.facets["poet"].gate_pass is False
    assert verdict.all_pass is False
    assert verdict.weakest_facet == "poet"


def test_read_raw_tsv_parses_profiles(tmp_path):
    tsv = tmp_path / "raw.tsv"
    tsv.write_text(
        "item1\tjudgeA\t{\"philosopher\": 12, \"poet\": 8, \"satirist\": 5, "
        "\"humorist\": 7, \"private\": 14}\n"
        "item1\tjudgeB\t{\"philosopher\": 11, \"poet\": 9, \"satirist\": 6, "
        "\"humorist\": 7, \"private\": 13}\n",
        encoding="utf-8",
    )
    rows = sa.read_raw_tsv(tsv)
    assert len(rows) == 2
    assert rows[0][0] == "item1" and rows[0][1] == "judgeA"
    assert rows[0][2]["philosopher"] == 12.0


# ---------------------------------------------------------------------------
# the pre-registration stub — freeze BEFORE scoring, verify fails closed on drift
# ---------------------------------------------------------------------------

_STAMP = "2026-06-30T00:00:00+00:00"
_RUBRIC = "Rate the five Syad facets 0-20. Reason first, score last."


def test_freeze_is_deterministic_and_verifies():
    p1 = pr.freeze_preregistration(
        _RUBRIC, predicted_decoy_alpha_ceiling=0.20, alpha_gate_floor=ALPHA_TENTATIVE_FLOOR,
        frozen_at=_STAMP,
    )
    p2 = pr.freeze_preregistration(
        _RUBRIC, predicted_decoy_alpha_ceiling=0.20, alpha_gate_floor=ALPHA_TENTATIVE_FLOOR,
        frozen_at=_STAMP,
    )
    assert p1 == p2  # deterministic given a pinned stamp
    assert pr.verify_preregistration(p1, _RUBRIC) is True


def test_verify_fails_closed_on_rubric_drift():
    p = pr.freeze_preregistration(
        _RUBRIC, predicted_decoy_alpha_ceiling=0.20, alpha_gate_floor=ALPHA_TENTATIVE_FLOOR,
        frozen_at=_STAMP,
    )
    assert pr.verify_preregistration(p, _RUBRIC + " (edited)") is False


def test_decoy_ceiling_must_sit_below_gate_floor():
    with pytest.raises(ValueError, match="BELOW"):
        pr.freeze_preregistration(
            _RUBRIC, predicted_decoy_alpha_ceiling=0.70, alpha_gate_floor=0.667,
            frozen_at=_STAMP,
        )


def test_prereg_write_load_roundtrip(tmp_path):
    p = pr.freeze_preregistration(
        _RUBRIC, predicted_decoy_alpha_ceiling=0.20, alpha_gate_floor=ALPHA_TENTATIVE_FLOOR,
        frozen_at=_STAMP, note="qa_anchor sprint",
    )
    path = pr.write_preregistration(p, tmp_path / "prereg.json")
    loaded = pr.load_preregistration(path)
    assert loaded == p
    assert pr.verify_preregistration(loaded, _RUBRIC) is True
