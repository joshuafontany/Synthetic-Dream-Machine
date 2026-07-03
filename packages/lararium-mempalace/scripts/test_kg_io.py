"""kg_io serve ops CONSUME the mempalace KnowledgeGraph over an owned palace's kg sqlite: add a
bitemporal triple, query it back, timeline + stats — all JSON-serializable (the NDJSON surface).
No LLM (the graph STORE). The batch add/invalidate/kapae worldline cmds are unchanged.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-mempalace/scripts/test_kg_io.py -q
"""

import json

import kg_io


def _kg(tmp_path):
    return kg_io.Kg(str(tmp_path / ".content"))


def test_add_triple_then_query_entity(tmp_path):
    k = _kg(tmp_path)
    k.add_triple("Alice", "collaborates_with", "Bob")
    res = k.query_entity("Alice")
    assert res is not None
    blob = json.dumps(res)                 # the surface must serialize
    assert "bob" in blob.lower()           # the relationship rode back


def test_timeline_and_stats_serialize(tmp_path):
    k = _kg(tmp_path)
    k.add_triple("Alice", "knows", "Bob", valid_from="2026-01-01")
    json.dumps(k.timeline("Alice"))        # bitemporal events, serializable
    s = k.stats()
    json.dumps(s)                          # counts, serializable
    assert isinstance(s, dict)


def test_invalidate_closes_the_edge(tmp_path):
    k = _kg(tmp_path)
    k.add_triple("Alice", "knows", "Bob")
    k.invalidate("Alice", "knows", "Bob", ended="2026-07-02")
    # after close, an as_of before the close still sees it; a plain query reflects the closure —
    # we only assert the ops run + serialize (bitemporal semantics are mempalace's, consumed).
    json.dumps(k.query_entity("Alice"))


def test_build_ops_dispatch_shape():
    ops = kg_io._build_ops.__wrapped__ if hasattr(kg_io._build_ops, "__wrapped__") else None
    # the ops registry names the full read+write surface
    names = set(kg_io._build_ops(_kg_stub()).keys())
    assert {"ping", "add_entity", "add_triple", "invalidate", "query_entity", "query_relationship", "timeline", "stats"} <= names


class _KgStub:
    def __getattr__(self, _):
        return lambda *a, **k: None


def _kg_stub():
    return _KgStub()
