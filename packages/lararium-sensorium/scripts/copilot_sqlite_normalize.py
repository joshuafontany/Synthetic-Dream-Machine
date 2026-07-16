#!/usr/bin/env python3
"""copilot_sqlite_normalize — GitHub Copilot CLI session-store.db → Claude-shaped jsonl.

The Copilot CLI conversation lives in one global SQLite store
`~/.copilot/session-store.db` (`sessions` ⋈ `turns`).

The sovereign source cap reads SQLite directly. This script provides two small
adapter operations for the comparator only: it lists native session rows, or
renders one named session to `<out_dir>/<session-id>.jsonl` in the Claude-Code
transcript shape that vanilla Mempalace already eats.

The harvester (`discoverCopilotCli`) reads `--list` → wing = wingFromDir(cwd)
(no path-scraping; cwd is canonical in the `sessions` row), then submits the
database plus session id natively to Python.

Schema (verified locally, CLI 1.0.64):
    sessions(id, cwd, repository, branch, summary, created_at, updated_at, host_type)
    turns(session_id, turn_index, user_message, assistant_response, timestamp)
One `turns` row = one full user+assistant exchange (both sides in one row) →
emitted as two Claude-shaped lines (a user, then an assistant). Sessions with zero
turns are skipped (nothing to harvest). Tool traces (forge_trajectory_events) are
NOT inlined here: the comparator measures conversational prose only.

Usage:  copilot_sqlite_normalize.py --list <session-store.db>
        copilot_sqlite_normalize.py --session <id> <session-store.db> <out_dir>
"""
import json
import os
import sqlite3
import sys


def _row_get(row, key):
    try:
        v = row[key]
    except (IndexError, KeyError):
        return None
    return v if isinstance(v, str) and v.strip() else None


def read_sessions(db_path):
    """Yield `(session_id, cwd, turns)` from the Copilot SQLite store — the SQLite READ, NEVER the
    deleted per-session events.jsonl (which captures nothing now). Each `turns` row (one full
    user+assistant exchange) EXPANDS to Claude-shaped turn dicts `{uuid, role, text, ts}` in the grain
    the engine's exchange-assembler eats. The source-cap (`capture_sources.copilot_source`) drives this;
    the comparator adapter below renders one selected session to on-disk JSONL.

    Yields nothing (never raises) when the db goes missing / unreadable, or a session runs empty."""
    if not os.path.exists(db_path):
        return  # no db → nothing to read
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    except sqlite3.Error:
        return
    conn.row_factory = sqlite3.Row
    try:
        try:
            sessions = conn.execute("SELECT id, cwd FROM sessions").fetchall()
        except sqlite3.Error:
            return
        for s in sessions:
            sid = _row_get(s, "id")
            if not sid:
                continue
            cwd = _row_get(s, "cwd") or ""
            try:
                rows = conn.execute(
                    "SELECT turn_index, user_message, assistant_response, timestamp "
                    "FROM turns WHERE session_id=? ORDER BY turn_index",
                    (sid,),
                ).fetchall()
            except sqlite3.Error:
                continue
            turns = []
            for t in rows:
                idx = t["turn_index"]
                ts = _row_get(t, "timestamp") or ""
                um = _row_get(t, "user_message")
                am = _row_get(t, "assistant_response")
                if um:
                    turns.append({"uuid": f"{sid}-t{idx}-u", "role": "user", "text": um, "ts": ts})
                if am:
                    turns.append({"uuid": f"{sid}-t{idx}-a", "role": "assistant", "text": am, "ts": ts})
            if turns:
                yield sid, cwd, turns
    finally:
        conn.close()


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--list":
        for sid, cwd, turns in read_sessions(sys.argv[2]):
            rows = len({t["uuid"].rsplit("-", 1)[0] for t in turns})
            sys.stdout.write(json.dumps({"id": sid, "cwd": cwd, "turns": rows}) + "\n")
        return
    if len(sys.argv) == 5 and sys.argv[1] == "--session":
        wanted, db_path, out_dir = sys.argv[2], sys.argv[3], sys.argv[4]
        os.makedirs(out_dir, exist_ok=True)
        for sid, cwd, turns in read_sessions(db_path):
            if sid != wanted:
                continue
            out_path = os.path.join(out_dir, f"{sid}.jsonl")
            with open(out_path, "w", encoding="utf-8") as fh:
                for t in turns:
                    fh.write(json.dumps({
                        "type": t["role"], "uuid": t["uuid"], "timestamp": t["ts"],
                        "sessionId": sid, "cwd": cwd,
                        "message": {"role": t["role"], "content": t["text"]},
                    }) + "\n")
            return
        return
    sys.exit("usage: copilot_sqlite_normalize.py --list <session-store.db> | --session <id> <session-store.db> <out_dir>")


if __name__ == "__main__":
    main()
