"""Unit tests for sidecar_caps — the composition foundation.

The caps COMPOSE (no inheritance): a dummy ops-registry wires through make_dispatch;
a missing op fails clean (never crashes the loop); the flock-singleton still holds
per-palace; the idle-reap still bounds; run_sidecar refuses a second holder WITHOUT
building the sidecar's dispatch (the reap-don't-pile invariant). Run under the
mempalace venv (though these touch no ChromaDB):

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_sidecar_caps.py -q
"""

import io
import json
import os
import threading

import pytest

import sidecar_caps as sc

_posix_flock = pytest.mark.skipif(
    sc._fcntl is None, reason="serve.lock singleton relies on POSIX fcntl.flock"
)


# ---------------------------------------------------------------------------
# canonical_path
# ---------------------------------------------------------------------------


def test_canonical_path_collapses_variants(tmp_path):
    (tmp_path / "palace").mkdir()
    canonical = sc.canonical_path(str(tmp_path / "palace"))
    variant = sc.canonical_path(str(tmp_path / "palace" / "."))
    assert canonical == variant


def test_canonical_path_expands_user(monkeypatch, tmp_path):
    monkeypatch.setenv("HOME", str(tmp_path))
    assert sc.canonical_path("~").startswith(os.path.realpath(str(tmp_path)))


# ---------------------------------------------------------------------------
# read_ndjson_records
# ---------------------------------------------------------------------------


def test_read_ndjson_records_parses_and_skips_blanks(tmp_path):
    f = tmp_path / "recs.ndjson"
    f.write_text('{"a": 1}\n\n   \n{"b": 2}\n')
    recs = list(sc.read_ndjson_records(str(f)))
    assert recs == [{"a": 1}, {"b": 2}]


def test_read_ndjson_records_reads_stdin(monkeypatch):
    monkeypatch.setattr("sys.stdin", io.StringIO('{"x": 9}\n'))
    assert list(sc.read_ndjson_records("-")) == [{"x": 9}]


# ---------------------------------------------------------------------------
# make_dispatch — the ops-registry IS the #has-stack made literal
# ---------------------------------------------------------------------------


def test_make_dispatch_routes_to_op_and_envelopes():
    ops = {"echo": lambda req: {"said": req.get("msg")}}
    out = io.StringIO()
    sc.make_dispatch(ops)({"id": 7, "op": "echo", "msg": "hi"}, out)
    assert json.loads(out.getvalue()) == {"id": 7, "ok": True, "result": {"said": "hi"}}


def test_make_dispatch_missing_op_fails_clean():
    """An unknown op surfaces a clean error envelope — never crashes the loop."""
    out = io.StringIO()
    sc.make_dispatch({})({"id": 3, "op": "nope"}, out)
    resp = json.loads(out.getvalue())
    assert resp["id"] == 3 and resp["ok"] is False
    assert "unknown op" in resp["error"] and "nope" in resp["error"]


def test_make_dispatch_handler_error_surfaces_not_crashes():
    def _boom(req):
        raise ValueError("kaboom")

    out = io.StringIO()
    sc.make_dispatch({"boom": _boom})({"id": 1, "op": "boom"}, out)
    resp = json.loads(out.getvalue())
    assert resp["ok"] is False and "kaboom" in resp["error"]


# ---------------------------------------------------------------------------
# read_stored_embeddings — the model-agnostic store-readback cap
# ---------------------------------------------------------------------------


class _FakeCollection:
    """A minimal chroma-shaped collection: `.get(where=, include=)` returns parallel
    ids/embeddings/metadatas lists (the only surface read_stored_embeddings touches)."""

    def __init__(self, ids, embeddings, metadatas):
        self._ids = ids
        self._embs = embeddings
        self._metas = metadatas
        self.calls = []

    def get(self, where=None, include=None):
        self.calls.append({"where": where, "include": include})
        return {"ids": self._ids, "embeddings": self._embs, "metadatas": self._metas}


def test_read_stored_embeddings_projects_per_key_map():
    col = _FakeCollection(
        ids=["a", "b"],
        embeddings=[[1, 2], [3, 4]],
        metadatas=[{"src": "x", "n": 5}, {"src": "y", "n": 9}],
    )
    rows = sc.read_stored_embeddings(col, {"source_file": "src", "chunk_index": "n"})
    assert rows == [
        {"id": "a", "embedding": [1.0, 2.0], "source_file": "x", "chunk_index": 5},
        {"id": "b", "embedding": [3.0, 4.0], "source_file": "y", "chunk_index": 9},
    ]
    # the readback asks for BOTH embeddings + metadatas (never re-embeds, never a model).
    assert col.calls[0]["include"] == ["embeddings", "metadatas"]


def test_read_stored_embeddings_skips_none_embeddings_and_coerces_floats():
    col = _FakeCollection(
        ids=["a", "b", "c"],
        embeddings=[[1, 2], None, [7, 8]],  # b has no stored vector → dropped
        metadatas=[{"k": "1"}, {"k": "2"}, None],  # c's None metadata → projects None
    )
    rows = sc.read_stored_embeddings(col, {"key": "k"})
    assert [r["id"] for r in rows] == ["a", "c"]  # b skipped
    assert rows[0]["embedding"] == [1.0, 2.0]
    assert all(isinstance(x, float) for r in rows for x in r["embedding"])  # float-coerced
    assert rows[1]["key"] is None  # a missing metadata key projects None (caller defaults)


def test_read_stored_embeddings_passes_where_through():
    col = _FakeCollection(ids=["a"], embeddings=[[1.0]], metadatas=[{}])
    sc.read_stored_embeddings(col, {}, where={"wing": "w1"})
    assert col.calls[0]["where"] == {"wing": "w1"}


def test_form_collection_constant_is_form():
    assert sc.FORM_COLLECTION == "form"


# ---------------------------------------------------------------------------
# flock-singleton — per-palace, per-prefix, OS-enforced
# ---------------------------------------------------------------------------


@_posix_flock
def test_singleton_holds_per_palace(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    pa, pb = str(tmp_path / "a"), str(tmp_path / "b")
    fh1 = sc.acquire_serve_lock(pa, "demo")
    assert fh1 is not None
    assert sc.acquire_serve_lock(pa, "demo") is None  # same palace+prefix, held → refused
    fhb = sc.acquire_serve_lock(pb, "demo")
    assert fhb is not None  # different palace → independent
    sc.release_serve_lock(fh1)
    fh2 = sc.acquire_serve_lock(pa, "demo")
    assert fh2 is not None  # released → reclaimable
    sc.release_serve_lock(fh2)
    sc.release_serve_lock(fhb)


def test_serve_lock_belongs_to_its_palace_not_the_guest_comparator(tmp_path):
    palace = tmp_path / "sovereign" / "content"
    lock = sc.serve_lock_path(str(palace), "content_serve")
    assert lock.startswith(str(palace))
    assert ".mempalace" not in lock
    assert "/locks/" in lock
    assert ".sidecar-locks" not in lock


@_posix_flock
def test_singleton_independent_per_prefix(tmp_path, monkeypatch):
    """Two DIFFERENT sidecars (prefixes) over the SAME palace dir each hold their own
    singleton — the prefix names the entity in the lock namespace."""
    monkeypatch.setenv("HOME", str(tmp_path))
    p = str(tmp_path / "shared")
    fh_ast = sc.acquire_serve_lock(p, "structurepalace_serve")
    fh_form = sc.acquire_serve_lock(p, "form_encoder_serve")
    try:
        assert fh_ast is not None and fh_form is not None
    finally:
        sc.release_serve_lock(fh_ast)
        sc.release_serve_lock(fh_form)


# ---------------------------------------------------------------------------
# idle_ttl_seconds
# ---------------------------------------------------------------------------


def test_idle_ttl_seconds_env_parsing(monkeypatch):
    monkeypatch.delenv("CAPS_TTL_TEST", raising=False)
    assert sc.idle_ttl_seconds("CAPS_TTL_TEST", 600.0) == 600.0
    monkeypatch.setenv("CAPS_TTL_TEST", "12.5")
    assert sc.idle_ttl_seconds("CAPS_TTL_TEST", 600.0) == 12.5
    monkeypatch.setenv("CAPS_TTL_TEST", "0")
    assert sc.idle_ttl_seconds("CAPS_TTL_TEST", 600.0) == 0.0
    monkeypatch.setenv("CAPS_TTL_TEST", "garbage")
    assert sc.idle_ttl_seconds("CAPS_TTL_TEST", 600.0) == 600.0


# ---------------------------------------------------------------------------
# serve_loop — idle-reap bounds; request handled then EOF exit
# ---------------------------------------------------------------------------


@pytest.mark.skipif(sc._select is None, reason="idle-reap needs select")
def test_serve_loop_reaps_when_idle():
    r, w = os.pipe()
    out = io.StringIO()
    done = threading.Event()

    def _run():
        sc.serve_loop(lambda req, o: None, r, out, idle_ttl=0.5)
        done.set()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    try:
        assert done.wait(timeout=5), "idle loop did not reap within the TTL window"
    finally:
        os.close(w)
        os.close(r)
        t.join(timeout=2)


def test_serve_loop_handles_then_exits_on_eof():
    r, w = os.pipe()
    out = io.StringIO()
    done = threading.Event()
    dispatch = sc.make_dispatch({"ping": lambda req: {"ready": True}})

    def _run():
        sc.serve_loop(dispatch, r, out, idle_ttl=0)  # EOF drives exit
        done.set()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    try:
        os.write(w, (json.dumps({"id": 1, "op": "ping"}) + "\n").encode())
        os.write(w, b"not json at all\n")  # defensive: ignored, never crashes
        os.close(w)
        assert done.wait(timeout=5), "loop did not exit on EOF"
    finally:
        os.close(r)
        t.join(timeout=2)
    lines = [json.loads(x) for x in out.getvalue().splitlines() if x.strip()]
    assert lines == [{"id": 1, "ok": True, "result": {"ready": True}}]


# ---------------------------------------------------------------------------
# run_sidecar — composition root; refuses a 2nd holder without building dispatch
# ---------------------------------------------------------------------------


@_posix_flock
def test_run_sidecar_refuses_second_holder_without_building(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    palace = str(tmp_path / "palace")
    built = []
    held = sc.acquire_serve_lock(palace, "demo")
    assert held is not None
    try:
        sc.run_sidecar(
            palace=palace,
            lock_prefix="demo",
            build_dispatch=lambda: built.append(1) or (lambda req, o: None),
            idle_ttl=0,
            singleton_msg="refused\n",
        )
    finally:
        sc.release_serve_lock(held)
    assert built == [], "run_sidecar built the dispatch despite the singleton being held"


def test_run_sidecar_encode_only_skips_lock_and_runs(tmp_path):
    """palace=None (an encode-only holder): no lock taken, the loop still runs (EOF)."""
    r, w = os.pipe()
    out = io.StringIO()
    done = threading.Event()
    built = []

    def _run():
        sc.run_sidecar(
            palace=None,
            lock_prefix="demo",
            build_dispatch=lambda: built.append(1)
            or sc.make_dispatch({"ping": lambda req: {"ready": True}}),
            idle_ttl=0,
            require_lock=False,
            singleton_msg="n/a\n",
            in_fd=r,
            out=out,
        )
        done.set()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    try:
        os.write(w, (json.dumps({"id": 1, "op": "ping"}) + "\n").encode())
        os.close(w)
        assert done.wait(timeout=5)
    finally:
        os.close(r)
        t.join(timeout=2)
    assert built == [1]
    assert json.loads(out.getvalue()) == {"id": 1, "ok": True, "result": {"ready": True}}


# ── ReverseIndex — the lifted raw-sqlite-beside-chroma cap (structurepalace + persistence) ──

def _rev_idx(tmp_path, **kw):
    return sc.ReverseIndex(str(tmp_path), kw.get("db", "idx.sqlite3"), kw.get("table", "t"), kw.get("key", "k"), kw.get("val", "v"))


def test_reverse_index_put_then_lookup_roundtrips(tmp_path):
    idx = _rev_idx(tmp_path)
    idx.put("turn-1", "hash-A")
    assert idx.lookup("turn-1") == "hash-A"


def test_reverse_index_lookup_absent_is_none(tmp_path):
    assert _rev_idx(tmp_path).lookup("never") is None


def test_reverse_index_put_upserts_latest_value_wins(tmp_path):
    idx = _rev_idx(tmp_path)
    idx.put("turn-1", "hash-A")
    idx.put("turn-1", "hash-B")  # same key re-put under a new structure
    assert idx.lookup("turn-1") == "hash-B"


def test_reverse_index_persists_across_reopen(tmp_path):
    idx = _rev_idx(tmp_path)
    idx.put("turn-1", "hash-A")
    idx.close()
    assert _rev_idx(tmp_path).lookup("turn-1") == "hash-A"  # same db file


def test_reverse_index_signer_shape_composes_too(tmp_path):
    """persistence's signer -> testimony_id rides the SAME cap, differing only in column
    names — the lift generalizes past structurepalace's turn_key -> hash."""
    idx = _rev_idx(tmp_path, db="signer_index.sqlite3", table="signer_index", key="signer", val="testimony_id")
    idx.put("vessel-B", "t-42")
    assert idx.lookup("vessel-B") == "t-42"
    assert idx.lookup("vessel-Z") is None


# --- mine_busy_retry — the hardened-write busy-retry (align to the palace-flock LOCK_NB discipline) ---

def test_mine_busy_retry_retries_then_succeeds():
    from mempalace.palace import MineAlreadyRunning
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] < 3:
            raise MineAlreadyRunning("held by PID 999")
        return "ok"

    assert sc.mine_busy_retry(fn, attempts=6, base_ms=1) == "ok"
    assert calls["n"] == 3  # waited out two busy raises, landed on the third


def test_mine_busy_retry_surfaces_after_attempts():
    from mempalace.palace import MineAlreadyRunning

    def fn():
        raise MineAlreadyRunning("wedged")

    with pytest.raises(MineAlreadyRunning):
        sc.mine_busy_retry(fn, attempts=3, base_ms=1)


def test_mine_busy_retry_passes_non_busy_through():
    def fn():
        raise ValueError("a real fault, not a busy lock")

    with pytest.raises(ValueError):
        sc.mine_busy_retry(fn, attempts=5, base_ms=1)


def test_mine_busy_retry_success_first_try():
    assert sc.mine_busy_retry(lambda: 42) == 42
