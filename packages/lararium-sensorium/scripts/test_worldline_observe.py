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
from worldline_observe import derive_handle, observe_worldline
from worldline_veil import veiled_root

# A fixed WITNESS salt — the tests inject their own secret so they NEVER touch the operator's real keys.
_SECRET = b"witness-worldline-salt-c1b"


def _run(raw: str) -> str:
    """The VEILED root a witness expects for a raw session basename (owner-recompute under `_SECRET`)."""
    return veiled_root(raw, secret=_SECRET)


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
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    summary = observe_worldline(store, main, veil_secret=_SECRET)

    run = _run("sess-xyz")            # the VEILED root, never the bare session basename
    handle = derive_handle(run, "aaa")
    assert run.startswith("wl-")      # opaque — the bare "sess-xyz" never rides the graph
    assert "sess-xyz" not in run
    assert summary == {"run": run, "main_turns": 4, "spirits": [handle]}

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
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    observe_worldline(store, main, veil_secret=_SECRET)
    run = _run("sess-xyz")

    # a SPIRIT turn climbs its chain -> handle -> (fork) run; a MAIN turn climbs its chain -> run
    assert store.worldline_of("s2") == run
    assert store.worldline_of("s1") == run
    assert store.worldline_of("a2") == run
    assert store.worldline_of("u1") == run
    # one braid: the session root stands alone
    assert store.roots() == [run]


def test_re_run_mints_no_duplicate_edges(tmp_path):
    main = _synth_session(tmp_path)
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    observe_worldline(store, main, veil_secret=_SECRET)
    first = len(store.dag()["edges"])
    observe_worldline(store, main, veil_secret=_SECRET)  # a second pass over the same transcript
    assert len(store.dag()["edges"]) == first          # sink-idempotent: no duplicate edges
    assert store.roots() == [_run("sess-xyz")]         # still one (veiled) root after the re-run


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
    root = str(tmp_path / ".mem")
    res = capture_and_observe(root, "claude", main, wing="wing_proj",
                              embed_factory=_stub_embed_factory(), veil_secret=_SECRET)
    # content landed AND the worldline built in one pass
    assert res["landed"] == 2 and res["audit"]["ok"]           # two main exchanges (u1/a1, u2/a2)
    run = _run("sess-xyz")
    assert res["worldline"]["run"] == run                       # the VEILED root rides the summary
    assert res["worldline"]["spirits"] == [derive_handle(run, "aaa")]

    # the LANDED content turn-keys (the user-turn uuids) climb to the VEILED run — demux partitions by root
    store = wl.WorldlineStore(os.path.join(root, "worldline"))
    assert store.worldline_of("u1") == run
    assert store.worldline_of("u2") == run

    # no vessel-key / did / raw signing material leaks into any landed drawer's metadata (the C1b witness)
    import content_io as cio
    cstore = cio.ContentStore(os.path.join(root, "content"))
    metas = [r["metadata"] for r in cstore.scan(limit=256)["records"]]
    assert metas                                       # drawers actually landed
    leaky = ("verifyingKey", "signingKey", "did:", "vessel-key")
    for meta in metas:
        blob = json.dumps(meta)
        for token in leaky:
            assert token not in blob, f"identity material {token!r} leaked into a drawer"


def test_veiled_root_is_opaque_and_owner_recomputable(tmp_path):
    # C1b witness: the root reads opaque (`wl-<hash>`, no bare session id) AND the owner re-derives the
    # SAME root from the same secret + run (so a drawer still binds to its braid), while a DIFFERENT
    # secret yields a DIFFERENT root (an exfiltrator without the secret cannot recompute it).
    main = _synth_session(tmp_path)
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    summary = observe_worldline(store, main, veil_secret=_SECRET)

    root = summary["run"]
    assert root.startswith("wl-") and len(root) == len("wl-") + 16
    assert "sess-xyz" not in root
    assert root == _run("sess-xyz")                            # owner re-derivation matches
    assert veiled_root("sess-xyz", secret=b"another-salt") != root  # a foreign secret cannot recompute it
    # a DIFFERENT run under the SAME secret mints a DIFFERENT root (per-worldline shape B)
    assert veiled_root("sess-other", secret=_SECRET) != root


def test_resumed_transcript_roots_at_the_run_not_a_phantom(tmp_path):
    # step-4: a RESUMED session — the first turn's parentUuid points OUTSIDE this file (a prior-session
    # turn not captured here). Without the guard, that phantom parent (never a `to` of any edge) would
    # surface as a spurious braid-root. The guard re-roots it at the RUN, so roots() stands clean.
    main = tmp_path / "sess-resumed.jsonl"
    main.write_text("\n".join([
        _main_line("r1", "PRIOR-SESSION-TURN", "user", "resume the thread", "2026-07-05T11:00:00Z"),
        _main_line("r2", "r1", "assistant", "carrying on", "2026-07-05T11:00:05Z"),
    ]) + "\n", encoding="utf-8")
    store = wl.WorldlineStore(str(tmp_path / "worldline"))
    observe_worldline(store, str(main), veil_secret=_SECRET)

    run = _run("sess-resumed")
    assert store.roots() == [run]                          # the (veiled) RUN, never the phantom prior turn
    assert "PRIOR-SESSION-TURN" not in store.roots()
    assert store.worldline_of("r1") == run                 # r1 climbs to the run (its phantom parent dropped)
    assert store.worldline_of("r2") == run


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
