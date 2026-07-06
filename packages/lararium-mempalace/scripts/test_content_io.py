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


def test_search_over_fetch_bails_at_the_pool_ceiling_not_full_scan(tmp_path):
    # C5 scale: a kapae'd hot-region (all near-neighbors muted) must NOT widen the over-fetch to the whole
    # collection. The pool caps at k·C (=k*32); past it, recall bails with the live rows found — never a
    # full-collection ANN scan. Here EVERY row is muted, so the widen runs to the ceiling and stops.
    n = 300
    s = cio.ContentStore(str(tmp_path / ".mem"))
    for i in range(n):
        s.put(f"c{i}", f"turn {i}", [1.0, 0.0], {"w": "v", cio.KAPAE_META: "1"})   # all muted
    res = s.search([1.0, 0.0], k=2)
    assert res["matches"] == [] and res["matched"] == 0    # nothing live to recall
    assert res["scanned"] == 2 * cio._POOL_CEILING_FACTOR   # bailed at k·C (=64), never the full 300
    assert res["scanned"] < n                               # NOT a full-collection scan


def test_vectors_for_turns_scopes_the_pull_to_wanted_keys(tmp_path):
    # C5: the SCOPED vector pull returns ONLY the wanted turn-keys' vectors (never a whole-corpus scan) —
    # an unrelated drawer bound to a different turn-key never rides out.
    s = cio.ContentStore(str(tmp_path / ".mem"))
    s.put("a0", "wanted A", [0.1, 0.2], {"w": "v", cio.TURN_KEY_META: "A"})
    s.put("a1", "wanted A chunk2", [0.3, 0.4], {"w": "v", cio.TURN_KEY_META: "A"})   # same turn, 2 chunks
    s.put("b0", "wanted B", [0.5, 0.6], {"w": "v", cio.TURN_KEY_META: "B"})
    s.put("z0", "UNRELATED", [0.7, 0.8], {"w": "v", cio.TURN_KEY_META: "Z"})         # not wanted
    got = s.vectors_for_turns(["A", "B"])
    assert set(got) == {"A", "B"} and "Z" not in got        # scoped — the unrelated key never pulled
    assert len(got["A"]) == 2 and len(got["B"]) == 1        # a turn's chunk-vectors ride together
    assert s.vectors_for_turns([]) == {}                    # empty ask → empty pull


def test_vectors_for_turns_chunks_a_wide_braid_past_the_variable_limit(tmp_path):
    # A wide braid names more turn-keys than SQLite binds in one statement (SQLITE_MAX_VARIABLE_NUMBER
    # floors at 999). One $in over 1200 keys would overflow → a backend raise; the chunked pull queries
    # in batches and MERGES, returning the full union correctly.
    s = cio.ContentStore(str(tmp_path / ".wide"))
    n = 1200
    assert n > 2 * cio._IN_CHUNK                             # forces >2 batches (the merge path)
    keys = [f"t{i}" for i in range(n)]
    for i, k in enumerate(keys):
        s.put(f"c{i}", f"turn {i}", [float(i), 1.0], {"w": "v", cio.TURN_KEY_META: k})
    got = s.vectors_for_turns(keys)
    assert set(got) == set(keys)                            # the whole union rides out, no overflow
    assert all(len(v) == 1 for v in got.values())           # one chunk-vector per turn, no double-count
    assert got["t1000"][0] == pytest.approx([1000.0, 1.0])  # a key past the first batch resolves (float32)


def _raiser(exc):
    def f(*_a, **_k):
        raise exc
    return f


def test_count_backend_error_propagates_loud_not_look_empty(tmp_path, monkeypatch):
    # C4: a genuine backend error on count() must PROPAGATE (refuse-loud), never read as an empty
    # collection. Only the genuinely-absent collection (NotFoundError) reads empty.
    from chromadb.errors import NotFoundError
    s = _store(tmp_path)
    s.put("c1", "x", [0.1, 0.2, 0.3], {"w": "v"})
    monkeypatch.setattr(s._col, "count", _raiser(RuntimeError("backend down")))
    with pytest.raises(RuntimeError):
        s.search([0.1, 0.2, 0.3], 3)                          # never a look-empty result on a real error
    with pytest.raises(RuntimeError):
        s.scan()
    # the genuinely-absent collection still reads empty (the narrow, correct swallow)
    monkeypatch.setattr(s._col, "count", _raiser(NotFoundError("no collection")))
    assert s.search([0.1, 0.2, 0.3], 3) == {"matches": [], "scanned": 0, "matched": 0}
    assert s.scan()["records"] == []


def test_model_floor_scans_past_unstamped_drawers(tmp_path):
    # C4: sampling only metas[0] slips a mixed-history palace — an unstamped prefix hides a held model.
    # The scan finds the first STAMPED drawer, so opening under a different model fails loud regardless
    # of where the stamped drawer sits.
    p = str(tmp_path / ".mem")
    s = cio.ContentStore(p, required_keys={"wing", "room"})    # no model pin — land a mixed history
    for i in range(4):
        s.put(f"u{i}", f"unstamped {i}", [0.1, 0.2, 0.3], {"wing": "w", "room": "r"})   # UNSTAMPED
    s.put("stamped", "held", [0.1, 0.2, 0.3], {"wing": "w", "room": "r", "lar_embedder_model": "model-A/3"})
    with pytest.raises(cio.ContentFloorError):
        cio.ContentStore(p, expected_model="model-B/3")        # the held model-A hides behind the unstamped prefix
    cio.ContentStore(p, expected_model="model-A/3")            # opening under the held model passes


def test_non_finite_vector_value_fails_at_the_land_floor(tmp_path):
    # C3: a NaN/inf vector value never lands — it corrupts nearest-neighbor recall silently. A per-record
    # data poison (plain ValueError, so the capture poison-guard rides it to `failed`), not a systemic floor.
    s = cio.ContentStore(str(tmp_path / ".sess"), required_keys={"wing", "room"}, expected_dim=3)
    meta = {"wing": "w", "room": "r"}
    with pytest.raises(ValueError) as ei:
        s.put("nan", "t", [0.1, float("nan"), 0.3], meta)
    assert not isinstance(ei.value, cio.ContentFloorError)    # a per-record poison, NOT the systemic floor
    with pytest.raises(ValueError):
        s.put("inf", "t", [0.1, 0.2, float("inf")], meta)
    assert s.get("nan") is None and s.get("inf") is None      # neither poisoned the store
    s.put("ok", "t", [0.1, 0.2, 0.3], meta)                   # a finite vector lands clean
    assert s.get("ok") is not None


def test_append_only_refuses_a_differing_vector_re_put(tmp_path):
    # C3: the immutable ground refuses a same-TEXT DIFFERENT-VECTOR re-put (a silent model-drift the
    # model-stamp missed corrupts recall as badly as a text edit). An identical re-put stays idempotent.
    s = cio.ContentStore(str(tmp_path / ".mem"), required_keys={"wing", "room"}, append_only=True)
    meta = {"wing": "w", "room": "r"}
    s.put("a", "same text", [0.1, 0.2, 0.3], meta)
    s.put("a", "same text", [0.1, 0.2, 0.3], meta)            # identical re-put — idempotent, no raise
    with pytest.raises(ValueError):                            # same text, DIFFERENT vector → refused
        s.put("a", "same text", [0.9, 0.8, 0.7], meta)
    with pytest.raises(ValueError):                            # (the text-differ half still holds)
        s.put("a", "edited text", [0.1, 0.2, 0.3], meta)
    assert s.get("a")["document"] == "same text"              # the committed atom stands unchanged


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


def test_session_memory_store_enforces_embedder_model(tmp_path):
    # the MODEL-NAME half of the embedder-identity floor (W0.3 / sev16): a same-dim DIFFERENT-model
    # swap slips the dim guard but corrupts recall — reject it (and an absent tag, fail-closed).
    s = cio.ContentStore(str(tmp_path / ".model"), expected_dim=3, expected_model="minilm")
    s.put("t-1", "one", [0.1, 0.2, 0.3], {"lar_embedder_model": "minilm"})   # right model+dim → lands
    assert s.get("t-1")["metadata"]["lar_embedder_model"] == "minilm"
    with pytest.raises(ValueError):                                          # same dim, DIFFERENT model → refuse
        s.put("t-2", "two", [0.1, 0.2, 0.3], {"lar_embedder_model": "other-384d"})
    with pytest.raises(ValueError):                                          # absent model tag → fail-closed
        s.put("t-3", "three", [0.1, 0.2, 0.3], {})


def test_append_only_is_the_immutable_ground(tmp_path):
    # the Memory sensorium (W1.1): a committed atom's text can't be overwritten (an edit rides kapae),
    # but an idempotent same-text re-put passes (the re-derivation crash-cure).
    s = cio.ContentStore(str(tmp_path / ".memory"), append_only=True)
    s.put("c-1", "the verbatim turn", [0.1, 0.2], {"wing": "w"})
    s.put("c-1", "the verbatim turn", [0.1, 0.2], {"wing": "w2"})   # SAME text → idempotent re-put OK
    assert s.get("c-1")["document"] == "the verbatim turn"
    with pytest.raises(ValueError):                                 # DIFFERENT text → immutable-ground refuses
        s.put("c-1", "an edited turn", [0.3, 0.4], {"wing": "w"})


def test_mutable_store_allows_overwrite_the_dream_default(tmp_path):
    # the Dream sensorium / generic default (append_only off): an overwrite is allowed (mutable schema).
    s = _store(tmp_path)
    s.put("c-1", "first", [0.1, 0.2], {})
    s.put("c-1", "second", [0.3, 0.4], {})   # overwrite OK
    assert s.get("c-1")["document"] == "second"


def test_palace_history_model_floor_on_compose(tmp_path):
    # the palace-history half: a model-B driver re-opening a model-A palace fails loud on compose
    # (the record-level stamp can't catch it — a model-B driver stamps self-consistently).
    palace = str(tmp_path / ".hist")
    a = cio.ContentStore(palace, expected_dim=3, expected_model="minilm")
    a.put("c-1", "one", [0.1, 0.2, 0.3], {"lar_embedder_model": "minilm"})
    cio.ContentStore(palace, expected_dim=3, expected_model="minilm")   # same model re-opens fine
    with pytest.raises(ValueError):                                     # model-B over a model-A palace → refuse
        cio.ContentStore(palace, expected_dim=3, expected_model="other-384d")
    cio.ContentStore(str(tmp_path / ".empty"), expected_model="minilm")  # empty palace → no history, opens


def test_generic_store_ignores_embedder_model(tmp_path):
    # no expected_model → generic corpora write with any/no model tag (the guard is opt-in).
    s = _store(tmp_path)
    s.put("c-1", "x", [0.1, 0.2], {"lar_embedder_model": "whatever"})  # no raise
    assert s.get("c-1") is not None


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


def test_patch_metadata_merges_and_preserves_vector(tmp_path):
    # the partial write: merge patch onto existing metadata, preserving document AND embedding.
    s = _store(tmp_path)
    s.put("c-1", "the text", [0.5, 0.6], {"wing": "w1", "standing": "data"})
    r = s.patch_metadata("c-1", {"standing": "meme", "note": "bumped"})
    assert r == {"ok": True, "cid": "c-1"}
    got = s.get("c-1")
    assert got["document"] == "the text"          # document preserved (no re-put)
    assert got["metadata"]["standing"] == "meme"  # overwritten
    assert got["metadata"]["wing"] == "w1"        # untouched key survives the merge
    assert got["metadata"]["note"] == "bumped"    # new key added
    assert s.search([0.5, 0.6], 1)["matches"][0]["cid"] == "c-1"  # the vector survived (still findable)


def test_patch_metadata_absent_cid_is_ok_false(tmp_path):
    # a patch names an EXISTING drawer; an absent cid is an honest no-op, never a create.
    assert _store(tmp_path).patch_metadata("nope", {"x": 1}) == {"ok": False, "cid": "nope"}


def test_patch_metadata_guarded_rejects_emptying_a_required_key(tmp_path):
    # on a session-memory store, a patch must not leave a required key missing/empty.
    s = cio.ContentStore(str(tmp_path / ".patch_guarded"), required_keys={"wing", "room"}, expected_dim=2)
    s.put("c-1", "t", [0.1, 0.2], {"wing": "w", "room": "r"})
    with pytest.raises(ValueError):
        s.patch_metadata("c-1", {"room": ""})     # emptying a required key → refuse
    s.patch_metadata("c-1", {"room": "r2"})       # a valid patch lands
    assert s.get("c-1")["metadata"]["room"] == "r2"


def test_search_empty_is_empty(tmp_path):
    assert _store(tmp_path).search([1.0, 2.0], 8) == {"matches": [], "scanned": 0, "matched": 0}


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
