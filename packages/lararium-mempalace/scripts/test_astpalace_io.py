"""Regression tests for astpalace_io's serve singleton + idle-reap.

These mirror the submodule daemon's singleton/idle-reap fix on OUR in-tree
.astpalace holder. They never touch ChromaDB (a dummy store stands in), so they
run fast under the mempalace venv:

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_astpalace_io.py -q
"""

import io
import json
import os
import threading

import pytest

import astpalace_io as ap

_posix_flock = pytest.mark.skipif(
    ap._fcntl is None,
    reason="serve.lock singleton relies on POSIX fcntl.flock",
)


class _DummyStore:
    """Stands in for AstPalaceStore so the loop tests never open ChromaDB."""

    def __init__(self):
        self.puts = []

    def put(self, h, ast, source_file, verbatim_sha):
        self.puts.append((h, ast, source_file, verbatim_sha))
        return {"hash": h, "count": 1}

    def get(self, h):
        return None


@_posix_flock
def test_serve_lock_is_singleton_per_palace(tmp_path, monkeypatch):
    """A second acquire for the same palace is refused (None) while the first is
    held; releasing the first lets a later acquire succeed; a DIFFERENT palace is
    never blocked — per-palace, not per-machine."""
    monkeypatch.setenv("HOME", str(tmp_path))
    palace_a = str(tmp_path / "palace_a")
    palace_b = str(tmp_path / "palace_b")

    fh1 = ap._acquire_serve_lock(palace_a)
    assert fh1 is not None
    # Same palace, still held → refused.
    assert ap._acquire_serve_lock(palace_a) is None
    # Different palace → independent singleton, allowed.
    fh_b = ap._acquire_serve_lock(palace_b)
    assert fh_b is not None

    ap._release_serve_lock(fh1)
    # After release the palace can be claimed again.
    fh2 = ap._acquire_serve_lock(palace_a)
    assert fh2 is not None

    ap._release_serve_lock(fh2)
    ap._release_serve_lock(fh_b)


@_posix_flock
def test_serve_lock_collapses_path_variants(tmp_path, monkeypatch):
    """Two spellings of ONE physical palace dir collapse to one singleton key, so
    a path variant can't mint a second 'singleton'."""
    monkeypatch.setenv("HOME", str(tmp_path))
    (tmp_path / "palace").mkdir()
    canonical = str(tmp_path / "palace")
    variant = str(tmp_path / "palace" / ".")  # …/palace/. → same realpath

    fh = ap._acquire_serve_lock(canonical)
    assert fh is not None
    try:
        assert ap._acquire_serve_lock(variant) is None
    finally:
        ap._release_serve_lock(fh)


@_posix_flock
def test_serve_refuses_second_holder_without_opening_collection(tmp_path, monkeypatch):
    """When the singleton lock is already held, _serve exits WITHOUT constructing
    AstPalaceStore (no ChromaDB client, no mine-lock fight)."""
    monkeypatch.setenv("HOME", str(tmp_path))
    palace = str(tmp_path / "palace")

    built = []
    monkeypatch.setattr(
        ap, "AstPalaceStore", lambda *a, **kw: built.append(1) or object()
    )

    held = ap._acquire_serve_lock(palace)
    assert held is not None
    try:
        ap._serve(palace)  # must take the singleton-refused branch
    finally:
        ap._release_serve_lock(held)
    assert built == [], "_serve constructed a store despite the lock being held"


@pytest.mark.skipif(ap._select is None, reason="idle-reap needs select")
def test_serve_loop_reaps_when_idle(monkeypatch):
    """With a tiny TTL and no input, the loop self-reaps (returns) within the
    window instead of blocking forever."""
    monkeypatch.setenv(ap.IDLE_TTL_ENV, "0.5")
    r, w = os.pipe()
    out = io.StringIO()
    done = threading.Event()

    def _run():
        ap._serve_loop(_DummyStore(), r, out)
        done.set()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    try:
        assert done.wait(timeout=5), "idle loop did not reap within the TTL window"
    finally:
        os.close(w)
        os.close(r)
        t.join(timeout=2)


def test_serve_loop_handles_request_then_exits_on_eof(monkeypatch):
    """A request is processed (ok response written) and the loop exits cleanly on
    EOF (parent closed stdin)."""
    monkeypatch.setenv(ap.IDLE_TTL_ENV, "0")  # opt out of reap; EOF drives exit
    r, w = os.pipe()
    out = io.StringIO()
    store = _DummyStore()
    done = threading.Event()

    def _run():
        ap._serve_loop(store, r, out)
        done.set()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    try:
        os.write(w, (json.dumps({"id": 1, "op": "ping"}) + "\n").encode("utf-8"))
        os.write(
            w,
            (
                json.dumps(
                    {"id": 2, "op": "put", "hash": "H", "ast": "{}", "source_file": "f",
                     "verbatim_sha": "V"}
                )
                + "\n"
            ).encode("utf-8"),
        )
        os.close(w)  # EOF → loop returns after draining
        assert done.wait(timeout=5), "loop did not exit on EOF"
    finally:
        os.close(r)
        t.join(timeout=2)

    lines = [json.loads(x) for x in out.getvalue().splitlines() if x.strip()]
    assert lines[0] == {"id": 1, "ok": True, "result": {"ready": True}}
    assert lines[1]["id"] == 2 and lines[1]["ok"] is True
    assert store.puts == [("H", "{}", "f", "V")]


def test_idle_ttl_seconds_env_parsing(monkeypatch):
    monkeypatch.delenv(ap.IDLE_TTL_ENV, raising=False)
    assert ap._idle_ttl_seconds() == ap.DEFAULT_IDLE_TTL_SECONDS
    monkeypatch.setenv(ap.IDLE_TTL_ENV, "12.5")
    assert ap._idle_ttl_seconds() == 12.5
    monkeypatch.setenv(ap.IDLE_TTL_ENV, "0")
    assert ap._idle_ttl_seconds() == 0.0
    monkeypatch.setenv(ap.IDLE_TTL_ENV, "garbage")
    assert ap._idle_ttl_seconds() == ap.DEFAULT_IDLE_TTL_SECONDS
