"""test_sensorium_fusion — the py H1 gate holds its contract.

Guards the categorical fork the gate carries: the hollow triangle mints one H1 generator
above tolerance and none below; a common witness fills the hole; the fuse branch reaches
the exact H0 consensus; the cosheaf refusal raises.
"""
import pytest

from plane_base import BASE_RECORD

from sensorium_fusion import (
    agreement_nerve,
    cohomology_obstruction,
    fuse,
    kernel_consensus,
    reconciliation_cost,
)


def _sheaf(plane, value, base=BASE_RECORD):
    """The synthetic units name records; every restriction carries the base it stands over, because
    the H1 gate refuses one that does not (plane_base)."""
    return {"plane": plane, "base": base, "variance": "sheaf", "value": value}


def _hollow(base=0.5, gap=0.2):
    return {
        "restrictions": [
            _sheaf("content", {"a": base, "b": base}),
            _sheaf("structure", {"b": base + gap, "c": base}),
            _sheaf("form", {"c": base + gap, "a": base + gap}),
        ],
        "stalk": {"units": ["a", "b", "c"]},
    }


class TestAgreementNerve:
    def test_disagreeing_pairs_mint_no_edge_below_tolerance(self):
        nerve = agreement_nerve(_hollow(), agreement_tolerance=0.1)
        assert len(nerve["edges"]) == 0

    def test_edges_appear_once_tolerance_crosses_the_gap(self):
        nerve = agreement_nerve(_hollow(), agreement_tolerance=0.3)
        assert len(nerve["edges"]) == 3
        assert len(nerve["triangles"]) == 0   # no common witness — the triangle stays hollow

    def test_a_common_witness_fills_the_triangle(self):
        filled = {
            "restrictions": [
                _sheaf("content", {"w": 0.5}), _sheaf("structure", {"w": 0.5}),
                _sheaf("form", {"w": 0.5}),
            ],
            "stalk": {"units": ["w"]},
        }
        nerve = agreement_nerve(filled)
        assert len(nerve["triangles"]) == 1

    def test_cosheaf_refused(self):
        with pytest.raises(ValueError, match="SHEAF planes only"):
            agreement_nerve({"restrictions": [
                {"plane": "bands", "base": BASE_RECORD, "variance": "cosheaf", "value": {"u": 1.0}}],
                "stalk": {"units": ["u"]}})


class TestCohomologyObstruction:
    def test_the_hollow_triangle_carries_one_generator(self):
        obs = cohomology_obstruction(_hollow(), agreement_tolerance=0.3)
        assert obs["dimH1"] == 1
        assert obs["kind"] == "ontological"
        assert obs["cost"] == 0.0            # log2(1)

    def test_below_tolerance_nothing_obstructs(self):
        obs = cohomology_obstruction(_hollow(), agreement_tolerance=0.1)
        assert obs["dimH1"] == 0
        assert obs["kind"] == "reconcilable"

    def test_the_filled_triangle_kills_the_cocycle(self):
        filled = {
            "restrictions": [
                _sheaf("content", {"w": 0.5, "a": 0.2}),
                _sheaf("structure", {"w": 0.5, "b": 0.7}),
                _sheaf("form", {"w": 0.5, "c": 0.4}),
            ],
            "stalk": {"units": ["w", "a", "b", "c"]},
        }
        obs = cohomology_obstruction(filled)
        assert obs["dimH1"] == 0
        assert len(obs["nerve"]["triangles"]) == 1

    def test_dim_h0_counts_agreement_components(self):
        two = {
            "restrictions": [
                _sheaf("p0", {"x": 0.3}), _sheaf("p1", {"x": 0.3}),
                _sheaf("p2", {"y": 0.7}), _sheaf("p3", {"y": 0.7}),
            ],
            "stalk": {"units": ["x", "y"]},
        }
        assert cohomology_obstruction(two)["dimH0"] == 2

    def test_two_independent_triangles_stack_generators(self):
        h0 = _hollow(gap=0.1)
        h1 = _hollow(gap=0.4)
        for r in h1["restrictions"]:
            r["plane"] += "'"
            r["value"] = {k + "'": v for k, v in r["value"].items()}
        both = {"restrictions": h0["restrictions"] + h1["restrictions"],
                "stalk": {"units": ["a", "b", "c", "a'", "b'", "c'"]}}
        assert cohomology_obstruction(both, agreement_tolerance=0.2)["dimH1"] == 1
        assert cohomology_obstruction(both, agreement_tolerance=0.5)["dimH1"] == 2

    def test_reconciliation_cost_reads_log2(self):
        assert reconciliation_cost(0) == 0.0
        assert reconciliation_cost(1) == 0.0
        assert reconciliation_cost(4) == 2.0


class TestFuseGate:
    def test_h1_holds_the_gate_open(self):
        g = fuse(_hollow(), agreement_tolerance=0.3)
        assert g["verdict"] == "hold-open"
        assert g["obstruction"]["dimH1"] == 1

    def test_reconcilable_fuses_to_the_exact_consensus(self):
        a = {
            "restrictions": [
                _sheaf("content", {"u": 0.2}), _sheaf("structure", {"u": 0.6}),
            ],
            "stalk": {"units": ["u"]},
        }
        g = fuse(a)
        assert g["verdict"] == "fuse"
        assert g["fused"]["consensus"]["u"] == pytest.approx(0.4)

    def test_kernel_consensus_keeps_a_single_observer_value(self):
        a = {"restrictions": [_sheaf("content", {"solo": 0.7})], "stalk": {"units": ["solo"]}}
        assert kernel_consensus(a)["solo"] == pytest.approx(0.7)
