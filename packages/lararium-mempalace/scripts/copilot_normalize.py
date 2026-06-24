#!/usr/bin/env python3
"""copilot_normalize — GitHub Copilot CLI events.jsonl → a Claude-Code-shaped jsonl.

mempalace's convo_miner detects Claude Code / Codex / ChatGPT / Slack, but NOT
Copilot CLI. So our layer normalizes a Copilot session's events.jsonl into the
Claude-Code transcript shape mempalace already eats (`_try_claude`), then the
existing `mempalace mine --mode convos` + `lares harvest --writeback` pipeline
runs unchanged.

Copilot events.jsonl envelope (per the github/copilot-cli session format):
  {"type": "<event>", "timestamp": <n>, "data": {...}}
  user text      → type "user.message"      (or bare "user"),      data.content (str)
  assistant text → type "assistant.message" (or bare "assistant"), data.content (str)
  everything else (tool.*, skill.*, session.*, subagent*, rewind…) is dropped.

UNVERIFIED against a real local session (none exists on this box yet) — built to
the documented/fixture spec. Tolerant by design: matches both dotted and bare
event names (the docs disagree), and survives the known multi-line-JSON hazard
(U+2028 / embedded newlines in tool results, copilot-cli #2012/#2490/#2649) by
skipping unparseable records rather than aborting.

Usage:  copilot_normalize.py <events.jsonl>   # emits Claude-shaped jsonl on stdout
"""
import json
import os
import sys

USER_TYPES = {"user.message", "user"}
ASSISTANT_TYPES = {"assistant.message", "assistant"}


def _content(data):
    c = data.get("content") if isinstance(data, dict) else None
    return c if isinstance(c, str) and c.strip() else None


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: copilot_normalize.py <events.jsonl>")
    path = sys.argv[1]
    # session id = the session-state/<uuid>/ dir name; cwd filled from session.start.
    session_id = os.path.basename(os.path.dirname(os.path.abspath(path)))
    cwd = ""

    out = sys.stdout
    n = 0
    for raw in open(path, encoding="utf-8", errors="replace"):
        raw = raw.strip()
        if not raw:
            continue
        try:
            ev = json.loads(raw)
        except Exception:
            continue  # multi-line / malformed record — skip, never abort
        if not isinstance(ev, dict):
            continue
        etype = ev.get("type", "")
        data = ev.get("data", {}) if isinstance(ev.get("data"), dict) else {}
        ts = ev.get("timestamp", "")

        if etype in ("session.start", "session") and not cwd:
            cwd = data.get("cwd", "") or data.get("workspace", "") or ""
            continue

        if etype in USER_TYPES:
            text = _content(data)
            if text is None:
                continue
            out.write(json.dumps({
                "type": "user",
                "uuid": f"copilot-{session_id}-{n}",
                "sessionId": session_id,
                "cwd": cwd,
                "timestamp": ts,
                "message": {"role": "user", "content": text},
            }) + "\n")
            n += 1
        elif etype in ASSISTANT_TYPES:
            text = _content(data)
            if text is None:
                continue
            out.write(json.dumps({
                "type": "assistant",
                "uuid": f"copilot-{session_id}-{n}",
                "sessionId": session_id,
                "cwd": cwd,
                "timestamp": ts,
                "message": {"role": "assistant", "content": [{"type": "text", "text": text}]},
            }) + "\n")
            n += 1
    sys.stderr.write(f"copilot_normalize: {n} messages from {session_id}\n")


if __name__ == "__main__":
    main()
