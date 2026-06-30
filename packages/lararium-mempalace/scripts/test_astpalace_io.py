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

    def put(self, h, ast, source_file, verbatim_sha, turn_key=""):
        self.puts.append((h, ast, source_file, verbatim_sha, turn_key))
        return {"hash": h, "count": 1}

    def get(self, h):
        return None

    def kapae(self, turn_key, ended=None):
        return {"closed": 0, "tombstoned": [], "verbatim_shas": [], "turn_key": turn_key}


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
    assert store.puts == [("H", "{}", "f", "V", "")]


def test_idle_ttl_seconds_env_parsing(monkeypatch):
    monkeypatch.delenv(ap.IDLE_TTL_ENV, raising=False)
    assert ap._idle_ttl_seconds() == ap.DEFAULT_IDLE_TTL_SECONDS
    monkeypatch.setenv(ap.IDLE_TTL_ENV, "12.5")
    assert ap._idle_ttl_seconds() == 12.5
    monkeypatch.setenv(ap.IDLE_TTL_ENV, "0")
    assert ap._idle_ttl_seconds() == 0.0
    monkeypatch.setenv(ap.IDLE_TTL_ENV, "garbage")
    assert ap._idle_ttl_seconds() == ap.DEFAULT_IDLE_TTL_SECONDS


# ── Strand B: the turn_key provenance + kapae tally-decrement (real ChromaDB store) ──────────────
#
# These open a real AstPalaceStore in a tmp palace (the venv supplies chroma). They prove the
# three new contracts: put appends turn_key into provenance + upserts the reverse-index;
# store.kapae decrements + tombstones-at-zero (KEEPING the row) + is idempotent; the reverse-index
# SELECT → RMW drives an O(1) kapae.


def _store(tmp_path):
    return ap.AstPalaceStore(str(tmp_path / "astpalace"))


# Structural hashes are sha256 hex (the _embed reads hex off them) — use valid hex fixtures.
H1 = "a" * 64


def test_put_appends_turn_key_to_provenance_and_reverse_index(tmp_path):
    store = _store(tmp_path)
    store.put(H1, '{"t":1}', "wing/sess.jsonl", "vsha1", "turn-A")
    entry = store.get(H1)
    assert entry is not None
    assert entry["count"] == 1
    assert entry["provenance"] == [
        {"source_file": "wing/sess.jsonl", "verbatim_sha": "vsha1", "turn_key": "turn-A"}
    ]
    # The reverse-index maps the turn_key → this structure (the O(1) kapae lookup).
    assert store._index_lookup("turn-A") == H1
    assert store._index_lookup("nope") is None


def test_kapae_decrements_and_tombstones_at_zero_keeping_the_row(tmp_path):
    store = _store(tmp_path)
    store.put(H1, '{"t":1}', "wing/s.jsonl", "vshaA", "turn-A")
    # A SECOND distinct turn unfolds the SAME structure → count 2, two provenance lines.
    store.put(H1, '{"t":1}', "wing/s.jsonl", "vshaB", "turn-B")
    assert store.get(H1)["count"] == 2

    # kapae turn-A → drops its line, count 2→1, NOT tombstoned, returns its verbatim_sha.
    r1 = store.kapae("turn-A")
    assert r1["closed"] == 1
    assert r1["verbatim_shas"] == ["vshaA"]
    assert r1["tombstoned"] == []
    e1 = store.get(H1)
    assert e1["count"] == 1
    assert [p["turn_key"] for p in e1["provenance"]] == ["turn-B"]
    assert "tombstoned_at" not in e1  # still live

    # kapae turn-B → count 1→0 → TOMBSTONED, the chroma row KEPT (get still returns it).
    r2 = store.kapae("turn-B")
    assert r2["closed"] == 1
    assert r2["tombstoned"] == [H1]
    e2 = store.get(H1)
    assert e2 is not None  # row kept, never deleted
    assert e2["count"] == 0
    assert e2.get("tombstoned_at")  # the set-aside marker stamped


def test_kapae_is_idempotent(tmp_path):
    store = _store(tmp_path)
    store.put(H1, '{"t":1}', "wing/s.jsonl", "vshaA", "turn-A")
    first = store.kapae("turn-A")
    assert first["closed"] == 1
    # A 2nd kapae for the same uuid finds the line already gone → no-op (nothing re-decremented).
    second = store.kapae("turn-A")
    assert second["closed"] == 0
    assert second["tombstoned"] == []
    assert second["verbatim_shas"] == []


def test_kapae_unknown_turn_key_is_a_noop(tmp_path):
    store = _store(tmp_path)
    store.put(H1, '{"t":1}', "wing/s.jsonl", "vshaA", "turn-A")
    r = store.kapae("never-seen")
    assert r == {"closed": 0, "tombstoned": [], "verbatim_shas": [], "turn_key": "never-seen"}
    # The live entry is untouched.
    assert store.get(H1)["count"] == 1


def test_put_revives_a_tombstoned_structure(tmp_path):
    store = _store(tmp_path)
    store.put(H1, '{"t":1}', "wing/s.jsonl", "vshaA", "turn-A")
    store.kapae("turn-A")
    assert store.get(H1).get("tombstoned_at")  # tombstoned
    # The same structure recurs (a new turn) → revived, the marker cleared.
    store.put(H1, '{"t":1}', "wing/s.jsonl", "vshaC", "turn-C")
    revived = store.get(H1)
    assert not revived.get("tombstoned_at")
    assert revived["count"] == 1


def test_put_edit_same_uuid_retracts_the_old_structure_tally(tmp_path):
    """The stale-tally fix: editing content under an UNCHANGED turn-uuid repoints the reverse-index
    to the new structure AND retracts the OLD structure's tally — count decremented + tombstoned-at-
    zero (row KEPT), never orphaned. A re-put to the SAME structure is a no-op (the guard never fires).
    """
    H2 = "b" * 64
    store = _store(tmp_path)
    # turn-A first unfolds to structure H1.
    store.put(H1, '{"t":1}', "wing/s.jsonl", "vshaA", "turn-A")
    assert store.get(H1)["count"] == 1
    assert store._index_lookup("turn-A") == H1

    # EDIT: the SAME turn-A now unfolds to a DIFFERENT structure H2 (content edited in place).
    store.put(H2, '{"t":2}', "wing/s.jsonl", "vshaB", "turn-A")

    # The OLD structure H1 is retracted: count 1→0, TOMBSTONED, the row KEPT (no orphaned tally).
    e1 = store.get(H1)
    assert e1 is not None                                   # row kept, never deleted
    assert e1["count"] == 0
    assert e1.get("tombstoned_at")                          # the set-aside marker stamped
    assert [p.get("turn_key") for p in e1["provenance"]] == []  # turn-A's line dropped

    # The NEW structure H2 carries the turn now: count 1, live, the reverse-index repointed.
    e2 = store.get(H2)
    assert e2["count"] == 1
    assert not e2.get("tombstoned_at")
    assert store._index_lookup("turn-A") == H2

    # SAME-uuid SAME-hash re-put → the guard never fires: H2 stays live, the index unchanged, and
    # the already-tombstoned H1 is untouched (no second decrement, no re-stamp).
    stamp = e1["tombstoned_at"]
    store.put(H2, '{"t":2}', "wing/s.jsonl", "vshaB", "turn-A")
    assert store._index_lookup("turn-A") == H2
    assert not store.get(H2).get("tombstoned_at")
    assert store.get(H1)["count"] == 0
    assert store.get(H1).get("tombstoned_at") == stamp
