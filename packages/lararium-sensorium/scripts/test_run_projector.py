"""test_run_projector — the RUN surface's pure faces hold their contracts.

The live 3-plane read + sweep rides the witnessed test-bed (prove-by-witness, the CLI);
these tests guard the pure instruments the sweep composes: the dial ladder, the
alpha->confidence map, the rank salience, the excess-entropy estimator (including the
small-corpus saturation wall the witness names), the band convention, the tree fold,
and the jitter null's skeleton discipline.
"""
import math

import pytest

from plane_base import BASE_RECORD, to_labeled
from run_projector import (
    _alpha_to_confidence,
    _band,
    _jittered_assignment,
    _rank_salience,
    excess_entropy_bits,
    geom_arl0_range,
    to_csv,
)
import random


class TestDial:
    def test_geom_ladder_descends_hi_to_lo(self):
        r = geom_arl0_range(200.0, 1.6, 28)
        assert len(r) == 28
        assert r[0] == pytest.approx(200.0)
        assert r[-1] == pytest.approx(1.6)
        assert all(r[i] > r[i + 1] for i in range(len(r) - 1))

    def test_single_rung_reads_hi(self):
        assert geom_arl0_range(50.0, 2.0, 1) == [50.0]

    def test_alpha_to_confidence_bounds(self):
        assert _alpha_to_confidence(0.0) == pytest.approx(18.0)
        assert _alpha_to_confidence(1.0) == pytest.approx(10.0)
        assert _alpha_to_confidence(5.0) == pytest.approx(10.0)   # clamped past 1
        assert 10.0 < _alpha_to_confidence(0.5) < 18.0


class TestRankSalience:
    def test_spreads_over_unit_interval(self):
        s = _rank_salience({"a": 0.1, "b": 0.5, "c": 0.9})
        assert s["a"] == pytest.approx(0.0)
        assert s["b"] == pytest.approx(0.5)
        assert s["c"] == pytest.approx(1.0)

    def test_ties_share_the_average_rank(self):
        s = _rank_salience({"a": 0.2, "b": 0.2, "c": 0.9})
        assert s["a"] == s["b"] == pytest.approx(0.25)

    def test_singleton_sits_mid(self):
        assert _rank_salience({"solo": 3.0}) == {"solo": 0.5}

    def test_empty_reads_empty(self):
        assert _rank_salience({}) == {}


class TestExcessEntropy:
    def test_a_periodic_stream_carries_its_phase_memory(self):
        period4 = [0, 0, 1, 1] * 100
        e = excess_entropy_bits(period4, 6)
        assert e == pytest.approx(2.0, abs=0.1)     # log2(period) bits of phase memory

    def test_an_iid_stream_carries_less_memory_than_the_ordered_one(self):
        rng = random.Random(7)
        iid = [rng.randrange(2) for _ in range(400)]
        ordered = [0, 0, 1, 1] * 100
        assert excess_entropy_bits(iid, 6) < excess_entropy_bits(ordered, 6)

    def test_the_small_corpus_saturation_wall(self):
        # every length-2 block unique -> the plug-in estimator saturates at a ceiling
        # DEPENDING ONLY on the stream length — the wall the projector witness names.
        a = list(range(12))
        b = list(reversed(range(12)))
        assert excess_entropy_bits(a, 4) == pytest.approx(excess_entropy_bits(b, 4))
        n = 12
        ceiling = math.log2(n - 2) + 3 * math.log2((n - 2) / (n - 3))
        assert excess_entropy_bits(a, 4) == pytest.approx(ceiling)


class TestBand:
    def test_the_quantile_and_conservative_p(self):
        draws = [float(i) for i in range(20)]        # 0..19
        v = _band(25.0, draws, 0.05)
        assert v["band"] == 18.0                     # ceil(0.95*20)-1 = index 18
        assert v["sig"] == 1
        assert v["p"] == pytest.approx(1.0 / 21.0)

    def test_an_inside_observation_reads_not_significant(self):
        draws = [float(i) for i in range(20)]
        v = _band(5.0, draws, 0.05)
        assert v["sig"] == 0
        assert v["p"] > 0.05


class TestTreeFold:
    def test_folds_type_labels_and_container_children(self):
        tree = {"type": "doc", "body": [{"type": "p", "text": "hi"},
                                        {"type": "p", "text": "yo"}]}
        lt = to_labeled(tree)
        assert lt["label"] == "type=doc"
        assert lt["children"][0]["label"] == "[list]"
        kids = lt["children"][0]["children"]
        assert [k["label"] for k in kids] == ["type=p", "type=p"]

    def test_scalars_fold_away(self):
        assert to_labeled("just text") is None


class TestJitterNull:
    def test_jitter_moves_values_never_the_skeleton(self):
        assignment = {
            "restrictions": [
                {"plane": "content", "base": BASE_RECORD, "variance": "sheaf",
                 "value": {"u": 0.5, "w": 0.2}, "origin": "native"},
            ],
            "stalk": {"units": ["u", "w"]},
        }
        j = _jittered_assignment(assignment, random.Random(3), 0.5)
        assert list(j["restrictions"][0]["value"].keys()) == ["u", "w"]
        assert j["stalk"] is assignment["stalk"]
        assert j["restrictions"][0]["value"] != assignment["restrictions"][0]["value"]

    def test_the_null_carries_the_base_so_it_faces_the_same_gate(self):
        """A surrogate that dropped `base` would sail past the gate the real assignment must clear,
        and the null would then be testing a different instrument than the observation does."""
        assignment = {
            "restrictions": [
                {"plane": "content", "base": BASE_RECORD, "variance": "sheaf",
                 "value": {"u": 0.5}, "origin": "native"},
            ],
            "stalk": {"units": ["u"]},
        }
        j = _jittered_assignment(assignment, random.Random(3), 0.5)
        assert j["restrictions"][0]["base"] == BASE_RECORD
        assert j["restrictions"][0]["origin"] == "native"


class TestCsv:
    def test_arl0_alpha_lead_and_the_rest_sort(self):
        rows = [{"arl0": 2.0, "alpha": 0.5, "zeta": 1, "beta": 2}]
        out = to_csv(rows)
        assert out.splitlines()[0] == "arl0,alpha,beta,zeta"

    def test_empty_reads_empty(self):
        assert to_csv([]) == ""
