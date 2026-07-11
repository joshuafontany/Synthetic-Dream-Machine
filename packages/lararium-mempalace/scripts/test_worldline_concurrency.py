#!/usr/bin/env python3
"""test_worldline_concurrency — the guards must hold under N CONCURRENT PROCESSES.

The `serve` path takes a per-palace flock singleton, so through the sidecar there is one writer and
the guards are trivially safe. But `capture_session.py` constructs `WorldlineStore` DIRECTLY,
in-process — so N live harness sessions put N OS processes on one `worldline.sqlite3`. Under default
sqlite settings `add_edge`'s cycle- and fork-guards are check-then-act: both writers pass a guard the
other is about to invalidate, both INSERT, and the lineage is malformed. It does not corrupt the file
— it produces a graph that READS as valid and is not.

These tests spawn REAL processes (never threads — the GIL would mask exactly the interleaving we are
hunting) and assert the invariants the guards exist to defend:

  FORK-CONFLICT: a child holds AT MOST ONE open fork-parent. N parents race to fork ONE child; the
                 store must admit exactly one and refuse the rest with `fork_conflict`.
  CYCLE:         the spawn-tree stays acyclic. Two processes race the two halves of a 2-cycle
                 (A->B and B->A); at most one may land.

Run:  PYTHONPATH=<repo>/mempalace  <venv>/python3 -m pytest test_worldline_concurrency.py -v
"""
from __future__ import annotations

import multiprocessing as mp
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from worldline_io import WorldlineStore  # noqa: E402


def _fork_child(palace: str, parent: str, child: str, barrier, out) -> None:
    """One process: open the store, wait on the barrier so every writer swings at once, fork `child`."""
    store = WorldlineStore(palace)
    barrier.wait()                       # maximize the interleaving — all writers hit BEGIN together
    out.put(store.add_edge(parent, child, "fork", 1))


def _add(palace: str, frm: str, to: str, barrier, out) -> None:
    store = WorldlineStore(palace)
    barrier.wait()
    out.put(store.add_edge(frm, to, "fork", 1))


def _run(target, argsets):
    """Spawn one process per argset, all released together by a barrier. Returns their results."""
    ctx = mp.get_context("spawn")        # spawn, not fork — a fresh interpreter per writer
    barrier = ctx.Barrier(len(argsets))
    out = ctx.Queue()
    procs = [ctx.Process(target=target, args=(*a, barrier, out)) for a in argsets]
    for p in procs:
        p.start()
    results = [out.get(timeout=60) for _ in argsets]
    for p in procs:
        p.join(timeout=60)
        assert p.exitcode == 0, f"writer died: exitcode={p.exitcode}"
    return results


def test_fork_conflict_guard_holds_under_concurrent_processes():
    """N parents race to fork ONE child. Exactly one may win; the rest must refuse legibly."""
    with tempfile.TemporaryDirectory() as palace:
        n = 8
        results = _run(_fork_child, [(palace, f"parent-{i}", "shared-child") for i in range(n)])

        added = [r for r in results if r.get("added")]
        refused = [r for r in results if r.get("fork_conflict")]

        assert len(added) == 1, f"expected exactly ONE fork to land, got {len(added)}: {results}"
        assert len(refused) == n - 1, f"the losers must refuse with fork_conflict, got {refused}"

        # …and the STORE agrees: the child holds exactly one OPEN fork-parent. This is the invariant
        # `_up_parent` depends on — two open fork-parents make worldline membership nondeterministic.
        store = WorldlineStore(palace)
        rows = store._conn.execute(
            "SELECT frm FROM worldline_edges WHERE to_node=? AND relation='fork' AND valid_to IS NULL",
            ("shared-child",),
        ).fetchall()
        assert len(rows) == 1, f"child must hold exactly ONE open fork-parent, holds {len(rows)}: {rows}"


def test_cycle_guard_holds_under_concurrent_processes():
    """Two processes race the two halves of a 2-cycle. The spawn-tree must not close it."""
    with tempfile.TemporaryDirectory() as palace:
        # Both edges are legal in isolation and illegal together — the classic check-then-act window.
        results = _run(_add, [(palace, "A", "B"), (palace, "B", "A")])

        added = [r for r in results if r.get("added")]
        assert len(added) <= 1, f"a 2-cycle closed — both halves landed: {results}"

        store = WorldlineStore(palace)
        a_to_b = store._conn.execute(
            "SELECT 1 FROM worldline_edges WHERE frm='A' AND to_node='B'").fetchone()
        b_to_a = store._conn.execute(
            "SELECT 1 FROM worldline_edges WHERE frm='B' AND to_node='A'").fetchone()
        assert not (a_to_b and b_to_a), "the spawn-tree holds a cycle — roots() would silent-drop turns"


def test_wal_and_busy_timeout_are_actually_set():
    """The hardening must be LIVE, not merely written — a default-journal store races again."""
    with tempfile.TemporaryDirectory() as palace:
        store = WorldlineStore(palace)
        mode = store._conn.execute("PRAGMA journal_mode").fetchone()[0]
        busy = store._conn.execute("PRAGMA busy_timeout").fetchone()[0]
        assert mode.lower() == "wal", f"journal_mode must be WAL (readers vs writer), got {mode!r}"
        assert busy >= 1000, f"busy_timeout must make a blocked writer WAIT, got {busy}"
