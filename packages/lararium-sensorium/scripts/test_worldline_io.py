"""Phase-4 witness — the WORLDLINE RHIZOME (fork-DAG) + FULL kapae across the pinned sensoria.

Proves, over REAL content_io palaces + the two PINNED sensoria (Memory=immutable-ground ⊥ Dream):
  · fork-DAG      — spawn->fork, handback->join (fork interval closes), concurrent siblings->∥;
                    a real multi-turn shape replays correctly.
  · kapae-cascade — kapae a BRANCH (root + subtree) EXCLUDES its entries from recall across BOTH
                    sensoria; the other turns stay intact.
  · un-kapae      — restores the branch across all sensoria (the entries reappear).
  · move-not-delete — the edges stay, the kapae-log only GROWS (polarity 1 then -1), the content
                    rows persist while muted; no hard removal anywhere.
  · restart       — the mute survives reopening the rhizome sqlite + the chroma palaces.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_worldline_io.py -q
"""

import content_io as cio
import worldline_io as wl
from sensorium import compose_content_land, compose_sensorium


def _embed(_text):
    # One shared embedding so EVERY row is a near neighbor — recall then returns all live rows,
    # and the kapae exclusion is the only thing that drops any.
    return [1.0, 0.0]


def _build_rhizome(store):
    """A real multi-turn shape:  root forks A and B (A ∥ B); B forks B1 (B's subtree); A hands back."""
    store.fork("t-root", "t-A", tick=1)
    store.fork("t-root", "t-B", tick=2)      # B forked while A still runs -> A ∥ B
    store.fork("t-B", "t-B1", tick=3)        # B1 rides B's subtree
    store.handback("t-root", "t-A", tick=4)  # child A hands back to parent root: join + close the fork


def test_graph_walks_ride_the_frm_to_indexes(tmp_path):
    # C5 scale: the down-walk (_children) and up-walk (_up_parent) push frm/to WHERE to sqlite, so the
    # ix_edges_frm / ix_edges_to indexes (dead weight before) now carry the walk — never a full-table scan.
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    store.linear("a", "b", tick=1)
    down = store._conn.execute(
        "EXPLAIN QUERY PLAN SELECT to_node FROM worldline_edges WHERE frm=? AND relation IN (?,?)",
        ("a", "fork", "linear"),
    ).fetchall()
    up = store._conn.execute(
        "EXPLAIN QUERY PLAN SELECT relation, frm FROM worldline_edges WHERE to_node=? AND relation IN (?,?)",
        ("b", "fork", "linear"),
    ).fetchall()
    assert any("ix_edges_frm" in str(r) for r in down), down     # the down-walk rides ix_edges_frm
    assert any("ix_edges_to" in str(r) for r in up), up          # the up-walk rides ix_edges_to
    # and the walks still read correctly through the indexed path
    assert store.descendants("a") == ["b"] and store.worldline_of("b") == "a"


def test_bogus_branch_kapae_reads_resolved_false(tmp_path):
    # C4: a bogus/typo branch (no rhizome node, no bound content) reads resolved:false — a legible miss,
    # never a silent no-op — and logs NO phantom mute. A real branch resolves true.
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    content = cio.ContentStore(str(tmp_path / ".mem"))
    store.linear("a", "b", tick=1)                       # a -> b (a real branch)

    miss = wl.cascade_kapae(store, [content], "NOPE-typo", tick=2)
    assert miss == {"branch": [], "muted_entries": 0, "resolved": False}
    assert not store.muted_turns()                       # the typo logged no phantom mute

    hit = wl.cascade_kapae(store, [content], "a", tick=3)
    assert hit["resolved"] is True and set(hit["branch"]) == {"a", "b"}
    assert store.muted_turns() == {"a", "b"}             # the real branch muted
    un = wl.cascade_un_kapae(store, [content], "NOPE-typo", tick=4)
    assert un["resolved"] is False                       # un-kapae of a typo is legible too


def test_add_edge_rejects_a_cycle_creating_spawn_edge(tmp_path):
    # C3: a spawn-tree edge that would close a cycle is REJECTED (never added), so no pure-cycle
    # component silent-drops its turns from the demux (roots()/worldline_of climb the spawn-tree). The
    # reject reads legible; the would-be-looped node roots itself instead of vanishing.
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    store.linear("a", "b", tick=1)
    store.linear("b", "c", tick=2)                        # chain a -> b -> c

    res = store.linear("c", "a", tick=3)                  # c -> a would close a -> b -> c -> a
    assert res == {"added": False, "cycle": True, "frm": "c", "to": "a", "relation": "linear"}
    self_loop = store.fork("a", "a", tick=4)              # a self-loop is a trivial cycle
    assert self_loop["added"] is False and self_loop["cycle"] is True

    # never silent-dropped: the chain still roots at `a`, and every turn climbs to it (no vanished node).
    assert store.roots() == ["a"]
    assert store.worldline_of("c") == "a" and store.worldline_of("b") == "a"
    # the rejected edges never entered the rhizome
    assert not any((e["frm"], e["to"]) in {("c", "a"), ("a", "a")} for e in store.dag()["edges"])


def test_add_edge_refuses_a_second_distinct_open_fork_parent(tmp_path):
    # A child holds AT MOST ONE open fork-parent. A second DISTINCT open fork onto an existing child
    # clears the cycle-guard (a leaf child reaches nothing) yet would leave _up_parent picking a spawner
    # arbitrarily → non-deterministic worldline membership. The second distinct parent is REFUSED legibly;
    # the SAME fork-parent stays idempotent; the child's spawner stays the first (deterministic).
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    first = store.fork("p1", "child", tick=1)
    assert first["added"] is True

    same = store.fork("p1", "child", tick=1)                 # a re-observed spawn — idempotent, mints nothing
    assert same["added"] is False and same.get("fork_conflict") is None

    clash = store.fork("p2", "child", tick=2)                # a SECOND distinct open fork-parent — refused
    assert clash == {"added": False, "fork_conflict": True, "frm": "p2", "to": "child",
                     "relation": "fork", "held_parent": "p1"}

    # the rejected edge never entered the rhizome; the spawner reads deterministically as the first parent
    assert not any((e["frm"], e["to"]) == ("p2", "child") for e in store.dag()["edges"])
    assert store.worldline_of("child") == "p1"

    # after handback closes the first fork, the child re-forks free (only OPEN parents block)
    store.handback("p1", "child", tick=3)
    reforked = store.fork("p2", "child", tick=4)
    assert reforked["added"] is True


def test_fork_dag_spawn_handback_concurrent_replays(tmp_path):
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    _build_rhizome(store)

    edges = store.dag()["edges"]
    rels = {(e["frm"], e["to"]): e for e in edges}
    # spawn -> fork edges (cause->effect)
    assert rels[("t-root", "t-A")]["relation"] == "fork"
    assert rels[("t-root", "t-B")]["relation"] == "fork"
    assert rels[("t-B", "t-B1")]["relation"] == "fork"
    # handback -> a join edge (child->parent) AND the fork interval closed (bitemporal valid_to)
    assert rels[("t-A", "t-root")]["relation"] == "join"
    assert rels[("t-root", "t-A")]["valid_to"] == 4          # closed at handback
    assert rels[("t-root", "t-B")]["valid_to"] is None       # B still open

    # concurrent -> ∥ : the two siblings of one fork read concurrent; parent/child read ordered
    assert store.are_concurrent("t-A", "t-B") is True
    assert store.are_concurrent("t-B", "t-B1") is False
    assert store.relation_of("t-B", "t-B1") == "before"
    assert store.relation_of("t-B1", "t-B") == "after"

    # replay the branch subtree (fork+linear, join runs upward so never walks)
    assert set(store.descendants("t-B")) == {"t-B1"}
    assert set(store.branch_keys("t-B")) == {"t-B", "t-B1"}

    # bitemporal AS-OF (valid-time slice): at tick 3 the root->A fork is OPEN and the join is not
    # yet minted; at tick 5 the fork has closed (valid_to=4) and the join stands.
    early = {(e["frm"], e["to"]) for e in store.dag(as_of=3)["edges"]}
    assert ("t-root", "t-A") in early and ("t-A", "t-root") not in early
    late = {(e["frm"], e["to"]) for e in store.dag(as_of=5)["edges"]}
    assert ("t-root", "t-A") not in late and ("t-A", "t-root") in late


def _two_sensoria(tmp_path):
    mem = compose_sensorium(
        kind="memory", source=lambda records: records, embed=_embed,
        land=compose_content_land(str(tmp_path / ".mem"), required_keys={"wing", "room"}, expected_dim=2),
    )
    dream = compose_sensorium(
        kind="dream", source=lambda records: records, embed=_embed,
        land=compose_content_land(str(tmp_path / ".dream"), append_only=False),
    )
    mst, dst = mem._land.store, dream._land.store
    # Memory (immutable ground) carries wing/room; both stores tag each row with its worldline turn.
    mst.put("m-A", "mem A", [1.0, 0.0], {"wing": "w", "room": "r", "lar_turn_key": "t-A"})
    mst.put("m-B", "mem B", [1.0, 0.0], {"wing": "w", "room": "r", "lar_turn_key": "t-B"})
    mst.put("m-B1", "mem B1", [1.0, 0.0], {"wing": "w", "room": "r", "lar_turn_key": "t-B1"})
    dst.put("d-A", "dream A", [1.0, 0.0], {"lar_turn_key": "t-A"})
    dst.put("d-B", "dream B", [1.0, 0.0], {"lar_turn_key": "t-B"})
    return mem, dream, mst, dst


def test_kapae_branch_excludes_then_unkapae_restores_across_both_sensoria(tmp_path):
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    _build_rhizome(store)
    mem, dream, mst, dst = _two_sensoria(tmp_path)

    def recalled(sensorium):
        return {m["cid"] for m in sensorium.recall([1.0, 0.0], k=8)["matches"]}

    # before kapae: recall sees every turn's entries
    assert recalled(mem) == {"m-A", "m-B", "m-B1"}
    assert recalled(dream) == {"d-A", "d-B"}

    # FULL kapae of branch t-B (root + subtree t-B1) — cascades across BOTH sensoria
    res = wl.cascade_kapae(store, [mst, dst], "t-B", tick=5)
    assert res["branch"] == ["t-B", "t-B1"]
    assert res["muted_entries"] == 3                        # m-B, m-B1, d-B

    # recall now EXCLUDES the muted branch across both; the other turn (t-A) stays intact
    assert recalled(mem) == {"m-A"}
    assert recalled(dream) == {"d-A"}
    assert store.muted_turns() == {"t-B", "t-B1"}

    # UN-KAPAE restores the branch across all sensoria — the entries reappear
    back = wl.cascade_un_kapae(store, [mst, dst], "t-B", tick=6)
    assert back["restored_entries"] == 3
    assert recalled(mem) == {"m-A", "m-B", "m-B1"}
    assert recalled(dream) == {"d-A", "d-B"}
    assert store.muted_turns() == set()


def test_worldline_of_climbs_to_the_braid_root(tmp_path):
    # the demux membership query: a sub-agent turn resolves to the MAIN-session root, not its own start.
    w = wl.WorldlineStore(str(tmp_path / ".wl-root"))
    # One braid per row — the semicolon holds a chain together so each row reads as one lineage.
    w.linear("m0", "m1", 1); w.linear("m1", "m2", 2)   # noqa: E702 — main chain m0→m1→m2
    w.fork("m1", "s0", 2); w.linear("s0", "s1", 3)      # noqa: E702 — m1 spawns sub-agent s0→s1
    w.linear("n0", "n1", 1)                             # a separate braid n0→n1
    assert w.worldline_of("s1") == "m0"   # climbs s1→s0 (linear) → m1 (fork) → m0 (linear) → root
    assert w.worldline_of("m2") == "m0"
    assert w.worldline_of("n1") == "n0"
    assert set(w.roots()) == {"m0", "n0"}  # one root per braid


def test_move_not_delete_history_preserved(tmp_path):
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    _build_rhizome(store)
    mem, dream, mst, dst = _two_sensoria(tmp_path)
    edge_count = len(store.dag()["edges"])

    wl.cascade_kapae(store, [mst, dst], "t-B", tick=5)
    wl.cascade_un_kapae(store, [mst, dst], "t-B", tick=6)

    # the STRUCTURE never changed — kapae rides its own polarity-log, not the edges
    assert len(store.dag()["edges"]) == edge_count
    # the kapae-log only GREW: polarity=1 (2 rows) then polarity=-1 (2 rows), nothing removed
    log = store.kapae_log()
    assert [e["polarity"] for e in log] == [1, 1, -1, -1]
    assert {e["turn_key"] for e in log} == {"t-B", "t-B1"}
    # the content rows persist through the whole cycle (muted, then restored) — never deleted
    assert mst.get("m-B") is not None and mst.get("m-B1") is not None
    assert dst.get("d-B") is not None
    # while muted (re-kapae), the immutable-ground Memory row STILL carries its verbatim atom
    wl.cascade_kapae(store, [mst, dst], "t-B", tick=7)
    assert mst.get("m-B")["document"] == "mem B"            # the atom untouched — mute is metadata


def test_kapae_survives_a_restart(tmp_path):
    wpath = str(tmp_path / "worldline")
    mpath, dpath = str(tmp_path / ".mem" / "content"), str(tmp_path / ".dream" / "content")
    store = wl.WorldlineStore(wpath)
    _build_rhizome(store)
    _, _, mst, dst = _two_sensoria(tmp_path)
    wl.cascade_kapae(store, [mst, dst], "t-B", tick=5)
    store.close()

    # reopen the rhizome sqlite + the chroma palaces from disk (a fresh process would see this)
    store2 = wl.WorldlineStore(wpath)
    mst2 = cio.ContentStore(mpath, required_keys={"wing", "room"}, expected_dim=2, append_only=True)
    dst2 = cio.ContentStore(dpath, append_only=False)
    assert store2.muted_turns() == {"t-B", "t-B1"}          # the mute survived
    assert {m["cid"] for m in mst2.search([1.0, 0.0], k=8)["matches"]} == {"m-A"}
    assert {m["cid"] for m in dst2.search([1.0, 0.0], k=8)["matches"]} == {"d-A"}
