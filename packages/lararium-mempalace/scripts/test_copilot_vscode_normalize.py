"""copilot_vscode_normalize — the Copilot Chat (VS Code) event stream → Claude-shaped jsonl.

`normalize()` runs pure over an iterable of raw lines, so every case drives it without a filesystem.
The fixtures below mirror the SHAPE of the live transcripts (event types and data keys taken from a
census over the real ones), never their content.
"""
import json

from copilot_vscode_normalize import normalize

SESSION_START = json.dumps({
    "type": "session.start",
    "data": {"sessionId": "s-1", "producer": "copilot-agent", "copilotVersion": "0.57", "version": 1},
    "id": "e0", "timestamp": "2026-07-11T15:10:12.699Z", "parentId": None,
})
USER = json.dumps({
    "type": "user.message",
    "data": {"content": "why does the gate refuse this?", "attachments": []},
    "id": "e1", "timestamp": "2026-07-11T15:10:13Z", "parentId": "e0",
})
ASSISTANT = json.dumps({
    "type": "assistant.message",
    "data": {"content": "the store's own shape sets the bar", "messageId": "m1",
             "reasoningText": "…", "toolRequests": []},
    "id": "e2", "timestamp": "2026-07-11T15:10:20Z", "parentId": "e0",
})


def test_user_and_assistant_prose_ride_claude_shaped():
    turns = list(normalize([SESSION_START, USER, ASSISTANT]))
    assert [t["type"] for t in turns] == ["user", "assistant"]
    # the exact line shape convo_miner's _try_claude eats (parity with copilot_sqlite_normalize)
    assert set(turns[0]) == {"type", "uuid", "timestamp", "sessionId", "cwd", "message"}
    assert turns[0]["message"] == {"role": "user", "content": "why does the gate refuse this?"}
    assert turns[1]["message"]["content"] == "the store's own shape sets the bar"


def test_session_id_rides_every_turn():
    turns = list(normalize([SESSION_START, USER, ASSISTANT]))
    assert {t["sessionId"] for t in turns} == {"s-1"}


def test_uuid_and_timestamp_come_from_the_event_never_invented():
    turns = list(normalize([SESSION_START, USER]))
    assert turns[0]["uuid"] == "e1"
    assert turns[0]["timestamp"] == "2026-07-11T15:10:13Z"


def test_tool_traces_and_turn_brackets_carry_no_prose_and_emit_nothing():
    # PARITY with the sqlite reader, which drops tool events. A normalizer that inlined tool output on
    # ONE source would hand the comparator two different corpora under one name.
    noise = [
        json.dumps({"type": "assistant.turn_start", "data": {"turnId": "t1"}, "id": "x1"}),
        json.dumps({"type": "tool.execution_start",
                    "data": {"toolName": "grep", "arguments": "{}", "toolCallId": "c1"}, "id": "x2"}),
        json.dumps({"type": "tool.execution_complete",
                    "data": {"success": True, "toolCallId": "c1"}, "id": "x3"}),
        json.dumps({"type": "assistant.turn_end", "data": {"turnId": "t1"}, "id": "x4"}),
    ]
    assert list(normalize([SESSION_START, *noise])) == []


def test_a_tool_only_assistant_turn_says_nothing_and_mines_nothing():
    # An assistant turn that only requested a tool carries empty content; an empty drawer prices as
    # noise and mines as a blank, so it never emits.
    empty = json.dumps({"type": "assistant.message",
                        "data": {"content": "", "toolRequests": [{"toolCallId": "c1"}]}, "id": "e9"})
    blank = json.dumps({"type": "assistant.message", "data": {"content": "   "}, "id": "e10"})
    assert list(normalize([SESSION_START, empty, blank])) == []


def test_an_unparseable_line_gets_skipped_never_guessed_at(capsys):
    # A half-read event would fabricate a turn. Skip it — and SAY SO, so a malformed transcript names
    # itself instead of thinning the harvest quietly.
    turns = list(normalize([SESSION_START, "{ not json", USER, "", "[]"]))
    assert [t["type"] for t in turns] == ["user"]
    assert "skipped 2 unparseable line(s)" in capsys.readouterr().err


def test_a_stream_with_no_session_start_still_yields_its_prose():
    turns = list(normalize([USER]))
    assert len(turns) == 1
    assert turns[0]["sessionId"] == ""   # absent, never invented


def test_cwd_stays_empty_because_the_events_never_state_one():
    # The harvester routes the wing from the transcript's PATH; a cwd here would carry a guess where
    # the caller already holds a fact.
    turns = list(normalize([SESSION_START, USER]))
    assert turns[0]["cwd"] == ""
