#!/usr/bin/env python3
"""copilot_sqlite_normalize — GitHub Copilot CLI session-store.db → Claude-shaped jsonl.

The Copilot CLI format DRIFTED: the per-session `~/.copilot/session-state/<id>/
events.jsonl` is gone (CLI 1.0.6x), and the conversation now lives in a single
global SQLite store `~/.copilot/session-store.db` (`sessions` ⋈ `turns`). The old
`copilot_normalize.py` (events.jsonl → jsonl) silently captures nothing now; this
reads the db instead.

Per session it writes `<out_dir>/<session-id>.jsonl` in the Claude-Code transcript
shape mempalace's convo_miner already eats (`_try_claude`), and prints a JSON
manifest line per exported session to stdout:
    {"id": "...", "cwd": "...", "path": "<out_dir>/<id>.jsonl", "turns": N}

The harvester (`discoverCopilotCli`) reads the manifest → wing = wingFromDir(cwd)
(no more path-scraping; cwd is canonical in the `sessions` row), stages each path.

Schema (verified locally, CLI 1.0.64):
    sessions(id, cwd, repository, branch, summary, created_at, updated_at, host_type)
    turns(session_id, turn_index, user_message, assistant_response, timestamp)
One `turns` row = one full user+assistant exchange (both sides in one row) →
emitted as two Claude-shaped lines (a user, then an assistant). Sessions with zero
turns are skipped (nothing to harvest). Tool traces (forge_trajectory_events) are
NOT inlined here — parity with the old normalizer, which dropped tool events.

Usage:  copilot_sqlite_normalize.py <session-store.db> <out_dir>
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
    the CLI `main` below renders the same turns to on-disk jsonl for the legacy harvester manifest.

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
    if len(sys.argv) < 3:
        sys.exit("usage: copilot_sqlite_normalize.py <session-store.db> <out_dir>")
    db_path, out_dir = sys.argv[1], sys.argv[2]
    if not os.path.exists(db_path):
        return  # no db → nothing to export (empty manifest)
    os.makedirs(out_dir, exist_ok=True)

    for sid, cwd, turns in read_sessions(db_path):
        # Render each turn dict back to the Claude-Code transcript line shape the legacy harvester eats.
        out_path = os.path.join(out_dir, f"{sid}.jsonl")
        n = 0
        try:
            with open(out_path, "w", encoding="utf-8") as fh:
                for t in turns:
                    fh.write(json.dumps({
                        "type": t["role"],
                        "uuid": t["uuid"],
                        "timestamp": t["ts"],
                        "sessionId": sid,
                        "cwd": cwd,
                        "message": {"role": t["role"], "content": t["text"]},
                    }) + "\n")
                    n += 1
        except OSError:
            continue
        if n == 0:
            try:
                os.remove(out_path)
            except OSError:
                pass
            continue
        # The manifest counts turn-ROWS (each `<sid>-t<idx>` prefix names one exchange row), NOT the
        # expanded user+assistant line count — parity with the pre-refactor manifest.
        row_count = len({t["uuid"].rsplit("-", 1)[0] for t in turns})
        sys.stdout.write(json.dumps({"id": sid, "cwd": cwd, "path": out_path, "turns": row_count}) + "\n")


if __name__ == "__main__":
    main()
