#!/usr/bin/env python3
"""worldline_io — the WORLDLINE RHIZOME (a fork-DAG over turns) + FULL kapae.

The agent worldline READS as a rhizome: a turn SPAWNS a fork, a HANDBACK joins the fork back,
and concurrent siblings of one spawn (no join between them) run ∥. This holder persists that
fork-DAG durably and drives the FULL kapae — branch-mute that CASCADES across the sensoria's
palaces so recall EXCLUDES a muted fork-path, reversibly, move-not-delete.

TWO append-only sqlite tables BESIDE the palace (the raw-sqlite-beside-chroma idiom kg_io /
structurepalace already ride):

  worldline_edges  — the rhizome STRUCTURE + the bitemporal spawn-interval.
      Each edge points CAUSE -> EFFECT (happened-before): a `fork` runs parent->child, a
      `linear` runs prev->next, a `join` (handback) runs child->parent (the reunion — the
      parent's post-handback acts stand AFTER the child). `valid_from` opens the interval on a
      caller LOGICAL tick; `valid_to` closes it at handback (bitemporal, kg_io's idiom).
      History stays: a close sets `valid_to`, never a DELETE.

  worldline_kapae  — the MUTE polarity-log (persistence_io's move-not-delete idiom).
      kapae APPENDS a `polarity=1` row per branch turn-key; un_kapae APPENDS `polarity=-1`.
      Nothing ever drops — a turn's live mute-state reads the LATEST polarity row (max id).
      This log IS the "polarity/valid-close edge" a defeat rides; a removal never happens.

CLOCK-PURITY (the sighting ward, no-global-now): every mark — `valid_from`, `valid_to`, the
kapae `tick` — takes a caller-supplied LOGICAL tick. This module imports NO host clock (no
time/datetime); a wall-time mark would corrupt the bitemporal stream with an unreliable
witness (persistence_io.witness carries the same tick idiom).

kapae is WORLDLINE-scoped — a branch (a fork-path subtree) plus its palace entries — DISTINCT
from the general release/supersede/purge. The cascade rides `cascade_kapae` below: it mutes the
branch in the rhizome, then mutes THOSE entries (by turn-key) across the pinned sensoria's
content stores. Un-kapae RESTORES across all of them.

Protocol — NDJSON over stdin/stdout, one JSON object per line (only JSON to stdout):

    -> {"id":1,"op":"ping"}
    <- {"id":1,"ok":true,"result":{"ready":true}}

    -> {"id":2,"op":"add_edge","parent":P,"child":C,"relation":"fork","tick":N}
    -> {"id":2,"op":"handback","parent":P,"child":C,"tick":N}      # join + close the fork interval
    -> {"id":3,"op":"dag","as_of":N?}                              # the rhizome (bitemporal read)
    -> {"id":4,"op":"descendants","node":X,"as_of":N?}            # the branch subtree (fork+linear)
    -> {"id":5,"op":"are_concurrent","a":X,"b":Y}                 # ∥ verdict (spawn-tree incomparable)
    -> {"id":6,"op":"kapae","branch":R,"tick":N}                  # mute the branch (returns turn-keys)
    -> {"id":7,"op":"un_kapae","branch":R,"tick":N}              # restore the branch
    -> {"id":8,"op":"muted_turns"}                                # the live-muted turn-keys

The CASCADE (branch-mute across the sensoria) rides the Python coordinator (`cascade_kapae` /
`cascade_un_kapae`) — it holds the rhizome AND the content stores, above any single palace.

Run with the mempalace CLI's interpreter (it has the package):
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 worldline_io.py serve --palace <data>/sensoriums/<target>/worldline
"""
from __future__ import annotations

import argparse
import os
import sqlite3
from contextlib import contextmanager

from holder_caps import (
    canonical_path,
    idle_ttl_seconds,
    make_dispatch,
    run_holder,
)

# The three rhizome relations — each stored CAUSE -> EFFECT so happened-before reads as reachability.
REL_FORK = "fork"      # spawn: parent -> child
REL_LINEAR = "linear"  # sequential: prev -> next
REL_JOIN = "join"      # handback: child -> parent (the reunion; parent stands after child)
REL_CONTAINS = "contains"  # declared static topology; never temporal or branch lineage

# The spawn-tree relations — the DOWNWARD branch. kapae mutes a subtree over these; the ∥ verdict
# reads incomparability over these. A `join` runs UPWARD (back to main) and rides NEITHER walk.
_SPAWN_TREE = (REL_FORK, REL_LINEAR)

_DB_NAME = "worldline.sqlite3"

IDLE_TTL_ENV = "WORLDLINE_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
_LOCK_PREFIX = "worldline_serve"


def _db_path(palace_path: str) -> str:
    # The rhizome sqlite lives INSIDE the palace dir (kg_io's <palace>/knowledge_graph.sqlite3
    # discipline). Canonicalize so a symlink/relative spelling addresses the SAME file.
    return canonical_path(os.path.join(os.path.expanduser(palace_path), _DB_NAME))


class WorldlineStore:
    """One rhizome fork-DAG over a palace dir: add the structure edges, close a spawn-interval at
    handback, walk the branch subtree, read the ∥ verdict, and drive the move-not-delete kapae
    polarity-log. Pure sqlite BESIDE the chroma palaces — no LLM, no vectors, no host clock."""

    def __init__(self, palace_path: str) -> None:
        os.makedirs(os.path.expanduser(palace_path), exist_ok=True)
        # MULTI-WRITER HARDENING. The `serve` path takes a per-palace flock singleton
        # (holder_caps.acquire_serve_lock), so through the sidecar there is exactly one writer. But
        # capture_session.py constructs this store DIRECTLY, in-process, bypassing the sidecar — so
        # N concurrent harness sessions put N processes on this one file. Default sqlite settings
        # (rollback journal, implicit transactions) turn `add_edge`'s check-then-insert guards into
        # a TOCTOU race: two writers each pass the cycle- and fork-guards, then both INSERT, and the
        # lineage is silently malformed. Not file corruption — worse, because it reads as valid.
        #
        # WAL lets readers run while a writer holds the file; `busy_timeout` makes a blocked writer
        # WAIT rather than raise `database is locked`; `isolation_level=None` hands transaction
        # control to us so the guards and their INSERT can ride ONE `BEGIN IMMEDIATE` (see `_write`).
        self._conn = sqlite3.connect(_db_path(palace_path), timeout=30.0, isolation_level=None)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA busy_timeout=30000")
        self._conn.execute("PRAGMA synchronous=NORMAL")   # WAL-safe; fsync per checkpoint, not per commit
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS worldline_edges ("
            "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "  frm TEXT NOT NULL,"           # cause endpoint
            "  to_node TEXT NOT NULL,"       # effect endpoint
            "  relation TEXT NOT NULL,"      # fork | linear | join
            "  basis TEXT NOT NULL DEFAULT 'given',"  # source fact | declared corpus relation
            "  valid_from,"                  # caller logical tick (opens the interval)
            "  valid_to"                     # caller logical tick or NULL-open (closes at handback)
            ")"
        )
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS worldline_kapae ("
            "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "  branch TEXT NOT NULL,"        # the branch-root the mute keys to
            "  turn_key TEXT NOT NULL,"      # one row per branch turn (the muted node)
            "  polarity INTEGER NOT NULL,"   # 1 = muted, -1 = restored (un-kapae); latest wins
            "  tick"                         # caller logical tick
            ")"
        )
        self._conn.execute("CREATE INDEX IF NOT EXISTS ix_edges_frm ON worldline_edges(frm)")
        self._conn.execute("CREATE INDEX IF NOT EXISTS ix_edges_to ON worldline_edges(to_node)")
        self._conn.execute("CREATE INDEX IF NOT EXISTS ix_kapae_turn ON worldline_kapae(turn_key)")
        # Existing palaces predate edge-basis provenance.  The default preserves
        # their observed session edges as given rather than guessing a derivation.
        columns = {row[1] for row in self._conn.execute("PRAGMA table_info(worldline_edges)")}
        if "basis" not in columns:
            self._conn.execute("ALTER TABLE worldline_edges ADD COLUMN basis TEXT NOT NULL DEFAULT 'given'")
        # (isolation_level=None → each statement above autocommits; no explicit commit needed.)

    @contextmanager
    def _write(self):
        """One ATOMIC write transaction, serialized against every other writer on this file.

        `BEGIN IMMEDIATE` takes sqlite's RESERVED lock at the START of the transaction rather than
        lazily on first write. That is the whole point: the guard SELECTs inside a write block then
        see a frozen file, so no other process can slip an INSERT between a guard and its INSERT.
        Without it, `add_edge`'s cycle- and fork-guards are check-then-act and race under N sessions.

        A concurrent writer blocks up to `busy_timeout` and then proceeds — it does not raise.
        """
        self._conn.execute("BEGIN IMMEDIATE")
        try:
            yield
        except BaseException:
            self._conn.execute("ROLLBACK")
            raise
        else:
            self._conn.execute("COMMIT")

    # -- structure: add the rhizome edges (SINK-idempotent, kg_io's add-idiom) --------------

    def _would_cycle(self, frm: str, to_node: str) -> bool:
        """Whether a spawn-tree edge `frm -> to_node` would CLOSE a cycle — a self-loop, or `to_node`
        already reaches `frm` DOWN the spawn-tree (so the new edge would loop it back). Cheap common case:
        a fresh `to_node` with no spawn-tree out-edge reaches nothing (one indexed lookup), so a normal
        chain/fork pays almost nothing; only a re-parent onto an existing subtree walks."""
        if frm == to_node:
            return True
        has_out = self._conn.execute(
            "SELECT 1 FROM worldline_edges WHERE frm=? AND relation IN (?,?) LIMIT 1",
            (to_node, REL_FORK, REL_LINEAR),
        ).fetchone()
        if not has_out:
            return False                       # to_node reaches nothing down the spawn-tree — no cycle
        return frm in self.descendants(to_node)

    def add_edge(self, frm: str, to_node: str, relation: str, tick, *, basis: str = "given") -> dict:
        """Add one CAUSE->EFFECT edge at `tick`. SINK-idempotent: an identical (frm,to,relation)
        opening at the SAME tick already stands (a re-observed spawn), so a re-run mints nothing.

        CYCLE-GUARD: a spawn-tree edge (fork/linear) that would close a cycle is REJECTED, never added —
        else a pure-cycle component (every node carrying an up-edge) would surface NO root in `roots()`
        and the demux would SILENT-DROP its turns. The reject reads legible (`added:False, cycle:True`),
        and the orphaned `to_node` roots itself instead of vanishing. A `join` runs upward-to-main and
        rides no spawn-tree walk, so it never counts as a cycle here (a fork+join pair is not a walk-cycle).

        FORK-PARENT GUARD: a child holds AT MOST ONE open fork-parent. A SECOND distinct open fork onto an
        existing child clears the cycle-guard (a fresh child reaches nothing) yet leaves `_up_parent` to
        pick a spawner arbitrarily among two — non-deterministic worldline membership on malformed lineage.
        So a distinct open fork-parent is REJECTED legibly (`added:False, fork_conflict:True, held_parent`),
        mirroring the cycle-reject; a re-add of the SAME fork-parent stays idempotent (falls through to the
        exact-match drop below). Only OPEN forks (valid_to NULL) count — a handed-back child re-forks free."""
        if not frm or not to_node:
            raise ValueError("add_edge: frm and to_node required")
        if relation not in (REL_FORK, REL_LINEAR, REL_JOIN, REL_CONTAINS):
            raise ValueError(f"add_edge: unknown relation {relation!r}")
        if not basis.strip():
            raise ValueError("add_edge: basis is required")
        # ATOMICITY: both guards READ the whole edge set, then we INSERT. Split across transactions
        # that is check-then-act, and two concurrent sessions each pass a guard the other is about to
        # invalidate. Inside ONE `BEGIN IMMEDIATE`, the guards read a file no one else can write —
        # so a guard that passes STAYS passed until the INSERT lands. This is what makes the cycle-
        # and fork-guards true invariants rather than hopeful ones.
        with self._write():
            if relation in _SPAWN_TREE and self._would_cycle(frm, to_node):
                return {"added": False, "cycle": True, "frm": frm, "to": to_node, "relation": relation}
            if relation == REL_FORK:
                other = self._conn.execute(
                    "SELECT frm FROM worldline_edges WHERE to_node=? AND relation=? AND valid_to IS NULL "
                    "AND frm<>? LIMIT 1",
                    (to_node, REL_FORK, frm),
                ).fetchone()
                if other:
                    return {"added": False, "fork_conflict": True, "frm": frm, "to": to_node,
                            "relation": relation, "held_parent": other[0]}
            existing = self._conn.execute(
                "SELECT 1 FROM worldline_edges WHERE frm=? AND to_node=? AND relation=? AND valid_from IS ?",
                (frm, to_node, relation, tick),
            ).fetchone()
            if existing:
                return {"added": False, "frm": frm, "to": to_node, "relation": relation}
            self._conn.execute(
                "INSERT INTO worldline_edges (frm, to_node, relation, basis, valid_from, valid_to) VALUES (?,?,?,?,?,NULL)",
                (frm, to_node, relation, basis, tick),
            )
        return {"added": True, "frm": frm, "to": to_node, "relation": relation, "basis": basis}

    def fork(self, parent: str, child: str, tick, *, basis: str = "given") -> dict:
        """SPAWN — the parent forks the child (parent happened-before child)."""
        return self.add_edge(parent, child, REL_FORK, tick, basis=basis)

    def linear(self, prev: str, nxt: str, tick, *, basis: str = "given") -> dict:
        """A linear turn->turn step (prev happened-before next)."""
        return self.add_edge(prev, nxt, REL_LINEAR, tick, basis=basis)

    def handback(self, parent: str, child: str, tick) -> dict:
        """HANDBACK — the twin-reunion: add the JOIN edge (child->parent, the parent stands after
        the child) AND CLOSE the still-open fork interval (bitemporal valid_to; move-not-delete —
        the fork row stays, only its interval closes). Idempotent: a re-handback closes nothing new."""
        # TWO transactions, not one: `add_edge` opens its own `BEGIN IMMEDIATE`, and sqlite does not
        # nest. Each leg is individually atomic and BOTH are idempotent, so a crash between them
        # leaves a join added with the fork still open — and a re-handback closes it. The interval
        # never tears; it can only lag, and the re-run is the cure (the same crash-cure discipline
        # the rest of the capture wire carries).
        join = self.add_edge(child, parent, REL_JOIN, tick)
        with self._write():
            cur = self._conn.execute(
                "UPDATE worldline_edges SET valid_to=? WHERE frm=? AND to_node=? AND relation=? AND valid_to IS NULL",
                (tick, parent, child, REL_FORK),
            )
            closed = cur.rowcount
        return {"join": join["added"], "fork_closed": closed}

    # -- reads: the bitemporal rhizome + the branch subtree + the ∥ verdict ------------------

    def _rows(self, as_of=None) -> list:
        """Every edge (frm, to, relation, valid_from, valid_to), optionally AS-OF a tick — the
        bitemporal slice keeps only intervals open at `as_of` (valid_from<=as_of<valid_to)."""
        rows = self._conn.execute(
            "SELECT frm, to_node, relation, basis, valid_from, valid_to FROM worldline_edges ORDER BY id"
        ).fetchall()
        if as_of is None:
            return [{"frm": r[0], "to": r[1], "relation": r[2], "basis": r[3], "valid_from": r[4], "valid_to": r[5]} for r in rows]
        out = []
        for r in rows:
            vf, vt = r[4], r[5]
            if vf is not None and vf > as_of:
                continue                       # not yet opened at as_of
            if vt is not None and vt <= as_of:
                continue                       # already closed at as_of
            out.append({"frm": r[0], "to": r[1], "relation": r[2], "basis": r[3], "valid_from": vf, "valid_to": vt})
        return out

    def dag(self, as_of=None) -> dict:
        """The rhizome as an edge list (bitemporal AS-OF a tick, else the whole history) — the
        tree/replay read: the caller reconstructs adjacency from the CAUSE->EFFECT edges."""
        return {"edges": self._rows(as_of)}

    @staticmethod
    def _interval_clause(as_of) -> tuple:
        """The bitemporal WHERE fragment + params keeping only edges OPEN at `as_of` (empty when None).
        `valid_from<=as_of` (opened) AND `valid_to>as_of`/NULL (not yet closed) — the _rows slice, pushed
        to sqlite so a per-node walk rides the frm/to indexes instead of scanning the whole edge table."""
        if as_of is None:
            return "", ()
        return " AND (valid_from IS NULL OR valid_from<=?) AND (valid_to IS NULL OR valid_to>?)", (as_of, as_of)

    def _children(self, node: str, as_of=None) -> list:
        """The spawn-tree children of `node` (its fork/linear `to`) — an INDEXED read on ix_edges_frm,
        the down-walk step. No whole-table scan: the WHERE frm=? rides the index."""
        clause, params = self._interval_clause(as_of)
        rows = self._conn.execute(
            "SELECT to_node FROM worldline_edges WHERE frm=? AND relation IN (?,?)" + clause,
            (node, REL_FORK, REL_LINEAR, *params),
        ).fetchall()
        return [r[0] for r in rows]

    def descendants(self, node: str, as_of=None) -> list:
        """The BRANCH subtree rooted at `node` — every turn reachable DOWN the spawn-tree
        (fork+linear), the node itself EXCLUDED. Join edges run upward-to-main, so they never
        walk (a rejoined branch's tail stays inside its own subtree). Cycle-safe BFS, each step an
        INDEXED `_children` read (ix_edges_frm) rather than a full edge-table scan."""
        seen, out, queue = {node}, [], list(self._children(node, as_of))
        while queue:
            n = queue.pop(0)
            if n in seen:
                continue
            seen.add(n)
            out.append(n)
            queue.extend(self._children(n, as_of))
        return out

    def branch_keys(self, branch_root: str, as_of=None) -> list:
        """The full branch = the root PLUS its spawn-tree descendants — the turn-key set kapae mutes."""
        return [branch_root, *self.descendants(branch_root, as_of)]

    def _up_parent(self, node: str, as_of=None) -> "str | None":
        """The node standing UP the braid from `node` — its fork-spawner (preferred) or its linear-prev.
        A turn holds at most one of each; the spawner outranks the chain, so a sub-agent climbs to its
        spawning main-turn before climbing that main's own chain. An INDEXED read on ix_edges_to."""
        clause, params = self._interval_clause(as_of)
        rows = self._conn.execute(
            "SELECT relation, frm FROM worldline_edges WHERE to_node=? AND relation IN (?,?)" + clause,
            (node, REL_FORK, REL_LINEAR, *params),
        ).fetchall()
        fork_up = linear_up = None
        for relation, frm in rows:
            if relation == REL_FORK:
                fork_up = frm
            elif relation == REL_LINEAR:
                linear_up = frm
        return fork_up or linear_up

    def worldline_of(self, turn: str, as_of=None) -> str:
        """The worldline-ROOT of a turn (the demux's lineage-path) — climb the braid (fork-spawner,
        else linear-prev) to the top: a sub-agent turn climbs its fork-parent to the spawning main-turn,
        then up the main's linear chain to the main-session root. The root carries no fork-parent and no
        linear-prev — descent IS the address (agent-worldline Face-I). Cycle-guarded."""
        node, seen = turn, set()
        while node not in seen:
            seen.add(node)
            up = self._up_parent(node, as_of)
            if up is None:
                return node
            node = up
        return node

    def roots(self, as_of=None) -> list:
        """Every worldline-ROOT — the turns carrying no fork-parent and no linear-prev (one per braid).
        The demux partitions the captured turns by which root `worldline_of` climbs to."""
        nodes: set = set()
        has_up: set = set()
        for e in self._rows(as_of):
            nodes.add(e["frm"])
            nodes.add(e["to"])
            if e["relation"] in (REL_FORK, REL_LINEAR):
                has_up.add(e["to"])
        return sorted(nodes - has_up)

    def are_concurrent(self, a: str, b: str, as_of=None) -> bool:
        """The ∥ verdict — a and b run concurrent when NEITHER stands in the other's spawn-tree
        subtree (incomparable in the spawn partial-order). Two siblings of one fork with no join
        between them read ∥; a parent and its own descendant read ordered, not ∥."""
        if a == b:
            return False
        return b not in self.descendants(a, as_of) and a not in self.descendants(b, as_of)

    def relation_of(self, a: str, b: str, as_of=None) -> str:
        """"before" (a in b's ancestry via the spawn-tree), "after", or "concurrent" (∥)."""
        if b in self.descendants(a, as_of):
            return "before"
        if a in self.descendants(b, as_of):
            return "after"
        return "concurrent"

    # -- kapae: the move-not-delete mute polarity-log ---------------------------------------

    def has_node(self, node: str) -> bool:
        """Whether `node` stands in the rhizome at all — it appears as the `frm` or `to` of some edge. A
        bogus/typo branch names no node; kapae over it must read resolved:false, never a silent no-op."""
        row = self._conn.execute(
            "SELECT 1 FROM worldline_edges WHERE frm=? OR to_node=? LIMIT 1", (node, node)
        ).fetchone()
        return row is not None

    def muted_turns(self) -> set:
        """The live-muted turn-keys — each turn's LATEST polarity row (max id) reading 1. The log
        stays append-only, so this DERIVES the current mute-state; no row ever drops."""
        rows = self._conn.execute(
            "SELECT turn_key, polarity FROM worldline_kapae k WHERE id = "
            "(SELECT MAX(id) FROM worldline_kapae k2 WHERE k2.turn_key = k.turn_key)"
        ).fetchall()
        return {r[0] for r in rows if int(r[1]) == 1}

    def _log(self, branch_root: str, turn_keys, polarity: int, tick) -> None:
        # One transaction for the whole batch: a half-written mute cascade would leave a branch
        # partly silenced, which reads as a real (wrong) state rather than a failed one.
        with self._write():
            self._conn.executemany(
                "INSERT INTO worldline_kapae (branch, turn_key, polarity, tick) VALUES (?,?,?,?)",
                [(branch_root, tk, polarity, tick) for tk in turn_keys],
            )

    def kapae(self, branch_root: str, tick) -> list:
        """Mute the branch (root + spawn-tree subtree) — APPEND a polarity=1 row per turn-key
        (move-not-delete). Returns the muted turn-keys so the coordinator can cascade to the
        palaces. Idempotent-in-effect: a re-kapae appends fresh polarity=1 rows (the latest still
        reads muted), never a duplicate STATE."""
        keys = self.branch_keys(branch_root)
        self._log(branch_root, keys, 1, tick)
        return keys

    def un_kapae(self, branch_root: str, tick) -> list:
        """Restore the branch — APPEND a polarity=-1 row per turn-key (the log grows; the mute
        rows STAY, only the latest polarity flips). Returns the restored turn-keys for the cascade."""
        keys = self.branch_keys(branch_root)
        self._log(branch_root, keys, -1, tick)
        return keys

    def kapae_log(self) -> list:
        """The whole append-only mute-log (the move-not-delete witness) — every polarity edge, in order."""
        rows = self._conn.execute(
            "SELECT branch, turn_key, polarity, tick FROM worldline_kapae ORDER BY id"
        ).fetchall()
        return [{"branch": r[0], "turn_key": r[1], "polarity": int(r[2]), "tick": r[3]} for r in rows]

    def close(self) -> None:
        self._conn.close()


# ---------------------------------------------------------------------------
# The CASCADE — branch-mute ACROSS the sensoria (the coordinator's cross-palace leg)
# ---------------------------------------------------------------------------
#
# kapae stays worldline-scoped but its BLAST-RADIUS crosses the palaces: muting a branch must mute
# THOSE turns' entries in every sensorium so recall excludes them. The rhizome holds no vectors,
# so the cascade rides ABOVE it — it holds the rhizome AND the content stores (the pinned Memory +
# Dream land-stores), the @daemon coordinator's seat. Each content store resolves its own cids for
# a turn-key (content_io.cids_for_turn) and mutes/unmutes them (content_io.mute, vector-safe).


def _branch_resolves(worldline: WorldlineStore, stores, branch_root: str) -> bool:
    """Whether a branch NAMES something real — a rhizome node, OR a turn with bound content in some store
    (a content-only turn carries no edge yet still mutes). A pure typo matches NEITHER — the caller reads
    resolved:false instead of a silent no-op, and no phantom mute logs against a name for nothing."""
    if worldline.has_node(branch_root):
        return True
    return any(store.cids_for_turn(branch_root) for store in stores)


def cascade_kapae(worldline: WorldlineStore, stores, branch_root: str, tick) -> dict:
    """FULL kapae: mute the branch in the rhizome, then cascade the mute to EVERY store's entries
    for those turn-keys. `stores` = the sensoria's content stores (Memory + Dream). Returns the
    branch + the total entries muted + `resolved` (false for a bogus/typo branch — a silent no-op today).
    Reversible via `cascade_un_kapae` (move-not-delete throughout)."""
    if not _branch_resolves(worldline, stores, branch_root):
        return {"branch": [], "muted_entries": 0, "resolved": False}   # a pure typo — never a phantom mute
    keys = worldline.kapae(branch_root, tick)
    muted = 0
    for store in stores:
        for tk in keys:
            for cid in store.cids_for_turn(tk):
                store.mute(cid, tick)
                muted += 1
    return {"branch": sorted(keys), "muted_entries": muted, "resolved": True}


def cascade_un_kapae(worldline: WorldlineStore, stores, branch_root: str, tick) -> dict:
    """Restore the branch across the rhizome AND every store — the entries reappear in recall. The
    rows never left (move-not-delete), so cids_for_turn still finds them to un-mute. A bogus/typo branch
    reads resolved:false (a silent no-op today)."""
    if not _branch_resolves(worldline, stores, branch_root):
        return {"branch": [], "restored_entries": 0, "resolved": False}
    keys = worldline.un_kapae(branch_root, tick)
    restored = 0
    for store in stores:
        for tk in keys:
            for cid in store.cids_for_turn(tk):
                store.unmute(cid, tick)
                restored += 1
    return {"branch": sorted(keys), "restored_entries": restored, "resolved": True}


# ---------------------------------------------------------------------------
# serve — the rhizome's NDJSON face (the cascade rides the Python coordinator above)
# ---------------------------------------------------------------------------


def _build_ops(store: WorldlineStore) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "add_edge": lambda req: store.add_edge(req["frm"], req["to"], req["relation"], req.get("tick")),
        "fork": lambda req: store.fork(req["parent"], req["child"], req.get("tick")),
        "linear": lambda req: store.linear(req["prev"], req["next"], req.get("tick")),
        "handback": lambda req: store.handback(req["parent"], req["child"], req.get("tick")),
        "dag": lambda req: store.dag(req.get("as_of")),
        "descendants": lambda req: {"branch": store.descendants(req["node"], req.get("as_of"))},
        "are_concurrent": lambda req: {"concurrent": store.are_concurrent(req["a"], req["b"], req.get("as_of"))},
        "relation_of": lambda req: {"relation": store.relation_of(req["a"], req["b"], req.get("as_of"))},
        "kapae": lambda req: {"branch": store.kapae(req["branch"], req.get("tick"))},
        "un_kapae": lambda req: {"branch": store.un_kapae(req["branch"], req.get("tick"))},
        "muted_turns": lambda req: {"muted": sorted(store.muted_turns())},
        "kapae_log": lambda req: {"log": store.kapae_log()},
    }


def _serve(palace_path: str) -> None:
    run_holder(
        palace=palace_path,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(WorldlineStore(palace_path))),
        idle_ttl=idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS),
        singleton_msg="worldline_io: another holder already serves this palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="worldline I/O (the rhizome fork-DAG + kapae holder)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON RPC holder for one worldline palace dir")
    s.add_argument("--palace", required=True)
    s.set_defaults(fn=lambda a: _serve(a.palace))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
