"""Real-chroma round-trip for the CONTENT store (content_io) — caller-vector put/get/search over a
tmp palace dir (the venv has chroma). Non-memory targeted content, uniform with structurepalace_io.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_content_io.py -q
"""

import content_io as cio


def _store(tmp_path):
    return cio.ContentStore(str(tmp_path / ".content_test"))


def test_put_then_get_roundtrips(tmp_path):
    s = _store(tmp_path)
    s.put("c-1", "the whale breached at dawn", [0.1, 0.2, 0.3], {"source": "twain", "chap": 1})
    got = s.get("c-1")
    assert got is not None
    assert got["cid"] == "c-1"
    assert got["document"] == "the whale breached at dawn"
    assert got["metadata"]["source"] == "twain"


def test_get_absent_is_none(tmp_path):
    assert _store(tmp_path).get("nope") is None


def test_put_is_idempotent_on_cid(tmp_path):
    s = _store(tmp_path)
    s.put("c-1", "first", [1.0, 0.0], {})
    s.put("c-1", "second", [1.0, 0.0], {"v": 2})   # re-put overwrites
    assert s.get("c-1")["document"] == "second"


def test_search_empty_is_empty(tmp_path):
    assert _store(tmp_path).search([1.0, 2.0], 8) == {"matches": []}


def test_search_returns_nearest_with_where(tmp_path):
    s = _store(tmp_path)
    for i in range(5):
        s.put(f"c-{i}", f"line {i}", [float(i), 0.0], {"chap": i % 2})
    res = s.search([0.0, 0.0], 3)
    assert len(res["matches"]) == 3
    assert all("cid" in m and "distance" in m for m in res["matches"])
    # where-filter narrows
    filtered = s.search([0.0, 0.0], 8, where={"chap": 1})
    assert all(m["metadata"]["chap"] == 1 for m in filtered["matches"])
