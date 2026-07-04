"""Tests for drawer_io — the two readers COMPOSE the shared store-readback cap.

The cap (read_stored_embeddings) lives in sidecar_caps and is tested there; here we
prove the two call sites compose it correctly: the CONTENT reader (cmd_embeddings)
SORTS by (source_file, chunk_index, id) and the FORM reader (cmd_form_embeddings)
dumps FLAT (native order, keyed by verbatim_sha). No ChromaDB — the collection is a
fake, injected by monkeypatch. Run under the mempalace venv:

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_drawer_io.py -q
"""

import argparse
import json

import pytest

import drawer_io as dio


def test_write_paths_fail_closed_when_adapter_missing(monkeypatch, tmp_path):
    # KA-4 fail-closed: an un-importable adapter (_DECLARED None) must REFUSE a session-memory write,
    # never silently degrade to unvalidated/mis-stamped drawers. _require_adapter raises before _col().
    monkeypatch.setattr(dio, "_DECLARED", None)
    pf = tmp_path / "p.ndjson"
    pf.write_text(json.dumps({"id": "d1", "patch": {"lar_salience": 0.5}}) + "\n")
    with pytest.raises(SystemExit):
        dio.cmd_apply(argparse.Namespace(patchfile=str(pf)))
    with pytest.raises(SystemExit):
        dio.cmd_kapae(argparse.Namespace(patchfile=str(pf), salience=None))


class _FakeCollection:
    """A chroma-shaped collection: `.get(where=, include=)` → parallel id/emb/meta lists."""

    def __init__(self, ids, embeddings, metadatas):
        self._ids = ids
        self._embs = embeddings
        self._metas = metadatas

    def get(self, where=None, include=None):
        return {"ids": self._ids, "embeddings": self._embs, "metadatas": self._metas}


def _lines(capsys):
    out = capsys.readouterr().out
    return [json.loads(x) for x in out.splitlines() if x.strip()]


# ---------------------------------------------------------------------------
# cmd_embeddings — the CONTENT plane: composes the cap, then SORTS (caller-owned)
# ---------------------------------------------------------------------------


def test_cmd_embeddings_sorts_and_rides_new_keys(monkeypatch, capsys):
    # Deliberately OUT of order: chunk 2 before 0, plus a second source_file.
    col = _FakeCollection(
        ids=["d2", "d0", "d1", "e0"],
        embeddings=[[1, 1], [2, 2], [3, 3], [4, 4]],
        metadatas=[
            {"chunk_index": 2, "source_file": "a.jsonl", "lar_verbatim_sha": "sha2",
             "lar_agent_handle": "agentA", "lar_salience": 0.2},
            {"chunk_index": 0, "source_file": "a.jsonl", "lar_verbatim_sha": "sha0"},
            {"chunk_index": 1, "source_file": "a.jsonl", "lar_ffz": "session/_.a._._.p1"},
            {"chunk_index": 0, "source_file": "b.jsonl"},
        ],
    )
    monkeypatch.setattr(dio, "_col", lambda: col)
    dio.cmd_embeddings(argparse.Namespace(wing=""))
    rows = _lines(capsys)
    # SORTED by (source_file, chunk_index, id): a#0, a#1, a#2, then b#0.
    assert [r["id"] for r in rows] == ["d0", "d1", "d2", "e0"]
    # the two ride-along keys land off the same readback.
    by_id = {r["id"]: r for r in rows}
    assert by_id["d2"]["lar_agent_handle"] == "agentA"
    assert by_id["d2"]["lar_salience"] == 0.2
    # string fields default to "" (the stable readback shape the TS orchestrator parses).
    assert by_id["d0"]["lar_ffz"] == ""
    assert by_id["e0"]["source_file"] == "b.jsonl"
    assert by_id["e0"]["verbatim_sha"] == ""
    assert by_id["d0"]["verbatim_sha"] == "sha0"


def test_cmd_embeddings_skips_vectorless_drawer(monkeypatch, capsys):
    col = _FakeCollection(
        ids=["has", "none"],
        embeddings=[[1.0], None],
        metadatas=[{"chunk_index": 0, "source_file": "a"}, {"chunk_index": 1, "source_file": "a"}],
    )
    monkeypatch.setattr(dio, "_col", lambda: col)
    dio.cmd_embeddings(argparse.Namespace(wing=""))
    rows = _lines(capsys)
    assert [r["id"] for r in rows] == ["has"]  # the vectorless drawer is dropped


# ---------------------------------------------------------------------------
# cmd_form_embeddings — the FORM plane: composes the cap, dumps FLAT (no sort)
# ---------------------------------------------------------------------------


def test_cmd_form_embeddings_dumps_flat_keyed_by_sha(monkeypatch, capsys):
    # Native (unsorted) order is PRESERVED — the orchestrator joins on verbatim_sha.
    col = _FakeCollection(
        ids=["shaZ", "shaA", "shaM"],
        embeddings=[[0.9], [0.1], [0.5]],
        metadatas=[{"lar_verbatim_sha": "shaZ"}, {}, {"lar_verbatim_sha": "shaM"}],
    )
    monkeypatch.setattr(dio, "get_collection", lambda *a, **k: col)
    dio.cmd_form_embeddings(argparse.Namespace())
    rows = _lines(capsys)
    assert [r["id"] for r in rows] == ["shaZ", "shaA", "shaM"]  # FLAT, no sort
    # verbatim_sha is non-null for the join; defaults to the id (id already == sha).
    assert [r["verbatim_sha"] for r in rows] == ["shaZ", "shaA", "shaM"]
    assert rows[0]["embedding"] == [0.9]


def test_cmd_form_embeddings_degrades_when_no_form_collection(monkeypatch, capsys):
    def _boom(*a, **k):
        raise RuntimeError("no such collection: form")

    monkeypatch.setattr(dio, "get_collection", _boom)
    dio.cmd_form_embeddings(argparse.Namespace())  # must NOT raise
    assert _lines(capsys) == []  # 0 rows ⇒ the orchestrator stays 1-plane


# ---------------------------------------------------------------------------
# cmd_kapae — the strand-C salience down-weight (by verbatim_sha)
# ---------------------------------------------------------------------------


class _StampCollection:
    """A chroma-shaped collection that resolves a verbatim_sha where-filter → drawer ids and
    records updates. `where` carries {"lar_verbatim_sha": V} or {"lar_verbatim_sha": {"$in": [...]}}"""

    def __init__(self, by_sha):
        self._by_sha = by_sha  # sha -> (id, meta)
        self.updates = []  # (ids, metadatas)

    def get(self, where=None, include=None):
        f = (where or {}).get("lar_verbatim_sha")
        wanted = f["$in"] if isinstance(f, dict) else [f]
        ids, metas = [], []
        for sha in wanted:
            if sha in self._by_sha:
                did, meta = self._by_sha[sha]
                ids.append(did)
                metas.append(meta)
        return {"ids": ids, "metadatas": metas}

    def update(self, ids=None, metadatas=None):
        self.updates.append((ids, metadatas))


def test_cmd_kapae_stamps_floor_salience_and_liveness_stamp(monkeypatch, capsys, tmp_path):
    col = _StampCollection(
        {"shaA": ("dA", {"wing": "w", "lar_verbatim_sha": "shaA"}),
         "shaB": ("dB", {"wing": "w", "lar_verbatim_sha": "shaB"})},
    )
    monkeypatch.setattr(dio, "_col", lambda: col)
    pf = tmp_path / "shas.ndjson"
    # shaA rides the detection moment (the liveness stamp); shaB rides a LEGACY row (no ended).
    pf.write_text(
        json.dumps({"verbatim_sha": "shaA", "ended": "2026-07-01T04:05:06Z"}) + "\n"
        + json.dumps({"verbatim_sha": "shaB"}) + "\n"
    )
    dio.cmd_kapae(argparse.Namespace(patchfile=str(pf), salience=None))
    out = _lines(capsys)[0]
    assert out["stamped"] == 2
    assert out["salience"] == dio.KAPAE_FLOOR_SALIENCE
    # Both drawers got the floor salience + the kapae stamp, merge-only (wing preserved):
    # lar_kapae = the row's iso-seconds detection moment; a legacy row (no ended) stamps 1.
    ids, metas = col.updates[0]
    assert ids == ["dA", "dB"]
    by_id = dict(zip(ids, metas))
    assert by_id["dA"]["lar_kapae"] == "2026-07-01T04:05:06Z"
    assert by_id["dB"]["lar_kapae"] == 1
    for m in metas:
        assert m["lar_salience"] == dio.KAPAE_FLOOR_SALIENCE
        assert m["wing"] == "w"
        assert m["adapter_name"] == dio.ADAPTER_NAME


def test_cmd_kapae_skips_missing_shas(monkeypatch, capsys, tmp_path):
    col = _StampCollection({"shaA": ("dA", {"lar_verbatim_sha": "shaA"})})
    monkeypatch.setattr(dio, "_col", lambda: col)
    pf = tmp_path / "shas.ndjson"
    pf.write_text(json.dumps({"verbatim_sha": "ghost"}) + "\n")
    dio.cmd_kapae(argparse.Namespace(patchfile=str(pf), salience=None))
    out = _lines(capsys)[0]
    assert out["stamped"] == 0
    assert col.updates == []  # nothing matched ⇒ no write
