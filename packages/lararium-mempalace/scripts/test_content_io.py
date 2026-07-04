"""Real-chroma round-trip for the CONTENT store (content_io) — caller-vector put/get/search over a
tmp palace dir (the venv has chroma). Non-memory targeted content, uniform with structurepalace_io.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_content_io.py -q
"""

import pytest

import content_io as cio


def _store(tmp_path):
    return cio.ContentStore(str(tmp_path / ".content_test"))


def test_generic_store_accepts_arbitrary_metadata(tmp_path):
    # the DEFAULT store is GENERIC (arbitrary corpora) — neither opt-in guard fires.
    s = _store(tmp_path)
    s.put("c-1", "anything", [0.1, 0.2, 0.3], {"whatever": "shape"})  # no raise
    assert s.get("c-1")["metadata"]["whatever"] == "shape"


def test_session_memory_store_enforces_schema_and_dim(tmp_path):
    # the SESSION-MEMORY palace opts IN: required mempalace-schema keys + a pinned embedder dim.
    s = cio.ContentStore(str(tmp_path / ".sess"), required_keys={"wing", "room"}, expected_dim=3)
    s.put("t-1", "turn one", [0.1, 0.2, 0.3], {"wing": "w1", "room": "r1", "source_file": "s"})  # full schema, right dim
    assert s.get("t-1")["metadata"]["wing"] == "w1"
    with pytest.raises(ValueError):                                      # off-schema (no room) → fail loud
        s.put("t-2", "turn two", [0.1, 0.2, 0.3], {"wing": "w1"})
    with pytest.raises(ValueError):                                      # wrong dim → embedder-identity floor
        s.put("t-3", "turn three", [0.1, 0.2], {"wing": "w1", "room": "r1"})
    with pytest.raises(ValueError):                                      # None embedding → clean domain error (not len(None))
        s.put("t-4", "turn four", None, {"wing": "w1", "room": "r1"})
    with pytest.raises(ValueError):                                      # present-but-EMPTY required value → violation
        s.put("t-5", "turn five", [0.1, 0.2, 0.3], {"wing": "", "room": "r1"})
    s.put("t-6", "turn six", [0.1, 0.2, 0.3], {"wing": "w1", "room": "r1", "chunk_index": 0})  # zero-value PASSES (not falsy-rejected)
    assert s.get("t-6")["metadata"]["chunk_index"] == 0


def test_guard_raise_crosses_the_wire(tmp_path):
    # fail-loud COMPOSITION: a guard-raise crosses as the {ok:false,error} NDJSON envelope through
    # make_dispatch, never a crash and never a Python exception escaping (JSON-legal str error).
    import io
    import json
    from sidecar_caps import make_dispatch
    store = cio.ContentStore(str(tmp_path / ".wire"), required_keys={"wing", "room"}, expected_dim=3)
    dispatch = make_dispatch(cio._build_ops(store))

    def call(req):
        out = io.StringIO()
        dispatch(req, out)
        return json.loads(out.getvalue())

    ok = call({"id": 1, "op": "put", "cid": "c1", "text": "t", "embedding": [0.1, 0.2, 0.3], "metadata": {"wing": "w", "room": "r"}})
    assert ok["ok"] is True and ok["result"]["cid"] == "c1"
    bad = call({"id": 2, "op": "put", "cid": "c2", "text": "t", "embedding": [0.1, 0.2, 0.3], "metadata": {"wing": "w"}})
    assert bad["ok"] is False and isinstance(bad["error"], str) and "room" in bad["error"]
    baddim = call({"id": 3, "op": "put", "cid": "c3", "text": "t", "embedding": [0.1, 0.2], "metadata": {"wing": "w", "room": "r"}})
    assert baddim["ok"] is False and "dim" in baddim["error"]


def test_require_keys_flag_parsing_empty_yields_none():
    # the load-bearing empty-flag ward: serve --require-keys "" (or absent) must yield None (generic),
    # NEVER {""} — which would fire the guard on every put and reject all generic corpora.
    parse = lambda s: ({k for k in s.split(",") if k} or None)  # mirrors content_io.main serve-flag logic
    assert parse("") is None
    assert parse("wing,room") == {"wing", "room"}
    assert parse("wing,,room") == {"wing", "room"}  # a stray comma drops, never mints an empty key


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


def test_scan_pages_records_with_embeddings(tmp_path):
    # the guest-import read leg: scan yields cid + document + EMBEDDING + metadata, paged.
    s = _store(tmp_path)
    for i in range(5):
        s.put(f"c-{i}", f"line {i}", [float(i), 1.0], {"n": i})
    page1 = s.scan(0, 2)
    assert len(page1["records"]) == 2
    assert page1["total"] == 5
    assert page1["next"] == 2
    r0 = page1["records"][0]
    assert r0["cid"].startswith("c-")
    assert r0["embedding"] is not None and len(r0["embedding"]) == 2   # the vector rides OUT
    assert r0["document"].startswith("line ")
    # drain the rest
    page2 = s.scan(2, 2)
    page3 = s.scan(4, 2)
    assert page3["next"] is None                                       # short page → drained
    seen = {r["cid"] for r in page1["records"] + page2["records"] + page3["records"]}
    assert seen == {f"c-{i}" for i in range(5)}


def test_scan_past_end_is_empty(tmp_path):
    assert _store(tmp_path).scan(10, 5) == {"records": [], "next": None, "total": 0}


def test_taxonomy_aggregates_metadata(tmp_path):
    s = _store(tmp_path)
    s.put("d1", "a", [0.1, 0.2], {"wing": "w1", "room": "r1", "hall": "h1", "entities": "alice;bob"})
    s.put("d2", "b", [0.3, 0.4], {"wing": "w1", "room": "r2", "hall": "h1", "entities": "alice;carol"})
    tax = s.taxonomy()
    assert tax["total"] == 2
    assert tax["wings"] == ["w1"]
    assert tax["rooms"] == ["r1", "r2"]
    assert tax["halls"] == ["h1"]
    assert tax["entities"]["alice"] == 2          # alice in both drawers
    assert tax["entities"]["bob"] == 1


def test_taxonomy_empty_store(tmp_path):
    assert _store(tmp_path).taxonomy() == {"total": 0, "wings": [], "rooms": [], "halls": [], "entities": {}}
