"""W5.1 / W1.5d / W5.2 — the multi-surface SOURCE-CAP witnesses over REAL-shaped fixtures.

  · W5.1  per-surface parse:  a real-shaped Claude .jsonl · Codex rollout · Copilot SQLite → correct
          {seq, cid, text, metadata} records.
  · W1.5d cid single-derivation:  distinct same-source turns → distinct FULL-hex cids (no clobber);
          a re-derived cid matches (idempotent); the hash rides FULL 64-hex, never the old [:24].
  · W5.2  Copilot real store:  the SQLite path parses; it does NOT read the (deleted) events.jsonl.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_capture_sources.py -q
"""
import hashlib
import json
import os
import sqlite3
import subprocess
import sys

import pytest

from capture_sources import (
    _source_key,
    _turn_key,
    claude_source,
    codex_source,
    copilot_source,
    copilot_vscode_source,
    corpus_source,
    derive_cid,
    resolve_source,
)

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures", "capture")
CLAUDE = os.path.join(FIXTURES, "claude-main.jsonl")
CODEX = os.path.join(FIXTURES, "codex-rollout.jsonl")


# --- C3 correctness batch: session-scoped keys, chunk-folded turn-key, UTF8-tolerant parse ----------

def test_source_key_scopes_by_session_and_surface_no_cross_collision():
    # C3: the bare basename COLLIDES — two parent sessions each spawn an `agent-aaa.jsonl`. The
    # session+surface-qualified key keeps them disjoint; the surface prefix walls Claude off from Codex.
    p1 = "/x/sess-one/subagents/agent-aaa.jsonl"
    p2 = "/x/sess-two/subagents/agent-aaa.jsonl"       # same basename, DIFFERENT parent session
    assert _source_key("claude", p1) == "claude:sess-one.aaa"
    assert _source_key("claude", p2) == "claude:sess-two.aaa"
    assert _source_key("claude", p1) != _source_key("claude", p2)   # no cross-session collision
    assert derive_cid(_source_key("claude", p1), 0) != derive_cid(_source_key("claude", p2), 0)
    # a MAIN session keys on its (unique) session id; the surface prefix separates like-named surfaces
    assert _source_key("claude", "/x/sess-one.jsonl") == "claude:sess-one"
    assert _source_key("codex", "/y/sess-one.jsonl") == "codex:sess-one"
    assert _source_key("claude", "/x/sess-one.jsonl") != _source_key("codex", "/y/sess-one.jsonl")


def test_staged_and_direct_pointer_share_one_source_identity_and_cids():
    # The comparator/ingest stage may spell the same native stream `claude__<session>.jsonl`.
    # Staging is ingress-only: a stage re-pass must converge with direct capture, never mint a
    # second drawer family for the same exchanges.
    direct = _source_key("claude", "/source/claude-main.jsonl")
    staged = _source_key("claude", "/stage/claude__claude-main.jsonl")
    assert direct == staged == "claude:claude-main"
    assert derive_cid(direct, 2) == derive_cid(staged, 2)


def test_turn_key_fallback_folds_chunk_no_collision():
    # C3: two no-uuid turns (Codex user / Copilot) sharing ts + text-prefix would collapse to ONE key and
    # kapae would mute both together — the chunk ordinal keeps them distinct while staying idempotent.
    a = {"role": "user", "text": "yes do it", "ts": "2026-07-05T10:00:00Z"}      # no uuid
    b = {"role": "user", "text": "yes do it", "ts": "2026-07-05T10:00:00Z"}      # identical no-uuid turn
    assert _turn_key("s", a, 0) != _turn_key("s", b, 1)          # distinct chunks → distinct keys
    assert _turn_key("s", a, 0) == _turn_key("s", a, 0)          # idempotent (stable across re-runs)
    # a native uuid still wins verbatim, chunk-independent (the uuid IS the stable identity)
    assert _turn_key("s", {"uuid": "u-9", "text": "t", "ts": "z"}, 3) == "u-9"


def test_parse_tolerates_a_non_utf8_byte(tmp_path):
    # C3: one non-UTF8 byte substitutes U+FFFD, never crashes the pass (errors="replace"). The valid
    # turns still land; the mangled line either JSON-parses (U+FFFD in text) or skips cleanly.
    p = tmp_path / "sess-bad.jsonl"
    good = ('{"type":"user","uuid":"u1","timestamp":"t","sessionId":"s",'
            '"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}\n')
    p.write_bytes(good.encode("utf-8") + b"\xff\xfe not valid utf8 here\n" + good.replace("u1", "u2").encode("utf-8"))
    recs = list(claude_source(wing="w")(str(p)))       # NO crash on the bad byte
    assert len(recs) >= 1                               # the valid turn(s) still land


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
    # every cid ties to the SAME source_file but a distinct chunk → the chunk is what disambiguates.
    # source_file now carries the session+surface-qualified key (C3), never the bare basename.
    assert {r["metadata"]["source_file"] for r in recs} == {"claude:claude-main"}
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
    assert first["cid"] == derive_cid("claude:claude-main", 0)       # the single gate (qualified key, C3)


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
    assert recs[0]["metadata"]["lar_sidechain"] == 1   # int, isomorphic with the TS stamp (Q3)
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
    assert m["source_file"] == "copilot:cop-sess-1"                  # session+surface-qualified key (C3)
    assert recs[0]["cid"] == derive_cid("copilot:cop-sess-1", 0)


def test_copilot_sqlite_source_can_select_one_native_session(tmp_path):
    db = tmp_path / "session-store.db"
    _build_copilot_db(str(db))
    selected = list(copilot_source(wing="wing_proj", session_id="cop-sess-1")(str(db)))
    missing = list(copilot_source(wing="wing_proj", session_id="absent")(str(db)))
    assert len(selected) == 2 and not missing


def test_copilot_sqlite_adapter_lists_and_exports_only_the_selected_session(tmp_path):
    """The comparator adapter is explicit: sovereign capture never consumes this JSONL."""
    db = tmp_path / "session-store.db"
    _build_copilot_db(str(db))
    script = os.path.join(os.path.dirname(__file__), "copilot_sqlite_normalize.py")

    listed = subprocess.run(
        [sys.executable, script, "--list", str(db)], check=True, capture_output=True, text=True,
    )
    assert [json.loads(line)["id"] for line in listed.stdout.splitlines()] == ["cop-sess-1"]

    out = tmp_path / "comparator-stage"
    subprocess.run(
        [sys.executable, script, "--session", "cop-sess-1", str(db), str(out)], check=True,
    )
    exported = out / "cop-sess-1.jsonl"
    assert exported.exists()
    assert "read the sqlite store" in exported.read_text(encoding="utf-8")


def test_copilot_vscode_reads_its_native_event_stream_not_a_staged_rewrite(tmp_path):
    stream = tmp_path / "chat.jsonl"
    stream.write_text(
        "\n".join([
            json.dumps({"type": "session.start", "data": {"sessionId": "vscode-7"}}),
            json.dumps({"type": "user.message", "id": "u-7", "timestamp": "t1", "data": {"content": "native event stream"}}),
            json.dumps({"type": "assistant.message", "id": "a-7", "timestamp": "t2", "data": {"content": "Python reads it directly"}}),
        ]) + "\n",
        encoding="utf-8",
    )
    recs = list(copilot_vscode_source(wing="wing_proj")(str(stream)))
    assert len(recs) == 1
    assert recs[0]["metadata"]["source_file"] == "copilot-vscode:vscode-7"
    assert recs[0]["metadata"]["lar_surface"] == "copilot-vscode"
    assert "Python reads it directly" in recs[0]["text"]


def test_resolve_source_dispatch_and_wing_floor():
    assert resolve_source("codex", wing="w") is not None
    with pytest.raises(ValueError):
        resolve_source("codex")                       # file surfaces require a wing (the schema floor)
    with pytest.raises(ValueError):
        resolve_source("nope", wing="w")              # unknown surface refuses
    assert resolve_source("copilot") is not None      # copilot defaults its wing per-session
    assert resolve_source("copilot-vscode", wing="w") is not None


# --- the curated human-text corpus cap (RUN-ARC #2 — the test-bed ground) ---------------------------

def _plant_corpus(tmp_path):
    root = tmp_path / "memes"
    (root / "sub").mkdir(parents=True)
    (root / "a.md").write_text("# Alpha\n\nA prose paragraph about the hearth.\n", encoding="utf-8")
    (root / "sub" / "b.md").write_text("# Beta\n\nAnother paragraph, another meme.\n", encoding="utf-8")
    (root / "c.py").write_text("print('no corpus signal')\n", encoding="utf-8")   # ext outside the cap
    (root / "empty.md").write_text("   \n", encoding="utf-8")                     # blank → never a record
    return root


def test_corpus_source_one_file_one_record_stable_identity(tmp_path):
    root = _plant_corpus(tmp_path)
    recs = list(corpus_source(wing="wing_testbed")(str(root)))
    # two md files ride; the .py and the blank file never land; the seq runs dense over the sorted walk.
    assert [r["seq"] for r in recs] == [1, 2]
    keys = sorted(r["metadata"]["source_file"] for r in recs)
    assert keys == ["corpus:memes/a.md", "corpus:memes/sub/b.md"]   # root-basename + relpath, never absolute
    a = next(r for r in recs if r["metadata"]["source_file"] == "corpus:memes/a.md")
    assert a["cid"] == derive_cid("corpus:memes/a.md", 0)           # the single cid gate, chunk 0
    assert a["metadata"]["lar_surface"] == "corpus"
    assert a["metadata"]["lar_kind"] == "markdown"                  # the router kind rides the record
    assert a["metadata"]["wing"] == "wing_testbed" and a["metadata"]["room"] == "corpus"
    assert a["metadata"]["lar_chain"]                                # the one-link chain binds the text
    assert a["metadata"]["lar_mtime_sighting"]                       # sighting register — provenance only
    # idempotent: a re-read derives the SAME cids + chains (the frozen corpus re-derivation).
    again = list(corpus_source(wing="wing_testbed")(str(root)))
    assert [(r["cid"], r["metadata"]["lar_chain"]) for r in again] == \
           [(r["cid"], r["metadata"]["lar_chain"]) for r in recs]


def test_corpus_source_edit_keeps_cid_breaks_chain(tmp_path):
    # the rewind surface: a re-curated file keeps its content-INDEPENDENT cid but its chain diverges,
    # so the pipeline's rewind guard re-lands instead of silent-skipping the stale text.
    root = _plant_corpus(tmp_path)
    before = {r["cid"]: r["metadata"]["lar_chain"] for r in corpus_source(wing="w")(str(root))}
    (root / "a.md").write_text("# Alpha EDITED\n\nThe paragraph moved on.\n", encoding="utf-8")
    after = {r["cid"]: r["metadata"]["lar_chain"] for r in corpus_source(wing="w")(str(root))}
    assert set(before) == set(after)                                 # cids hold (source+chunk identity)
    edited = derive_cid("corpus:memes/a.md", 0)
    assert before[edited] != after[edited]                           # the chain breaks — rewind detectable
    other = derive_cid("corpus:memes/sub/b.md", 0)
    assert before[other] == after[other]                             # the untouched file's chain holds


def test_corpus_source_multi_root_and_collision_fails_loud(tmp_path):
    # The rows align so the two roots differ ONLY in name — the comparison IS the assertion.
    r1 = tmp_path / "one";  r1.mkdir();  (r1 / "x.md").write_text("# One\n", encoding="utf-8")  # noqa: E702
    r2 = tmp_path / "two";  r2.mkdir();  (r2 / "y.md").write_text("# Two\n", encoding="utf-8")  # noqa: E702
    pointer = os.pathsep.join([str(r1), str(r2)])
    recs = list(corpus_source(wing="w")(pointer))
    assert sorted(r["metadata"]["source_file"] for r in recs) == ["corpus:one/x.md", "corpus:two/y.md"]
    # two roots whose basenames collide would fuse distinct files under one cid — FAIL LOUD instead.
    d1 = tmp_path / "p1" / "mu";  d1.mkdir(parents=True);  (d1 / "z.md").write_text("# Z1\n", encoding="utf-8")  # noqa: E702
    d2 = tmp_path / "p2" / "mu";  d2.mkdir(parents=True);  (d2 / "z.md").write_text("# Z2\n", encoding="utf-8")  # noqa: E702
    with pytest.raises(ValueError, match="collision"):
        list(corpus_source(wing="w")(os.pathsep.join([str(d1), str(d2)])))


def test_resolve_source_knows_the_corpus_surface():
    assert resolve_source("corpus", wing="w") is not None
    with pytest.raises(ValueError):
        resolve_source("corpus")                      # the corpus cap requires a wing (the schema floor)


def test_corpus_source_eats_mem_carriers(tmp_path):
    # `.mem` names the registered memetic-wikitext carrier — a filter without it
    # silently empties every meme bed (the memes-bed regenesis caught this live).
    root = tmp_path / "memes"
    root.mkdir()
    (root / "seed.mem").write_text("<<~ ahu #entry >>\n\naloha\n\n<<~/ahu >>\n")
    recs = list(corpus_source(wing="wing_testbed")(str(root)))
    assert [r["metadata"]["source_file"] for r in recs] == ["corpus:memes/seed.mem"]


def test_corpus_source_refuses_loud_on_an_empty_yield(tmp_path):
    # A named corpus yielding nothing refuses — a silent empty bed builds
    # "successfully" and reads as a finding downstream.
    root = tmp_path / "empty"
    root.mkdir()
    (root / "code.py").write_text("pass\n")  # filtered by extension; nothing lands
    with pytest.raises(SystemExit, match="ZERO records"):
        list(corpus_source(wing="wing_testbed")(str(root)))


def test_sectioned_extract_designates_prose_when_the_sniffer_abstains(tmp_path):
    # Bare verse pulled from #source-text IS text by construction — extracted mode
    # designates prose where detect_kind abstains, so the structure plane never
    # silently skips a whole thesis bed (the kumulipo-extracted regenesis catch).
    carrier = "\n".join([
        "<<~ ahu #source-text >>",
        "## The First Era", "O ke au i kahuli wela ka honua", "",
        "## The Second Era", "Hanau ka po", "",
        "<<~/ahu >>",
    ])
    root = tmp_path / "kumulipo"
    root.mkdir()
    (root / "kumulipo-liliuokalani.mem").write_text(carrier)
    from capture_sources import corpus_sectioned_source
    recs = list(corpus_sectioned_source(wing="wing_testbed", extract=True)(str(root)))
    assert recs, "the sectioner still cuts the carrier"
    assert all(r["metadata"]["lar_kind"] for r in recs), "no record rides kindless"
    assert {r["metadata"]["lar_kind"] for r in recs} <= {"prose", "markdown", "memetic-wikitext"}
