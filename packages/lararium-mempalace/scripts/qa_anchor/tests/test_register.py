"""Tests for the deterministic commitment-register grader — hand-counted markers on
fixtures, the sigil/killer disciplines, and the drawer/form-vector artifact wiring.
No LLM, no palace: every count is computed by hand.

    PYTHONPATH=<scripts> python -m pytest qa_anchor/tests/test_register.py -q
"""

from __future__ import annotations

import json

import pytest

from qa_anchor import register as reg


# ---------------------------------------------------------------------------
# the grader core — hand-counted fixtures
# ---------------------------------------------------------------------------


def test_hedge_fixture_counts_exact():
    # "Perhaps this might possibly work. I think so."
    # hedges: perhaps(adv) · might(modal) · possibly(adv) · "i think"(phrase) = 4; boosters: 0
    s = reg.scan_text("Perhaps this might possibly work. I think so.")
    assert s["hedge_count"] == 4
    assert s["booster_count"] == 0
    assert s["hedge_per100"] > s["booster_per100"]
    assert s["commitment_index"] < 0  # provisional


def test_booster_fixture_counts_exact():
    # "Clearly this proves it. Of course it is certain."
    # boosters: clearly(clause-initial) · proves(factive) · "of course"(phrase) · certain(adj) = 4
    s = reg.scan_text("Clearly this proves it. Of course it is certain.")
    assert s["booster_count"] == 4
    assert s["hedge_count"] == 0
    assert s["commitment_index"] > 0  # committed


def test_clause_initial_discipline():
    # "clearly" mid-clause must NOT count; only clause-initial does.
    mid = reg.scan_text("She could see it clearly through the glass.")
    # 'could' is a hedge modal; 'clearly' is mid-clause -> not a booster.
    assert mid["booster_count"] == 0


def test_sigil_span_stripped():
    echo = reg.scan_text("<<~ confidence Canon 18/20 >> Canberra is the capital.")
    assert echo["hedge_count"] == 0 and echo["booster_count"] == 0


def test_excluded_killer_not_in_headline():
    s = reg.scan_text("You can see the result around the corner or here.")
    # 'can', 'around', 'or' are POS-ambiguous killers excluded from the headline.
    assert s["hedge_count"] == 0
    assert s["excluded_ambiguous"] >= 3


def test_phrase_before_single_no_double_count():
    # "in fact" must match as a phrase, not as 'fact' + a stray single.
    s = reg.scan_text("In fact, the answer is correct.")
    assert s["booster_count"] == 1  # the single phrase "in fact"


def test_selftest_direction_holds():
    # the module's own selftest assertions, exercised here.
    reg._selftest()


# ---------------------------------------------------------------------------
# artifact wiring — drawer text / form-vector artifacts
# ---------------------------------------------------------------------------


def test_extract_text_tries_candidate_keys():
    assert reg.extract_text({"text": "hello there"}) == "hello there"
    assert reg.extract_text({"content": "drawer body"}) == "drawer body"
    assert reg.extract_text({"source_text": "form vector prose"}) == "form vector prose"
    assert reg.extract_text({"unrelated": 5}) is None
    assert reg.extract_text("a bare string") == "a bare string"


def test_scan_artifact_reads_text_field(tmp_path):
    art = tmp_path / "drawer.json"
    art.write_text(json.dumps({"content": "Perhaps this might work."}), encoding="utf-8")
    sc = reg.scan_artifact(art)
    assert sc is not None
    assert sc["hedge_count"] == 2  # perhaps + might
    assert sc["source"].endswith("drawer.json")


def test_scan_artifact_none_when_no_text(tmp_path):
    art = tmp_path / "novec.json"
    art.write_text(json.dumps({"form_vector": [0.1, 0.2]}), encoding="utf-8")
    assert reg.scan_artifact(art) is None


def test_scan_artifacts_and_aggregate(tmp_path):
    (tmp_path / "a.json").write_text(json.dumps({"text": "Perhaps it might work."}), encoding="utf-8")
    (tmp_path / "b.json").write_text(
        json.dumps({"text": "Clearly it proves the point."}), encoding="utf-8"
    )
    rows = reg.scan_artifacts(tmp_path)
    assert len(rows) == 2
    agg = reg.aggregate(rows)
    assert agg["n"] == 2
    assert "med_hedge_per100" in agg and "med_booster_per100" in agg


def test_aggregate_empty():
    assert reg.aggregate([]) == {"n": 0}


def test_lexicon_poles_disjoint_in_singles():
    # a single token must not sit in BOTH poles (would be double-counted on one text).
    overlap = (reg._HS & reg._BS)
    assert overlap == set(), f"singles appear in both poles: {overlap}"
