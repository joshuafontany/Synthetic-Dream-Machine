"""Phase-1 witness — generic cap-stack composition over real rooted content lands. Proves: compose
+ capture + recall; idempotent re-capture; blind-by-composition (a missing cap REFUSES); and the
declared durability policy (append-only rejects an edit-overwrite; mutable allows it).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_sensorium.py -q
"""

import pytest

from sensorium import (compose_content_land, compose_persistence_cap, compose_sensorium,
                       compose_stream_sensorium, sensorium_paths)


def _recs(n):
    return [{"seq": i + 1, "cid": f"m-{i + 1}", "text": f"turn {i + 1}",
             "metadata": {"wing": "w", "room": "r"}} for i in range(n)]


def _embed(text):
    return [float(len(text)), 0.0]


def _sensorium(root, *, kind="memory", append_only=True, required_keys=None, expected_dim=None):
    return compose_sensorium(
        kind=kind, source=lambda records: records, embed=_embed,
        land=compose_content_land(root, append_only=append_only, required_keys=required_keys,
                                  expected_dim=expected_dim),
    )


def test_memory_sensorium_captures_recalls_and_is_idempotent(tmp_path):
    s = _sensorium(str(tmp_path / ".mem"), required_keys={"wing", "room"}, expected_dim=2)
    assert s.kind == "memory"
    res = s.capture(_recs(3))
    assert res["landed"] == 3 and res["audit"]["ok"]
    hit = s.recall([float(len("turn 2")), 0.0], 1)
    assert hit["matches"] and hit["matches"][0]["cid"].startswith("m-")   # recall read-face
    res2 = s.capture(_recs(3))                                            # re-derivation idempotent
    assert res2["landed"] == 0 and res2["skipped"] == 3


def test_the_two_pins_carry_their_mutability_policy(tmp_path):
    mem = _sensorium(str(tmp_path / ".mem2"), required_keys={"wing", "room"}, expected_dim=2)
    dream = _sensorium(str(tmp_path / ".dream"), kind="dream", append_only=False)
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


def test_stream_sensorium_keeps_warm_land_but_mints_pass_local_caps():
    """Live and harvest share the entity without sharing a mutable source/plane pass."""
    class Land:
        def __init__(self):
            self.rows = {}

        def is_landed(self, cid):
            return cid in self.rows

        def land(self, cid, text, vector, metadata):
            self.rows[cid] = (text, metadata)

    land = Land()
    made, finished = [], []

    def source_factory(*, label):
        made.append(label)
        return lambda _pointer: [{"seq": 1, "cid": f"cid-{label}", "text": label, "metadata": {}}]

    class Plane:
        name = "witness"

        def __init__(self, label):
            self.label = label

        def land(self, _record):
            pass

        def finish(self):
            finished.append(self.label)
            return {"landed": 1}

    stream = compose_stream_sensorium(
        kind="text", land=land, source_factory=source_factory,
        planes_factory=lambda *, label, pointer: [Plane(label)],
        observer=lambda _pointer, *, label: {"observed": label},
    )
    assert stream.capture("first", label="live")["observed"] == "live"
    assert stream.capture("second", label="harvest")["observed"] == "harvest"
    assert made == ["live", "harvest"] and finished == ["live", "harvest"]
    assert set(land.rows) == {"cid-live", "cid-harvest"}


def test_root_derives_one_stable_palace_stack(tmp_path):
    paths = sensorium_paths(str(tmp_path / "sensorium" / ".." / "sensorium"))
    assert paths.content == str(tmp_path / "sensorium" / "content")
    assert paths.worldline == str(tmp_path / "sensorium" / "worldline")


def test_persistence_cap_declares_policy_without_materializing_a_store(tmp_path):
    root = tmp_path / "sensorium"
    cap = compose_persistence_cap(str(root), half_life=None)
    assert cap.path == str(root / "persistence") and cap.half_life is None and cap.active is False
    assert not (root / "persistence").exists()
    with pytest.raises(ValueError, match="positive or null"):
        compose_persistence_cap(str(root), half_life=0)


def test_every_sensorium_carries_inactive_persistence_until_a_lifecycle_activates_it(tmp_path):
    sensorium = _sensorium(str(tmp_path / "generic"))
    assert sensorium._persistence.path is None and sensorium._persistence.active is False


def test_a_blank_root_refuses_rather_than_landing_in_the_cwd():
    """A sensorium root must be NAMED — an unnamed one is not a default, it is the cwd.

    `expanduser("")` returns "" and `realpath("")` returns the current working directory, so a caller
    whose root came back empty composed a whole sensorium — manifest, content palace, locks, worldline —
    wherever the process happened to stand, silently and with a clean exit. Measured: a repo checkout
    grew four sensorium directories that way.

    The root is the one argument every plane path hangs off, so its absence is the failure.
    """
    import pytest
    for blank in ("", "   ", None):
        with pytest.raises((ValueError, TypeError)):
            sensorium_paths(blank)


def test_a_named_root_still_derives_every_plane():
    """The refusal reaches blanks only — a real root keeps deriving the full stack."""
    paths = sensorium_paths("/tmp/lares-test-sensorium-root")
    assert paths.content.endswith("/content")
    assert paths.worldline.endswith("/worldline")
