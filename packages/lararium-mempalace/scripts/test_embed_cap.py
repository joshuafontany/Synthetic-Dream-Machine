"""Phase-2 witness (W2.1/W2.3) — the warm in-engine embed cap produces a real dense vector (the config
model, minilm/384), deterministic + store-compatible; and a Memory sensorium composed with it lands a
turn through the {model,dim} identity floors. Loads the real ONNX model (an integration witness).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_embed_cap.py -q
"""

import pytest

from embed_cap import make_embed_cap
from sensorium import compose_content_land, compose_sensorium


def _warm_embed_or_skip():
    try:
        return make_embed_cap()
    except Exception as exc:  # noqa: BLE001 — model retrieval remains an external integration condition
        pytest.skip(f"warm embed cap unavailable: {exc}")


def test_warm_embed_cap_produces_a_real_deterministic_vector():
    embed_one, model = _warm_embed_or_skip()
    try:
        v = embed_one("the whale breached at dawn")
    except Exception as exc:  # noqa: BLE001 — model weights may be absent in an offline runner
        pytest.skip(f"warm embed cap unavailable: {exc}")
    assert isinstance(v, list) and len(v) > 0 and all(isinstance(x, float) for x in v)
    assert model, "a config model name must ride back (the embedder-identity tag)"
    assert embed_one("the whale breached at dawn") == v   # deterministic → store-compatible


def test_memory_sensorium_lands_with_the_warm_embedder(tmp_path):
    embed_one, model = _warm_embed_or_skip()
    try:
        dim = len(embed_one("probe"))
    except Exception as exc:  # noqa: BLE001 — model weights may be absent in an offline runner
        pytest.skip(f"warm embed cap unavailable: {exc}")
    recs = [{"seq": 1, "cid": "m-1", "text": "turn one",
             "metadata": {"wing": "w", "room": "r", "lar_embedder_model": model}}]
    s = compose_sensorium(
        kind="memory", source=lambda records: records, embed=embed_one,
        land=compose_content_land(str(tmp_path / ".mem"), required_keys={"wing", "room"},
                                  expected_dim=dim, expected_model=model),
    )
    res = s.capture(recs)                                 # lands through the dim + model identity floors
    assert res["landed"] == 1 and res["audit"]["ok"]
    hit = s.recall(embed_one("turn one"), 1)
    assert hit["matches"] and hit["matches"][0]["cid"] == "m-1"
