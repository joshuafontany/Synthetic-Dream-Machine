"""W5.1 / W1.5d / W5.2 — the multi-surface SOURCE-CAP witnesses over REAL-shaped fixtures.

  · W5.1  per-surface parse:  a real-shaped Claude .jsonl · Codex rollout · Copilot SQLite → correct
          {seq, cid, text, metadata} records.
  · W1.5d cid single-derivation:  distinct same-source turns → distinct FULL-hex cids (no clobber);
          a re-derived cid matches (idempotent); the hash rides FULL 64-hex, never the old [:24].
  · W5.2  Copilot real store:  the SQLite path parses; it does NOT read the (deleted) events.jsonl.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_capture_sources.py -q
"""
import hashlib
import os
import sqlite3

import pytest

from capture_sources import claude_source, codex_source, copilot_source, derive_cid, resolve_source

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures", "capture")
CLAUDE = os.path.join(FIXTURES, "claude-main.jsonl")
CODEX = os.path.join(FIXTURES, "codex-rollout.jsonl")


# --- W1.5d — the single cid gate -------------------------------------------

def test_cid_is_full_hex_and_distinct_per_chunk():
    c0 = derive_cid("sess-abc.jsonl", 0)
    c1 = derive_cid("sess-abc.jsonl", 1)
    hash_part = c0.rsplit("_", 1)[0]
    assert len(hash_part) == 64                       # FULL sha256 hex — never the old [:24] truncation
    assert hash_part == hashlib.sha256(b"sess-abc.jsonl").hexdigest()  # matches caller-vector-flush.ts
    assert c0 != c1                                   # distinct chunks (distinct turns) → distinct cids
    assert derive_cid("sess-abc.jsonl", 0) == c0      # idempotent re-derivation


def test_distinct_same_source_turns_get_distinct_cids_no_clobber():
    recs = list(claude_source(wing="w")(CLAUDE))
    cids = [r["cid"] for r in recs]
    assert len(cids) == len(set(cids))                # no two turns share a cid (no turnKey clobber)
    # every cid ties to the SAME source_file but a distinct chunk → the chunk is what disambiguates
    assert {r["metadata"]["source_file"] for r in recs} == {"claude-main.jsonl"}
    assert sorted(r["metadata"]["chunk_index"] for r in recs) == [0, 1, 2]


# --- W5.1 — Claude parse ----------------------------------------------------

def test_claude_parse_lands_correct_records():
    recs = list(claude_source(wing="wing_proj", room="conversations")(CLAUDE))
    assert len(recs) == 3                             # 3 exchanges (the tool_result-only user turn drops)
    assert [r["seq"] for r in recs] == [1, 2, 3]      # dense 1-based pass seq
    first = recs[0]
    assert first["text"].startswith("> light the capture engine")   # user side carries the `>` quote
    assert "the source-cap parses the transcript" in first["text"]  # assistant joined into one drawer
    assert "tool_use" not in first["text"]            # tool block dropped from the recall text
    m = first["metadata"]
    assert m["wing"] == "wing_proj" and m["room"] == "conversations"
    assert m["lar_turn_key"] == "u-1"                 # the user turn's uuid binds the worldline
    assert m["lar_surface"] == "claude"
    assert first["cid"] == derive_cid("claude-main.jsonl", 0)        # the single gate


def test_claude_subagent_file_marks_sidechain(tmp_path):
    # an `agent-<id>.jsonl` basename reads through the same parser, marked lar_sidechain.
    agent = tmp_path / "agent-deadbeef.jsonl"
    agent.write_text(
        '{"type":"user","uuid":"su-1","message":{"role":"user","content":"spirit task"}}\n'
        '{"type":"assistant","uuid":"sa-1","message":{"role":"assistant","content":"spirit finding"}}\n',
        encoding="utf-8",
    )
    recs = list(claude_source(wing="wing_proj__spirits")(str(agent)))
    assert len(recs) == 1
    assert recs[0]["metadata"]["lar_sidechain"] == "1"
    assert recs[0]["metadata"]["lar_agent"] == "deadbeef"


# --- W5.1 — Codex parse -----------------------------------------------------

def test_codex_parse_lands_correct_records():
    recs = list(codex_source(wing="wing_proj")(CODEX))
    assert len(recs) == 2                             # developer / reasoning / event_msg all drop
    texts = "\n".join(r["text"] for r in recs)
    assert "base instructions injection" not in texts          # developer role skipped
    assert "reasoning item" not in texts and "double-count trap" not in texts
    assert recs[0]["text"].startswith("> parse the codex rollout")
    assert "the response_item lines carry the transcript" in recs[0]["text"]
    assert recs[0]["metadata"]["lar_surface"] == "codex"
    # a user turn carries no native id → content-hash turn-key (16 hex), never empty
    assert len(recs[0]["metadata"]["lar_turn_key"]) == 16


# --- W5.2 — Copilot reads the SQLite store, NOT events.jsonl ----------------

def _build_copilot_db(path):
    """Build a REAL-shaped Copilot session-store.db (the CLI 1.0.64 schema)."""
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE sessions (id TEXT, cwd TEXT, repository TEXT, branch TEXT, "
                 "summary TEXT, created_at TEXT, updated_at TEXT, host_type TEXT)")
    conn.execute("CREATE TABLE turns (session_id TEXT, turn_index INTEGER, user_message TEXT, "
                 "assistant_response TEXT, timestamp TEXT)")
    conn.execute("INSERT INTO sessions (id, cwd) VALUES (?,?)", ("cop-sess-1", "/home/joshu/proj"))
    conn.executemany(
        "INSERT INTO turns (session_id, turn_index, user_message, assistant_response, timestamp) VALUES (?,?,?,?,?)",
        [("cop-sess-1", 0, "read the sqlite store", "not the deleted events.jsonl", "2026-07-04T12:00:00Z"),
         ("cop-sess-1", 1, "second exchange", "lands from the db", "2026-07-04T12:01:00Z")],
    )
    conn.commit()
    conn.close()


def test_copilot_reads_sqlite_not_events_jsonl(tmp_path):
    db = tmp_path / "session-store.db"
    _build_copilot_db(str(db))
    # plant a DECOY events.jsonl beside it — a source that read it would leak this text.
    (tmp_path / "events.jsonl").write_text(
        '{"type":"user.message","data":{"content":"DECOY from events.jsonl"}}\n', encoding="utf-8")

    recs = list(copilot_source(wing="wing_proj")(str(db)))
    assert len(recs) == 2                             # two turn-rows → two exchanges
    assert [r["seq"] for r in recs] == [1, 2]         # one dense running seq across the session
    texts = "\n".join(r["text"] for r in recs)
    assert "DECOY from events.jsonl" not in texts     # the SQLite path never touched events.jsonl
    assert recs[0]["text"].startswith("> read the sqlite store")
    assert "not the deleted events.jsonl" in recs[0]["text"]
    m = recs[0]["metadata"]
    assert m["lar_surface"] == "copilot-cli" and m["wing"] == "wing_proj"
    assert m["source_file"] == "cop-sess-1.jsonl"
    assert recs[0]["cid"] == derive_cid("cop-sess-1.jsonl", 0)


def test_resolve_source_dispatch_and_wing_floor():
    assert resolve_source("codex", wing="w") is not None
    with pytest.raises(ValueError):
        resolve_source("codex")                       # file surfaces require a wing (the schema floor)
    with pytest.raises(ValueError):
        resolve_source("nope", wing="w")              # unknown surface refuses
    assert resolve_source("copilot") is not None      # copilot defaults its wing per-session
