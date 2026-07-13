"""capture_reading — the py twin matches the TS canon, case for case, pole included."""

import json
import math
import os

import pytest

import capture_reading as cr

_FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "capture-reading-parity.json")


def _cases():
    with open(_FIXTURE) as f:
        return json.load(f)["cases"]


def test_witness_parity_matches_the_ts_twin_case_for_case():
    """The TS generates (capture_reading_fixture.ts); the py matches — fixtures-as-data
    across the causal-island, never a live cross-runtime call."""
    for case in _cases():
        dials = cr.CaptureDials(**case["dials"])
        got = cr.capture_reading([float(e) for e in case["epochs"]], dials)
        want = case["reading"]
        assert got.concentration == pytest.approx(want["concentration"]), case["note"]
        assert got.ceiling == want["ceiling"], case["note"]
        assert got.headroom == pytest.approx(want["headroom"]), case["note"]
        assert got.at_ceiling == want["at_ceiling"], case["note"]
        if want["curve_bar"] == "Infinity":
            assert math.isinf(got.curve_bar), case["note"]
        else:
            assert got.curve_bar == pytest.approx(want["curve_bar"]), case["note"]


def test_an_unfed_place_reads_zero_never_raises():
    assert cr.concentration([]) == 0.0


def test_the_pole_stands_at_the_ceiling():
    # r >= beta → the convex wall reads inf; a reading, never a verdict.
    assert math.isinf(cr.capture_threshold(0.8, 0.8, 0.05, 1000, 0.9))
    assert math.isinf(cr.capture_threshold(0.95, 0.8, 0.05, 1000, 0.9))


def test_alpha_outside_its_range_refuses_loud():
    with pytest.raises(ValueError, match="alpha"):
        cr.capture_threshold(0.1, 0.8, 0.05, 1000, 1.0)
