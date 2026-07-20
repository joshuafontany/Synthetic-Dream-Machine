"""Serve-op witness — `CaptureSessionServer.subagent_edges` derives the spawn/handback edge-DAG the
worldline-COMPARE consumer (the TS VM worker) reads. This crunch MOVED off the retired TS
`deriveSubagentEdges` to sit beside the transcript data in python.

Proves, over a SYNTHETIC session (a main transcript + two `subagents/agent-<id>.jsonl` spirits):
  · the pair shape   — each pair carries {spawn, handback} matching the TS SubagentEdgePair EXACTLY
                       (subject=PLAIN run, predicate="prov:Delegation", object=<run>.<agentId>, turnKey).
  · PLAIN identity   — the run-root reads the session basename (NOT the veiled wl-<hash>), so the
                       operator's `<sessionId>.<agentId>` handles name the same worldlines the compare projects.
  · clock-purity     — no valid_from / ended rides the edge (the compare verdict is timestamp-invariant).
  · empty session    — a session that spawned no spirits derives no pairs.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_subagent_edges.py -q
"""
import json

from capture_session import CaptureSessionServer


def _line(uuid, parent, role, text, ts):
    return json.dumps({"type": role, "uuid": uuid, "parentUuid": parent, "sessionId": "sess-xyz",
                       "timestamp": ts, "message": {"role": role, "content": [{"type": "text", "text": text}]}})


def _synth_session(tmp_path, spirits=("aaa", "bbb")):
    """A main `sess-xyz.jsonl` + one `agent-<id>.jsonl` per named spirit (each s1->s2)."""
    main = tmp_path / "sess-xyz.jsonl"
    main.write_text("\n".join([
        _line("u1", None, "user", "light the engine", "2026-07-05T10:00:00Z"),
        _line("a1", "u1", "assistant", "spawning spirits", "2026-07-05T10:00:05Z"),
    ]) + "\n", encoding="utf-8")
    subdir = tmp_path / "sess-xyz" / "subagents"
    subdir.mkdir(parents=True)
    for i, sid in enumerate(spirits):
        (subdir / f"agent-{sid}.jsonl").write_text("\n".join([
            _line(f"s{i}0", None, "user", "the handoff", "2026-07-05T10:00:06Z"),
            _line(f"s{i}1", f"s{i}0", "assistant", "the finding", "2026-07-05T10:00:09Z"),
        ]) + "\n", encoding="utf-8")
    return str(main)


def test_subagent_edges_derives_the_two_pairs(tmp_path):
    main = _synth_session(tmp_path, spirits=("aaa", "bbb"))
    server = CaptureSessionServer(str(tmp_path / ".mem"))
    out = server.subagent_edges({"transcript": main})
    pairs = out["pairs"]
    assert len(pairs) == 2

    # PLAIN run identity — the session basename, never a veiled wl-<hash> root
    run = "sess-xyz"
    by_object = {p["spawn"]["object"]: p for p in pairs}
    assert set(by_object) == {f"{run}.aaa", f"{run}.bbb"}

    p = by_object[f"{run}.aaa"]
    # the SPAWN triple — subject=run, prov:Delegation, object=handle, turnKey=first spirit turn uuid
    assert p["spawn"] == {"subject": run, "predicate": "prov:Delegation",
                          "object": f"{run}.aaa", "turnKey": "s00"}
    # the HANDBACK close — subject/predicate/object mirror the spawn (the twin-reunion of the interval)
    assert p["handback"] == {"subject": run, "predicate": "prov:Delegation", "object": f"{run}.aaa"}
    # clock-purity: no timestamp rides the edge (the compare verdict is timestamp-invariant for siblings)
    assert "valid_from" not in p["spawn"] and "ended" not in p["handback"]


def test_subagent_edges_empty_when_no_spirits(tmp_path):
    main = tmp_path / "sess-solo.jsonl"
    main.write_text(_line("u1", None, "user", "no spirits here", "2026-07-05T10:00:00Z") + "\n",
                    encoding="utf-8")
    server = CaptureSessionServer(str(tmp_path / ".mem"))
    assert server.subagent_edges({"transcript": str(main)}) == {"pairs": []}


def test_subagent_edges_requires_a_transcript(tmp_path):
    server = CaptureSessionServer(str(tmp_path / ".mem"))
    try:
        server.subagent_edges({})
    except ValueError:
        return
    raise AssertionError("subagent_edges must reject an absent transcript pointer")
