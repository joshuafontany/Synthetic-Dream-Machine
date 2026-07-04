"""Phase-2 witness (W2.1/W2.3) — the warm in-engine embed cap produces a real dense vector (the config
model, minilm/384), deterministic + store-compatible; and a Memory sensorium composed with it lands a
turn through the {model,dim} identity floors. Loads the real ONNX model (an integration witness).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_embed_cap.py -q
"""

from embed_cap import make_embed_cap
from sensorium import compose_memory_sensorium


def test_warm_embed_cap_produces_a_real_deterministic_vector():
    embed_one, model = make_embed_cap()
    v = embed_one("the whale breached at dawn")
    assert isinstance(v, list) and len(v) > 0 and all(isinstance(x, float) for x in v)
    assert model, "a config model name must ride back (the embedder-identity tag)"
    assert embed_one("the whale breached at dawn") == v   # deterministic → store-compatible


def test_memory_sensorium_lands_with_the_warm_embedder(tmp_path):
    embed_one, model = make_embed_cap()
    dim = len(embed_one("probe"))
    recs = [{"seq": 1, "cid": "m-1", "text": "turn one",
             "metadata": {"wing": "w", "room": "r", "lar_embedder_model": model}}]
    s = compose_memory_sensorium(str(tmp_path / ".mem"), source=lambda r: r, embed=embed_one,
                                 expected_dim=dim, expected_model=model)
    res = s.capture(recs)                                 # lands through the dim + model identity floors
    assert res["landed"] == 1 and res["audit"]["ok"]
    hit = s.recall(embed_one("turn one"), 1)
    assert hit["matches"] and hit["matches"][0]["cid"] == "m-1"
