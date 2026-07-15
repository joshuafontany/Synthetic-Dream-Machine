import json
from pathlib import Path

import pytest

from sensorium import declare_sensorium_contract


FIXTURE = Path(__file__).resolve().parents[2] / "lararium-mesh" / "tests" / "fixtures" / "sensorium-contract-parity.json"


def test_python_contract_matches_the_shared_conformance_fixture():
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert declare_sensorium_contract(**fixture["valid"]) == fixture["normalized"]
    for invalid in fixture["invalid"]:
        with pytest.raises(ValueError, match=invalid["error"]):
            declare_sensorium_contract(**invalid["contract"])
