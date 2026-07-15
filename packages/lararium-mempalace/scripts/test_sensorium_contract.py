import json
from pathlib import Path

import pytest

from sensorium import compose_sensorium_contract, declare_sensorium_contract


FIXTURE = Path(__file__).resolve().parents[2] / "lararium-mesh" / "tests" / "fixtures" / "sensorium-contract-parity.json"


def test_python_contract_matches_the_shared_conformance_fixture():
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert declare_sensorium_contract(**fixture["valid"]) == fixture["normalized"]
    for invalid in fixture["invalid"]:
        with pytest.raises(ValueError, match=invalid["error"]):
            declare_sensorium_contract(**invalid["contract"])


def test_python_composes_the_same_open_cap_fragments_as_mesh():
    assert compose_sensorium_contract([
        {"has": ["content", "recall"]},
        {"has": ["telemetry"], "apertures": {"measure": "boundary-changepoint"}},
    ]) == {
        "has": ["content", "recall", "telemetry"],
        "apertures": {"measure": "boundary-changepoint"},
    }


def test_python_refuses_conflicting_cap_order_witnesses():
    with pytest.raises(ValueError, match="conflicting order evidence"):
        compose_sensorium_contract([
            {"has": ["capture"], "order": {"projector": "stream", "basis": "observed:source-sequence"}},
            {"has": ["worldline"], "order": {"projector": "stream", "basis": "declared:turn-sequence"}},
        ])
