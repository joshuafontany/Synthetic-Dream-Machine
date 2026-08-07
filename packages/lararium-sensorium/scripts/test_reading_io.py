"""A reading lands on the persistence plane carrying what it was computed over."""

from __future__ import annotations

import json

import pytest

from reading_io import (
    canonical_json,
    flatten_reading,
    reading_claim_cid,
    record_reading,
)


class _Store:
    """A stand-in for PersistenceStore.put — the real store stays dumb, so this can be too."""

    def __init__(self):
        self.rows = {}

    def put(self, claim_cid, kind, assertion, signer, frontier, pubinfo, document=""):
        self.rows[claim_cid] = {
            "kind": kind,
            "assertion": assertion,
            "signer": signer,
            "frontier": frontier,
            "pubinfo": pubinfo,
            "document": document,
        }
        return {"claim_cid": claim_cid}


def _record(store, payload, **over):
    args = dict(
        signer="vessel-0", frontier="pour-1", sensorium="memory",
        plane="content", grain="drawer", engine="RTransferEntropy-calc_ete",
    )
    args.update(over)
    return record_reading(store, "couple_streams", payload, **args)


def test_a_reading_lands_with_its_declaration():
    """The value alone names a choice, not a fact — the partition must ride beside it."""
    store = _Store()
    out = _record(store, {"ete": [[None, 0.24], [0.0, None]], "engine": "calc_ete"})

    row = store.rows[out["claim_cid"]]
    assert row["pubinfo"]["sensorium"] == "memory"
    assert row["pubinfo"]["plane"] == "content"
    assert row["pubinfo"]["grain"] == "drawer"
    assert row["pubinfo"]["engine"] == "RTransferEntropy-calc_ete"
    assert row["pubinfo"]["width"] == len(row["assertion"])


def test_the_numbers_become_the_assertion_and_the_strings_do_not():
    """The store indexes by assertion, so a reading's own figures place it; its labels ride pubinfo."""
    v = flatten_reading({"engine": "calc_ete", "ete": [[None, 0.24], [0.0, None]], "n": 2})
    # keys sort engine, ete, n: the engine STRING drops out, the matrix folds in row order with each
    # empty diagonal cell held as 0.0 so the width survives, then n.
    assert v == [0.0, 0.24, 0.0, 0.0, 2.0]


def test_an_empty_reading_refuses_rather_than_colliding():
    """Every measurement-free reading would address the same claim — so none may land."""
    with pytest.raises(ValueError, match="no finite numbers"):
        _record(_Store(), {"engine": "calc_ete", "note": "insufficient"})


def test_the_same_reading_over_the_same_ground_lands_once():
    """Content-addressed by {signer, frontier, assertion} — a re-record collides idempotently."""
    store = _Store()
    payload = {"ete": [[None, 0.24], [0.0, None]]}
    a, b = _record(store, payload), _record(store, payload)
    assert a["claim_cid"] == b["claim_cid"]
    assert len(store.rows) == 1


def test_a_reading_over_a_different_pour_lands_beside_it_not_on_it():
    """The frontier carries causal position, so the same figure re-read later stays a SECOND claim —
    which is the whole point: a series needs both rows to survive."""
    store = _Store()
    payload = {"ete": [[None, 0.24], [0.0, None]]}
    _record(store, payload, frontier="pour-1")
    _record(store, payload, frontier="pour-2")
    assert len(store.rows) == 2


def test_canonical_json_sorts_keys_and_refuses_non_finite():
    assert canonical_json({"b": 1, "a": [2, {"d": 4, "c": 3}]}) == '{"a":[2,{"c":3,"d":4}],"b":1}'
    with pytest.raises(ValueError, match="non-finite"):
        canonical_json({"x": float("inf")})


def test_the_claim_id_matches_what_the_TS_keel_computes():
    """Both sides address one claim, or the plane holds two records of it.

    Recomputed here against the same rule sensorium.ts states — sha256 over canonical
    {signer, frontier, assertion} — so a drift in either serializer fails loudly rather than
    quietly forking the id space.
    """
    import hashlib

    assertion = [0.0, 0.24, 1.0]
    expect = hashlib.sha256(
        '{"assertion":[0.0,0.24,1.0],"frontier":"pour-1","signer":"vessel-0"}'.encode("utf-8")
    ).hexdigest()
    assert reading_claim_cid("vessel-0", "pour-1", assertion) == expect


def test_the_document_slot_carries_the_reading_verbatim():
    """The vector holds the figures; the text projection keeps the shape a reader can still parse."""
    store = _Store()
    payload = {"ete": [[None, 0.24]], "engine": "calc_ete"}
    out = _record(store, payload)
    assert json.loads(store.rows[out["claim_cid"]]["document"])["engine"] == "calc_ete"
