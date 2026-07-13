"""test_sensorium_consistency — the py H0 twin holds its contract.

The TS<->py parity itself rides the committed fixture (the mesh vitest side consumes it);
these tests guard the twin's own semantics: the glue verdict, the vacuous flag, the
variance gates both ways, the locus argmax, and the native pseudometrics' edges.
"""
import math

import pytest

from plane_base import BASE_PATTERN, BASE_RECORD

from sensorium_consistency import (
    characteristic_vector,
    consistency_radius,
    cosine_distance,
    deckard_distance,
    jaccard_distance,
    ki_co_consistency,
)


def _sheaf(plane, value, base=BASE_RECORD):
    """The synthetic units name records; the li radius refuses a restriction with no base."""
    return {"plane": plane, "base": base, "variance": "sheaf", "value": value}


def _cosheaf(plane, value, base=BASE_PATTERN):
    """A ki face stands over the PATTERN base by default — the structure registry's own universe,
    which is exactly the base the li radius does NOT read."""
    return {"plane": plane, "base": base, "variance": "cosheaf", "value": value}


class TestConsistencyRadius:
    def test_glue_reads_zero_radius(self):
        v = consistency_radius(
            [_sheaf("content", {"u": 0.5, "w": 0.2}), _sheaf("structure", {"u": 0.5, "w": 0.2})],
            {"units": ["u", "w"]})
        assert v["radius"] == 0.0
        assert v["glues"] is True
        assert v["vacuous"] is False

    def test_obstruction_localizes_to_the_argmax_unit(self):
        v = consistency_radius(
            [_sheaf("content", {"u": 0.1, "w": 0.4}), _sheaf("structure", {"u": 0.9, "w": 0.5})],
            {"units": ["u", "w"]})
        assert v["radius"] == pytest.approx(0.8)
        assert v["obstructionLocus"] == ["u"]
        assert v["glues"] is False

    def test_disjoint_domains_flag_vacuous_never_a_false_glue(self):
        v = consistency_radius(
            [_sheaf("content", {"a": 0.1}), _sheaf("structure", {"b": 0.9})],
            {"units": ["a", "b"]})
        assert v["vacuous"] is True
        assert v["glues"] is False
        assert v["radius"] == 0.0

    def test_empty_stalk_reads_vacuous(self):
        v = consistency_radius([_sheaf("content", {"a": 0.1})], {"units": []})
        assert v["vacuous"] is True
        assert "note" in v

    def test_units_outside_the_stalk_never_constrain(self):
        v = consistency_radius(
            [_sheaf("content", {"u": 0.5, "ghost": 0.0}),
             _sheaf("structure", {"u": 0.5, "ghost": 1.0})],
            {"units": ["u"]})
        assert v["glues"] is True

    def test_variance_gate_refuses_a_cosheaf_loudly(self):
        with pytest.raises(ValueError, match="SHEAF planes only"):
            consistency_radius([_cosheaf("bands", {"u": 1.0})], {"units": ["u"]})

    def test_signal_kind_names_the_disagreement_signal(self):
        v = consistency_radius([_sheaf("content", {"u": 0.5})], {"units": ["u"]})
        assert v["signalKind"] == "disagreement-signal"


class TestKiCoConsistency:
    def test_co_extension_agrees_at_zero(self):
        v = ki_co_consistency(
            [_cosheaf("D1", {"c0": 0.0, "c1": 0.0}), _cosheaf("D2", {"c0": 0.0, "c1": 0.0})],
            {"cofaces": ["c0", "c1"]})
        assert v["coExtends"] is True

    def test_a_leaking_band_reads_a_co_obstruction(self):
        v = ki_co_consistency(
            [_cosheaf("D1", {"c0": 0.0}), _cosheaf("D2", {"c0": 0.4})],
            {"cofaces": ["c0"]})
        assert v["radius"] == pytest.approx(0.4)
        assert v["offendingCoface"] == ["c0"]

    def test_mirror_gate_refuses_a_sheaf_loudly(self):
        with pytest.raises(ValueError, match="COSHEAF faces only"):
            ki_co_consistency([_sheaf("content", {"c0": 1.0})], {"cofaces": ["c0"]})


class TestNativeMetrics:
    def test_cosine_edges(self):
        assert cosine_distance([0.0], [0.0]) == 0.0
        assert cosine_distance([0.0], [1.0]) == 1.0
        assert cosine_distance([1.0, 0.0], [0.0, 1.0]) == pytest.approx(1.0)
        assert cosine_distance([0.3, 0.4], [0.3, 0.4]) == pytest.approx(0.0, abs=1e-12)

    def test_jaccard_edges(self):
        assert jaccard_distance(set(), set()) == 0.0
        assert jaccard_distance({"x"}, {"y"}) == 1.0
        assert jaccard_distance({"x", "y"}, {"y", "z"}) == pytest.approx(2.0 / 3.0)

    def test_deckard_reflexive_snaps_to_exact_zero(self):
        t = {"label": "doc", "children": [{"label": "p", "children": []}]}
        assert deckard_distance(t, t) == 0.0

    def test_deckard_rises_with_shape_divergence(self):
        # b shares a's "p" leaf pattern (distance < 0.5); c shares nothing — disjoint
        # histograms sit at angular 0.5 (cos-sim 0), the maximal count-histogram spread.
        a = {"label": "doc", "children": [{"label": "p", "children": []},
                                          {"label": "p", "children": []}]}
        b = {"label": "sec", "children": [{"label": "p", "children": []}]}
        c = {"label": "table", "children": [{"label": "row", "children": []},
                                            {"label": "row", "children": []}]}
        assert 0.0 < deckard_distance(a, b) < deckard_distance(a, c) == pytest.approx(0.5)

    def test_characteristic_vector_survives_a_deep_chain(self):
        node = {"label": "leaf", "children": []}
        for _ in range(5000):
            node = {"label": "n", "children": [node]}
        vec = characteristic_vector(node)
        assert sum(vec.values()) == 5001

    def test_deckard_escapes_delimiter_labels(self):
        a = {"label": "x(y,z)", "children": []}
        b = {"label": "x", "children": [{"label": "y", "children": []},
                                        {"label": "z", "children": []}]}
        assert deckard_distance(a, b) > 0.0
