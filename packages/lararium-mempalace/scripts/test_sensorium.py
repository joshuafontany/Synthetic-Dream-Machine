"""Phase-1 witness — compose_sensorium (the nameless-entity fleet-builder) + the 2 PINNED instances
(Memory=immutable-ground ⊥ Dream=mutable) over real content_io ephemeral palaces. Proves: compose
+ capture + recall; idempotent re-capture; blind-by-composition (a missing cap REFUSES); and the
pin-policy (Memory rejects an edit-overwrite, Dream allows it — W1.1/W1.2/W1.3).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_sensorium.py -q
"""

import pytest

from sensorium import compose_dream_sensorium, compose_memory_sensorium, compose_sensorium


def _recs(n):
    return [{"seq": i + 1, "cid": f"m-{i + 1}", "text": f"turn {i + 1}",
             "metadata": {"wing": "w", "room": "r"}} for i in range(n)]


def _embed(text):
    return [float(len(text)), 0.0]


def test_memory_sensorium_captures_recalls_and_is_idempotent(tmp_path):
    s = compose_memory_sensorium(str(tmp_path / ".mem"), source=lambda r: r, embed=_embed, expected_dim=2)
    assert s.kind == "memory"
    res = s.capture(_recs(3))
    assert res["landed"] == 3 and res["audit"]["ok"]
    hit = s.recall([float(len("turn 2")), 0.0], 1)
    assert hit["matches"] and hit["matches"][0]["cid"].startswith("m-")   # recall read-face
    res2 = s.capture(_recs(3))                                            # re-derivation idempotent
    assert res2["landed"] == 0 and res2["skipped"] == 3


def test_the_two_pins_carry_their_mutability_policy(tmp_path):
    mem = compose_memory_sensorium(str(tmp_path / ".mem2"), source=lambda r: r, embed=_embed, expected_dim=2)
    dream = compose_dream_sensorium(str(tmp_path / ".dream"), source=lambda r: r, embed=_embed)
    assert dream.kind == "dream"
    mem.capture(_recs(1))
    with pytest.raises(ValueError):                                      # Memory = immutable ground: no edit-overwrite
        mem._land.store.put("m-1", "an edited turn", [0.1, 0.2], {"wing": "w", "room": "r"})
    dream._land.store.put("d-1", "reflection v1", [1.0, 0.0], {})
    dream._land.store.put("d-1", "reflection v2", [1.0, 0.0], {})        # Dream = mutable: overwrite OK
    assert dream.recall([1.0, 0.0], 1)["matches"][0]["cid"] == "d-1"


def test_compose_refuses_a_missing_cap():
    with pytest.raises(ValueError):                                      # blind-by-composition
        compose_sensorium(kind="broken", source=None, land=object())
