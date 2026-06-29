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


@_posix_flock
def test_singleton_independent_per_prefix(tmp_path, monkeypatch):
    """Two DIFFERENT sidecars (prefixes) over the SAME palace dir each hold their own
    singleton — the prefix names the entity in the lock namespace."""
    monkeypatch.setenv("HOME", str(tmp_path))
    p = str(tmp_path / "shared")
    fh_ast = sc.acquire_serve_lock(p, "astpalace_serve")
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
    seen = []
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
