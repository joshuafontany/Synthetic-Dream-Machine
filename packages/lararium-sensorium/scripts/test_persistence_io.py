"""Real-chroma round-trip for the PersistencePalace store (persistence_io). Opens a real
ChromaDB collection in a tmp palace dir (the venv has chroma), exercising the DUMB store's
put/get/witness-RMW/neighbors — the lifecycle LAW stays in the TS keel, so this only proves
persistence + load + append + the neighbor read.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-sensorium/scripts/test_persistence_io.py -q
"""

import pytest

import persistence_io as pio


def _store(tmp_path):
    return pio.PersistenceStore(str(tmp_path / ".structurepalace_test_persist"))


def test_put_then_get_roundtrips_the_testimony(tmp_path):
    s = _store(tmp_path)
    s.put("t-1", "innovation", [0.1, 0.2, 0.3], "vessel-A", "f0", {"vow": "provisional"})
    got = s.get("t-1")
    assert got is not None
    assert got["kind"] == "innovation"
    assert got["provenance"] == {"signer": "vessel-A", "frontier": "f0"}
    assert got["pubinfo"] == {"vow": "provisional"}
    assert got["witnesses"] == []  # born with no witnesses
    assert len(got["assertion"]) == 3
    assert got["document"] == "t-1"  # no text projection given → id placeholder


def test_get_absent_is_none(tmp_path):
    assert _store(tmp_path).get("never") is None


def test_witness_appends_signed_edges_rmw(tmp_path):
    s = _store(tmp_path)
    s.put("t-1", "innovation", [1.0, 0.0], "vessel-A", "f0", {})
    r1 = s.witness("t-1", "vessel-B", "f1", 1, 5)
    assert r1 == {"ok": True, "witnesses": 1}
    r2 = s.witness("t-1", "vessel-C", "f2", -1)  # a defeat
    assert r2["witnesses"] == 2
    log = s.get("t-1")["witnesses"]
    assert log[0] == {"signer": "vessel-B", "frontier": "f1", "polarity": 1, "tick": 5}
    assert log[1] == {"signer": "vessel-C", "frontier": "f2", "polarity": -1}  # no tick


def test_witness_on_absent_is_honest_noop(tmp_path):
    assert _store(tmp_path).witness("ghost", "vessel-B", "f1", 1) == {"ok": False, "witnesses": 0}


def test_truncation_never_sheds_a_defeat(tmp_path):
    # A defeat born as the OLDEST entry must survive a vouch-storm that overruns WITNESS_CAP —
    # dropping it would silently resurrect every vouch it defeated (the standing law reads a false
    # rise). Defeats stay compaction-exempt; only vouches truncate, oldest-first.
    s = _store(tmp_path)
    s.put("t-1", "innovation", [1.0, 0.0], "vessel-A", "f0", {})
    s.witness("t-1", "vessel-DEFEATER", "f-defeat", -1)          # the defeat: the OLDEST edge
    for i in range(pio.WITNESS_CAP + 50):                         # a vouch-storm overruns the cap
        s.witness("t-1", f"vessel-{i}", f"f{i}", 1)
    log = s.get("t-1")["witnesses"]
    assert len(log) <= pio.WITNESS_CAP                            # the log stays bounded
    defeats = [e for e in log if e["polarity"] < 0]
    assert defeats and defeats[0]["signer"] == "vessel-DEFEATER"  # the defeat SURVIVED the storm
    assert log[0]["polarity"] < 0                                 # and stays the oldest (its audit slot holds)


def test_put_preserves_witness_log_on_reput(tmp_path):
    s = _store(tmp_path)
    s.put("t-1", "innovation", [1.0, 0.0], "vessel-A", "f0", {})
    s.witness("t-1", "vessel-B", "f1", 1)
    s.put("t-1", "innovation", [1.0, 0.0], "vessel-A", "f0", {"note": "re-put"})  # content re-put
    got = s.get("t-1")
    assert len(got["witnesses"]) == 1        # the log survived the re-put
    assert got["pubinfo"] == {"note": "re-put"}


def test_neighbors_empty_population_is_empty(tmp_path):
    assert _store(tmp_path).neighbors([1.0, 2.0], 8) == {"population": []}


def test_neighbors_returns_nearest_vectors_for_the_gate(tmp_path):
    s = _store(tmp_path)
    for i in range(5):
        s.put(f"t-{i}", "innovation", [float(i), 0.0], "vessel-A", f"f{i}", {})
    pop = s.neighbors([0.0, 0.0], 3)["population"]
    assert len(pop) == 3            # the k nearest existing vectors
    assert all(len(v) == 2 for v in pop)


def test_default_store_identity_floor_off_accepts_any_width(tmp_path):
    # DEFAULT (no expected_dim): the floor is OFF — testimony stays caller-trusting, any width lands.
    s = _store(tmp_path)
    s.put("t-a", "innovation", [0.1, 0.2, 0.3, 0.4], "vessel-A", "f0", {})  # 4-wide, no raise
    assert len(s.get("t-a")["assertion"]) == 4


def test_expected_dim_floor_rejects_mismatch_and_none(tmp_path):
    # opt IN the embedder-identity floor: a dim swap fails loud BEFORE it corrupts standing.
    s = pio.PersistenceStore(str(tmp_path / ".persist_guarded"), expected_dim=3)
    s.put("t-1", "innovation", [0.1, 0.2, 0.3], "vessel-A", "f0", {})       # right dim → lands
    assert len(s.get("t-1")["assertion"]) == 3                              # (chroma stores float32; check width)
    with pytest.raises(ValueError):                                          # wrong dim → embedder-identity floor
        s.put("t-2", "innovation", [0.1, 0.2], "vessel-A", "f0", {})
    with pytest.raises(ValueError):                                          # None assertion → clean domain error (not len(None))
        s.put("t-3", "innovation", None, "vessel-A", "f0", {})


def test_expected_model_floor_rejects_a_same_dim_swap(tmp_path):
    # C4: mirror content_io's MODEL half — a same-dim DIFFERENT-model swap slips the dim guard yet
    # searches an incomparable space (standing corruption). The store self-stamps the model on put; the
    # palace-history open-check refuses to reopen the palace under a different model.
    p = str(tmp_path / ".persist_model")
    s = pio.PersistenceStore(p, expected_model="model-A/4")
    s.put("t-1", "innovation", [0.1, 0.2, 0.3, 0.4], "vessel-A", "f0", {})  # stamps model-A
    with pytest.raises(ValueError):                                          # same dim, DIFFERENT model → fail loud
        pio.PersistenceStore(p, expected_model="model-B/4")
    pio.PersistenceStore(p, expected_model="model-A/4")                     # the held model reopens clean
