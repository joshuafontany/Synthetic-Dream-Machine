"""Demux 1b witness — the worldline OBSERVER builds the fork-DAG from a captured transcript.

Proves, over a SYNTHETIC session (a main transcript chained by parentUuid + a `subagents/agent-<id>.jsonl`):
  · the wire builds  — the main linear-chain + a SPAWN fork (run -> `<run>.<agentId>`) + a HANDBACK close.
  · worldline_of     — a spirit turn AND a main turn both climb to the SESSION root (the run braid-anchor).
  · roots()          — the session root stands alone (one braid).
  · idempotent       — a re-run mints no duplicate edges (worldline_io add_edge is sink-idempotent).
  · clock-purity     — the module imports no host clock; the edge path rides logical ordinals only.
  · end-to-end       — capture_and_observe lands the content AND builds the worldline in one pass; the
                       landed content turn-keys (user uuids) climb to the run.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_worldline_observe.py -q
"""
import json
import os

import worldline_io as wl
from worldline_observe import derive_handle, observe_worldline, run_id_of


def _main_line(uuid, parent, role, text, ts):
    row = {"type": role, "uuid": uuid, "parentUuid": parent, "sessionId": "sess-xyz",
           "timestamp": ts, "message": {"role": role, "content": [{"type": "text", "text": text}]}}
    return json.dumps(row)


def _synth_session(tmp_path):
    """A main session `sess-xyz.jsonl` (u1->a1->u2->a2) + one spirit `agent-aaa.jsonl` (s1->s2)."""
    main = tmp_path / "sess-xyz.jsonl"
    main.write_text("\n".join([
        json.dumps({"type": "summary", "summary": "a non-turn line the reader skips"}),
        _main_line("u1", None, "user", "light the capture engine", "2026-07-05T10:00:00Z"),
        _main_line("a1", "u1", "assistant", "spawning a spirit", "2026-07-05T10:00:05Z"),
        _main_line("u2", "a1", "user", "carry on", "2026-07-05T10:01:00Z"),
        _main_line("a2", "u2", "assistant", "the tail lands", "2026-07-05T10:01:05Z"),
    ]) + "\n", encoding="utf-8")

    subdir = tmp_path / "sess-xyz" / "subagents"
    subdir.mkdir(parents=True)
    (subdir / "agent-aaa.jsonl").write_text("\n".join([
        _main_line("s1", None, "user", "the spirit's handoff", "2026-07-05T10:00:06Z"),
        _main_line("s2", "s1", "assistant", "the spirit's finding", "2026-07-05T10:00:09Z"),
    ]) + "\n", encoding="utf-8")
    return str(main)


def test_wire_builds_fork_chain_and_handback(tmp_path):
    main = _synth_session(tmp_path)
    store = wl.WorldlineStore(str(tmp_path / ".worldline"))
    summary = observe_worldline(store, main)

    run, handle = "sess-xyz", "sess-xyz.aaa"
    assert summary == {"run": run, "main_turns": 4, "spirits": [handle]}
    assert derive_handle(run, "aaa") == handle

    edges = {(e["frm"], e["to"]): e for e in store.dag()["edges"]}
    # the SPAWN fork run -> handle (the task's edge)
    assert edges[(run, handle)]["relation"] == "fork"
    # the main linear-chain: a null-parent main turn roots at the RUN, the rest chain by parentUuid
    assert edges[(run, "u1")]["relation"] == "linear"
    assert edges[("u1", "a1")]["relation"] == "linear"
    assert edges[("a1", "u2")]["relation"] == "linear"
    # the spirit chain hangs off the HANDLE
    assert edges[(handle, "s1")]["relation"] == "linear"
    assert edges[("s1", "s2")]["relation"] == "linear"
    # the HANDBACK: a join handle -> run AND the fork interval closed (bitemporal valid_to set)
    assert edges[(handle, run)]["relation"] == "join"
    assert edges[(run, handle)]["valid_to"] is not None


def test_worldline_of_climbs_to_the_session_root(tmp_path):
    main = _synth_session(tmp_path)
    store = wl.WorldlineStore(str(tmp_path / ".worldline"))
    observe_worldline(store, main)
    run = "sess-xyz"

    # a SPIRIT turn climbs its chain -> handle -> (fork) run; a MAIN turn climbs its chain -> run
    assert store.worldline_of("s2") == run
    assert store.worldline_of("s1") == run
    assert store.worldline_of("a2") == run
    assert store.worldline_of("u1") == run
    # one braid: the session root stands alone
    assert store.roots() == [run]


def test_re_run_mints_no_duplicate_edges(tmp_path):
    main = _synth_session(tmp_path)
    store = wl.WorldlineStore(str(tmp_path / ".worldline"))
    observe_worldline(store, main)
    first = len(store.dag()["edges"])
    observe_worldline(store, main)                    # a second pass over the same transcript
    assert len(store.dag()["edges"]) == first          # sink-idempotent: no duplicate edges
    assert store.roots() == ["sess-xyz"]               # still one root after the re-run


def test_no_host_wall_time_on_the_edge_path(tmp_path):
    # clock-purity (the sighting ward): the observer imports no host clock; ordinals ride the edge path.
    src = open(os.path.join(os.path.dirname(__file__), "worldline_observe.py"), encoding="utf-8").read()
    for banned in ("import time", "import datetime", "from datetime", "time.time", "datetime.now",
                   "utcnow", "time.monotonic"):
        assert banned not in src, f"clock leak: {banned!r} on the worldline edge path"


def test_capture_and_observe_lands_content_and_builds_the_worldline(tmp_path):
    from capture_session import capture_and_observe

    def _stub_embed_factory():
        def factory():
            def embed_one(text):
                h = abs(hash(text))
                return [float((h >> (8 * i)) & 0xFF) for i in range(4)]
            return embed_one, "stub-minilm/4"
        return factory

    main = _synth_session(tmp_path)
    res = capture_and_observe(str(tmp_path / ".mem"), "claude", main, wing="wing_proj",
                              worldline_palace=str(tmp_path / ".worldline"),
                              embed_factory=_stub_embed_factory())
    # content landed AND the worldline built in one pass
    assert res["landed"] == 2 and res["audit"]["ok"]           # two main exchanges (u1/a1, u2/a2)
    assert res["worldline"]["run"] == "sess-xyz"
    assert res["worldline"]["spirits"] == ["sess-xyz.aaa"]

    # the LANDED content turn-keys (the user-turn uuids) climb to the run — the demux partitions by root
    store = wl.WorldlineStore(str(tmp_path / ".worldline"))
    assert store.worldline_of("u1") == "sess-xyz"
    assert store.worldline_of("u2") == "sess-xyz"


def test_detect_rewind_finds_the_diverged_prefix(tmp_path):
    # step-3 (A): a content-hash-chain surfaces an edited prefix the content-independent cid would skip.
    import content_io as cio
    from capture_sources import _sha16, derive_cid
    from worldline_observe import detect_rewind

    store = cio.ContentStore(str(tmp_path / ".rewind"))
    sf = "sess.jsonl"

    def drawers(texts):
        prev, out = "", []
        for i, t in enumerate(texts):
            chain = _sha16(t + prev)
            prev = chain
            out.append((derive_cid(sf, i), t, {"lar_turn_key": f"t{i}", "lar_chain": chain,
                                               "wing": "w", "room": "r"}))
        return out

    for cid, t, m in drawers(["a", "b", "c"]):
        store.put(cid, t, [0.1, 0.2], m)
    assert detect_rewind(store, drawers(["a", "b", "c"])) is None       # chain holds -> no rewind
    assert detect_rewind(store, drawers(["a", "B!", "c"])) == "t1"      # turn-1 edited -> chain diverges at t1
    assert detect_rewind(store, drawers(["a", "b", "c", "d"])) is None  # a new tail turn = growth, not rewind
