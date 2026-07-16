"""Static corpus worldline backfill — declared relation only, no traversal fiction."""
import json

import pytest

import corpus_worldline as cw
from worldline_io import WorldlineStore


def _manifest(root, *, real=("in-file",), arbitrary=("walk-order",)):
    (root / "manifest.json").write_text(json.dumps({
        "worldline": {"real": list(real), "arbitrary": list(arbitrary)},
    }), encoding="utf-8")


def test_backfill_projects_only_declared_in_file_order(tmp_path, monkeypatch):
    _manifest(tmp_path)
    monkeypatch.setattr(cw, "_records", lambda _content: [
        {"cid": "a2", "metadata": {"source_file": "corpus:a", "chunk_index": 1, "lar_turn_key": "a-2"}},
        {"cid": "b1", "metadata": {"source_file": "corpus:b", "chunk_index": 0, "lar_turn_key": "b-1"}},
        {"cid": "a1", "metadata": {"source_file": "corpus:a", "chunk_index": 0, "lar_turn_key": "a-1"}},
    ])

    out = cw.backfill(str(tmp_path))
    assert out["sources"] == 2 and out["records"] == 3 and out["edges"] == 3
    store = WorldlineStore(str(tmp_path / "worldline"))
    try:
        edges = store.dag()["edges"]
        assert {edge["basis"] for edge in edges} == {"declared:in-file"}
        assert store.worldline_of("a-2") == store.worldline_of("a-1")
        assert store.worldline_of("a-1") != store.worldline_of("b-1")
    finally:
        store.close()


def test_backfill_refuses_an_undeclared_worldline(tmp_path):
    (tmp_path / "manifest.json").write_text("{}", encoding="utf-8")
    with pytest.raises(SystemExit, match="declares no worldline"):
        cw.backfill(str(tmp_path))


def test_containment_projects_path_topology_without_temporal_lineage(tmp_path, monkeypatch):
    _manifest(tmp_path, real=("in-file", "containment"))
    monkeypatch.setattr(cw, "_records", lambda _content: [
        {"cid": "x", "metadata": {"source_file": "corpus:root/docs/a.mem", "chunk_index": 0,
                                        "lar_turn_key": "turn-a"}},
    ])
    out = cw.backfill(str(tmp_path))
    assert out["containment_edges"] == 3
    store = WorldlineStore(str(tmp_path / "worldline"))
    try:
        edges = store.dag()["edges"]
        assert any(edge["relation"] == "contains" and edge["basis"] == "declared:containment"
                   for edge in edges)
        assert store.worldline_of("turn-a").startswith("corpus:")
    finally:
        store.close()
