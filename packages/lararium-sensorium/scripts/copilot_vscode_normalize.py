#!/usr/bin/env python3
"""copilot_vscode_normalize — Copilot Chat (VS Code) transcript → Claude-shaped jsonl.

The VS Code extension writes an EVENT STREAM, one json object per line, under
`<workspaceStorage>/<hash>/GitHub.copilot-chat/transcripts/<session>.jsonl`:

    {"type": "...", "data": {...}, "id": "...", "timestamp": "...", "parentId": ...}

Seven event types carry a session (census over the live transcripts):

    session.start            — sessionId, copilotVersion, vscodeVersion, startTime
    user.message             — data.content            (+ data.attachments)
    assistant.message        — data.content            (+ data.reasoningText, data.toolRequests)
    assistant.turn_start     — turnId                  (a bracket, no prose)
    assistant.turn_end       — turnId                  (a bracket, no prose)
    tool.execution_start     — toolName, arguments, toolCallId
    tool.execution_complete  — success, toolCallId

This emits ONE Claude-shaped line per conversational message to stdout, in the exact shape
`copilot_sqlite_normalize` renders and mempalace's convo_miner already eats (`_try_claude`):

    {"type": role, "uuid": ..., "timestamp": ..., "sessionId": ..., "cwd": "",
     "message": {"role": role, "content": text}}

WHAT RIDES AND WHAT DOES NOT. Only `user.message` and `assistant.message` carry prose, so only they
emit. Tool traces drop — PARITY with the sqlite reader, which drops them too; a normalizer that
inlined tool output here and not there would hand the comparator two different corpora wearing one
name, and every cross-source number would read the difference as a finding.

An assistant turn that only requested a tool carries empty `content`; it emits nothing, because an
empty message drawer prices as noise and mines as a blank.

`cwd` stays empty: these events never state one. The harvester routes the wing from the transcript's
own path (`scrapeWing`), so the field would carry a guess where the harvester already holds a fact.

A line that fails to parse gets SKIPPED, never guessed at — a half-read event is a fabricated turn.
The count of skipped lines rides stderr so a malformed transcript names itself instead of thinning
the harvest quietly.

Usage:  copilot_vscode_normalize.py <transcript.jsonl>   → Claude-shaped jsonl on stdout
"""
import json
import sys

# The two event types that carry prose, mapped to the role they speak as.
_PROSE = {"user.message": "user", "assistant.message": "assistant"}


def normalize(lines):
    """Yield Claude-shaped turn dicts from a Copilot VS Code event stream.

    Pure over an iterable of raw lines, so the test drives it without a filesystem."""
    session_id = ""
    unparsed = 0
    for raw in lines:
        raw = raw.strip()
        if not raw:
            continue
        try:
            ev = json.loads(raw)
        except (ValueError, TypeError):
            unparsed += 1
            continue
        if not isinstance(ev, dict):
            unparsed += 1
            continue

        etype = ev.get("type")
        data = ev.get("data") if isinstance(ev.get("data"), dict) else {}

        if etype == "session.start":
            sid = data.get("sessionId")
            if isinstance(sid, str) and sid:
                session_id = sid
            continue

        role = _PROSE.get(etype)
        if not role:
            continue                       # brackets and tool traces carry no prose

        content = data.get("content")
        if not isinstance(content, str) or not content.strip():
            continue                       # a tool-only assistant turn says nothing

        yield {
            "type": role,
            "uuid": ev.get("id") or "",
            "timestamp": ev.get("timestamp") or "",
            "sessionId": session_id,
            "cwd": "",
            "message": {"role": role, "content": content},
        }

    if unparsed:
        sys.stderr.write(f"copilot_vscode_normalize: skipped {unparsed} unparseable line(s)\n")


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: copilot_vscode_normalize.py <transcript.jsonl>")
    try:
        with open(sys.argv[1], encoding="utf-8") as fh:
            for turn in normalize(fh):
                sys.stdout.write(json.dumps(turn) + "\n")
    except OSError as e:
        sys.exit(f"copilot_vscode_normalize: cannot read {sys.argv[1]}: {e}")


if __name__ == "__main__":
    main()
