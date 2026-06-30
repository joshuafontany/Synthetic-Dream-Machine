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

import drawer_io as dio


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
